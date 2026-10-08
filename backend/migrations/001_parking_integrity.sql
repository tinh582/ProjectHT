-- Run as the database owner. This migration targets the existing public tables.
-- All application data now flows through the authenticated Express API.
-- No existing rows are deleted; inconsistent data causes the migration to fail.
begin;

alter table public.transactions add column if not exists confirmed_at timestamptz;
update public.transactions set confirmed_at = created_at where status = 'completed' and confirmed_at is null;

revoke all on table public.profiles, public.vehicles, public.parking_zones,
  public.parking_slots, public.parking_sessions, public.pricing_configs,
  public.transactions, public.notifications from public, anon, authenticated;
grant all on table public.profiles, public.vehicles, public.parking_zones,
  public.parking_slots, public.parking_sessions, public.pricing_configs,
  public.transactions, public.notifications to service_role;

create unique index if not exists parking_one_slot_per_vehicle on public.parking_slots(vehicle_id) where vehicle_id is not null;
create unique index if not exists parking_one_active_session on public.parking_sessions(vehicle_id) where status = 'active';
create unique index if not exists parking_unique_plate on public.vehicles(upper(trim(plate)));
create unique index if not exists parking_unique_slot_name on public.parking_slots(zone_id, slot_name);
create index if not exists parking_session_entry on public.parking_sessions(entry_time);
create index if not exists parking_session_exit on public.parking_sessions(exit_time);
create index if not exists parking_completed_transactions on public.transactions((coalesce(confirmed_at, created_at))) where status = 'completed';
create index if not exists parking_user_transactions on public.transactions(user_id, created_at desc);
create index if not exists parking_user_notifications on public.notifications(user_id, created_at desc);

-- Text identifiers support existing UUID or numeric primary keys. Resolve each
-- supplied ID to a typed row before using it for writes and indexed joins.
create or replace function public.reserve_parking_slot(p_user_id text, p_vehicle_id text, p_slot_id text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v public.vehicles%rowtype;
  s public.parking_slots%rowtype;
begin
  select * into v from public.vehicles where id::text = p_vehicle_id for update;
  if not found or v.user_id::text is distinct from p_user_id then raise exception 'Vehicle not found or not owned by you.'; end if;
  if exists(select 1 from public.parking_sessions where vehicle_id = v.id and status = 'active') then
    raise exception 'A parked vehicle cannot change slots.';
  end if;
  -- Lock the old and new slots in a stable order, including cross-zone swaps.
  perform id from public.parking_slots where vehicle_id = v.id or id::text = p_slot_id order by id for update;
  select * into s from public.parking_slots where id::text = p_slot_id;
  if not found then raise exception 'Slot not found.'; end if;
  if s.vehicle_id = v.id and s.status = 'rented' then return; end if;
  if s.status is distinct from 'empty' or s.vehicle_id is not null then raise exception 'This slot has already been taken. Refresh and choose another.'; end if;
  if not exists(select 1 from public.parking_zones where id = s.zone_id and vehicle_type = v.type) then
    raise exception 'This slot does not support your vehicle type.';
  end if;
  update public.parking_slots set status = 'empty', vehicle_id = null where vehicle_id = v.id;
  update public.parking_slots set status = 'rented', vehicle_id = v.id where id = s.id;
end $$;

create or replace function public.transition_parking_session(p_plate text, p_session_id text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v public.vehicles%rowtype;
  s public.parking_slots%rowtype;
  ps public.parking_sessions%rowtype;
  z public.parking_zones%rowtype;
  message text;
begin
  if p_session_id is not null then
    select vehicles.* into v from public.vehicles vehicles
      join public.parking_sessions sessions on sessions.vehicle_id = vehicles.id
      where sessions.id::text = p_session_id for update of vehicles;
  else
    select * into v from public.vehicles where upper(trim(plate)) = upper(trim(p_plate)) for update;
  end if;
  if not found then raise exception 'Vehicle or parking session not found.'; end if;
  select * into s from public.parking_slots where vehicle_id = v.id for update;
  if not found then raise exception 'Vehicle has no assigned slot.'; end if;
  select * into z from public.parking_zones where id = s.zone_id for update;
  if not found then raise exception 'Parking zone not found.'; end if;
  select * into ps from public.parking_sessions where vehicle_id = v.id and status = 'active' for update;
  if p_session_id is not null and (ps.id is null or ps.id::text <> p_session_id) then
    raise exception 'This session has already been closed.';
  end if;
  if ps.id is not null then
    update public.parking_sessions set status = 'completed', exit_time = now() where id = ps.id;
    update public.parking_slots set status = 'rented' where id = s.id;
    update public.parking_zones set current_occupancy = greatest(0, coalesce(current_occupancy, 0) - 1) where id = z.id;
    message := 'CHECK-OUT: ' || v.plate || ' - ' || s.slot_name;
  else
    if s.status is distinct from 'rented' then raise exception 'Slot is not ready for check-in.'; end if;
    if not exists(select 1 from public.transactions where user_id = v.user_id and status = 'completed'
      and coalesce(confirmed_at, created_at) >= now() - interval '30 days'
      and coalesce(confirmed_at, created_at) <= now()) then
      raise exception 'A confirmed, unexpired parking subscription is required.';
    end if;
    if coalesce(z.current_occupancy, 0) >= z.total_capacity then raise exception 'Parking zone is full.'; end if;
    insert into public.parking_sessions(vehicle_id, status, entry_time) values(v.id, 'active', now());
    update public.parking_slots set status = 'occupied' where id = s.id;
    update public.parking_zones set current_occupancy = coalesce(current_occupancy, 0) + 1 where id = z.id;
    message := 'CHECK-IN: ' || v.plate || ' - ' || s.slot_name;
  end if;
  insert into public.notifications(user_id, title, message) values(v.user_id, 'Parking update', message);
  return jsonb_build_object('message', message);
end $$;

create or replace function public.edit_parking_vehicle(p_user_id text, p_vehicle_id text, p_fields jsonb, p_delete boolean)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare v public.vehicles%rowtype;
begin
  select * into v from public.vehicles where id::text = p_vehicle_id for update;
  if not found or v.user_id::text is distinct from p_user_id then raise exception 'Vehicle not found or not owned by you.'; end if;
  if exists(select 1 from public.parking_sessions where vehicle_id = v.id and status = 'active') then
    raise exception 'A parked vehicle cannot be changed or deleted.';
  end if;
  if p_delete then
    update public.parking_slots set status = 'empty', vehicle_id = null where vehicle_id = v.id;
    delete from public.vehicles where id = v.id;
  else
    if v.type <> p_fields->>'type' then
      update public.parking_slots set status = 'empty', vehicle_id = null where vehicle_id = v.id;
    end if;
    v := jsonb_populate_record(v, p_fields - 'id' - 'user_id');
    update public.vehicles set type = v.type, brand = v.brand, model = v.model,
      color = v.color, plate = v.plate, months = v.months, image = v.image where id = v.id;
  end if;
end $$;

create or replace function public.request_parking_payment(p_user_id text, p_plan_id text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  customer public.profiles%rowtype;
  plan public.pricing_configs%rowtype;
  payment public.transactions%rowtype;
begin
  select * into customer from public.profiles where id::text = p_user_id for update;
  if not found then raise exception 'Account not found.'; end if;
  select * into plan from public.pricing_configs where id::text = p_plan_id for share;
  if not found or plan.price is null or plan.price < 0 then raise exception 'Pricing plan is unavailable.'; end if;
  -- Repeated clicks/retries reuse the pending request for this plan and price.
  select * into payment from public.transactions where user_id = customer.id and status = 'pending'
    and plan_name = plan.plan_type and amount = plan.price order by created_at desc limit 1;
  if not found then
    insert into public.transactions(user_id, amount, plan_name, status)
      values(customer.id, plan.price, plan.plan_type, 'pending') returning * into payment;
    insert into public.notifications(user_id, title, message)
      values(customer.id, 'Payment awaiting confirmation', 'Your request for ' || plan.plan_type || ' is awaiting staff confirmation.');
  end if;
  return jsonb_build_object('id', payment.id, 'status', payment.status, 'amount', payment.amount);
end $$;

create or replace function public.initialize_parking_slots(p_zone_id text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare z public.parking_zones%rowtype;
begin
  select * into z from public.parking_zones where id::text = p_zone_id for update;
  if not found then raise exception 'Zone not found.'; end if;
  if z.total_capacity < 1 or z.total_capacity > 1000 then raise exception 'Zone capacity must be between 1 and 1000.'; end if;
  insert into public.parking_slots(zone_id, slot_name, status)
    select z.id, split_part(z.zone_name, ' ', 1) || '-' || n, 'empty'
    from generate_series(1, z.total_capacity::integer) n
    on conflict(zone_id, slot_name) do nothing;
end $$;

create or replace function public.create_parking_zone(p_name text, p_type text, p_capacity integer)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare z public.parking_zones%rowtype;
begin
  if p_capacity < 1 or p_capacity > 1000 then raise exception 'Invalid capacity.'; end if;
  insert into public.parking_zones(zone_name, vehicle_type, total_capacity, current_occupancy)
    values(p_name, p_type, p_capacity, 0) returning * into z;
  perform public.initialize_parking_slots(z.id::text);
end $$;

create or replace function public.delete_parking_zone(p_zone_id text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare z public.parking_zones%rowtype;
begin
  -- Match check-in's slot -> zone lock order.
  perform id from public.parking_slots where zone_id::text = p_zone_id order by id for update;
  select * into z from public.parking_zones where id::text = p_zone_id for update;
  if not found then raise exception 'Zone not found.'; end if;
  if exists(select 1 from public.parking_slots where zone_id = z.id and (vehicle_id is not null or status <> 'empty')) then
    raise exception 'Release all assigned slots before deleting this zone.';
  end if;
  delete from public.parking_slots where zone_id = z.id;
  delete from public.parking_zones where id = z.id;
end $$;

create or replace function public.parking_report(p_time_zone text default 'Asia/Ho_Chi_Minh')
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
  today date := (now() at time zone p_time_zone)::date;
  day_start timestamptz := today::timestamp at time zone p_time_zone;
  day_end timestamptz := (today + 1)::timestamp at time zone p_time_zone;
  traffic bigint;
  active bigint;
  capacity bigint;
  occupancy bigint;
  revenue numeric;
  chart jsonb;
begin
  select count(*) into traffic from public.parking_sessions
    where (entry_time >= day_start and entry_time < day_end) or (exit_time >= day_start and exit_time < day_end);
  select count(*) into active from public.parking_sessions where status = 'active';
  select coalesce(sum(total_capacity), 0), coalesce(sum(current_occupancy), 0) into capacity, occupancy from public.parking_zones;
  with daily as (
    select (coalesce(confirmed_at, created_at) at time zone p_time_zone)::date as day, sum(amount) as amount
    from public.transactions where status = 'completed'
      and coalesce(confirmed_at, created_at) >= (today - 6)::timestamp at time zone p_time_zone
      and coalesce(confirmed_at, created_at) < day_end
    group by 1
  ), days as (
    select today - n as day from generate_series(0, 6) n
  )
  select jsonb_agg(jsonb_build_object('name', to_char(days.day, 'DD/MM'), 'revenue', coalesce(daily.amount, 0)) order by days.day),
    coalesce(max(daily.amount) filter(where days.day = today), 0)
    into chart, revenue from days left join daily using(day);
  return jsonb_build_object('todayTraffic', traffic, 'activeSessions', active,
    'availableSpots', greatest(0, capacity - occupancy),
    'occupancyRate', case when capacity > 0 then round(occupancy * 100.0 / capacity) else 0 end,
    'todayRevenue', revenue, 'reportData', chart);
end $$;

-- Functions take verified user IDs from the API, so browsers must never call them directly.
revoke all on function public.reserve_parking_slot(text,text,text),
  public.transition_parking_session(text,text), public.edit_parking_vehicle(text,text,jsonb,boolean),
  public.request_parking_payment(text,text), public.initialize_parking_slots(text),
  public.create_parking_zone(text,text,integer), public.delete_parking_zone(text), public.parking_report(text)
  from public, anon, authenticated;
grant execute on function public.reserve_parking_slot(text,text,text),
  public.transition_parking_session(text,text), public.edit_parking_vehicle(text,text,jsonb,boolean),
  public.request_parking_payment(text,text), public.initialize_parking_slots(text),
  public.create_parking_zone(text,text,integer), public.delete_parking_zone(text), public.parking_report(text)
  to service_role;

commit;

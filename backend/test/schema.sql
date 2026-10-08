-- Representative schema for local regression tests, not a production bootstrap.
create role anon;
create role authenticated;
create role service_role;
create table profiles (
  id uuid primary key default gen_random_uuid(), name text, email text,
  role text default 'user', created_at timestamptz default now()
);
create table vehicles (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles,
  type text, brand text, model text, color text, plate text, months integer, image text
);
create table parking_zones (
  id uuid primary key default gen_random_uuid(), zone_name text, vehicle_type text,
  total_capacity integer, current_occupancy integer default 0, created_at timestamptz default now()
);
create table parking_slots (
  id uuid primary key default gen_random_uuid(), zone_id uuid references parking_zones,
  slot_name text, status text default 'empty', vehicle_id uuid references vehicles
);
create table parking_sessions (
  id uuid primary key default gen_random_uuid(), vehicle_id uuid references vehicles on delete cascade,
  status text, entry_time timestamptz default now(), exit_time timestamptz
);
create table pricing_configs (
  id uuid primary key default gen_random_uuid(), plan_type text, price numeric, created_at timestamptz default now()
);
create table transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles, amount numeric,
  plan_name text, status text check(status in ('pending', 'completed', 'refunded')), created_at timestamptz default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles,
  title text, message text, is_read boolean default false, created_at timestamptz default now()
);

-- Test fixture based on the user-provided columns, defaults and constraints.
-- Not a production bootstrap: auth.users is a minimal stub, and uuid_generate_v4
-- uses PostgreSQL's built-in random UUID generator instead of the uuid-ossp extension.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid());
create function public.uuid_generate_v4() returns uuid
  language sql volatile as 'select gen_random_uuid()';
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null, created_at timestamptz default now(),
  role text default 'customer', email text
);
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  type text, brand text, model text, color text, plate text unique,
  months integer, created_at timestamptz default now(), image text
);
create table parking_zones (
  id uuid primary key default gen_random_uuid(),
  zone_name text not null, vehicle_type text not null,
  total_capacity integer not null, current_occupancy integer default 0,
  created_at timestamptz not null default timezone('utc', now())
);
create table parking_slots (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid references parking_zones(id) on delete cascade,
  slot_name text not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  status text default 'empty' check(status in ('empty', 'rented', 'occupied')),
  created_at timestamptz not null default timezone('utc', now())
);
create table parking_sessions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  entry_time timestamptz not null default timezone('utc', now()),
  exit_time timestamptz, status text default 'active', spot_id text,
  created_at timestamptz not null default timezone('utc', now())
);
create table pricing_configs (
  id uuid primary key default gen_random_uuid(),
  plan_type text not null unique, price numeric not null,
  created_at timestamptz not null default timezone('utc', now())
);
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  amount numeric not null, plan_name text not null,
  payment_method text default 'VietQR', status text default 'completed',
  created_at timestamptz not null default timezone('utc', now())
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null, message text not null, is_read boolean default false,
  created_at timestamptz not null default timezone('utc', now())
);

-- Reproduce the supplied permissive policies; enable RLS and grant table access
-- here to verify that the migration closes direct access even in that setup.
alter table parking_slots enable row level security;
alter table transactions enable row level security;
grant all on parking_slots, transactions to anon, authenticated;
create policy "Allow public delete on parking_slots" on parking_slots for delete to public using(true);
create policy "Allow public insert on parking_slots" on parking_slots for insert to public with check(true);
create policy "Allow public select on parking_slots" on parking_slots for select to public using(true);
create policy "Allow public update on parking_slots" on parking_slots for update to public using(true);
create policy "Allow public insert on transactions" on transactions for insert to public with check(true);
create policy "Allow public select on transactions" on transactions for select to public using(true);

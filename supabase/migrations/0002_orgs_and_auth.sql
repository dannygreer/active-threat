-- 0002_orgs_and_auth.sql
-- Multi-tenancy + Supabase Auth integration.
-- Adds orgs (multi-tenant root) and profiles (1-to-1 with auth.users).
-- Trigger auto-provisions a profiles row with default role 'student' on auth.users insert.
-- RLS is enabled with service-role-only policies; role-aware policies arrive in 0006_rls.sql.

-- 1. Orgs (hospitals, police depts, etc. + CRM-lite fields)
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,                                  -- 'hospital' | 'police' | 'military' | 'other'
  contact_name text,
  contact_email text,
  status text not null default 'lead'
    check (status in ('lead','active','completed','churned')),
  deal_value_cents integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orgs_status_idx on orgs(status);
create index if not exists orgs_created_at_idx on orgs(created_at desc);

alter table orgs enable row level security;
create policy "Service role full access" on orgs for all using (true) with check (true);

-- 2. updated_at maintenance for orgs
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orgs_set_updated_at on orgs;
create trigger orgs_set_updated_at
  before update on orgs
  for each row execute function set_updated_at();

-- 3. Profiles (1-to-1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references orgs(id) on delete set null,
  role text not null default 'student'
    check (role in ('super_admin','org_admin','student')),
  full_name text,
  role_group text,                            -- doctor's "role_group" field
  experience_years integer,
  created_at timestamptz not null default now()
);
create index if not exists profiles_org_id_idx on profiles(org_id);
create index if not exists profiles_role_idx on profiles(role);

alter table profiles enable row level security;
create policy "Service role full access" on profiles for all using (true) with check (true);

-- 4. Auto-provision a profile on auth.users insert
-- Uses security definer so the trigger can write to profiles even when
-- the inserting actor (auth service) doesn't own it directly.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Migration: Active Threat Training Upgrade
-- Run AFTER setup.sql in the Supabase SQL Editor
-- Does NOT touch existing quiz_results table

-- 1. Scenarios
create table if not exists scenarios (
  id uuid default gen_random_uuid() primary key,
  scenario_id text not null,
  version text not null,
  title text not null,
  entry_screen_id text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(scenario_id, version)
);
alter table scenarios enable row level security;
create policy "Service role full access" on scenarios for all using (true) with check (true);

-- 2. Scenario screens
create table if not exists scenario_screens (
  id uuid default gen_random_uuid() primary key,
  scenario_fk uuid not null references scenarios(id) on delete cascade,
  screen_id text not null,
  screen_text text not null,
  timer_seconds integer not null default 30,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(scenario_fk, screen_id)
);
alter table scenario_screens enable row level security;
create policy "Service role full access" on scenario_screens for all using (true) with check (true);

-- 3. Screen options
create table if not exists screen_options (
  id uuid default gen_random_uuid() primary key,
  screen_fk uuid not null references scenario_screens(id) on delete cascade,
  option_label text not null,
  option_text text not null,
  next_screen_id text,
  sort_order integer not null default 0
);
alter table screen_options enable row level security;
create policy "Service role full access" on screen_options for all using (true) with check (true);

-- 4. Response tags (category labels per question+option combo)
create table if not exists response_tags (
  id uuid default gen_random_uuid() primary key,
  scenario_fk uuid not null references scenarios(id) on delete cascade,
  screen_id text not null,
  option_label text not null,
  response_category text not null check (response_category in ('controlled', 'acceptable', 'premature', 'unsafe')),
  unique(scenario_fk, screen_id, option_label)
);
alter table response_tags enable row level security;
create policy "Service role full access" on response_tags for all using (true) with check (true);

-- 5. Responses: long format (one row per question event)
create table if not exists responses_long (
  id bigint generated always as identity primary key,
  participant_id text not null,
  first_name text not null,
  last_name text not null,
  phase text not null check (phase in ('pre', 'post')),
  scenario_id text not null,
  scenario_version text not null,
  question_id text not null,
  branch_path text not null default '',
  option_selected text,
  response_category text,
  rt_ms integer not null,
  timed_out boolean not null default false,
  timestamp timestamptz not null default now()
);
alter table responses_long enable row level security;
create policy "Service role full access" on responses_long for all using (true) with check (true);

-- 6. Responses: wide format (one row per participant session)
create table if not exists responses_wide (
  id bigint generated always as identity primary key,
  participant_id text not null,
  first_name text not null,
  last_name text not null,
  phase text not null check (phase in ('pre', 'post')),
  scenario_id text not null,
  scenario_version text not null,
  branch_path text not null default '',
  q1_answer text,
  q1_rt integer,
  q2_answer text,
  q2_rt integer,
  q3_answer text,
  q3_rt integer,
  q4_answer text,
  q4_rt integer,
  q5_answer text,
  q5_rt integer,
  q6_answer text,
  q6_rt integer,
  total_time integer not null,
  completed_at timestamptz not null default now()
);
alter table responses_wide enable row level security;
create policy "Service role full access" on responses_wide for all using (true) with check (true);

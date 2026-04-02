-- Create the quiz_results table for the Active Threat Training app
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

create table if not exists quiz_results (
  id bigint generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  answer_1 int not null,
  answer_2 int not null,
  answer_3 int not null,
  time_1_ms int not null,
  time_2_ms int not null,
  time_3_ms int not null,
  total_time_ms int not null,
  completed_at timestamptz not null default now()
);

-- Disable RLS so the service role key can read/write freely
alter table quiz_results enable row level security;

-- Allow full access for the service_role (used server-side)
create policy "Service role full access"
  on quiz_results
  for all
  using (true)
  with check (true);

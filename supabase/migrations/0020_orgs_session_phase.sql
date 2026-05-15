-- 0020_orgs_session_phase.sql
-- Live-session phase gate. The session moderator bumps this from the
-- org detail page ("Session Day" card); a student's landing only
-- enables phases <= session_phase. 1 = only Phase 1 open, 2 =
-- Phases 1-2, 3 = all three. Moderator-controlled only (no auto
-- completion gating on the student side).

alter table public.orgs
  add column if not exists session_phase smallint not null default 1
  check (session_phase between 1 and 3);

comment on column public.orgs.session_phase is
  'Max student-landing phase the moderator has unlocked for this org (1-3). Drives /app phase availability; moderator-controlled only.';

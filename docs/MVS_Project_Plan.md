# Mental Velocity System (MVS) — Technical Project Plan

**Client:** Dr. Kevin Scully, Human Performance Risk Control Infrastructure™
**Owner/Builder:** Danny Greer (Claude Code, autonomous mode)
**Domain:** mentalvelocitysystem.com (already purchased — DNS hookup pending)
**Stack:** Next.js 16 + React 19 + Tailwind 4 + Supabase + Vercel + Resend
**Target:** First live cohort in **~14 days**
**Plan date:** May 8, 2026

---

## 0. Executive Summary

The repo `dannygreer/mvs` already has a working "Active Threat" assessment built. It's much closer to the doctrine than the doctor's docs implied. Going forward, this is an **expansion**, not a rebuild. The existing assessment runner (`src/components/quiz/`) is doctrine-correct: client-side reaction time capture, event-per-decision logging, branching, timer, timeout handling, branch-path reconstruction. We reuse it.

The expansion adds:
1. **Multi-tenancy** — orgs (hospitals, police depts, etc.) with a roster of students each.
2. **Real auth** — Supabase Auth (magic link) with three roles, replacing the custom username/password admin.
3. **A second assessment type** — the 50-question multi-choice Test Bank from the doctor's docs.
4. **Enrollment + delivery** — assigning a pre/post pair to a student, tracking completion.
5. **Email automation** — invites + reminders via Resend.
6. **Org admin role** — a hospital/PD contact can see only their org's roster.
7. **Marketing landing page** — public site at mentalvelocitysystem.com.
8. **CRM-lite** — pipeline status + revenue fields on `orgs`.

Out of scope for v1 (Phase 2 backlog): video scenarios (you're doing those separately), full CRM (kanban + activity log), in-app payments (invoice off-platform), instructor day-of dashboard, advanced analytics, org admin self-serve sign-up.

---

## 1. What's already built (and doctrine-aligned)

| Component | Location | Status |
|---|---|---|
| Scenario data model (branching, timers) | `supabase/migration.sql` | ✓ doctrine-aligned |
| `responses_long` (event per decision) | `supabase/migration.sql` | ✓ doctrine-aligned |
| `responses_wide` (per-session row) | `supabase/migration.sql` | ✓ doctrine-aligned |
| `response_tags` taxonomy (`controlled \| acceptable \| premature \| unsafe`) | `supabase/migration.sql` | ✓ already populated, see `ResponseTaggingTab` |
| Active-threat scenario seed (4 branches → convergence → final pressure) | `supabase/seed.sql` | ✓ ready |
| Assessment runner (Read → Continue → Answer → next) | `src/components/quiz/Quiz.tsx` + `ScenarioScreen.tsx` | ✓ client-side RT, branching, timeout handling |
| Admin: scenarios, responses, tagging, summary | `src/components/admin/*` | ✓ functional |
| CSV export | `src/app/api/admin/export-csv/` | ✓ functional |
| Custom admin auth (username/password) | `src/lib/session.ts`, `src/actions/auth.ts` | ⚠ to be replaced by Supabase Auth |
| Vercel deploy linked to repo | `.vercel/project.json` | ✓ auto-deploys main |
| Custom domain | mentalvelocitysystem.com | ⚠ purchased, not yet wired to Vercel |

**One small doctrine note** for the autonomous agent to address during the refactor: the assessment screen shows `Step {N}` text. Strictly per the doctrine, that's a mild progress signal. Discuss with the doctor whether to keep, hide, or replace with non-numeric framing.

---

## 2. What needs to be built

### 2.1 Database additions (additive migrations only — don't touch existing files)

```sql
-- 0002_orgs_and_auth.sql
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,                            -- 'hospital' | 'police' | 'military' | 'other'
  contact_name text, contact_email text,
  status text default 'lead',           -- 'lead' | 'active' | 'completed' | 'churned'
  deal_value_cents int,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  org_id uuid references orgs on delete set null,
  role text not null check (role in ('super_admin','org_admin','student')),
  full_name text,
  role_group text,                      -- the doctor's "role_group" field
  experience_years int,
  created_at timestamptz default now()
);

-- 0003_assessments_and_enrollments.sql
create table assessments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- 'active_threat_v1', 'mvs_test_bank_v1', 'mvs_scenarios_v1'
  name text not null,
  kind text not null check (kind in ('scenario','multi_choice')),
  scenario_fk uuid references scenarios,  -- null when kind='multi_choice'
  is_active bool default true,
  created_at timestamptz default now()
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles on delete cascade,
  assessment_id uuid references assessments on delete restrict,
  phase text not null check (phase in ('pre','post','practice')),
  assigned_at timestamptz default now(),
  due_at timestamptz,
  invited_email_sent_at timestamptz,
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  unique(student_id, assessment_id, phase)
);

-- 0004_multi_choice_test.sql (for the 50-question Test Bank)
create table mc_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments on delete cascade,
  sequence int not null,
  prompt text not null,
  time_limit_seconds int,
  unique(assessment_id, sequence)
);

create table mc_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references mc_questions on delete cascade,
  label text not null,                  -- 'A','B','C','D'
  text text not null,
  is_correct bool,                      -- [NEEDS_DOCTOR] for many rows
  response_category text,
  unique(question_id, label)
);

-- 0005_link_responses_to_enrollments.sql
alter table responses_long add column enrollment_id uuid references enrollments;
alter table responses_wide add column enrollment_id uuid references enrollments;
alter table responses_long add column student_id uuid references profiles;
alter table responses_wide add column student_id uuid references profiles;
-- legacy participant_id (string) stays for backward compat with existing rows.
-- new submissions populate both.

-- 0006_rls.sql
-- Enable RLS already enabled on all existing tables, but current policies are 
-- "service role full access". Replace with role-aware policies.
-- super_admin: select/insert/update/delete on everything (via app server using 
--   service role, OR via policies that check profiles.role).
-- org_admin: select rows where org_id = (select org_id from profiles where id = auth.uid()).
-- student: select/insert their own profile, enrollments, sessions, responses.
```

The existing `quiz_results` table is a prototype artifact and stays untouched. Don't migrate from it. It's not driving anything in the LMS.

### 2.2 Code additions

**Auth migration** (~1 day):
- Add Supabase Auth dependency (`@supabase/ssr`).
- Create `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` per the SSR pattern for Next 16.
- Replace `src/lib/session.ts` and `src/actions/auth.ts` with Supabase Auth.
- Update `src/app/mvs/admin/login/page.tsx` to be a magic-link login.
- Add middleware that redirects by role.
- Provision the doctor + Danny as `super_admin` via SQL (manual `update profiles set role = 'super_admin' where id = ...`).

**Multi-org admin** (~1 day):
- New page: `/mvs/admin/orgs` (list, create, edit).
- New page: `/mvs/admin/orgs/[id]` (detail, roster, CRM fields).
- Existing admin tabs filter by org.
- Bulk-invite students (CSV paste or one-at-a-time) → creates `profiles` row, sends Supabase Auth magic link.

**Org admin portal** (~0.5 day):
- New route group: `/org/*`.
- Dashboard shows their org only. Read-only roster + aggregate scores.

**Student portal** (~0.5 day):
- New route group: `/app/*`.
- Lists assigned enrollments. "Take pre-assessment" / "Take post-assessment" buttons launch the existing Quiz component, scoped to the assessment_id from the enrollment.
- Hand off `enrollment_id` and `student_id` so the response_events get linked properly.

**Multi-choice runner** (~1 day):
- New component `src/components/quiz/McRunner.tsx` mirroring the doctrine pattern from the existing `AnswerScreen`: client-side RT, single-question-per-screen, no back button. One row per answer in `responses_long`.
- Reuse `responses_long` schema. The 50-question Test Bank shows up as `assessment.kind = 'multi_choice'` with no `scenario_fk`.

**Email automation** (~0.5 day):
- Resend SDK + React Email templates.
- Triggers on: enrollment created (invite), 3 days before due (pre-reminder), training day +1 (post-invite), 3 days after post-invite (post-reminder).
- Use Vercel Cron for the reminder ticks.
- Track `invited_email_sent_at` and `reminder_sent_at` on `enrollments`.

**Marketing landing page** (~0.5 day):
- Replace the existing `src/app/page.tsx` (currently the quiz title screen) with a marketing landing page. Move the quiz title to `/take/[scenario_code]` or similar.
- Hero, what is MVS, who it's for, the doctor, contact form (form posts to a `leads` table; super admin sees inbound leads in `/mvs/admin/leads`).
- Wire `mentalvelocitysystem.com` to the Vercel project and set as production domain.

**CRM-lite** (~0.5 day):
- The fields are already on `orgs` (status, deal_value_cents, notes). Just expose in admin UI with status dropdown, currency input, notes textarea.

### 2.3 Open items the doctor still needs to provide

These move to `docs/needs_doctor.md`. The biggest two block accurate analytics:

1. **50-question Test Bank answer key** — for every question, mark the correct option (A/B/C/D).
2. **`response_category` for the 50-question test** — the existing taxonomy (`controlled | acceptable | premature | unsafe`) was authored for scenarios. Confirm whether the same taxonomy applies to the test bank or define a different one.
3. **25 scenarios from `Scenario_Bank_Doctrine_Locked.docx`** — these are scenario *prompts* but missing the multiple-choice options for each of the 4 standardized questions, the correct option, and the branching transitions if any. (You're handling videos separately, so the scenarios can ship as text-first like the active-threat one already does.)
4. **Time limits** per question/screen for the new content.
5. **Brand assets** — logo, colors, font, trademark usage rules.
6. **First cohort details** — org, roster, training date, pre/post windows.
7. **Marketing copy** — confirm tone + final wording for the public landing page.

---

## 3. Architecture decisions already locked

- **Auth**: Supabase Auth (magic link) + RLS. Migrating off custom username/password admin.
- **Multi-tenancy**: enforced at the DB layer via RLS, not in app code.
- **Commerce**: invoice off-platform. Admin tracks revenue manually as a CRM field.
- **Roles**: `super_admin`, `org_admin`, `student`. No instructor role for v1.
- **Videos**: out of scope. Scenario type ships text-first.
- **Branching**: schema supports it (it already does); UI ships linear for new scenarios until the doctor provides transitions.

---

## 4. Sprint plan

Roughly two weeks of calendar time, autonomous Claude Code sessions of 2-3 hours each. Adjust as you go.

### Day 1: Auth refactor part 1 — wire Supabase Auth
- Add `@supabase/ssr`. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` (HUMAN must grab from Supabase dashboard).
- Create `src/lib/supabase/server.ts` + `src/lib/supabase/client.ts`.
- Add `0002_orgs_and_auth.sql` migration. Apply via Supabase CLI.
- Build `/auth/login` (magic link). New unified login replaces the custom one — old `/mvs/admin/login` redirects.
- Middleware: redirect by role.
- Manually seed Danny + the doctor as `super_admin` after they sign in once.

**Acceptance:** can sign in via magic link, role-based redirect works, `/mvs/admin` only accessible to `super_admin`.

### Day 2: Auth refactor part 2 — RLS + tenant isolation
- Add `0006_rls.sql` migration with policies for all three roles on every existing table.
- Verify all existing admin functionality still works (super_admin uses service role for now, OR uses authenticated client with super_admin policy — pick one).
- Write RLS verification tests (impersonate each role, confirm only-allowed rows are visible).
- **Verify with subagent.** Tenant-leak audit.

**Acceptance:** RLS enforced everywhere. Tests green. No `select *` policies that would leak across orgs.

### Day 3: Orgs + bulk student invite
- `0003_assessments_and_enrollments.sql` migration.
- Backfill: create one default org for the active-threat existing data; assign existing responses to it (or leave them unassigned with a note).
- Admin UI: `/mvs/admin/orgs` list + create. Org detail page with roster + CRM-lite fields.
- Bulk-invite students (paste `name,email`, one per line). Creates profile + sends magic-link invite via Supabase Auth.

**Acceptance:** super_admin can create an org, invite 10 students, the students arrive via magic link.

### Day 4: Student portal
- Route group `(student)` → `/app/*`.
- `/app` lists `enrollments` for the logged-in student.
- "Start" button launches the existing `Quiz` component with the scenario from the enrollment's assessment.
- On completion, mark `enrollments.completed_at`. Link `responses_long` + `responses_wide` rows to `enrollment_id` and `student_id`.

**Acceptance:** student logs in, sees their enrollments, takes the pre-assessment, response data ties back to enrollment + student.

### Day 5: Multi-choice runner
- Build `src/components/quiz/McRunner.tsx`. Same RT/event pattern as existing `AnswerScreen`.
- Add `0004_multi_choice_test.sql` migration.
- Seed the 50-question Test Bank into `mc_questions` + `mc_options`. Use `[NEEDS_DOCTOR]` for `is_correct` until doctor delivers answer key.
- Update student portal to launch `McRunner` for `assessment.kind = 'multi_choice'`.
- Update admin response views to handle multi-choice rows (already in `responses_long`, just needs different UI grouping).

**Acceptance:** student can take the 50-question test, every answer is one row in `responses_long` with a valid RT.

### Day 6: Org admin portal
- Route group `(org)` → `/org/*`.
- Read-only roster + aggregate scores for their org only.
- RLS guarantees isolation.

**Acceptance:** invited org admin can see only their org. Cross-org access blocked at DB level.

### Day 7: Email automation (Resend)
- Install Resend + React Email.
- Templates: invite, pre-reminder, post-invite, post-reminder.
- Trigger invite on enrollment create.
- Vercel Cron route that runs daily, sends reminders for due-soon enrollments.
- Track timestamps on `enrollments`.

**Acceptance:** create an enrollment → invite arrives within 60s. Cron sends a reminder N days before due.

### Day 8: Marketing landing page + domain
- Move existing quiz title screen from `/` to a new route (e.g., `/take/[scenario_code]`).
- New `/` is the marketing page: hero, what is MVS, who it's for, the doctor, contact form.
- Contact form posts to `leads` table; admin view at `/mvs/admin/leads`.
- Wire `mentalvelocitysystem.com` to Vercel: add domain in Vercel dashboard, update DNS at the registrar (this is a HUMAN step — log to needs_human.md if blocked).

**Acceptance:** mentalvelocitysystem.com resolves to the Vercel deploy. Lighthouse 90+. Contact form lands a row.

### Day 9: 25 scenarios + scenario seeding
- IF the doctor has provided the scenario options/answers for the 25 from `Scenario_Bank_Doctrine_Locked.docx`: seed them into `scenarios` + `scenario_screens` + `screen_options`. Each scenario probably has 4 standardized question screens (the four doctrine questions).
- IF NOT: skip this day. Log to needs_doctor as critical-path-blocked. The runner is built, content is just missing.

**Acceptance:** 25 scenarios appear as separate assessments and are runnable.

### Day 10: First cohort prep
- Create the actual first org. Bulk-invite the actual roster.
- Create pre-assessment enrollments for everyone.
- Manual QA: full pre flow on a real device, real email, real student account.
- Set up Sentry (free tier) for error monitoring.
- Write a one-page runbook for the doctor: "How to invite a new org," "How to download scores," "Who to email when something breaks."

**Acceptance:** real students can take the pre-assessment.

### Days 11-14: Buffer + polish
- Whatever rolled. Bugs. UX rough edges. Doctor feedback.
- Post-cohort: post-assessment enrollment + invite for the cohort after the in-person training.

---

## 5. Phase 2 backlog (post-cohort)

1. Live video scenario player when videos arrive.
2. Full CRM kanban + activity log.
3. Org admin self-serve invite within seat caps.
4. Advanced analytics: latency trends, cohort comparison, drift detection.
5. Instructor day-of dashboard.
6. Stripe Invoice integration if volume justifies.
7. Marketing site expansion: blog, case studies, SEO.

---

## 6. Acceptance criteria for "ready for first cohort"

- [ ] `mentalvelocitysystem.com` resolves to the Vercel deploy with TLS.
- [ ] Magic-link login works for all three roles.
- [ ] A new org can be created in admin in <60 seconds.
- [ ] Students can be invited in bulk and arrive via magic link.
- [ ] A student receives the invite email and completes the pre-assessment without instructor help.
- [ ] `responses_long` rows are written one-per-decision with millisecond reaction times.
- [ ] The validation reconstruction test passes (path replay with timing).
- [ ] CSV export delivers wide + long formats, filterable by org/date/phase.
- [ ] Reminder email fires N days before in-person training.
- [ ] Post-assessment can be assigned and completed independently.
- [ ] Doctor can answer "did this student improve?" from the admin UI in two clicks.

---

## 7. The hard truth about 14 days

It's achievable because so much is already built. The risk is no longer "will it ship" — it's "is the content accurate." The biggest single thing that determines whether the first cohort produces meaningful data is **whether the doctor delivers the test answer key and scenario answers**. Push him.

The auth refactor (Days 1-2) is the only piece with real risk of breaking existing functionality. Take care: feature branch, RLS verification tests, subagent review, manual smoke test of the existing `/mvs/admin` after the cutover. If anything goes wrong, the existing prod is one revert away.

Everything else is execution. The hardest engineering problem (doctrine-correct event-based decision capture) is already solved.

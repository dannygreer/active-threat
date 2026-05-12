# Day 12 Prompt — Super-admin dashboard

Paste this into Claude Code (cwd = repo root). ~2.5 hour focused session.

The super-admin landing at `/mvs/admin` currently has no dashboard. Today we build one — both for Danny's operational visibility AND for the doctor's external pitch deck. The dashboard becomes the new default view at `/mvs/admin`; existing tabs (Responses, Scenario Builder, Response Tagging) move to dedicated routes underneath.

Read these in order before any code:
1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/phase1_freeze.md` — the 8 event markers we're surfacing
4. `worklog.md`
5. `supabase/migrations/` — all prior migrations, especially the marker JSONB columns and the `enrollment_scores` view from Day 6

You are running with `--dangerously-skip-permissions`. Plan to work autonomously for **~2.5 hours**.

## Branch
Branch from `main` as `feat/admin-dashboard`.

## Audiences served (informs prioritization)

- **Audience 1 — Danny:** is the platform working, who's stuck, what's broken
- **Audience 2 — Dr. Scully:** does the training measurably change behavior (this is the pitch deck)
- **Audience 3 — Org admin (future):** was the spend worth it

The doctor doesn't know what charts he wants. I'm picking what I think is the strongest set; he'll react to the actual rendered view.

## Scope today

Four dashboard sections + supporting SQL views + Recharts integration.

### Section A — Volume & Activity (Audience 1)
- 4 stat tiles: total orgs, total students, total completed sessions, in-flight sessions
- Test-completion table: rows by assessment + phase, columns: enrolled / completed / completion rate
- Recent activity feed: last 10 enrollments OR completions (mixed, time-sorted)

### Section B — Training Effectiveness (Audience 2 — THE doctor's pitch)
- **Active-Threat Pre→Post path divergence:** for students with both pre and post completions, % who took a different branch path. Big number + supporting chart.
- **First-decision RT delta (Active-Threat):** average RT on the first question, pre vs post, bar chart. Positive delta = more deliberation = doctrinally good.
- **Event-marker reduction:** bar chart, 8 markers, pre vs post counts (or per-student averages). This is the doctor's strongest single chart. Depends on doctor having populated `screen_options.triggers_markers` and `mc_options.triggers_markers` via admin UI — if all markers are empty, the chart will show all zeros. Render anyway with a small note: *"awaiting marker tagging — see needs_doctor.md"*.

### Section C — Certification (Audience 2 + 3)
- 50-Q exam pass rate (% of completed exams with score >= 80%)
- Score distribution histogram (buckets: <70, 70-79, 80-89, 90-100)
- Performance-tier breakdown (using the doctor's rubric tiers)

### Section D — Operational Health (Audience 1)
- Average time from invite to completion (latency metric)
- Abandonment rate (% started but not completed)
- Sentry error count (last 7 days — pull via Sentry API if env var present; else show "configure Sentry" placeholder)

## Phase A — Foundation check (~10 min)

1. `git checkout main && git pull`. `git checkout -b feat/admin-dashboard`.
2. `npm install` → `npm run build`.
3. `ls supabase/migrations/` — confirm next migration number.
4. Check what `/mvs/admin` currently renders (`src/app/mvs/admin/page.tsx`). The existing landing probably defaults to the Responses tab or shows a tab strip; **we're replacing this default with the new dashboard**. Existing tab content (Scenario Builder, Response Tagging, Responses table) moves to dedicated routes like `/mvs/admin/scenarios`, `/mvs/admin/responses`, etc.
5. Install Recharts: `npm install recharts`. Check it works with React 19 — should be fine on recent versions (≥2.13). If incompatible, fall back to inline SVG charts.

## Phase B — SQL views for aggregation (~30 min)

Create `supabase/migrations/00NN_dashboard_views.sql` (use next available number):

```sql
-- 00NN_dashboard_views.sql
-- Read-only views that aggregate data for the super-admin dashboard.
-- All views inherit RLS from underlying tables; only super_admin queries
-- against them produce non-empty results.

-- 1. Volume tiles
create or replace view dashboard_volume as
select
  (select count(*) from orgs) as total_orgs,
  (select count(*) from profiles where role = 'student') as total_students,
  (select count(*) from sessions where completion_status = 'completed') as total_completed_sessions,
  (select count(*) from sessions where completion_status = 'in_progress') as in_flight_sessions;

-- 2. Test completion by assessment + phase
create or replace view dashboard_completion_by_assessment as
select
  a.code as assessment_code,
  a.name as assessment_name,
  a.kind as assessment_kind,
  e.phase,
  count(*) as enrolled,
  count(e.completed_at) as completed,
  case when count(*) > 0
       then round(100.0 * count(e.completed_at) / count(*), 1)
       else 0 end as completion_pct
from assessments a
join enrollments e on e.assessment_id = a.id
group by a.code, a.name, a.kind, e.phase
order by a.code, e.phase;

-- 3. Active-Threat pre/post pairs (only students with BOTH)
create or replace view dashboard_active_threat_pairs as
with pairs as (
  select
    e.student_id,
    max(case when e.phase = 'pre'  then e.id end) as pre_enrollment_id,
    max(case when e.phase = 'post' then e.id end) as post_enrollment_id
  from enrollments e
  join assessments a on a.id = e.assessment_id
 where a.code = 'active_threat_v1'
   and e.completed_at is not null
 group by e.student_id
 having count(distinct e.phase) = 2
)
select
  p.student_id,
  p.pre_enrollment_id,
  p.post_enrollment_id,
  pre_es.avg_rt_ms as pre_avg_rt,
  post_es.avg_rt_ms as post_avg_rt,
  pre_w.branch_path as pre_branch,
  post_w.branch_path as post_branch,
  (pre_w.branch_path is distinct from post_w.branch_path) as path_diverged,
  -- First-response RT specifically (sequence_number = 1)
  (select rt_ms from responses_long where enrollment_id = p.pre_enrollment_id  and sequence_number = 1 limit 1) as pre_first_rt,
  (select rt_ms from responses_long where enrollment_id = p.post_enrollment_id and sequence_number = 1 limit 1) as post_first_rt
from pairs p
join enrollment_scores pre_es  on pre_es.enrollment_id  = p.pre_enrollment_id
join enrollment_scores post_es on post_es.enrollment_id = p.post_enrollment_id
left join responses_wide pre_w  on pre_w.enrollment_id  = p.pre_enrollment_id
left join responses_wide post_w on post_w.enrollment_id = p.post_enrollment_id;

-- 4. Event-marker aggregates by phase
-- For each of the 8 markers, count events flagged true, grouped by enrollment phase.
create or replace view dashboard_marker_aggregates as
with marker_keys as (
  select unnest(array[
    'escalation','narrowing','premature_commitment','sequencing_break',
    'drift','intervention','recovery','governance_instability'
  ]) as marker
)
select
  m.marker,
  e.phase,
  count(*) filter (where (rl.event_markers ->> m.marker) = 'true') as fired_count,
  count(*) as total_events,
  case when count(*) > 0
       then round(100.0 * count(*) filter (where (rl.event_markers ->> m.marker) = 'true') / count(*), 2)
       else 0 end as fire_rate_pct
from marker_keys m
cross join responses_long rl
join enrollments e on e.id = rl.enrollment_id
where rl.event_markers is not null
group by m.marker, e.phase
order by m.marker, e.phase;

-- 5. 50-Q exam certification stats
create or replace view dashboard_exam_certification as
select
  es.enrollment_id,
  es.score_percent,
  es.pass,
  case
    when es.score_percent is null then 'incomplete'
    when es.score_percent >= 90 then 'high'
    when es.score_percent >= 80 then 'certified'
    when es.score_percent >= 70 then 'borderline'
    else 'not_certified'
  end as tier
from enrollment_scores es
join assessments a on a.id = es.assessment_id
where a.code = 'mvs_test_bank_v1'
  and es.completed_at is not null;

-- 6. Operational health
create or replace view dashboard_operational as
select
  -- Avg invite→completion latency
  (select round(avg(extract(epoch from (completed_at - invited_email_sent_at)) / 3600.0)::numeric, 1)
     from enrollments
    where invited_email_sent_at is not null and completed_at is not null) as avg_invite_to_completion_hours,
  -- Abandonment: started (has any responses_long) but not completed, older than 7 days
  (select count(distinct rl.enrollment_id)
     from responses_long rl
     join enrollments e on e.id = rl.enrollment_id
    where e.completed_at is null
      and e.invited_email_sent_at < now() - interval '7 days') as abandoned_count,
  (select count(*) from enrollments where completed_at is null and invited_email_sent_at is not null) as total_invited_incomplete;
```

Apply via `npx supabase db push`. Verify each view returns rows:
```sql
select * from dashboard_volume;
select * from dashboard_completion_by_assessment;
select count(*) from dashboard_active_threat_pairs;
select * from dashboard_marker_aggregates limit 16;
select tier, count(*) from dashboard_exam_certification group by tier;
select * from dashboard_operational;
```

## Phase C — Dashboard page (~90 min)

### C.1 Restructure routes

The existing tabs at `/mvs/admin` (Responses, ScenarioBuilder, ResponseTagging) move to dedicated routes:
- `/mvs/admin/responses` — existing ResponsesTab
- `/mvs/admin/scenarios` — existing ScenarioBuilderTab
- `/mvs/admin/tagging` — existing ResponseTaggingTab

`/mvs/admin` (root) becomes the new dashboard.

Top nav (existing buttons): Dashboard | Responses | Scenarios | Tagging | Orgs | Leads | CSV (Wide) | CSV (Long) | Logout

### C.2 Build the dashboard component

`src/app/mvs/admin/page.tsx` — Server Component. Server-fetches all six view rows in parallel:

```tsx
import { requireSuperAdmin } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  await requireSuperAdmin();
  const sb = createServiceRoleClient();

  const [volume, completion, atPairs, markers, certification, operational] = await Promise.all([
    sb.from('dashboard_volume').select('*').single(),
    sb.from('dashboard_completion_by_assessment').select('*'),
    sb.from('dashboard_active_threat_pairs').select('*'),
    sb.from('dashboard_marker_aggregates').select('*'),
    sb.from('dashboard_exam_certification').select('*'),
    sb.from('dashboard_operational').select('*').single(),
  ]);

  return (
    <DashboardClient
      volume={volume.data}
      completion={completion.data ?? []}
      activeThreatPairs={atPairs.data ?? []}
      markers={markers.data ?? []}
      certification={certification.data ?? []}
      operational={operational.data}
    />
  );
}
```

`DashboardClient` is a Client Component that renders the four sections with Recharts.

### C.3 Section A — Volume & Activity
- 4 stat tiles in a grid. Cyan accent, dark cards, big numbers (consistent with the operator aesthetic).
- Test completion table (rows: assessment × phase; columns: enrolled / completed / %)
- Recent activity feed — query separately, last 10 events

### C.4 Section B — Training Effectiveness (the pitch deck)

**Path divergence card:** big stat "X% of students took a different decision path post-training" — computed from `dashboard_active_threat_pairs` where `path_diverged = true`. Helper text: "Same scenario, different decisions = changed decision profile."

**First-RT delta:** Recharts BarChart, two bars (pre / post), values = average `first_rt` from pairs. Tooltip explains "higher = more deliberation = good per doctrine."

**Marker reduction chart:** Recharts grouped BarChart, 8 marker categories on x-axis, two bars per category (pre / post fire rate %). Color: pre = neutral gray, post = cyan if reduced, red if increased. Sort by absolute change. This is THE pitch chart — make it look good.

**Empty-state handling:** if `dashboard_marker_aggregates` returns all zeros (because doctor hasn't tagged options yet), render the chart container with a clear empty-state message: *"Markers will populate as Dr. Scully tags option-marker associations in the Scenario Builder. See needs_doctor.md."*

### C.5 Section C — Certification
- Pass rate big stat: % of `dashboard_exam_certification` where `pass = true`
- Score distribution histogram (Recharts BarChart, x = score buckets, y = student count)
- Tier breakdown (Recharts PieChart or stacked bar: high / certified / borderline / not_certified)

### C.6 Section D — Operational Health
- Avg invite→completion latency (stat tile, in hours)
- Abandonment count (stat tile)
- Sentry errors last 7 days: if `SENTRY_AUTH_TOKEN` env var is set, fetch from Sentry API; else "Configure Sentry to see error trends"

### C.7 Doctor's pitch-deck mode
At the bottom of the dashboard, add a small subtle link: **"Print pitch deck view"** that opens a print-optimized stripped layout showing only the 4 effectiveness charts (Path Divergence, First-RT Delta, Marker Reduction, Certification Pass Rate) in a 2×2 grid optimized for screenshot. This is the doctor's "show clients" view.

## Phase D — Subagent + verification (~20 min)

Subagent brief:

> Independently review the admin dashboard on branch `feat/admin-dashboard`. Specifically:
> 1. Does the dashboard correctly require `super_admin` role? Verify a non-super-admin auth path returns 403 / redirect.
> 2. Do the 6 SQL views inherit RLS correctly? Try querying them as an authenticated org_admin or student via supabase-js — should return 0 rows.
> 3. Are the views performant on cohort-scale data (estimate 500 students × 8 enrollments × 50 events = 200K rows in responses_long)? Run EXPLAIN on each view's underlying queries; flag any seq-scans on large tables.
> 4. Does the marker-reduction chart correctly compute fire rate as `count_fired / total_events`, NOT `count_fired / count_students`? (The former is the right doctrine metric — per-event probability of a marker firing.)
> 5. Does the empty-state for markers render cleanly when the data is all zeros?
> 6. Print pitch deck view — does it strip operational chrome and show only the 4 effectiveness charts cleanly?
> 7. Are PII fields kept off the dashboard? Don't display student names, emails, or session IDs at aggregate level.
> Report findings with file:line references.

## Phase E — Stop cleanly (~10 min)

1. Append `worklog.md`: what shipped, view-query performance notes, subagent findings.
2. Update `docs/needs_doctor.md`: dashboard built; marker reduction chart awaits his marker-tagging work to populate fully (already in #2b/2c — reinforce that the dashboard is the visible payoff for that work).
3. `npm run build` — must pass.
4. Commit: `feat: super-admin dashboard with effectiveness metrics`.
5. Push.
6. Print chat summary: dashboard live, 4 charts ready for doctor to react to, what's empty until doctor tags markers.

## Day 12 acceptance criteria
- `/mvs/admin` renders the dashboard as default landing for super_admin
- Existing tabs (Responses, Scenarios, Tagging) moved to dedicated routes; nav updated
- 6 SQL views applied; performance acceptable on test data
- 4 sections render: Volume, Effectiveness, Certification, Operational
- Recharts installed and rendering correctly with React 19
- Marker-reduction chart renders even with all-zero data (empty-state messaging)
- Print pitch-deck view available at a small subtle link
- Subagent findings addressed
- `npm run build` passes; branch pushed

## Things to watch
- **Recharts + React 19 compatibility.** Verify on Recharts ≥2.13 (latest as of May 2026 should be fine). If broken, fall back to inline SVG; don't introduce a different chart library mid-build.
- **View performance at cohort scale.** With 500 students completing 8 enrollments each, `responses_long` has ~200K rows. The marker aggregation cross-joins 8 marker keys × 200K rows = 1.6M operations. Should still be sub-second with the existing indexes from Phase 1 Freeze (expression indexes on the 8 marker keys) but worth verifying via EXPLAIN.
- **RLS on views.** Postgres views inherit the RLS of the underlying tables BUT also need an explicit grant if the view uses tables across schemas. All these views use only `public` schema tables and rely on existing RLS; verify no super_admin policy gap exists.
- **Don't display PII on aggregates.** Student names, emails, session IDs at aggregate level can lead to identifying individuals in small orgs. Aggregate stats only; drill-downs for individual data live in existing per-student admin views.
- **Empty-state design matters.** The marker reduction chart will be empty until the doctor tags option-markers. Render it gracefully — not a broken-looking chart. The empty state IS a feature: it shows him what's at stake by not doing the tagging work.

Go.

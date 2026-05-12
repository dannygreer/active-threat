-- 0015_dashboard_views.sql
-- Read-only views aggregating data for the super-admin dashboard.
--
-- Doctrine notes:
-- - The prompt referenced a `sessions` table that doesn't exist in this
--   schema; we substitute enrollments (one enrollment ≈ one session).
-- - The prompt referenced responses_long.sequence_number which doesn't
--   exist either. We derive "first decision" via ORDER BY timestamp.
-- - All views get security_invoker = true so RLS on the underlying
--   tables flows through (mirrors the pattern from 0010_enrollment_scores_view).

-- 1. Volume tiles ------------------------------------------------------
create or replace view dashboard_volume as
select
  (select count(*) from orgs) as total_orgs,
  (select count(*) from profiles where role = 'student') as total_students,
  (select count(*) from enrollments where completed_at is not null) as total_completed_sessions,
  (select count(*) from enrollments where completed_at is null
                                       and invited_email_sent_at is not null) as in_flight_sessions;

-- 2. Completion by assessment + phase ---------------------------------
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

-- 3. Active-Threat pre/post pairs (students with BOTH completions) ----
-- enrollment.id is uuid (no native max()), so we collect pre/post via two
-- filtered CTEs and inner-join on student_id — only students with BOTH
-- phases survive.
create or replace view dashboard_active_threat_pairs as
with pre_enr as (
  select e.student_id, e.id
    from enrollments e
    join assessments a on a.id = e.assessment_id
   where a.code = 'active_threat_v1'
     and e.phase = 'pre'
     and e.completed_at is not null
),
post_enr as (
  select e.student_id, e.id
    from enrollments e
    join assessments a on a.id = e.assessment_id
   where a.code = 'active_threat_v1'
     and e.phase = 'post'
     and e.completed_at is not null
)
select
  pre.student_id,
  pre.id as pre_enrollment_id,
  post.id as post_enrollment_id,
  pre_es.avg_rt_ms as pre_avg_rt,
  post_es.avg_rt_ms as post_avg_rt,
  pre_w.branch_path as pre_branch,
  post_w.branch_path as post_branch,
  (pre_w.branch_path is distinct from post_w.branch_path) as path_diverged,
  -- First decision = earliest response_long row by timestamp.
  (select rt_ms from responses_long
    where enrollment_id = pre.id
    order by timestamp asc limit 1) as pre_first_rt,
  (select rt_ms from responses_long
    where enrollment_id = post.id
    order by timestamp asc limit 1) as post_first_rt
from pre_enr pre
join post_enr post on post.student_id = pre.student_id
join enrollment_scores pre_es  on pre_es.enrollment_id  = pre.id
join enrollment_scores post_es on post_es.enrollment_id = post.id
left join responses_wide pre_w  on pre_w.enrollment_id  = pre.id
left join responses_wide post_w on post_w.enrollment_id = post.id;

-- 4. Event-marker aggregates by phase ---------------------------------
-- The 8 doctrine markers, fire count + total events, grouped by phase.
-- Marker aggregates only need pre/post; 'practice' enrollments don't
-- contribute to the doctor's pitch chart. Filtering here keeps the view
-- payload tight + avoids client-side filtering surprise.
--
-- PERF NOTE: the cross join × 8 markers × N events is O(N) per dashboard
-- load. Acceptable at the current 200-ish-event scale and at ~750-event
-- first-cohort scale. If responses_long crosses ~10K rows AND the doctor
-- has populated markers (so the partial expression indexes from
-- 0012_phase1_freeze become useful), consider rewriting the view as a
-- single-pass aggregate with the 8 markers inlined as separate columns,
-- then unpivot for the chart layer.
create or replace view dashboard_marker_aggregates as
with marker_keys as (
  select unnest(array[
    'escalation','narrowing','premature_commitment','sequencing_break',
    'drift','intervention','recovery','governance_instability'
  ]) as marker
),
event_pool as (
  select rl.event_markers, e.phase
    from responses_long rl
    join enrollments e on e.id = rl.enrollment_id
   where rl.event_markers is not null
     and e.phase in ('pre','post')
)
select
  m.marker,
  ep.phase,
  count(*) filter (where (ep.event_markers ->> m.marker) = 'true') as fired_count,
  count(*) as total_events,
  case when count(*) > 0
       then round(100.0 * count(*) filter (where (ep.event_markers ->> m.marker) = 'true') / count(*), 2)
       else 0 end as fire_rate_pct
from marker_keys m
cross join event_pool ep
group by m.marker, ep.phase
order by m.marker, ep.phase;

-- 5. 50-Q exam certification stats ------------------------------------
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

-- 6. Operational health -----------------------------------------------
create or replace view dashboard_operational as
select
  (select round(avg(extract(epoch from (completed_at - invited_email_sent_at)) / 3600.0)::numeric, 1)
     from enrollments
    where invited_email_sent_at is not null and completed_at is not null) as avg_invite_to_completion_hours,
  (select count(distinct rl.enrollment_id)
     from responses_long rl
     join enrollments e on e.id = rl.enrollment_id
    where e.completed_at is null
      and e.invited_email_sent_at < now() - interval '7 days') as abandoned_count,
  (select count(*) from enrollments where completed_at is null and invited_email_sent_at is not null) as total_invited_incomplete;

-- RLS pass-through (mirroring 0010_enrollment_scores_view.sql) --------
alter view dashboard_volume                    set (security_invoker = true);
alter view dashboard_completion_by_assessment  set (security_invoker = true);
alter view dashboard_active_threat_pairs       set (security_invoker = true);
alter view dashboard_marker_aggregates         set (security_invoker = true);
alter view dashboard_exam_certification        set (security_invoker = true);
alter view dashboard_operational               set (security_invoker = true);

// Server-side loaders for the six dashboard SQL views (migration 0015).
// Uses the same service-role client pattern as src/lib/db.ts because the
// dashboard is super_admin-only and the page itself enforces that via
// requireSuperAdmin(). Views ALSO have security_invoker = true so a stray
// caller without the role would get zero rows back regardless.

import { createClient } from '@supabase/supabase-js';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface DashboardVolume {
  total_orgs: number;
  total_students: number;
  total_completed_sessions: number;
  in_flight_sessions: number;
}

export interface CompletionRow {
  assessment_code: string;
  assessment_name: string;
  assessment_kind: 'scenario' | 'multi_choice';
  phase: 'pre' | 'post' | 'practice';
  enrolled: number;
  completed: number;
  completion_pct: number;
}

// PII note: the view exposes student_id + enrollment_id; the dashboard
// only needs the aggregate fields to render charts, so we keep IDs off
// the wire entirely. Anyone needing individual drill-downs uses the
// per-org admin views (/mvs/admin/orgs/[id]) which already have RLS.
export interface ActiveThreatPair {
  pre_avg_rt: number | null;
  post_avg_rt: number | null;
  pre_branch: string | null;
  post_branch: string | null;
  path_diverged: boolean;
  pre_first_rt: number | null;
  post_first_rt: number | null;
  // Phase A doctrine deltas (migrations 0022/0023). Null until the
  // path's options are weighted (only 5 screens seeded so far).
  pre_net_governance_load: number | null;
  post_net_governance_load: number | null;
  pre_instability_load: number | null;
  post_instability_load: number | null;
  pre_rt_sd: number | null;
  post_rt_sd: number | null;
}

// Columns selected from dashboard_active_threat_pairs — shared by the
// loaders so the projection stays in one place.
const ACTIVE_THREAT_PAIR_COLS =
  'pre_avg_rt, post_avg_rt, pre_branch, post_branch, path_diverged, ' +
  'pre_first_rt, post_first_rt, pre_net_governance_load, ' +
  'post_net_governance_load, pre_instability_load, post_instability_load, ' +
  'pre_rt_sd, post_rt_sd';

export interface MarkerAggregate {
  marker: string;
  phase: 'pre' | 'post' | 'practice';
  fired_count: number;
  total_events: number;
  fire_rate_pct: number;
}

export interface ExamCertification {
  enrollment_id: string;
  score_percent: number | null;
  pass: boolean | null;
  tier: 'incomplete' | 'high' | 'certified' | 'borderline' | 'not_certified';
}

export interface OperationalRow {
  avg_invite_to_completion_hours: number | null;
  abandoned_count: number;
  total_invited_incomplete: number;
}

export interface DashboardSnapshot {
  volume: DashboardVolume | null;
  completion: CompletionRow[];
  activeThreatPairs: ActiveThreatPair[];
  markers: MarkerAggregate[];
  certification: ExamCertification[];
  operational: OperationalRow | null;
}

// Org-scoped outcomes panel for /mvs/admin/orgs/[id]. Mirrors the
// global Phase1To2Delta + CertificationCharts data, filtered to the
// open org via the SQL functions in migration 0019.
export interface OrgOutcomes {
  pairs: ActiveThreatPair[];
  markers: MarkerAggregate[];
  certification: ExamCertification[];
  postCompletion: { enrolled: number; completed: number } | null;
  hasAnyCompletions: boolean;
}

function tierFor(scorePercent: number | null): ExamCertification['tier'] {
  if (scorePercent == null) return 'incomplete';
  if (scorePercent >= 90) return 'high';
  if (scorePercent >= 80) return 'certified';
  if (scorePercent >= 70) return 'borderline';
  return 'not_certified';
}

export async function loadOrgOutcomes(orgId: string): Promise<OrgOutcomes> {
  const sb = client();
  const [pairs, markers, certRows, postRows] = await Promise.all([
    sb.rpc('org_active_threat_pairs', { p_org_id: orgId }),
    sb.rpc('org_marker_aggregates', { p_org_id: orgId }),
    sb
      .from('enrollment_scores')
      .select('enrollment_id, score_percent, pass, completed_at')
      .eq('org_id', orgId)
      .eq('assessment_code', 'mvs_test_bank_v1')
      .not('completed_at', 'is', null),
    sb
      .from('enrollment_scores')
      .select('enrollment_id, completed_at')
      .eq('org_id', orgId)
      .eq('assessment_code', 'active_threat_v1')
      .eq('phase', 'post'),
  ]);

  const certification: ExamCertification[] = (
    (certRows.data as
      | { enrollment_id: string; score_percent: number | null; pass: boolean | null }[]
      | null) ?? []
  ).map((r) => ({
    enrollment_id: r.enrollment_id,
    score_percent: r.score_percent,
    pass: r.pass,
    tier: tierFor(r.score_percent),
  }));

  const postEnrolled = (postRows.data as { completed_at: string | null }[] | null) ?? [];
  const postCompletion = postEnrolled.length
    ? {
        enrolled: postEnrolled.length,
        completed: postEnrolled.filter((r) => r.completed_at != null).length,
      }
    : null;

  const pairsData = (pairs.data as ActiveThreatPair[] | null) ?? [];
  const hasAnyCompletions = pairsData.length > 0 || certification.length > 0;

  return {
    pairs: pairsData,
    markers: (markers.data as MarkerAggregate[] | null) ?? [],
    certification,
    postCompletion,
    hasAnyCompletions,
  };
}

// Phase 2 only renders the active-threat pre/post pairs, the marker
// chart, and the post-completion count. Skip the 3 unused dashboard
// views entirely.
export interface Phase2Snapshot {
  activeThreatPairs: ActiveThreatPair[];
  markers: MarkerAggregate[];
  postCompletion: CompletionRow | null;
}
export async function loadPhase2Snapshot(): Promise<Phase2Snapshot> {
  const sb = client();
  const [pairs, markers, completion] = await Promise.all([
    sb
      .from('dashboard_active_threat_pairs')
      .select(ACTIVE_THREAT_PAIR_COLS),
    sb.from('dashboard_marker_aggregates').select('*'),
    sb
      .from('dashboard_completion_by_assessment')
      .select('*')
      .eq('assessment_code', 'active_threat_v1')
      .eq('phase', 'post')
      .maybeSingle(),
  ]);
  return {
    activeThreatPairs: (pairs.data as ActiveThreatPair[] | null) ?? [],
    markers: (markers.data as MarkerAggregate[] | null) ?? [],
    postCompletion: (completion.data as CompletionRow | null) ?? null,
  };
}

// Phase 3 only renders the certification tier breakdown. Skip the
// other 5 views.
export interface Phase3Snapshot {
  certification: ExamCertification[];
}
export async function loadPhase3Snapshot(): Promise<Phase3Snapshot> {
  const sb = client();
  const { data } = await sb.from('dashboard_exam_certification').select('*');
  return {
    certification: (data as ExamCertification[] | null) ?? [],
  };
}

// ─── Phase B: per-student Phase 1 report ────────────────────────────
import {
  buildPhase1Report,
  comparePrePost,
  buildUnitReport,
  type SessionMetrics,
  type Phase1ReportText,
  type PrePostReport,
  type UnitReport,
} from '@/lib/phase1Report';

export interface Phase1ReportPathStep {
  order: number;
  screenId: string;
  prompt: string;
  optionLabel: string | null;
  optionText: string | null;
  optionClassification: string | null;
  rtSeconds: number | null;
  timedOut: boolean;
}

export interface Phase1Report {
  enrollmentId: string;
  studentName: string | null;
  phase: string;
  completedAt: string | null;
  metrics: SessionMetrics;
  text: Phase1ReportText;
  path: Phase1ReportPathStep[];
}

export async function loadPhase1Report(
  enrollmentId: string,
): Promise<Phase1Report | null> {
  const sb = client();

  const { data: m } = await sb
    .from('phase1_session_metrics')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle();
  if (!m) return null;

  // Student name (metrics view exposes student_id only).
  const { data: prof } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', (m as { student_id: string }).student_id)
    .maybeSingle();

  // Decision path: events in order.
  const { data: events } = await sb
    .from('responses_long')
    .select(
      'question_id, option_selected, rt_ms, timed_out, timestamp, scenario_id',
    )
    .eq('enrollment_id', enrollmentId)
    .order('timestamp', { ascending: true });

  // Enrich with screen prompt + option text + classification from the
  // canonical scenario (active_threat_v1).
  const scenarioId =
    (events?.[0] as { scenario_id?: string } | undefined)?.scenario_id ??
    'active_threat_v1';
  const { data: opts } = await sb
    .from('screen_options')
    .select(
      'option_label, option_text, option_classification, scenario_screens!inner(screen_id, sort_order, scenarios!inner(scenario_id))',
    )
    .eq('scenario_screens.scenarios.scenario_id', scenarioId);

  type OptRow = {
    option_label: string;
    option_text: string | null;
    option_classification: string | null;
    scenario_screens: { screen_id: string; sort_order: number };
  };
  const optMap = new Map<string, OptRow>();
  for (const o of (opts ?? []) as unknown as OptRow[]) {
    optMap.set(`${o.scenario_screens.screen_id}::${o.option_label}`, o);
  }

  const path: Phase1ReportPathStep[] = (
    (events ?? []) as {
      question_id: string;
      option_selected: string | null;
      rt_ms: number;
      timed_out: boolean;
    }[]
  ).map((e, i) => {
    const hit = e.option_selected
      ? optMap.get(`${e.question_id}::${e.option_selected}`)
      : undefined;
    return {
      order: i + 1,
      screenId: e.question_id,
      prompt: '',
      optionLabel: e.option_selected,
      optionText: hit?.option_text ?? null,
      optionClassification: hit?.option_classification ?? null,
      rtSeconds: e.rt_ms != null ? Math.round(e.rt_ms / 100) / 10 : null,
      timedOut: e.timed_out,
    };
  });

  const metrics = m as unknown as SessionMetrics & {
    phase: string;
    completed_at: string | null;
  };

  return {
    enrollmentId,
    studentName: (prof as { full_name: string | null } | null)?.full_name ?? null,
    phase: metrics.phase,
    completedAt: metrics.completed_at,
    metrics,
    text: buildPhase1Report(metrics),
    path,
  };
}

// ─── Phase C: §7 within-person pre/post comparison ──────────────────
export interface PrePostReportData {
  studentName: string | null;
  preCompletedAt: string | null;
  postCompletedAt: string | null;
  preMetrics: SessionMetrics;
  postMetrics: SessionMetrics;
  report: PrePostReport;
}

// Given any phase-1 enrollment, resolve the participant's pre AND post
// active_threat sessions and compare them to each other (spec §7).
// Returns null until BOTH a pre and a post session exist.
export async function loadPrePostReport(
  enrollmentId: string,
): Promise<PrePostReportData | null> {
  const sb = client();

  const { data: anchor } = await sb
    .from('phase1_session_metrics')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle();
  if (!anchor) return null;
  const studentId = (anchor as { student_id: string }).student_id;

  const { data: rows } = await sb
    .from('phase1_session_metrics')
    .select('*')
    .eq('student_id', studentId);
  const all = (rows as ({ phase: string; completed_at: string | null } & SessionMetrics)[] | null) ?? [];
  const pre = all.find((r) => r.phase === 'pre');
  const post = all.find((r) => r.phase === 'post');
  if (!pre || !post) return null;

  const { data: prof } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle();

  return {
    studentName: (prof as { full_name: string | null } | null)?.full_name ?? null,
    preCompletedAt: pre.completed_at,
    postCompletedAt: post.completed_at,
    preMetrics: pre,
    postMetrics: post,
    report: comparePrePost(pre, post),
  };
}

// ─── Phase C: §8 unit-level aggregate (name-suppressed) ─────────────
export interface UnitReportData {
  report: UnitReport;
}

// Aggregate every completed active_threat phase-1 session in an org
// (spec §8). No participant identity is loaded — names never enter the
// command report.
export async function loadUnitReport(
  orgId: string,
): Promise<UnitReportData | null> {
  const sb = client();

  const { data: enr } = await sb
    .from('enrollment_scores')
    .select('enrollment_id')
    .eq('org_id', orgId)
    .eq('assessment_code', 'active_threat_v1')
    .not('completed_at', 'is', null);
  const ids = ((enr as { enrollment_id: string }[] | null) ?? []).map(
    (r) => r.enrollment_id,
  );
  if (!ids.length) return null;

  const { data: rows } = await sb
    .from('phase1_session_metrics')
    .select('*')
    .in('enrollment_id', ids);
  const sessions = (rows as SessionMetrics[] | null) ?? [];
  const report = buildUnitReport(sessions);
  if (!report) return null;
  return { report };
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const sb = client();
  const [volume, completion, atPairs, markers, certification, operational] =
    await Promise.all([
      sb.from('dashboard_volume').select('*').single(),
      sb.from('dashboard_completion_by_assessment').select('*'),
      sb
        .from('dashboard_active_threat_pairs')
        .select(ACTIVE_THREAT_PAIR_COLS),
      sb.from('dashboard_marker_aggregates').select('*'),
      sb.from('dashboard_exam_certification').select('*'),
      sb.from('dashboard_operational').select('*').single(),
    ]);

  return {
    volume: (volume.data as DashboardVolume | null) ?? null,
    completion: (completion.data as CompletionRow[] | null) ?? [],
    activeThreatPairs:
      (atPairs.data as ActiveThreatPair[] | null) ?? [],
    markers: (markers.data as MarkerAggregate[] | null) ?? [],
    certification: (certification.data as ExamCertification[] | null) ?? [],
    operational: (operational.data as OperationalRow | null) ?? null,
  };
}

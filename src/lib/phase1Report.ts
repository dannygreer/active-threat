// Phase 1 Report engine (Phase B — Scully "Report Generation Logic").
//
// Pure, deterministic: given a phase1_session_metrics row, returns the
// session classification, timing classification, and the conservative
// non-diagnostic report text blocks. Same metrics in → same report out
// (spec §11). Thresholds are Scully's "Version 1" starter values
// (§5/§6) — hard-coded constants for now; lift into a config table
// when a tuning UI is actually built (§10 is a future concern, the
// values are explicitly provisional).

export interface SessionMetrics {
  escalation_total: number | null;
  premature_commitment_total: number | null;
  drift_total: number | null;
  sequencing_break_total: number | null;
  governance_instability_total: number | null;
  narrowing_total: number | null;
  recovery_total: number | null;
  instability_load: number | null;
  net_governance_load: number | null;
  mean_rt: number | null;
  median_rt: number | null;
  rt_sd: number | null;
  max_rt: number | null;
  min_rt: number | null;
  rt_range: number | null;
  s5_rt: number | null;
  s6_rt: number | null;
  compression_index: number | null;
  acceleration_ratio: number | null;
  drift_ratio: number | null;
  sequencing_ratio: number | null;
  recovery_offset: number | null;
  event_count: number | null;
}

export type SessionClassification =
  | 'Controlled / Adaptive'
  | 'Acceptable / Neutral'
  | 'Premature Commitment Pattern'
  | 'Drift-Dominant Pattern'
  | 'Sequencing Instability Pattern'
  | 'Governance Instability Pattern'
  | 'High-Risk / Unsafe Pattern';

export type TimingClassification =
  | 'Stable Timing'
  | 'Variable Timing'
  | 'Erratic Timing';

export type TimingModifier =
  | 'Convergence Delay'
  | 'Final Pressure Compression'
  | 'Terminal Hesitation';

const n = (v: number | null | undefined) => (v == null ? 0 : v);

// ─── §5.2 Session-level classification ──────────────────────────────
// Evaluated worst-first so a participant who trips the High-Risk rule
// is flagged High-Risk even if a milder rule also matches. Acceptable
// / Neutral is the fallback ("no dominant high-risk marker").
export function classifySession(m: SessionMetrics): SessionClassification {
  const esc = n(m.escalation_total);
  const prem = n(m.premature_commitment_total);
  const drift = n(m.drift_total);
  const seq = n(m.sequencing_break_total);
  const gov = n(m.governance_instability_total);
  const rec = n(m.recovery_total);
  const ngl = n(m.net_governance_load);
  const accel = n(m.acceleration_ratio);
  const driftR = n(m.drift_ratio);
  const seqR = n(m.sequencing_ratio);
  const meanRt = n(m.mean_rt);
  const rtSd = n(m.rt_sd);

  if (ngl >= 14 || (esc >= 10 && rec > -2)) return 'High-Risk / Unsafe Pattern';
  if (esc + prem >= 10 || accel >= 0.45) return 'Premature Commitment Pattern';
  if (drift >= 6 || (driftR >= 0.3 && meanRt > 6.0))
    return 'Drift-Dominant Pattern';
  if (seq >= 6 || seqR >= 0.25) return 'Sequencing Instability Pattern';
  if (gov >= 7 || rtSd > 4.0) return 'Governance Instability Pattern';
  if (ngl <= 4 && rec <= -4 && rtSd <= 3.0) return 'Controlled / Adaptive';
  return 'Acceptable / Neutral';
}

// ─── §5.3 Timing classification + modifiers ─────────────────────────
export function classifyTiming(m: SessionMetrics): {
  band: TimingClassification;
  modifiers: TimingModifier[];
} {
  const rtSd = n(m.rt_sd);
  const meanRt = n(m.mean_rt);
  const s5 = m.s5_rt;
  const s6 = m.s6_rt;
  const comp = m.compression_index;

  const band: TimingClassification =
    rtSd > 4.0 ? 'Erratic Timing' : rtSd > 2.0 ? 'Variable Timing' : 'Stable Timing';

  const modifiers: TimingModifier[] = [];
  if (s5 != null && (s5 >= meanRt + 2.0 || s5 >= 8.0))
    modifiers.push('Convergence Delay');
  if (comp != null && comp >= 2.0) modifiers.push('Final Pressure Compression');
  if (s6 != null && (s6 >= meanRt + 2.0 || s6 >= 8.0))
    modifiers.push('Terminal Hesitation');

  return { band, modifiers };
}

// ─── §6.1 Primary classification text (conservative, non-diagnostic) ─
const PRIMARY_TEXT: Record<SessionClassification, string> = {
  'Controlled / Adaptive':
    'The participant demonstrated a controlled/adaptive pattern characterized by preserved sequencing, stabilizing choices, and maintained governance under pressure.',
  'Acceptable / Neutral':
    'The participant demonstrated workable baseline performance with no single dominant instability pattern. Minor inefficiencies may be present but did not dominate the scenario path.',
  'Premature Commitment Pattern':
    'The participant demonstrated an acceleration-dominant pattern characterized by rapid commitment, reduced reassessment, and increased risk of narrowing under pressure.',
  'Drift-Dominant Pattern':
    'The participant demonstrated a drift-dominant pattern characterized by delayed closure, continued uncertainty cycling, or slowed transition into stabilization.',
  'Sequencing Instability Pattern':
    'The participant demonstrated sequencing instability, meaning decisions were more likely to occur out of optimal operational order under pressure.',
  'Governance Instability Pattern':
    'The participant demonstrated governance instability, reflected by inconsistent pacing, unstable decision structure, or difficulty preserving internal rate control.',
  'High-Risk / Unsafe Pattern':
    'The participant demonstrated a high-risk pressure pattern marked by significant instability load with limited recovery or stabilizing behavior.',
};

// ─── §6.2 Timing text ───────────────────────────────────────────────
const TIMING_TEXT: Record<TimingClassification, string> = {
  'Stable Timing':
    'Decision timing remained comparatively stable across the scenario, suggesting preserved pacing and reduced timing volatility.',
  'Variable Timing':
    'Decision timing showed moderate variability, suggesting uneven processing stability as scenario pressure increased.',
  'Erratic Timing':
    'Decision timing was highly variable, suggesting timing instability and possible bandwidth saturation under load.',
};
const MODIFIER_TEXT: Record<TimingModifier, string> = {
  'Convergence Delay':
    'The participant showed delay at the convergence point, where multiple pressure variables were active at the same time.',
  'Final Pressure Compression':
    'The participant showed final-pressure compression, with timing narrowing from convergence load into terminal pressure.',
  'Terminal Hesitation':
    'The participant showed delay at the terminal pressure node, suggesting difficulty closing the decision gap under immediate proximity pressure.',
};

// ─── §6.3 Training recommendation (dominant finding) ────────────────
const TRAINING_REC: Record<SessionClassification, string> = {
  'Premature Commitment Pattern':
    'Training should emphasize protecting the gap before commitment, forcing one additional variable before final action, and reducing urgency-dominant closure.',
  'Drift-Dominant Pattern':
    'Training should emphasize commitment initiation, uncertainty tolerance, and transition from observation into stabilization.',
  'Sequencing Instability Pattern':
    'Training should emphasize operational order, stabilization before communication, and structured next-step sequencing.',
  'Governance Instability Pattern':
    'Training should emphasize internal rate control, controlled pacing, and stabilization under shifting pressure.',
  'High-Risk / Unsafe Pattern':
    'Training should emphasize recovery acceleration, re-opening optionality, and restoring sequencing after disruption.',
  'Controlled / Adaptive':
    'Performance is within the controlled band. Maintenance training should reinforce existing pacing discipline and recovery behavior under escalating load.',
  'Acceptable / Neutral':
    'No dominant deficit. General training should target consistency of pacing and earlier stabilization to move performance toward the controlled band.',
};

export interface Phase1ReportText {
  session: SessionClassification;
  timing: TimingClassification;
  modifiers: TimingModifier[];
  primaryText: string;
  timingText: string;
  modifierText: string[];
  trainingRecommendation: string;
}

export function buildPhase1Report(m: SessionMetrics): Phase1ReportText {
  const session = classifySession(m);
  const { band, modifiers } = classifyTiming(m);
  return {
    session,
    timing: band,
    modifiers,
    primaryText: PRIMARY_TEXT[session],
    timingText: TIMING_TEXT[band],
    modifierText: modifiers.map((md) => MODIFIER_TEXT[md]),
    trainingRecommendation: TRAINING_REC[session],
  };
}

// ════════════════════════════════════════════════════════════════════
// Phase C — §7 Pre/Post within-person comparison
// ════════════════════════════════════════════════════════════════════
// Compares a participant to himself/herself (spec §7: within-person
// movement, not a national norm). Deterministic, conservative.

// Severity ordering so "classification improved/worsened" is decidable
// (§7.1). Lower = more controlled, higher = more unsafe.
const CLASS_RANK: Record<SessionClassification, number> = {
  'Controlled / Adaptive': 0,
  'Acceptable / Neutral': 1,
  'Drift-Dominant Pattern': 2,
  'Sequencing Instability Pattern': 2,
  'Governance Instability Pattern': 2,
  'Premature Commitment Pattern': 3,
  'High-Risk / Unsafe Pattern': 4,
};

export type PrePostSummary =
  | 'Improved'
  | 'Mixed'
  | 'No Meaningful Change'
  | 'Degraded';

export interface PrePostDelta {
  meanRtChange: number; // post - pre  (negative = faster)
  rtSdChange: number; // negative = more stable
  instabilityLoadChange: number; // negative = less instability
  netGovernanceLoadChange: number; // negative = better governance
  recoveryChange: number; // more negative = more stabilizing
  s5Change: number; // convergence timing change
  compressionChange: number; // reduced positive = less terminal collapse
}

export interface PrePostReport {
  preClass: SessionClassification;
  postClass: SessionClassification;
  delta: PrePostDelta;
  // §7.1 findings that fired (human-readable labels).
  findings: string[];
  classificationImproved: boolean;
  classificationWorsened: boolean;
  summary: PrePostSummary;
  summaryText: string;
}

// fractional decrease of `a`→`b` (only meaningful when a>0). Positive
// result = b is smaller than a by that fraction.
const fracDrop = (a: number | null, b: number | null) => {
  const av = n(a);
  if (av <= 0) return 0;
  return (av - n(b)) / av;
};
const fracChangeAbs = (a: number | null, b: number | null) => {
  const av = n(a);
  if (av === 0) return n(b) === 0 ? 0 : 1;
  return Math.abs((n(b) - av) / av);
};

const PREPOST_TEXT: Record<PrePostSummary, string> = {
  Improved:
    'Post-training performance shows improved governance, reduced instability load, and/or more stable timing compared with baseline.',
  Mixed:
    'Post-training performance shows improvement in some areas with residual instability in others. The pattern should be interpreted as partial transfer rather than full stabilization.',
  'No Meaningful Change':
    'Post-training performance did not show a meaningful shift from baseline on the available Phase 1 metrics.',
  Degraded:
    'Post-training performance showed increased instability or reduced timing integrity. This may reflect fatigue, confusion, poor transfer, or stress reactivity and should be reviewed carefully.',
};

export function comparePrePost(
  pre: SessionMetrics,
  post: SessionMetrics,
): PrePostReport {
  const preClass = classifySession(pre);
  const postClass = classifySession(post);

  const delta: PrePostDelta = {
    meanRtChange: n(post.mean_rt) - n(pre.mean_rt),
    rtSdChange: n(post.rt_sd) - n(pre.rt_sd),
    instabilityLoadChange: n(post.instability_load) - n(pre.instability_load),
    netGovernanceLoadChange:
      n(post.net_governance_load) - n(pre.net_governance_load),
    recoveryChange: n(post.recovery_total) - n(pre.recovery_total),
    s5Change: n(post.s5_rt) - n(pre.s5_rt),
    compressionChange: n(post.compression_index) - n(pre.compression_index),
  };

  const classificationImproved = CLASS_RANK[postClass] < CLASS_RANK[preClass];
  const classificationWorsened = CLASS_RANK[postClass] > CLASS_RANK[preClass];

  // §7.1 improvement thresholds.
  const findings: string[] = [];
  if (fracDrop(pre.rt_sd, post.rt_sd) >= 0.2)
    findings.push('Meaningful Timing Stabilization');
  if (fracDrop(pre.instability_load, post.instability_load) >= 0.2)
    findings.push('Meaningful Instability Reduction');
  // recovery is negative-good: "more negative by >= 2 points".
  if (n(pre.recovery_total) - n(post.recovery_total) >= 2)
    findings.push('Meaningful Recovery Improvement');
  // S5 RT down >=20% AND S5 marker load not worsening. Per-node S5
  // marker load isn't in the metrics view; approximate "does not
  // worsen" with overall instability_load not increasing (documented
  // approximation — tighten if a per-node marker total is added).
  if (
    fracDrop(pre.s5_rt, post.s5_rt) >= 0.2 &&
    delta.instabilityLoadChange <= 0
  )
    findings.push('Meaningful Convergence Improvement');
  if (classificationImproved) findings.push('Classification Improvement');

  // §7.1 negative / null findings. Instability Load up >= 20% from
  // baseline (pre→post increase), or the session classification slid
  // to a worse band.
  const preLoad = n(pre.instability_load);
  const loadIncreased =
    preLoad <= 0
      ? n(post.instability_load) > 0
      : (n(post.instability_load) - preLoad) / preLoad >= 0.2;
  const possibleDegradation = loadIncreased || classificationWorsened;

  const coreStable =
    fracChangeAbs(pre.mean_rt, post.mean_rt) < 0.1 &&
    fracChangeAbs(pre.rt_sd, post.rt_sd) < 0.1 &&
    fracChangeAbs(pre.instability_load, post.instability_load) < 0.1 &&
    fracChangeAbs(pre.net_governance_load, post.net_governance_load) < 0.1;
  const noMeaningfulChange = coreStable && preClass === postClass;

  // §7.2 summary selection. Worst-case honesty: a degradation with no
  // offsetting gains reads Degraded; degradation alongside gains is
  // partial transfer (Mixed); clean gains read Improved.
  let summary: PrePostSummary;
  if (possibleDegradation && findings.length === 0) summary = 'Degraded';
  else if (noMeaningfulChange && findings.length === 0)
    summary = 'No Meaningful Change';
  else if (findings.length > 0 && possibleDegradation) summary = 'Mixed';
  else if (findings.length > 0) summary = 'Improved';
  else summary = 'Mixed';

  return {
    preClass,
    postClass,
    delta,
    findings,
    classificationImproved,
    classificationWorsened,
    summary,
    summaryText: PREPOST_TEXT[summary],
  };
}

// ════════════════════════════════════════════════════════════════════
// Phase C — §8 Unit-level aggregate (name-suppressed)
// ════════════════════════════════════════════════════════════════════
// Command-level report: never shame individuals, surface unit pressure
// patterns + training targets (spec §8). Inputs are the per-session
// metrics rows; no participant identity enters this function.

const MARKER_KEYS = [
  'escalation_total',
  'premature_commitment_total',
  'drift_total',
  'sequencing_break_total',
  'governance_instability_total',
  'narrowing_total',
] as const;

const MARKER_LABEL: Record<(typeof MARKER_KEYS)[number], string> = {
  escalation_total: 'Escalation',
  premature_commitment_total: 'Premature Commitment',
  drift_total: 'Drift',
  sequencing_break_total: 'Sequencing Break',
  governance_instability_total: 'Governance Instability',
  narrowing_total: 'Narrowing',
};

export type UnitPattern =
  | 'Controlled Unit Profile'
  | 'Premature Commitment Unit Risk'
  | 'Drift Unit Risk'
  | 'Sequencing Training Need'
  | 'Governance Instability Under Load'
  | 'Convergence Vulnerability'
  | 'Terminal Compression Pattern';

const UNIT_TEXT: Record<UnitPattern, string> = {
  'Convergence Vulnerability':
    'The unit demonstrated its greatest measurable vulnerability at convergence, where multiple pressure variables were active and timing stability became less consistent.',
  'Terminal Compression Pattern':
    'The unit demonstrated final-pressure compression, suggesting that decision windows narrowed as terminal pressure increased.',
  'Premature Commitment Unit Risk':
    'The dominant unit pattern suggests acceleration and early commitment under pressure rather than a simple knowledge deficit.',
  'Drift Unit Risk':
    'The dominant unit pattern suggests delayed commitment and uncertainty cycling under pressure rather than a simple knowledge deficit.',
  'Sequencing Training Need':
    'The unit pattern suggests a need to reinforce operational sequencing, especially stabilization before communication or movement transition.',
  'Governance Instability Under Load':
    'The unit showed variable timing integrity under load, indicating that internal rate control and stabilization should be primary training targets.',
  'Controlled Unit Profile':
    'The unit demonstrated a predominantly controlled profile, with most sessions in the controlled or acceptable bands and stable aggregate timing.',
};

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const round2 = (x: number) => Math.round(x * 100) / 100;

export interface UnitReport {
  nSessions: number;
  unitMeanRt: number;
  unitMedianRt: number;
  unitRtSd: number;
  s5: { mean: number; sd: number; max: number };
  s6: { mean: number; sd: number; max: number };
  unitCompressionIndex: number;
  markerTotals: { label: string; total: number; avg: number }[];
  classificationDistribution: { label: SessionClassification; pct: number; count: number }[];
  dominantTrainingTarget: string;
  dominantTrainingRecommendation: string;
  patterns: UnitPattern[];
  patternText: string[];
}

export function buildUnitReport(sessions: SessionMetrics[]): UnitReport | null {
  if (!sessions.length) return null;
  const N = sessions.length;

  // Session-pace based aggregation. NOTE (v1 approximation): spec §8.1
  // wants AVG/SD over *every* response-time row; we aggregate the
  // per-session mean_rt instead (one value per session). This tracks
  // unit decision pace and its session-to-session spread — directionally
  // faithful, lighter than a per-event scan. Tighten with a step-level
  // RT pull if node-level breakdown is later required.
  const meanRts = sessions.map((s) => n(s.mean_rt));
  const unitMeanRt = round2(mean(meanRts));
  const unitMedianRt = round2(median(meanRts));
  const unitRtSd = round2(sd(meanRts));

  const s5s = sessions.map((s) => n(s.s5_rt));
  const s6s = sessions.map((s) => n(s.s6_rt));
  const s5 = { mean: round2(mean(s5s)), sd: round2(sd(s5s)), max: round2(Math.max(...s5s)) };
  const s6 = { mean: round2(mean(s6s)), sd: round2(sd(s6s)), max: round2(Math.max(...s6s)) };
  const unitCompressionIndex = round2(s5.mean - s6.mean);

  const markerTotals = MARKER_KEYS.map((k) => {
    const total = sessions.reduce((acc, s) => acc + n(s[k]), 0);
    return { key: k, label: MARKER_LABEL[k], total, avg: round2(total / N) };
  });
  const topMarker = [...markerTotals].sort((a, b) => b.total - a.total);

  const classes = sessions.map(classifySession);
  const distMap = new Map<SessionClassification, number>();
  for (const c of classes) distMap.set(c, (distMap.get(c) ?? 0) + 1);
  const classificationDistribution = [...distMap.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: round2((count / N) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const pctClass = (preds: (c: SessionClassification) => boolean) =>
    classes.filter(preds).length / N;

  const controlledOrAcceptable = pctClass(
    (c) => c === 'Controlled / Adaptive' || c === 'Acceptable / Neutral',
  );

  // §8.2 — multiple patterns can co-apply.
  const patterns: UnitPattern[] = [];
  if (controlledOrAcceptable >= 0.6 && unitRtSd <= 3.0)
    patterns.push('Controlled Unit Profile');
  if (
    topMarker[0].key === 'premature_commitment_total' ||
    pctClass((c) => c === 'Premature Commitment Pattern') >= 0.35
  )
    patterns.push('Premature Commitment Unit Risk');
  if (
    topMarker[0].key === 'drift_total' ||
    (unitMeanRt >= 7.0 &&
      markerTotals.find((m) => m.key === 'drift_total')!.total > 0)
  )
    patterns.push('Drift Unit Risk');
  if (
    topMarker.slice(0, 2).some((m) => m.key === 'sequencing_break_total') ||
    pctClass((c) => c === 'Sequencing Instability Pattern') >= 0.25
  )
    patterns.push('Sequencing Training Need');
  // §8.2 "S5 SD is highest step-level SD" — no per-node SD in the
  // metrics view; approximate with: convergence timing SD exceeds
  // terminal timing SD and exceeds overall pace SD (documented).
  if (unitRtSd > 4.0 || (s5.sd >= s6.sd && s5.sd > unitRtSd))
    patterns.push('Governance Instability Under Load');
  if (s5.mean > s6.mean || s5.sd > s6.sd || s5.max > s6.max)
    patterns.push('Convergence Vulnerability');
  if (unitCompressionIndex >= 2.0)
    patterns.push('Terminal Compression Pattern');

  // Dominant training target = highest aggregate instability marker
  // (§8.1). Map to the §6.3 recommendation for the matching pattern.
  const dom = topMarker[0];
  const TARGET_REC: Record<string, string> = {
    premature_commitment_total: TRAINING_REC['Premature Commitment Pattern'],
    escalation_total: TRAINING_REC['Premature Commitment Pattern'],
    drift_total: TRAINING_REC['Drift-Dominant Pattern'],
    sequencing_break_total: TRAINING_REC['Sequencing Instability Pattern'],
    governance_instability_total: TRAINING_REC['Governance Instability Pattern'],
    narrowing_total: TRAINING_REC['Premature Commitment Pattern'],
  };

  return {
    nSessions: N,
    unitMeanRt,
    unitMedianRt,
    unitRtSd,
    s5,
    s6,
    unitCompressionIndex,
    markerTotals: markerTotals.map(({ label, total, avg }) => ({ label, total, avg })),
    classificationDistribution,
    dominantTrainingTarget: dom.total > 0 ? dom.label : 'None dominant',
    dominantTrainingRecommendation:
      dom.total > 0
        ? TARGET_REC[dom.key]
        : 'No dominant instability marker at the unit level. General maintenance training to preserve pacing discipline.',
    patterns,
    patternText: patterns.map((p) => UNIT_TEXT[p]),
  };
}

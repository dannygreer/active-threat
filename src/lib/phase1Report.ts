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

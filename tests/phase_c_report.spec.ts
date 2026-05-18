// Phase C engine — pure deterministic logic (Scully §7 pre/post, §8
// unit). No DB: these assert the classifier math only.
import { describe, it, expect } from 'vitest';
import {
  comparePrePost,
  buildUnitReport,
  type SessionMetrics,
} from '@/lib/phase1Report';

// Minimal metrics factory — everything 0 unless overridden.
function m(over: Partial<SessionMetrics> = {}): SessionMetrics {
  return {
    escalation_total: 0,
    premature_commitment_total: 0,
    drift_total: 0,
    sequencing_break_total: 0,
    governance_instability_total: 0,
    narrowing_total: 0,
    recovery_total: 0,
    instability_load: 0,
    net_governance_load: 0,
    mean_rt: 4,
    median_rt: 4,
    rt_sd: 1,
    max_rt: 5,
    min_rt: 3,
    rt_range: 2,
    s5_rt: 4,
    s6_rt: 4,
    compression_index: 0,
    acceleration_ratio: 0,
    drift_ratio: 0,
    sequencing_ratio: 0,
    recovery_offset: 0,
    event_count: 8,
    ...over,
  };
}

describe('comparePrePost (§7)', () => {
  it('flags Improved when instability + timing drop and class improves', () => {
    const pre = m({
      instability_load: 12,
      net_governance_load: 12,
      rt_sd: 5,
      escalation_total: 12,
    }); // High-Risk-ish
    const post = m({
      instability_load: 4,
      net_governance_load: 2,
      rt_sd: 1,
      recovery_total: -4,
    });
    const r = comparePrePost(pre, post);
    expect(r.summary).toBe('Improved');
    expect(r.findings).toContain('Meaningful Instability Reduction');
    expect(r.findings).toContain('Meaningful Timing Stabilization');
    expect(r.classificationImproved).toBe(true);
  });

  it('flags Degraded when instability rises and nothing improves', () => {
    const pre = m({ instability_load: 4, net_governance_load: 4 });
    const post = m({
      instability_load: 12,
      net_governance_load: 14,
    });
    const r = comparePrePost(pre, post);
    expect(r.summary).toBe('Degraded');
  });

  it('reports No Meaningful Change when metrics + class are flat', () => {
    const pre = m({ instability_load: 6, net_governance_load: 6 });
    const post = m({ instability_load: 6, net_governance_load: 6 });
    const r = comparePrePost(pre, post);
    expect(r.summary).toBe('No Meaningful Change');
  });

  it('recovery improvement requires >= 2 more-negative points', () => {
    const pre = m({ recovery_total: -1 });
    const post = m({ recovery_total: -3 });
    const r = comparePrePost(pre, post);
    expect(r.findings).toContain('Meaningful Recovery Improvement');
  });
});

describe('buildUnitReport (§8)', () => {
  it('returns null for an empty unit', () => {
    expect(buildUnitReport([])).toBeNull();
  });

  it('detects a controlled unit profile', () => {
    const sessions = [
      m({ net_governance_load: 2, recovery_total: -4, rt_sd: 1 }),
      m({ net_governance_load: 3, recovery_total: -5, rt_sd: 1 }),
      m({ net_governance_load: 1, recovery_total: -4, rt_sd: 1 }),
    ];
    const r = buildUnitReport(sessions)!;
    expect(r.nSessions).toBe(3);
    expect(r.patterns).toContain('Controlled Unit Profile');
  });

  it('flags premature-commitment unit risk when that marker dominates', () => {
    const sessions = [
      m({ premature_commitment_total: 8, instability_load: 9 }),
      m({ premature_commitment_total: 6, instability_load: 7 }),
    ];
    const r = buildUnitReport(sessions)!;
    expect(r.patterns).toContain('Premature Commitment Unit Risk');
    expect(r.dominantTrainingTarget).toBe('Premature Commitment');
  });

  it('classification distribution sums to 100%', () => {
    const sessions = [
      m({ instability_load: 6, net_governance_load: 6 }),
      m({ escalation_total: 12, net_governance_load: 14 }),
    ];
    const r = buildUnitReport(sessions)!;
    const total = r.classificationDistribution.reduce(
      (a, c) => a + c.pct,
      0,
    );
    expect(Math.round(total)).toBe(100);
  });
});

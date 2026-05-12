// Day 11 e2e: confirm scenario loader surfaces video metadata and the
// runner-step logic handles both video-led and text-only scenarios. We
// can't drive a real browser from vitest, so this stops short of clicking
// through the runner — but it locks in the data-shape contract Quiz.tsx
// depends on.
import { describe, it, expect } from 'vitest';
import { getScenarioByAssessmentId, getWalkInScenario } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

describe('Day 11 — scenario video metadata flows from DB into runtime types', () => {
  it('conversation_velocity_v1 surfaces videoUrl + videoDurationSeconds', async () => {
    const { data: a } = await admin
      .from('assessments')
      .select('id')
      .eq('code', 'scenario_conversation_velocity_v1')
      .single();
    const scenario = await getScenarioByAssessmentId(a!.id);
    expect(scenario).not.toBeNull();
    // Test asset wired in Phase G:
    expect(scenario!.videoUrl).toBe('/scenarios/test.mp4');
    expect(scenario!.videoDurationSeconds).toBe(6);
  });

  it('active_threat_v1 (walk-in) has null video fields', async () => {
    const walkIn = await getWalkInScenario();
    expect(walkIn).not.toBeNull();
    expect(walkIn!.scenarioId).toBe('active_threat_v1');
    expect(walkIn!.videoUrl).toBeNull();
    expect(walkIn!.videoDurationSeconds).toBeNull();
  });

  it('all 4 non-wired revisable scenarios still have null video fields', async () => {
    const codes = [
      'perception_narrowing_v1',
      'escalation_loop_v1',
      'team_velocity_v1',
      'recovery_drift_v1',
    ];
    for (const code of codes) {
      const { data: a } = await admin
        .from('assessments')
        .select('id')
        .eq('code', `scenario_${code}`)
        .single();
      const s = await getScenarioByAssessmentId(a!.id);
      expect(s).not.toBeNull();
      expect(s!.videoUrl).toBeNull();
      expect(s!.videoDurationSeconds).toBeNull();
    }
  });
});

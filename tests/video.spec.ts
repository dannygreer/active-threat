// Day 11: integrity of the video_url ↔ video_duration_seconds pair on
// scenarios. Both columns are nullable on their own, but a check constraint
// requires they be set together. This catches admin-UI mistakes where a
// paste-the-URL workflow drops the duration value.
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

let scenarioId: string;

beforeAll(async () => {
  const stamp = Date.now();
  const { data, error } = await admin
    .from('scenarios')
    .insert({
      scenario_id: `video_constraint_${stamp}`,
      version: '1',
      title: 'Video constraint test',
      entry_screen_id: 'Q1',
      is_active: false,
    })
    .select('id')
    .single();
  if (error) throw error;
  scenarioId = data!.id;
});

afterAll(async () => {
  if (scenarioId) await admin.from('scenarios').delete().eq('id', scenarioId);
});

describe('Day 11 — video_url_requires_duration constraint', () => {
  it('rejects video_url without video_duration_seconds', async () => {
    const { error } = await admin
      .from('scenarios')
      .update({
        video_url: 'https://example.com/x.mp4',
        video_duration_seconds: null,
      })
      .eq('id', scenarioId);
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toMatch(/check|constraint|violat/);
  });

  it('rejects video_duration_seconds without video_url', async () => {
    const { error } = await admin
      .from('scenarios')
      .update({
        video_url: null,
        video_duration_seconds: 12,
      })
      .eq('id', scenarioId);
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toMatch(/check|constraint|violat/);
  });

  it('accepts both fields set together', async () => {
    const { error } = await admin
      .from('scenarios')
      .update({
        video_url: 'https://example.com/x.mp4',
        video_duration_seconds: 12,
      })
      .eq('id', scenarioId);
    expect(error).toBeNull();
  });

  it('accepts both fields null together', async () => {
    const { error } = await admin
      .from('scenarios')
      .update({ video_url: null, video_duration_seconds: null })
      .eq('id', scenarioId);
    expect(error).toBeNull();
  });
});

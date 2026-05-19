// Integration: the shared-slug student self-signup flow (migration 0024 +
// lib/provisionStudent). Runs against the live test project like the other
// e2e specs. Everything is created with a random slug/email and torn down
// in afterAll.
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { provisionStudent } from '@/lib/provisionStudent';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

const rand = Math.random().toString(36).slice(2, 8);
const SLUG = `sgtest-${rand}`;
const EMAIL = `sgtest-${rand}@example.com`;

let orgId: string;
const createdUserIds: string[] = [];

beforeAll(async () => {
  const { data, error } = await admin
    .from('orgs')
    .insert({ name: `Signup Test ${rand}`, signup_slug: SLUG })
    .select('id')
    .single();
  if (error) throw new Error(`org seed failed: ${error.message}`);
  orgId = data!.id as string;
});

afterAll(async () => {
  for (const uid of createdUserIds) {
    await admin.auth.admin.deleteUser(uid).catch(() => {});
  }
  if (orgId) await admin.from('orgs').delete().eq('id', orgId);
});

describe('org_by_signup_slug RPC (anon)', () => {
  it('resolves case-insensitively and leaks no sensitive fields', async () => {
    const { data, error } = await anon.rpc('org_by_signup_slug', {
      p_slug: SLUG.toUpperCase(),
    });
    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.id).toBe(orgId);
    // Exactly the safe projection — no contact_email / notes / deal /
    // status / signup_slug.
    expect(Object.keys(row).sort()).toEqual(
      ['id', 'name', 'session_phase', 'type'].sort(),
    );
  });

  it('returns nothing for an unknown slug', async () => {
    const { data } = await anon.rpc('org_by_signup_slug', {
      p_slug: `nope-${rand}`,
    });
    expect((Array.isArray(data) ? data : []).length).toBe(0);
  });

  it('anon cannot read the orgs table directly', async () => {
    const { data } = await anon.from('orgs').select('id').eq('id', orgId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('provisionStudent', () => {
  it('creates the account, pins the org, and enrolls the standard set', async () => {
    const res = await provisionStudent({
      slug: SLUG,
      firstName: 'Pat',
      lastName: 'Tester',
      email: EMAIL,
      password: 'correct-horse-battery',
    });
    expect(res.ok, res.ok ? '' : res.error).toBe(true);
    if (!res.ok) return;
    createdUserIds.push(res.userId);

    const { data: profile } = await admin
      .from('profiles')
      .select('org_id, role, full_name')
      .eq('id', res.userId)
      .single();
    expect(profile?.org_id).toBe(orgId);
    expect(profile?.role).toBe('student');
    expect(profile?.full_name).toBe('Pat Tester');

    const { data: enr } = await admin
      .from('enrollments')
      .select('phase, assessments(code)')
      .eq('student_id', res.userId);
    const set = (enr ?? [])
      .map(
        (e) =>
          `${(e as unknown as { assessments: { code: string } }).assessments.code}:${e.phase}`,
      )
      .sort();
    expect(set).toEqual(
      [
        'active_threat_v1:pre',
        'active_threat_v1:post',
        'mvs_test_bank_v1:post',
      ].sort(),
    );
  });

  it('rejects a duplicate email', async () => {
    const res = await provisionStudent({
      slug: SLUG,
      firstName: 'Pat',
      lastName: 'Tester',
      email: EMAIL,
      password: 'correct-horse-battery',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/already exists/i);
  });

  it('rejects an unknown slug', async () => {
    const res = await provisionStudent({
      slug: `missing-${rand}`,
      firstName: 'No',
      lastName: 'Org',
      email: `no-org-${rand}@example.com`,
      password: 'correct-horse-battery',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no longer valid/i);
  });

  it('rejects a short password before creating anything', async () => {
    const res = await provisionStudent({
      slug: SLUG,
      firstName: 'Short',
      lastName: 'Pass',
      email: `short-${rand}@example.com`,
      password: 'abc',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/at least 8/i);
  });
});

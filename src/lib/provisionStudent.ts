import { createClient } from '@supabase/supabase-js';
import { normalizeSignupSlug } from '@/lib/signupSlug';

// Core student self-provisioning, factored out of the server action so it
// can be unit-tested without a request scope (no next/headers, no
// redirect). Resolves the org from a signup slug, creates the auth user
// with a pre-confirmed password, pins the profile to the org, and creates
// the standard enrollment set.
//
// The standard set mirrors supabase/seeds/sample_2026_05.sql so a
// self-signed student sees all three phases (each still gated by
// orgs.session_phase on the /app landing):
//   - active_threat_v1  phase 'pre'   → Phase 1
//   - active_threat_v1  phase 'post'  → Phase 2
//   - mvs_test_bank_v1  phase 'post'  → Phase 3 (written test)

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const MIN_PASSWORD = 8;

export type ProvisionInput = {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type ProvisionResult =
  | { ok: true; userId: string; email: string; password: string }
  | { ok: false; error: string };

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function provisionStudent(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const password = input.password;

  // Re-normalize the slug here; never trust the caller to have mapped it
  // to an org already.
  const slugCheck = normalizeSignupSlug(input.slug);
  if (!slugCheck.ok || !slugCheck.slug) {
    return { ok: false, error: 'This signup link is no longer valid.' };
  }
  if (!firstName || !lastName) {
    return { ok: false, error: 'First and last name are required.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD} characters.`,
    };
  }

  const admin = adminClient();

  // Service role bypasses RLS; case-insensitive to match
  // orgs_signup_slug_uniq.
  const { data: org, error: orgErr } = await admin
    .from('orgs')
    .select('id')
    .ilike('signup_slug', slugCheck.slug)
    .maybeSingle();
  if (orgErr) {
    return { ok: false, error: `Could not resolve organization: ${orgErr.message}` };
  }
  if (!org) {
    return { ok: false, error: 'This signup link is no longer valid.' };
  }

  const fullName = `${firstName} ${lastName}`;

  // Pre-confirm the email — test day is proctored, so skip the inbox
  // round-trip. The on_auth_user_created trigger (migration 0002) seeds
  // the profile row from user_metadata.full_name.
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    },
  );

  if (createErr) {
    const msg = createErr.message ?? '';
    if (
      /already.*registered/i.test(msg) ||
      /already been registered/i.test(msg) ||
      /already exists/i.test(msg) ||
      createErr.status === 422
    ) {
      return {
        ok: false,
        error:
          'An account with this email already exists. Use the sign-in link below.',
      };
    }
    return { ok: false, error: `Could not create account: ${msg}` };
  }

  const userId = created?.user?.id;
  if (!userId) {
    return { ok: false, error: 'Account creation returned no user id. Try again.' };
  }

  // Pin the profile to this org. Upsert (not insert) because the trigger
  // already created the row; we own org_id + full_name, role stays student.
  const { error: profErr } = await admin.from('profiles').upsert(
    {
      id: userId,
      role: 'student',
      org_id: org.id,
      full_name: fullName,
    },
    { onConflict: 'id' },
  );
  if (profErr) {
    return { ok: false, error: `Could not finish setup: ${profErr.message}` };
  }

  // Standard enrollment set. Look assessments up by code so we never
  // hardcode generated ids.
  const { data: assessments, error: asmtErr } = await admin
    .from('assessments')
    .select('id, code')
    .in('code', ['active_threat_v1', 'mvs_test_bank_v1']);
  if (asmtErr) {
    return { ok: false, error: `Could not load assessments: ${asmtErr.message}` };
  }
  const byCode = new Map(
    (assessments ?? []).map((a) => [a.code as string, a.id as string]),
  );
  const activeThreat = byCode.get('active_threat_v1');
  const testBank = byCode.get('mvs_test_bank_v1');
  if (!activeThreat || !testBank) {
    return {
      ok: false,
      error:
        'Assessment configuration is incomplete on the server. Tell your facilitator.',
    };
  }

  const enrollmentRows = [
    { student_id: userId, assessment_id: activeThreat, phase: 'pre' },
    { student_id: userId, assessment_id: activeThreat, phase: 'post' },
    { student_id: userId, assessment_id: testBank, phase: 'post' },
  ];
  // Idempotent against unique(student_id, assessment_id, phase) — a retried
  // submission for a half-provisioned user won't error.
  const { error: enrErr } = await admin
    .from('enrollments')
    .upsert(enrollmentRows, {
      onConflict: 'student_id,assessment_id,phase',
      ignoreDuplicates: true,
    });
  if (enrErr) {
    return { ok: false, error: `Could not assign assessments: ${enrErr.message}` };
  }

  return { ok: true, userId, email, password };
}

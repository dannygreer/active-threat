'use server';

import { createClient as createSessionClient } from '@/lib/supabase/server';
import { provisionStudent } from '@/lib/provisionStudent';
import { redirect } from 'next/navigation';

// Public, unauthenticated student self-registration. Replaces the old
// admin-preload + emailed /take/<token> flow: a facilitator sets a
// signup_slug on the org, shares mentalvelocitysystem.com/<slug>, and
// students create an email+password here on test day.
//
// Provisioning (org resolve + account + enrollments) lives in
// lib/provisionStudent so it stays unit-testable; this action only adds
// the request-scoped concerns: establishing the session cookie and the
// post-signup redirect.

export type SignupResult = { error: string };

export async function registerStudent(
  _prev: SignupResult | null,
  formData: FormData,
): Promise<SignupResult> {
  const result = await provisionStudent({
    slug: String(formData.get('slug') ?? ''),
    firstName: String(formData.get('first_name') ?? ''),
    lastName: String(formData.get('last_name') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  // Establish the browser session via the cookie-bound anon client so the
  // student lands in /app already signed in (no second credential prompt).
  const session = await createSessionClient();
  const { error: signInErr } = await session.auth.signInWithPassword({
    email: result.email,
    password: result.password,
  });
  if (signInErr) {
    // Account + enrollments exist; only the auto-login failed. Send them to
    // the login page rather than dead-ending on the signup form.
    redirect('/auth/login?next=/app&registered=1');
  }

  redirect('/app');
}

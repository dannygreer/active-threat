import { Resend } from 'resend';

// Resend transactional email client. Used for app-controlled emails
// (invites, etc.) — separate from Supabase Auth's SMTP integration which
// also uses Resend but goes through GoTrue's email pipeline.
//
// Sandbox limitation: until a sending domain is verified at Resend, emails
// can only be delivered to the email address that owns the Resend account.
// See docs/needs_human.md item #4.

let cached: Resend | null = null;

export function resendClient(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set');
  }
  cached = new Resend(key);
  return cached;
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'MVS <onboarding@resend.dev>';

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSession } from '@/lib/session';

// Reject scheme-relative (//evil.com), backslash-tricks, and absolute URLs.
function isSafeNext(next: string | null): next is string {
  if (!next) return false;
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//') || next.startsWith('/\\')) return false;
  return true;
}

// Magic-link callback. Exchanges the ?code= for a Supabase session cookie,
// then routes by role. For super_admin we ALSO mint the legacy admin-session
// JWT so the existing /mvs/admin proxy gate accepts the user — Day 2 removes
// the legacy gate entirely.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const safeNext = isSafeNext(nextParam) ? nextParam : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_user`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // The trigger from migration 0002 should always create the row, so this
    // only fires on RLS / network problems. Fail loudly rather than silently
    // routing to /app.
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(
        `profile_lookup_failed: ${profileError.message}`
      )}`
    );
  }

  const role = profile?.role ?? 'student';

  // Mint the legacy admin-session JWT for super_admin so /mvs/admin's proxy
  // gate accepts them during the Day 1 → Day 2 coexistence window.
  if (role === 'super_admin') {
    await createSession();
  }

  // Honour ?next= only when the role is allowed to land there.
  // /mvs/admin → super_admin only (today). Other roles fall back to default.
  if (safeNext) {
    const wantsAdmin = safeNext.startsWith('/mvs/admin');
    if (!wantsAdmin || role === 'super_admin') {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  switch (role) {
    case 'super_admin':
      return NextResponse.redirect(`${origin}/mvs/admin`);
    case 'org_admin':
      return NextResponse.redirect(`${origin}/org`);
    case 'student':
    default:
      return NextResponse.redirect(`${origin}/app`);
  }
}

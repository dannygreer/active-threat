import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { RESERVED_SLUGS } from '@/lib/signupSlug';

// Temporary site-wide password gate. Anyone without the mvs_access cookie
// gets bounced to /password. The cookie is set by the password page's
// server action and lasts 24 hours. Remove this block (and /password)
// once the client preview window ends.
const GATE_BYPASS_PATHS = new Set<string>([
  '/password',
  // Supabase magic-link callback — gating it would break admin login because
  // the magic-link arrives from email in a context that won't have the
  // access cookie yet. Admin still has to hit /password first to view
  // anything; this just keeps the callback functional once authenticated.
  '/auth/callback',
]);

// Student self-signup is public by design: facilitators hand out
// mentalvelocitysystem.com/<slug> on test day and students can't have the
// preview password. Bypass the gate for the student-facing surface only —
// marketing/admin/marketing pages stay gated.
//   - the signup slug page itself (a single non-reserved path segment;
//     server-action POSTs land on this same path so they're covered too)
//   - /app (real Supabase auth still gates it via requireStudent)
//   - /auth/login (returning students sign in here)
// Static app routes (/about, /mvs, …) are in RESERVED_SLUGS, so they do
// NOT match the slug rule and remain behind the preview gate.
function isStudentPublicPath(path: string): boolean {
  if (path === '/auth/login') return true;
  if (path === '/app' || path.startsWith('/app/')) return true;
  const m = /^\/([^/]+)$/.exec(path);
  if (m && !RESERVED_SLUGS.has(m[1].toLowerCase())) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!GATE_BYPASS_PATHS.has(path) && !isStudentPublicPath(path)) {
    const access = request.cookies.get('mvs_access');
    if (!access || access.value !== '1') {
      const url = new URL('/password', request.url);
      url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  // Refresh the Supabase session for every matched request.
  const { response, supabase } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith('/mvs/admin')) {
    if (request.nextUrl.pathname === '/mvs/admin/login') {
      return response;
    }

    if (!supabase) {
      // Supabase env vars not provisioned — block /mvs/admin entirely.
      return NextResponse.redirect(
        new URL('/auth/login?next=/mvs/admin', request.url)
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const next = encodeURIComponent(request.nextUrl.pathname);
      return NextResponse.redirect(
        new URL(`/auth/login?next=${next}`, request.url)
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      // Authenticated but not super_admin — send them to their own portal.
      const dest =
        profile?.role === 'org_admin' ? '/org' : '/app';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    return response;
  }

  return response;
}

export const config = {
  // Match everything except static assets so Supabase sessions refresh
  // on real navigations but skip image/asset requests.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

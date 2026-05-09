import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  // Refresh the Supabase session for every matched request.
  // Returns a NextResponse the rest of this function may piggyback on.
  const { response: supabaseResponse } = await updateSession(request);

  // Legacy admin gate — JWT-cookie based. Stays alive until Day 2 cut-over.
  if (request.nextUrl.pathname.startsWith('/mvs/admin')) {
    if (request.nextUrl.pathname === '/mvs/admin/login') {
      return supabaseResponse;
    }

    const token = request.cookies.get('admin-session')?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL('/mvs/admin/login', request.url)
      );
    }

    try {
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? '');
      await jwtVerify(token, secret);
      return supabaseResponse;
    } catch {
      return NextResponse.redirect(
        new URL('/mvs/admin/login', request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  // Match everything except static assets so Supabase sessions refresh
  // on real navigations but skip image/asset requests.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

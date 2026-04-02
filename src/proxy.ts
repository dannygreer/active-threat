import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/active-threat/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin-session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/active-threat/admin/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? '');
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/active-threat/admin/login', request.url));
  }
}

export const config = {
  matcher: ['/active-threat/admin/:path*'],
};

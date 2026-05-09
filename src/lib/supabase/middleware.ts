import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refresh the Supabase session for every matched request.
// Must be called from src/proxy.ts (Next 16's middleware-equivalent).
// Returns the response so the caller can keep modifying it (e.g. add redirects).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Anon key not provisioned yet — see docs/needs_human.md item #1.
    // Skip Supabase session refresh so legacy admin auth still works.
    return { response: supabaseResponse, supabase: null };
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser.
  // A simple mistake could make it very hard to debug issues with users
  // being randomly logged out.
  await supabase.auth.getUser();

  return { response: supabaseResponse, supabase };
}

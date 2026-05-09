import { createBrowserClient } from '@supabase/ssr';

// Browser client for Client Components.
// Singleton across the page; cookie handling is automatic.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

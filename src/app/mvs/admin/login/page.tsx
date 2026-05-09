import { redirect } from 'next/navigation';

// Legacy admin login URL preserved for bookmarks. Forwards to the unified
// magic-link login. Underlying legacy session/auth code stays in place
// (src/lib/session.ts, src/actions/auth.ts) and continues to gate /mvs/admin
// via existing JWT cookies until the Day 2 cut-over.
export default function AdminLoginRedirect() {
  redirect('/auth/login?next=/mvs/admin');
}

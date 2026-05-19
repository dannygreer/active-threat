// Shared signup-slug rules. Used by the org admin action (to validate +
// store) and the public /<slug> route (to resolve). Kept framework-free
// so it is unit-testable in isolation.

// Root path segments that already route to something in src/app. A slug
// must never shadow these or the public signup page would hijack a real
// page (or never be reachable). Admin picking one of these is rejected.
export const RESERVED_SLUGS = new Set<string>([
  'about',
  'api',
  'app',
  'auth',
  'certification',
  'contact',
  'decision-analytics',
  'password',
  'quiz',
  'take',
  'mvs',
  'org',
  // defensive: framework + obvious future segments
  'admin',
  'login',
  'logout',
  'signup',
  'signin',
  'register',
  '_next',
  'static',
  'public',
  'favicon',
]);

export type SlugValidation =
  | { ok: true; slug: string | null }
  | { ok: false; error: string };

// Normalize to the storable form: lowercase, [a-z0-9-] only, collapsed
// and trimmed dashes. Empty input -> null (clears the slug). Does NOT
// check uniqueness — that is the DB unique index's job.
export function normalizeSignupSlug(raw: string | null | undefined): SlugValidation {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return { ok: true, slug: null };

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug === '') {
    return {
      ok: false,
      error: 'Slug must contain at least one letter or number.',
    };
  }
  if (slug.length > 64) {
    return { ok: false, error: 'Slug must be 64 characters or fewer.' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return {
      ok: false,
      error: `"${slug}" is a reserved path and cannot be used as a signup slug.`,
    };
  }
  return { ok: true, slug };
}

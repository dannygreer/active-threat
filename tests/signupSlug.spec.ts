import { describe, it, expect } from 'vitest';
import { normalizeSignupSlug, RESERVED_SLUGS } from '@/lib/signupSlug';

describe('normalizeSignupSlug', () => {
  it('passes a clean date-style slug through unchanged', () => {
    expect(normalizeSignupSlug('06052026')).toEqual({
      ok: true,
      slug: '06052026',
    });
  });

  it('lowercases and dash-collapses messy input', () => {
    expect(normalizeSignupSlug('  Acme   PD // Spring 2026!! ')).toEqual({
      ok: true,
      slug: 'acme-pd-spring-2026',
    });
  });

  it('treats empty / whitespace as clearing the slug (null, ok)', () => {
    expect(normalizeSignupSlug('')).toEqual({ ok: true, slug: null });
    expect(normalizeSignupSlug('   ')).toEqual({ ok: true, slug: null });
    expect(normalizeSignupSlug(null)).toEqual({ ok: true, slug: null });
  });

  it('rejects input that normalizes to nothing', () => {
    const r = normalizeSignupSlug('!!!');
    expect(r.ok).toBe(false);
  });

  it('rejects over-long slugs', () => {
    const r = normalizeSignupSlug('a'.repeat(65));
    expect(r.ok).toBe(false);
  });

  it('rejects reserved route segments (case-insensitively)', () => {
    for (const reserved of ['app', 'AUTH', 'Mvs', 'about']) {
      const r = normalizeSignupSlug(reserved);
      expect(r.ok, `${reserved} should be reserved`).toBe(false);
    }
  });

  it('RESERVED_SLUGS covers every real root route segment', () => {
    // If a new top-level dir is added under src/app, add it to
    // RESERVED_SLUGS or the public [slug] page will shadow it.
    for (const seg of [
      'about',
      'api',
      'app',
      'auth',
      'certification',
      'contact',
      'decision-analytics',
      'password',
      'quiz',
      'mvs',
      'org',
    ]) {
      expect(RESERVED_SLUGS.has(seg), `missing reserved: ${seg}`).toBe(true);
    }
  });
});

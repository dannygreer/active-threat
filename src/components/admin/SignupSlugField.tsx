'use client';

import { useState } from 'react';

// Shared per-org signup link. The facilitator hands students
// mentalvelocitysystem.com/<slug> on test day; they self-register there.
// Live-previews the resolved URL as the operator types. Final
// normalization + uniqueness is enforced server-side on submit.
export default function SignupSlugField({
  initial,
}: {
  initial?: string | null;
}) {
  const [value, setValue] = useState(initial ?? '');

  const preview = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-zinc-700 mb-1">
        Signup link slug
      </label>
      <div className="flex items-stretch">
        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 text-zinc-500 text-sm mvs-mono">
          mentalvelocitysystem.com/
        </span>
        <input
          name="signup_slug"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="06052026"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 min-w-0 px-3 py-2 border border-zinc-300 rounded-r-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {preview ? (
          <>
            Students sign up at{' '}
            <span className="mvs-mono text-zinc-700">
              mentalvelocitysystem.com/{preview}
            </span>
            . Leave blank to disable signup. Changing it invalidates the old
            link.
          </>
        ) : (
          'Leave blank to disable self-signup for this org. Letters, numbers and dashes only; must be unique.'
        )}
      </p>
    </div>
  );
}

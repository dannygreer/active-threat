'use client';

import { useState } from 'react';

// Read-only value + one-click copy. Used for the per-org student signup
// link on the org detail page.
export default function CopyableText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 min-w-0 truncate px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 mvs-mono">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`mvs-mono text-[10px] uppercase tracking-widest px-3 py-2 border rounded-lg transition-colors shrink-0 ${
          copied
            ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
            : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
        }`}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}

'use client';

// Single-student add, surfaced in the Roster table header on the org
// detail page. Reuses the existing inviteStudents action (it already
// parses one CSV line fine) — no new server endpoint. On a clean add
// it refreshes the page so the new roster row appears.
import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteStudents, type InviteResult } from '@/actions/orgs';

export default function AddStudentInline({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [state, formAction, pending] = useActionState<
    InviteResult | null,
    FormData
  >(inviteStudents, null);
  const lastHandled = useRef<InviteResult | null>(null);

  useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    // Clean add (no parse/error rows) → close, clear, refresh roster.
    if (state.errorCount === 0 && state.rows.every((r) => r.status !== 'error' && r.status !== 'parse_error')) {
      setFirst('');
      setLast('');
      setEmail('');
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('orgId', orgId);
    fd.set('roster', `${first.trim()},${last.trim()},${email.trim()}`);
    formAction(fd);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-700 border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 transition-colors"
      >
        + Add student
      </button>
    );
  }

  const errorRow = state?.rows.find(
    (r) => r.status === 'error' || r.status === 'parse_error',
  );

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        placeholder="First"
        required
        disabled={pending}
        className="w-24 px-2 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <input
        value={last}
        onChange={(e) => setLast(e.target.value)}
        placeholder="Last"
        required
        disabled={pending}
        className="w-24 px-2 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        required
        disabled={pending}
        className="w-52 px-2 py-1.5 border border-zinc-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="mvs-mono text-[11px] uppercase tracking-widest bg-zinc-900 text-white px-3 py-1.5 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setFirst('');
          setLast('');
          setEmail('');
        }}
        disabled={pending}
        className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500 px-2 py-1.5 hover:text-zinc-800 transition-colors"
      >
        Cancel
      </button>
      {errorRow && (
        <span className="w-full text-xs text-red-600">
          {errorRow.message ?? 'Add failed'}
        </span>
      )}
    </form>
  );
}

'use client';

// Two-row roster element: visible row (name/email/role/done/joined/actions
// + chevron) plus an expanded panel that lists each enrollment with its
// full assessment name, phase badge, report links, and reset link.
// Renders as a Fragment of two <tr> so the expanded panel sits in the
// same table flow with a colSpan.
//
// (Pre-0024 this also surfaced a per-enrollment /take/<token> copy link.
// Students now self-register via the org signup slug, so there is no
// per-student URL to hand out.)
import { useState, useTransition } from 'react';
import { resetEnrollment } from '@/actions/orgs';
import { formatAdminDate } from '@/lib/adminFormat';

interface Enrollment {
  id: string;
  phase: 'pre' | 'post' | 'practice';
  assessment_code: string;
  assessment_name: string;
  completed_at: string | null;
}

interface Props {
  fullName: string | null;
  email: string | null;
  role: string;
  completedCount: number;
  createdAt: string;
  enrollments: Enrollment[];
  actions: React.ReactNode;
  // Number of <td> the expanded panel must span — equals the visible
  // column count (chevron + 6 = 7 here).
  columnCount: number;
}

export default function RosterRowExpandable({
  fullName,
  email,
  role,
  completedCount,
  createdAt,
  enrollments,
  actions,
  columnCount,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
        <td className="px-4 py-3 w-6">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? '▾' : '▸'}
          </button>
        </td>
        <td className="px-4 py-3 text-zinc-900">{fullName ?? '—'}</td>
        <td className="px-4 py-3 text-zinc-600">{email ?? '—'}</td>
        <td className="px-4 py-3 text-zinc-600">{role}</td>
        <td className="px-4 py-3 text-right text-zinc-600 tabular-nums">
          {completedCount}
        </td>
        <td className="px-4 py-3 text-zinc-500">
          {formatAdminDate(createdAt)}
        </td>
        <td className="px-4 py-3">{actions}</td>
      </tr>
      {open && (
        <tr className="border-b border-zinc-100 bg-zinc-50">
          <td colSpan={columnCount} className="px-6 py-4">
            {enrollments.length === 0 ? (
              <p className="text-xs text-zinc-500">No enrollments yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg bg-white">
                {enrollments.map((e) => (
                  <EnrollmentLine key={e.id} enrollment={e} />
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function EnrollmentLine({ enrollment }: { enrollment: Enrollment }) {
  const [resetting, setResetting] = useState(false);
  const [, startTransition] = useTransition();

  const phaseLabel = enrollment.phase.toUpperCase();
  const completed = !!enrollment.completed_at;

  function reset() {
    if (
      !window.confirm(
        `Reset ${enrollment.assessment_name} (${enrollment.phase}) for this student? Their previous responses stay in the data; they can take it again.`,
      )
    ) {
      return;
    }
    setResetting(true);
    startTransition(async () => {
      try {
        await resetEnrollment(enrollment.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Reset failed';
        window.alert(msg);
      } finally {
        setResetting(false);
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`mvs-mono inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest rounded ${
            enrollment.phase === 'pre'
              ? 'bg-blue-100 text-blue-700'
              : enrollment.phase === 'post'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-zinc-100 text-zinc-700'
          }`}
        >
          {phaseLabel}
        </span>
        <span className="text-zinc-800 truncate" title={enrollment.assessment_name}>
          {enrollment.assessment_name}
        </span>
        {completed ? (
          <span className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400">
            done {formatAdminDate(enrollment.completed_at)}
          </span>
        ) : (
          <span className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400">
            not started
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {completed &&
          enrollment.assessment_code === 'active_threat_v1' && (
            <a
              href={`/mvs/admin/report/${enrollment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 transition-colors"
            >
              Report ↗
            </a>
          )}
        {completed &&
          enrollment.assessment_code === 'active_threat_v1' &&
          enrollment.phase === 'post' && (
            <a
              href={`/mvs/admin/report/prepost/${enrollment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 transition-colors"
            >
              Pre/Post ↗
            </a>
          )}
        {completed && (
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 disabled:opacity-60"
          >
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        )}
      </div>
    </li>
  );
}

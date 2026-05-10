'use client';

import { useActionState, useState } from 'react';
import { sendPreInvites, type SendInvitesResult } from '@/actions/invites';

interface Props {
  orgId: string;
  pendingStudentCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Sent',
  skipped_already_sent: 'Already sent',
  no_pending_enrollments: 'Nothing pending',
  no_email: 'No email on file',
  error: 'Error',
};

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-emerald-50 text-emerald-700',
  skipped_already_sent: 'bg-zinc-100 text-zinc-600',
  no_pending_enrollments: 'bg-zinc-100 text-zinc-500',
  no_email: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
};

export default function SendPreInvitesPanel({
  orgId,
  pendingStudentCount,
}: Props) {
  const [state, action, pending] = useActionState<SendInvitesResult | null, FormData>(
    sendPreInvites,
    null
  );
  const [resendAll, setResendAll] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-zinc-600">
          <p>
            <span className="font-medium text-zinc-900">{pendingStudentCount}</span>{' '}
            student{pendingStudentCount === 1 ? '' : 's'} have pending pre-assessment
            invites.
          </p>
        </div>
        <form action={action} className="flex items-center gap-3">
          <input type="hidden" name="orgId" value={orgId} />
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              name="resendAll"
              checked={resendAll}
              onChange={(e) => setResendAll(e.target.checked)}
              disabled={pending}
              className="rounded"
            />
            Re-send to all
          </label>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:bg-zinc-300"
          >
            {pending ? 'Sending…' : 'Send pre-assessment invites'}
          </button>
        </form>
      </div>

      {state && (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center gap-4 text-sm">
            <span className="text-emerald-700 font-medium">
              {state.sentCount} sent
            </span>
            {state.skippedCount > 0 && (
              <span className="text-zinc-500">{state.skippedCount} skipped</span>
            )}
            {state.errorCount > 0 && (
              <span className="text-red-700 font-medium">
                {state.errorCount} error{state.errorCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Student</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-right px-4 py-2 font-medium">Pending</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((r) => (
                <tr
                  key={r.studentId}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-2 text-zinc-900">{r.name ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600">{r.email ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.enrollmentCount}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        STATUS_STYLE[r.status] ?? 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">
                    {r.message ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

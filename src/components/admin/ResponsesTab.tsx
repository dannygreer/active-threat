'use client';

import { useTransition } from 'react';
import type { ResponseWideRow } from '@/types';
import { deleteAssessmentResult } from '@/actions/quiz';

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

function DeleteButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm('Delete this result and all associated data?')) return;
        startTransition(() => deleteAssessmentResult(id));
      }}
      disabled={pending}
      className="text-zinc-400 hover:text-red-600 transition-colors disabled:opacity-50"
      title="Delete"
    >
      {pending ? '...' : '\u00D7'}
    </button>
  );
}

export default function ResponsesTab({
  responses,
}: {
  responses: ResponseWideRow[];
}) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No assessment results yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="py-3 px-4 font-medium text-zinc-500">Name</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Phase</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Version</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Path</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q1</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q2</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q3</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q4</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q5</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q6</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Total</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Completed</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {responses.map((r) => (
            <tr
              key={r.id}
              className="border-b border-zinc-100 hover:bg-zinc-50"
            >
              <td className="py-3 px-4 font-medium text-zinc-900 whitespace-nowrap">
                {r.first_name} {r.last_name}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.phase === 'pre'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {r.phase}
                </span>
              </td>
              <td className="py-3 px-4 text-zinc-500">{r.scenario_version}</td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-700">
                {r.branch_path}
              </td>
              {(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const).map((q) => {
                const answer = r[`${q}_answer` as keyof ResponseWideRow] as string | null;
                const rt = r[`${q}_rt` as keyof ResponseWideRow] as number | null;
                return (
                  <td key={q} className="py-3 px-4 text-zinc-700 whitespace-nowrap">
                    {answer || '\u2014'}{' '}
                    <span className="text-zinc-400 font-mono text-xs">
                      {rt != null ? formatTime(rt) : ''}
                    </span>
                  </td>
                );
              })}
              <td className="py-3 px-4 font-mono font-medium text-zinc-900">
                {formatTime(r.total_time)}
              </td>
              <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                {new Date(r.completed_at).toLocaleString('en-US', {
                  timeZone: 'America/Chicago',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </td>
              <td className="py-3 px-4 text-center">
                <DeleteButton id={r.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

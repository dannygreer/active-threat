'use client';

import type { QuizResultRow } from '@/lib/db';
import { getAnswerText } from '@/lib/questions';

interface ResultsTableProps {
  results: QuizResultRow[];
}

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

export default function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No quiz results yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="py-3 px-4 font-medium text-zinc-500">Name</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q1 Answer</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q1 Time</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q2 Answer</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q2 Time</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q3 Answer</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Q3 Time</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Total Time</th>
            <th className="py-3 px-4 font-medium text-zinc-500">Completed</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
              <td className="py-3 px-4 font-medium text-zinc-900">
                {r.first_name} {r.last_name}
              </td>
              <td className="py-3 px-4 text-zinc-700">{getAnswerText(0, r.answer_1)}</td>
              <td className="py-3 px-4 text-zinc-500 font-mono">{formatTime(r.time_1_ms)}</td>
              <td className="py-3 px-4 text-zinc-700">{getAnswerText(1, r.answer_2)}</td>
              <td className="py-3 px-4 text-zinc-500 font-mono">{formatTime(r.time_2_ms)}</td>
              <td className="py-3 px-4 text-zinc-700">{getAnswerText(2, r.answer_3)}</td>
              <td className="py-3 px-4 text-zinc-500 font-mono">{formatTime(r.time_3_ms)}</td>
              <td className="py-3 px-4 text-zinc-900 font-mono font-medium">{formatTime(r.total_time_ms)}</td>
              <td className="py-3 px-4 text-zinc-500">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

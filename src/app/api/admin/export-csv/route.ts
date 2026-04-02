import { verifySession } from '@/lib/session';
import { getAllResults } from '@/lib/db';
import { getAnswerText } from '@/lib/questions';

export async function GET() {
  const valid = await verifySession();
  if (!valid) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results = await getAllResults();

  const headers = [
    'First Name',
    'Last Name',
    'Q1 Answer',
    'Q1 Time (s)',
    'Q2 Answer',
    'Q2 Time (s)',
    'Q3 Answer',
    'Q3 Time (s)',
    'Total Time (s)',
    'Completed At',
  ];

  const csvRows = [headers.join(',')];

  for (const r of results) {
    const row = [
      quote(r.first_name),
      quote(r.last_name),
      quote(getAnswerText(0, r.answer_1)),
      (r.time_1_ms / 1000).toFixed(1),
      quote(getAnswerText(1, r.answer_2)),
      (r.time_2_ms / 1000).toFixed(1),
      quote(getAnswerText(2, r.answer_3)),
      (r.time_3_ms / 1000).toFixed(1),
      (r.total_time_ms / 1000).toFixed(1),
      r.completed_at,
    ];
    csvRows.push(row.join(','));
  }

  const csv = csvRows.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="quiz-results.csv"',
    },
  });
}

function quote(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

import { redirect } from 'next/navigation';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PHASE_META } from '@/lib/phases';

export const dynamic = 'force-dynamic';

// Phase 3 auto-chain pointer. Resolves the next incomplete Phase 3
// sub-assessment for the logged-in student and 302s the runner to it.
// If every Phase 3 sub-assessment is already complete (or none are
// assigned), redirects back to /app.
//
// The Phase 3 button on /app links here; the Quiz/McQuiz "next" link
// (set on runners launched from Phase 3 enrollments) also points here
// so the student auto-progresses through the 6 sub-assessments without
// returning to the landing in between.
export default async function Phase3NextPage() {
  const { user } = await requireStudent('/app/phase-3/next');
  const supabase = await createClient();

  const { data } = await supabase
    .from('enrollments')
    .select('id, completed_at, assessments(code)')
    .eq('student_id', user.id)
    .eq('phase', 'post');

  type Row = {
    id: string;
    completed_at: string | null;
    assessments: { code: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const byCode = new Map<string, Row>();
  for (const r of rows) {
    if (r.assessments?.code) byCode.set(r.assessments.code, r);
  }

  // Walk the doctrine-ordered Phase 3 codes; first incomplete one wins.
  for (const code of PHASE_META.phase_3.assessmentCodes) {
    const row = byCode.get(code);
    if (row && !row.completed_at) {
      redirect(`/app/take/${row.id}`);
    }
  }

  // All Phase 3 sub-assessments complete (or none assigned). Back to landing.
  redirect('/app?phase=3&status=complete');
}

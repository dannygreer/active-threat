// Admin preview run for an MC assessment (the 50-question test bank).
// Uses loadMcQuestionsForStudent (NOT the admin loader) so the answer
// key never crosses the wire — the preview wire payload is identical to
// what a real student would receive.
//
// Phase 3 is a two-part battery: the written test (this page) then the
// video scenarios. So the preview's "Submitted" screen chains into the
// first Phase 3 scenario's preview, letting an admin walk the full
// Part 1 → Part 2 sequence.
//
// Route: /mvs/admin/preview/test-bank/[id]  where [id] = assessments.id (uuid)
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { loadMcQuestionsForStudent, listAssessmentsByCodes } from '@/lib/db';
import { PHASE_META } from '@/lib/phases';
import McQuiz from '@/components/quiz/McQuiz';

export const dynamic = 'force-dynamic';

export default async function TestBankPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const [questions, phase3Assessments] = await Promise.all([
    loadMcQuestionsForStudent(id),
    listAssessmentsByCodes(PHASE_META.phase_3.assessmentCodes),
  ]);
  if (questions.length === 0) notFound();

  // First scenario-kind assessment in the Phase 3 doctrine order =
  // Part 2's entry point. Deep-link the Submitted screen into its
  // scenario preview so the full battery is walkable.
  const firstScenario = phase3Assessments.find(
    (a) => a.kind === 'scenario' && a.scenario_fk,
  );
  const nextHref = firstScenario
    ? `/mvs/admin/preview/scenario/${firstScenario.scenario_fk}`
    : '/app';

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-950">
      <McQuiz questions={questions} previewMode nextHref={nextHref} />
    </div>
  );
}

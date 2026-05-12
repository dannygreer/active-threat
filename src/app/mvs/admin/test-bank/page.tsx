import { requireSuperAdmin } from '@/lib/auth';
import {
  listMcAssessments,
  loadMcQuestionsForAdmin,
  type McAdminAssessment,
  type McAdminQuestion,
} from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import McMarkersTab from '@/components/admin/McMarkersTab';

export const dynamic = 'force-dynamic';

export default async function AdminTestBankPage() {
  await requireSuperAdmin();
  const assessments: McAdminAssessment[] = await listMcAssessments();
  let questions: McAdminQuestion[] = [];
  let activeId: string | null = null;
  if (assessments.length > 0) {
    activeId = assessments[0].id;
    questions = await loadMcQuestionsForAdmin(activeId);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader title="Test Bank" activeRoute="/mvs/admin/test-bank" />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <McMarkersTab
            assessments={assessments}
            questions={questions}
            activeAssessmentId={activeId}
          />
        </div>
      </main>
    </div>
  );
}

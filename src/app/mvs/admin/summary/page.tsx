import { requireSuperAdmin } from '@/lib/auth';
import { getAllResponsesWide, getAllResponsesLong } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import SummaryTab from '@/components/admin/SummaryTab';

export const dynamic = 'force-dynamic';

export default async function AdminSummaryPage() {
  await requireSuperAdmin();
  const [responsesWide, responsesLong] = await Promise.all([
    getAllResponsesWide(),
    getAllResponsesLong(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader title="Summary" activeRoute="/mvs/admin/summary" />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <SummaryTab
            responsesLong={responsesLong}
            responsesWide={responsesWide}
          />
        </div>
      </main>
    </div>
  );
}

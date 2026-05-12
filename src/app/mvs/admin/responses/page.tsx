import { requireSuperAdmin } from '@/lib/auth';
import { getAllResponsesWide } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import ResponsesTab from '@/components/admin/ResponsesTab';

export const dynamic = 'force-dynamic';

export default async function AdminResponsesPage() {
  await requireSuperAdmin();
  const responses = await getAllResponsesWide();

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader
        title="Responses"
        subtitle={`${responses.length} total responses`}
        activeRoute="/mvs/admin/responses"
      />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <ResponsesTab responses={responses} />
        </div>
      </main>
    </div>
  );
}

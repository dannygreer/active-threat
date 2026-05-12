import { requireSuperAdmin } from '@/lib/auth';
import { getDefaultAdminScenario, getResponseTags } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import ResponseTaggingTab from '@/components/admin/ResponseTaggingTab';

export const dynamic = 'force-dynamic';

export default async function AdminTaggingPage() {
  await requireSuperAdmin();
  const scenario = await getDefaultAdminScenario();
  const tags = scenario ? await getResponseTags(scenario.dbId) : [];

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader title="Response Tagging" activeRoute="/mvs/admin/tagging" />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <ResponseTaggingTab scenario={scenario} tags={tags} />
        </div>
      </main>
    </div>
  );
}

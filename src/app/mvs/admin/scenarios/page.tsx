import { requireSuperAdmin } from '@/lib/auth';
import { getDefaultAdminScenario, getAllScenarios } from '@/lib/db';
import AdminHeader from '@/components/admin/AdminHeader';
import ScenarioBuilderTab from '@/components/admin/ScenarioBuilderTab';

export const dynamic = 'force-dynamic';

export default async function AdminScenariosPage() {
  await requireSuperAdmin();
  const [scenario, scenarios] = await Promise.all([
    getDefaultAdminScenario(),
    getAllScenarios(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader title="Scenarios" activeRoute="/mvs/admin/scenarios" />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <ScenarioBuilderTab scenario={scenario} scenarios={scenarios} />
        </div>
      </main>
    </div>
  );
}

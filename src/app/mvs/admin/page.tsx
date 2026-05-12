// Super-admin dashboard. Default landing for /mvs/admin. The five legacy
// tabs (Responses, Scenarios, Tagging, Test Bank, Summary) moved to their
// own routes under /mvs/admin/*; this page now renders aggregate KPIs +
// charts pulled from migration 0015's dashboard_* views.

import { requireSuperAdmin } from '@/lib/auth';
import AdminHeader from '@/components/admin/AdminHeader';
import DashboardClient from '@/components/admin/DashboardClient';
import { loadDashboardSnapshot } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireSuperAdmin();
  let snapshot;
  let dbError: string | null = null;
  try {
    snapshot = await loadDashboardSnapshot();
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Failed to load dashboard';
    snapshot = {
      volume: null,
      completion: [],
      activeThreatPairs: [],
      markers: [],
      certification: [],
      operational: null,
    };
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader activeRoute="/mvs/admin" />
      <main className="max-w-7xl mx-auto px-6 py-6">
        {dbError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800">Dashboard error</p>
            <p className="text-sm text-red-600 mt-1">{dbError}</p>
          </div>
        )}
        <DashboardClient snapshot={snapshot} />
      </main>
    </div>
  );
}

import { getAllResults, getAverageTime } from '@/lib/db';
import ResultsTable from '@/components/admin/ResultsTable';
import { adminLogout } from '@/actions/auth';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const results = getAllResults();
  const avgTime = getAverageTime();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Active Threat Training — Admin</h1>
            <p className="text-sm text-zinc-500">{results.length} total responses</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/api/admin/export-csv"
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Download CSV
            </a>
            <form action={adminLogout}>
              <button
                type="submit"
                className="px-4 py-2 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {avgTime !== null && (
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <p className="text-sm text-zinc-500 font-medium">Average Quiz Completion Time</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">
              {(avgTime / 1000).toFixed(1)}s
            </p>
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <ResultsTable results={results} />
        </div>
      </main>
    </div>
  );
}

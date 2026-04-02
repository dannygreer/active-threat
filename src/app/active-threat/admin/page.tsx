import { getAllResults, getAverageTime, QuizResultRow } from '@/lib/db';
import ResultsTable from '@/components/admin/ResultsTable';
import { adminLogout } from '@/actions/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  let results: QuizResultRow[] = [];
  let avgTime: number | null = null;
  let dbError: string | null = null;

  try {
    results = await getAllResults();
    avgTime = await getAverageTime();
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Failed to load results';
  }

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
        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-sm font-medium text-red-800">Database error</p>
            <p className="text-sm text-red-600 mt-1">{dbError}</p>
            <p className="text-xs text-red-500 mt-2">
              Make sure the <code>quiz_results</code> table exists in Supabase. Run the SQL in <code>supabase/setup.sql</code>.
            </p>
          </div>
        )}

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

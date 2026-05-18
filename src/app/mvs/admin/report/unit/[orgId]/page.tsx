// Unit-level command report (Phase C — Scully Report Generation Logic
// §8). Names are suppressed by construction: loadUnitReport never loads
// participant identity. Aggregate pressure patterns + training targets.
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { loadUnitReport } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function UnitReportPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await requireSuperAdmin();
  const { orgId } = await params;
  const r = await loadUnitReport(orgId);
  if (!r) notFound();
  const u = r.report;

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500">
            Phase 1 — Unit-Level Command Report · Names suppressed
          </p>
          <h1 className="mvs-display text-3xl font-bold text-zinc-900 mt-1">
            Unit Aggregate
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {u.nSessions} completed session{u.nSessions === 1 ? '' : 's'}
          </p>
        </div>

        {/* Patterns */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900">
            Unit Pressure Patterns
          </h2>
          {u.patterns.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No dominant unit-level pattern detected.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {u.patterns.map((p) => (
                  <span
                    key={p}
                    className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-zinc-900 text-white"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {u.patternText.map((t, i) => (
                  <p
                    key={i}
                    className="text-sm text-zinc-700 leading-relaxed"
                  >
                    {t}
                  </p>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Timing */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
            Unit Timing (seconds)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Unit Mean RT" value={u.unitMeanRt} />
            <Stat label="Unit Median RT" value={u.unitMedianRt} />
            <Stat label="Unit RT SD" value={u.unitRtSd} />
            <Stat label="Compression Index" value={u.unitCompressionIndex} />
            <Stat label="S5 Mean" value={u.s5.mean} />
            <Stat label="S5 SD" value={u.s5.sd} />
            <Stat label="S6 Mean" value={u.s6.mean} />
            <Stat label="S6 SD" value={u.s6.sd} />
          </div>
        </section>

        {/* Marker distribution */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
            Marker Distribution
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {u.markerTotals.map((m) => (
              <div
                key={m.label}
                className="border border-zinc-200 rounded-lg p-3"
              >
                <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {m.label}
                </p>
                <p className="mvs-display text-xl font-bold text-zinc-900 mt-1">
                  {m.total}
                  <span className="text-sm text-zinc-400 ml-2">
                    avg {m.avg}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Classification distribution */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
            Classification Distribution
          </h2>
          <ul className="space-y-2">
            {u.classificationDistribution.map((c) => (
              <li key={c.label} className="flex items-center gap-3">
                <span className="text-sm text-zinc-700 w-64 shrink-0">
                  {c.label}
                </span>
                <div className="flex-1 bg-zinc-100 rounded h-3 overflow-hidden">
                  <div
                    className="bg-zinc-900 h-full"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <span className="mvs-mono text-[11px] tabular-nums text-zinc-600 w-20 text-right">
                  {c.pct}% ({c.count})
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Dominant training target */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900">
            Dominant Training Target — {u.dominantTrainingTarget}
          </h2>
          <p className="text-sm text-zinc-700 leading-relaxed">
            {u.dominantTrainingRecommendation}
          </p>
        </section>

        <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400 text-center">
          Command report · individual identities suppressed · thresholds
          Version 1 (Scully doctrine §8)
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-200 rounded-lg p-3">
      <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mvs-display text-xl font-bold text-zinc-900 mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}

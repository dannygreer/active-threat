// Within-person pre/post comparison (Phase C — Scully Report Generation
// Logic §7). Compares the participant to themselves; no national norm.
// Generated from phase1_session_metrics — conservative, non-diagnostic.
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { loadPrePostReport } from '@/lib/dashboard';
import { formatAdminDateTime } from '@/lib/adminFormat';

export const dynamic = 'force-dynamic';

const DELTA_ROWS: {
  key:
    | 'meanRtChange'
    | 'rtSdChange'
    | 'instabilityLoadChange'
    | 'netGovernanceLoadChange'
    | 'recoveryChange'
    | 's5Change'
    | 'compressionChange';
  label: string;
  good: 'lower' | 'lower-neg';
}[] = [
  { key: 'meanRtChange', label: 'Mean RT Change', good: 'lower' },
  { key: 'rtSdChange', label: 'RT SD Change', good: 'lower' },
  { key: 'instabilityLoadChange', label: 'Instability Load Change', good: 'lower' },
  {
    key: 'netGovernanceLoadChange',
    label: 'Net Governance Load Change',
    good: 'lower',
  },
  { key: 'recoveryChange', label: 'Recovery Change', good: 'lower-neg' },
  { key: 's5Change', label: 'S5 Convergence Change', good: 'lower' },
  { key: 'compressionChange', label: 'Compression Change', good: 'lower' },
];

export default async function PrePostReportPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  await requireSuperAdmin();
  const { enrollmentId } = await params;
  const r = await loadPrePostReport(enrollmentId);
  if (!r) notFound();

  const fmt = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
  const toneFor = (v: number) =>
    v < 0
      ? 'text-emerald-700'
      : v > 0
      ? 'text-amber-700'
      : 'text-zinc-500';

  const summaryTone =
    r.report.summary === 'Improved'
      ? 'bg-emerald-600 text-white'
      : r.report.summary === 'Degraded'
      ? 'bg-red-600 text-white'
      : r.report.summary === 'No Meaningful Change'
      ? 'bg-zinc-200 text-zinc-700'
      : 'bg-amber-500 text-white';

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500">
            Phase 1 — Pre/Post Within-Person Comparison · Generated report
          </p>
          <h1 className="mvs-display text-3xl font-bold text-zinc-900 mt-1">
            {r.studentName ?? 'Participant'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Pre:{' '}
            {r.preCompletedAt ? formatAdminDateTime(r.preCompletedAt) : '—'} ·
            Post:{' '}
            {r.postCompletedAt ? formatAdminDateTime(r.postCompletedAt) : '—'}
          </p>
        </div>

        {/* Summary */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`mvs-mono text-[11px] uppercase tracking-widest px-3 py-1 rounded ${summaryTone}`}
            >
              {r.report.summary}
            </span>
            <span className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-zinc-100 text-zinc-600">
              Pre: {r.report.preClass}
            </span>
            <span className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-zinc-900 text-white">
              Post: {r.report.postClass}
            </span>
          </div>
          <p className="text-sm text-zinc-700 leading-relaxed">
            {r.report.summaryText}
          </p>
        </section>

        {/* Deltas */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
            Pre → Post Change
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DELTA_ROWS.map(({ key, label }) => {
              const v = r.report.delta[key];
              return (
                <div
                  key={key}
                  className="border border-zinc-200 rounded-lg p-3"
                >
                  <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {label}
                  </p>
                  <p
                    className={`mvs-display text-xl font-bold mt-1 ${toneFor(
                      v,
                    )}`}
                  >
                    {fmt(v)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-3">
            Negative = faster / more stable / less instability / more
            stabilizing (recovery)
          </p>
        </section>

        {/* Findings */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900">
            Improvement Findings (§7.1)
          </h2>
          {r.report.findings.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No improvement thresholds were met.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {r.report.findings.map((f) => (
                <li
                  key={f}
                  className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-emerald-100 text-emerald-800"
                >
                  {f}
                </li>
              ))}
            </ul>
          )}
          {r.report.classificationWorsened && (
            <p className="mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-red-100 text-red-700 inline-block">
              Classification worsened
            </p>
          )}
        </section>

        <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400 text-center">
          Within-person comparison · thresholds Version 1 (Scully doctrine
          §7) · same inputs produce the same report
        </p>
      </main>
    </div>
  );
}

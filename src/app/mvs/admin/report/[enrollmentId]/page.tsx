// Per-student Phase 1 report (Phase B — Scully Report Generation Logic
// §6/§9). Generated from phase1_session_metrics + the decision path;
// no manually written narrative. Conservative, non-diagnostic language.
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { loadPhase1Report } from '@/lib/dashboard';
import { formatAdminDateTime } from '@/lib/adminFormat';

export const dynamic = 'force-dynamic';

const MARKER_ROWS: { key: keyof MetricsLike; label: string }[] = [
  { key: 'escalation_total', label: 'Escalation' },
  { key: 'premature_commitment_total', label: 'Premature Commitment' },
  { key: 'drift_total', label: 'Drift' },
  { key: 'sequencing_break_total', label: 'Sequencing Break' },
  { key: 'governance_instability_total', label: 'Governance Instability' },
  { key: 'narrowing_total', label: 'Narrowing' },
  { key: 'recovery_total', label: 'Recovery (− = stabilizing)' },
];

type MetricsLike = Record<string, number | null>;

export default async function Phase1ReportPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  await requireSuperAdmin();
  const { enrollmentId } = await params;
  const r = await loadPhase1Report(enrollmentId);
  if (!r) notFound();

  const m = r.metrics as unknown as MetricsLike;
  const fmt = (v: number | null | undefined) =>
    v == null ? '—' : String(v);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500">
            Phase 1 — Baseline Operational Assessment · Generated report
          </p>
          <h1 className="mvs-display text-3xl font-bold text-zinc-900 mt-1">
            {r.studentName ?? 'Participant'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Phase: {r.phase} · Completed:{' '}
            {r.completedAt ? formatAdminDateTime(r.completedAt) : '—'}
          </p>
        </div>

        {/* Executive summary */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900">
            Executive Summary
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">{r.text.session}</Badge>
            <Badge tone="muted">{r.text.timing}</Badge>
            {r.text.modifiers.map((md) => (
              <Badge key={md} tone="warn">
                {md}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-zinc-700 leading-relaxed">
            {r.text.primaryText}
          </p>
          <p className="text-sm text-zinc-700 leading-relaxed">
            {r.text.timingText}
          </p>
          {r.text.modifierText.map((t, i) => (
            <p key={i} className="text-sm text-zinc-600 leading-relaxed">
              {t}
            </p>
          ))}
        </section>

        {/* Marker totals + governance load */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
            Marker Totals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MARKER_ROWS.map(({ key, label }) => (
              <Stat key={key} label={label} value={fmt(m[key])} />
            ))}
            <Stat label="Instability Load" value={fmt(m.instability_load)} />
            <Stat
              label="Net Governance Load"
              value={fmt(m.net_governance_load)}
              emphasize
            />
          </div>
        </section>

        {/* Timing table */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
            Timing (seconds)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Mean RT" value={fmt(m.mean_rt)} />
            <Stat label="Median RT" value={fmt(m.median_rt)} />
            <Stat label="RT SD" value={fmt(m.rt_sd)} />
            <Stat label="RT Range" value={fmt(m.rt_range)} />
            <Stat label="S5 Convergence RT" value={fmt(m.s5_rt)} />
            <Stat label="S6 Final-Pressure RT" value={fmt(m.s6_rt)} />
            <Stat
              label="Compression Index"
              value={fmt(m.compression_index)}
            />
            <Stat label="Events" value={fmt(m.event_count)} />
          </div>
        </section>

        {/* Decision path */}
        <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200">
            <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900">
              Decision Path
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-4 py-2 font-medium">Screen</th>
                <th className="text-left px-4 py-2 font-medium">Choice</th>
                <th className="text-left px-4 py-2 font-medium">
                  Classification
                </th>
                <th className="text-right px-4 py-2 font-medium">RT (s)</th>
              </tr>
            </thead>
            <tbody>
              {r.path.map((s) => (
                <tr key={s.order} className="border-t border-zinc-100">
                  <td className="px-4 py-2 text-zinc-500 tabular-nums">
                    {s.order}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-700">
                    {s.screenId}
                  </td>
                  <td className="px-4 py-2 text-zinc-800">
                    {s.timedOut ? (
                      <span className="text-amber-700">No response (timed out)</span>
                    ) : (
                      <>
                        <span className="font-mono text-zinc-500 mr-1">
                          {s.optionLabel}.
                        </span>
                        {s.optionText ?? '—'}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 text-xs">
                    {s.optionClassification ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                    {s.rtSeconds ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Training recommendation */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
          <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900">
            Training Recommendation
          </h2>
          <p className="text-sm text-zinc-700 leading-relaxed">
            {r.text.trainingRecommendation}
          </p>
        </section>

        <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400 text-center">
          Generated from backend telemetry · thresholds Version 1 (Scully
          doctrine) · same inputs produce the same report
        </p>
      </main>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'primary' | 'muted' | 'warn';
}) {
  const cls =
    tone === 'primary'
      ? 'bg-zinc-900 text-white'
      : tone === 'warn'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-zinc-100 text-zinc-600';
  return (
    <span
      className={`mvs-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded ${cls}`}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${
        emphasize ? 'border-zinc-900' : 'border-zinc-200'
      }`}
    >
      <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p
        className={`mvs-display font-bold text-zinc-900 mt-1 ${
          emphasize ? 'text-2xl' : 'text-xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

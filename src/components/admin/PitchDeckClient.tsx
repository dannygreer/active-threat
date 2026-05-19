'use client';

// 2×2 grid of the four effectiveness charts — Path Divergence, First-RT
// Delta, Marker Reduction, Certification Pass Rate — sized for browser
// print or a single screenshot. Designed for the doctor to share with
// prospective clients without the operational chrome.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { DashboardSnapshot } from '@/lib/dashboard';

interface Props {
  snapshot: DashboardSnapshot;
}

export default function PitchDeckClient({ snapshot }: Props) {
  const { activeThreatPairs, markers, certification } = snapshot;

  const divergedCount = activeThreatPairs.filter((p) => p.path_diverged).length;
  const divergencePct =
    activeThreatPairs.length === 0
      ? 0
      : Math.round((100 * divergedCount) / activeThreatPairs.length);

  const firstRtPre =
    activeThreatPairs.filter((p) => p.pre_first_rt != null).reduce(
      (a, p) => a + (p.pre_first_rt ?? 0),
      0,
    ) / (activeThreatPairs.filter((p) => p.pre_first_rt != null).length || 1);
  const firstRtPost =
    activeThreatPairs.filter((p) => p.post_first_rt != null).reduce(
      (a, p) => a + (p.post_first_rt ?? 0),
      0,
    ) / (activeThreatPairs.filter((p) => p.post_first_rt != null).length || 1);

  // Marker pivot (same shape as the dashboard chart).
  const byMarker = new Map<
    string,
    { marker: string; pre: number; post: number }
  >();
  for (const r of markers) {
    const slot = byMarker.get(r.marker) ?? { marker: r.marker, pre: 0, post: 0 };
    if (r.phase === 'pre') slot.pre = Number(r.fire_rate_pct);
    if (r.phase === 'post') slot.post = Number(r.fire_rate_pct);
    byMarker.set(r.marker, slot);
  }
  const markerData = Array.from(byMarker.values());

  const completed = certification.filter((c) => c.score_percent != null);
  // Completion-based certification (no pass/fail). The informational
  // pitch metric is the average MVS knowledge score, not a pass rate.
  const avgScore =
    completed.length === 0
      ? 0
      : Math.round(
          completed.reduce((s, c) => s + Number(c.score_percent), 0) /
            completed.length,
        );

  return (
    <div className="min-h-screen bg-white mvs-body p-8 print:p-0">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 print:hidden">
        <div>
          <h1 className="mvs-display text-2xl font-bold uppercase tracking-wide text-zinc-900">
            MVS — Effectiveness Snapshot
          </h1>
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
            Pitch-deck print view
          </p>
        </div>
        <a
          href="/mvs/admin"
          className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-700"
        >
          ← Back to dashboard
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Card 1: Path Divergence */}
        <div className="border border-zinc-200 rounded-lg p-6">
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Pre → Post path divergence
          </p>
          <div className="mvs-display text-6xl font-bold text-zinc-900 mt-2">
            {divergencePct}%
          </div>
          <p className="text-sm text-zinc-600 mt-2">
            of students took a different decision path after training
          </p>
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-4">
            {divergedCount}/{activeThreatPairs.length} pre / post pairs
          </p>
        </div>

        {/* Card 2: First-RT Delta */}
        <div className="border border-zinc-200 rounded-lg p-6">
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            First decision reaction time
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={[
                { phase: 'Pre', rt: Math.round(firstRtPre) },
                { phase: 'Post', rt: Math.round(firstRtPost) },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="phase" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit=" ms" width={70} />
              <Tooltip formatter={(v) => `${v} ms`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="rt" fill="#0891b2" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-zinc-600 mt-2 text-center">
            Higher post = more deliberation. Doctrine-good.
          </p>
        </div>

        {/* Card 3: Marker Reduction */}
        <div className="border border-zinc-200 rounded-lg p-6 col-span-1 md:col-span-2">
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            Event-marker reduction (pre vs post)
          </p>
          {markerData.every((d) => d.pre === 0 && d.post === 0) ? (
            <p className="text-sm text-zinc-500 p-6">
              Awaiting Dr. Scully marker tagging.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={markerData} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="marker" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" width={50} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="pre" name="Pre" fill="#a1a1aa" radius={[2, 2, 0, 0]} />
                <Bar dataKey="post" name="Post" radius={[2, 2, 0, 0]}>
                  {markerData.map((d, i) => (
                    <Cell key={i} fill={d.post <= d.pre ? '#0891b2' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Card 4: Average certification score */}
        <div className="border border-zinc-200 rounded-lg p-6 col-span-1 md:col-span-2">
          <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Average certification score
          </p>
          <div className="mvs-display text-6xl font-bold text-zinc-900 mt-2">
            {avgScore}%
          </div>
          <p className="text-sm text-zinc-600 mt-2">
            mean score across {completed.length} certified completer
            {completed.length === 1 ? '' : 's'} on the 50-question exam —
            MVS is completion-based, not pass/fail.
          </p>
        </div>
      </div>

      <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-8 text-center print:mt-4">
        © {new Date().getFullYear()} Mental Velocity System
      </p>
    </div>
  );
}

'use client';

// Super-admin dashboard. Renders 4 sections:
//   A — Volume & Activity
//   B — Training Effectiveness (the doctor's pitch deck charts)
//   C — Certification
//   D — Operational Health
//
// Pure presentation: all aggregates are computed by the SQL views in
// migration 0015 and arrive as props from the Server Component parent.
// Empty-state branches guard each chart so the dashboard renders cleanly
// even when the doctor hasn't tagged option-markers yet (which makes
// dashboard_marker_aggregates all-zero today).
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
  Pie,
  PieChart,
} from 'recharts';
import type {
  DashboardSnapshot,
  ActiveThreatPair,
  MarkerAggregate,
  ExamCertification,
  CompletionRow,
} from '@/lib/dashboard';

interface Props {
  snapshot: DashboardSnapshot;
}

export default function DashboardClient({ snapshot }: Props) {
  const {
    volume,
    completion,
    activeThreatPairs,
    markers,
    certification,
  } = snapshot;

  return (
    <div className="space-y-10">
      <SectionVolume
        volume={volume}
        completion={completion}
      />
      <SectionEffectiveness
        pairs={activeThreatPairs}
        markers={markers}
      />
      <SectionCertification certification={certification} />
      <PrintDeckLink />
    </div>
  );
}

// ---------------------------------------------------------------------
// Section A — Volume & Activity
// ---------------------------------------------------------------------
function SectionVolume({
  volume,
  completion,
}: {
  volume: DashboardSnapshot['volume'];
  completion: CompletionRow[];
}) {
  return (
    <section>
      <SectionHeader label="Volume & Activity" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Orgs" value={volume?.total_orgs ?? 0} />
        <Tile label="Students" value={volume?.total_students ?? 0} />
        <Tile
          label="Completed enrollments"
          value={volume?.total_completed_sessions ?? 0}
        />
        <Tile
          label="In flight"
          value={volume?.in_flight_sessions ?? 0}
        />
      </div>

      <Card className="mt-4">
        <CardTitle>Completion by assessment + phase</CardTitle>
        {completion.length === 0 ? (
          <EmptyState text="No enrollments yet." />
        ) : (
          <table className="w-full text-sm mt-2">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Assessment</th>
                <th className="text-left px-3 py-2 font-medium">Phase</th>
                <th className="text-right px-3 py-2 font-medium">Enrolled</th>
                <th className="text-right px-3 py-2 font-medium">Completed</th>
                <th className="text-right px-3 py-2 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {completion.map((r, i) => (
                <tr
                  key={`${r.assessment_code}-${r.phase}-${i}`}
                  className="border-t border-zinc-100"
                >
                  <td className="px-3 py-2 text-zinc-700">
                    {r.assessment_name}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 uppercase tracking-wider text-[11px]">
                    {r.phase}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.enrolled}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.completed}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.completion_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------
// Section B — Training Effectiveness (the pitch deck)
// ---------------------------------------------------------------------
function SectionEffectiveness({
  pairs,
  markers,
}: {
  pairs: ActiveThreatPair[];
  markers: MarkerAggregate[];
}) {
  const divergedCount = pairs.filter((p) => p.path_diverged).length;
  const divergencePct =
    pairs.length === 0 ? 0 : Math.round((100 * divergedCount) / pairs.length);

  const firstRtPre =
    pairs.filter((p) => p.pre_first_rt != null).reduce((a, p) => a + (p.pre_first_rt ?? 0), 0) /
    (pairs.filter((p) => p.pre_first_rt != null).length || 1);
  const firstRtPost =
    pairs.filter((p) => p.post_first_rt != null).reduce((a, p) => a + (p.post_first_rt ?? 0), 0) /
    (pairs.filter((p) => p.post_first_rt != null).length || 1);
  const firstRtDelta = Math.round(firstRtPost - firstRtPre);

  return (
    <section data-pitch>
      <SectionHeader label="Training Effectiveness" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Path divergence stat */}
        <Card>
          <CardTitle>Pre → Post path divergence</CardTitle>
          {pairs.length === 0 ? (
            <EmptyState text="Awaiting students with both pre and post completions." />
          ) : (
            <>
              <div className="mvs-display text-5xl font-bold text-zinc-900 mt-2">
                {divergencePct}%
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                {divergedCount} of {pairs.length} students took a different
                decision path post-training.
              </p>
              <p className="mvs-mono text-[10px] text-zinc-400 mt-3 uppercase tracking-widest">
                Same scenario, different decisions = changed decision profile.
              </p>
            </>
          )}
        </Card>

        {/* First-decision RT delta */}
        <Card>
          <CardTitle>First-decision reaction time</CardTitle>
          {pairs.length === 0 ? (
            <EmptyState text="Awaiting pre / post pairs." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={[
                    { phase: 'Pre', rt: Math.round(firstRtPre) },
                    { phase: 'Post', rt: Math.round(firstRtPost) },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="phase"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit=" ms"
                    width={70}
                  />
                  <Tooltip
                    formatter={(v) => `${v} ms`}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="rt" fill="#0891b2" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mvs-mono text-[10px] text-zinc-400 mt-2 uppercase tracking-widest text-center">
                Δ {firstRtDelta >= 0 ? '+' : ''}
                {firstRtDelta} ms — higher post = more deliberation (good per doctrine)
              </p>
            </>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Event-marker reduction (pre vs post)</CardTitle>
        <MarkerReductionChart markers={markers} />
      </Card>
    </section>
  );
}

function MarkerReductionChart({ markers }: { markers: MarkerAggregate[] }) {
  // Pivot the SQL rows into a per-marker {marker, pre, post} shape Recharts
  // can render as grouped bars.
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
  const data = Array.from(byMarker.values());
  const anyFires = data.some((d) => d.pre > 0 || d.post > 0);

  if (!anyFires) {
    return (
      <div className="mt-4 p-6 border border-dashed border-zinc-300 rounded-lg bg-zinc-50">
        <p className="text-sm text-zinc-600">
          No marker fires recorded yet — the chart will populate as Dr. Scully
          tags option-marker associations in the Scenario Builder + Test Bank
          tabs.
        </p>
        <p className="mvs-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-2">
          See needs_doctor.md §2b
        </p>
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="marker"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
            width={50}
          />
          <Tooltip
            formatter={(v) => `${Number(v).toFixed(2)}%`}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="pre" name="Pre" fill="#a1a1aa" radius={[2, 2, 0, 0]} />
          <Bar dataKey="post" name="Post" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.post <= d.pre ? '#0891b2' : '#dc2626'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mvs-mono text-[10px] text-zinc-400 mt-2 uppercase tracking-widest">
        Lower post (cyan) = doctrine improvement. Higher post (red) = regression.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------
// Section C — Certification
// ---------------------------------------------------------------------
function SectionCertification({
  certification,
}: {
  certification: ExamCertification[];
}) {
  const completed = certification.filter((c) => c.score_percent != null);
  const passed = completed.filter((c) => c.pass === true).length;
  const passPct = completed.length === 0 ? 0 : Math.round((100 * passed) / completed.length);

  const buckets = [
    { range: '<70', count: 0 },
    { range: '70–79', count: 0 },
    { range: '80–89', count: 0 },
    { range: '90–100', count: 0 },
  ];
  for (const c of completed) {
    const s = Number(c.score_percent);
    if (s >= 90) buckets[3].count++;
    else if (s >= 80) buckets[2].count++;
    else if (s >= 70) buckets[1].count++;
    else buckets[0].count++;
  }

  const tiers = ['high', 'certified', 'borderline', 'not_certified'] as const;
  const tierCounts = tiers.map((t) => ({
    name: t,
    value: completed.filter((c) => c.tier === t).length,
  }));
  const TIER_COLORS: Record<(typeof tiers)[number], string> = {
    high: '#0891b2',
    certified: '#22c55e',
    borderline: '#eab308',
    not_certified: '#dc2626',
  };

  return (
    <section data-pitch>
      <SectionHeader label="Certification" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardTitle>Pass rate</CardTitle>
          {completed.length === 0 ? (
            <EmptyState text="No certification exams completed yet." />
          ) : (
            <>
              <div className="mvs-display text-5xl font-bold text-zinc-900 mt-2">
                {passPct}%
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                {passed} of {completed.length} students scored ≥ 80%.
              </p>
            </>
          )}
        </Card>

        <Card>
          <CardTitle>Score distribution</CardTitle>
          {completed.length === 0 ? (
            <EmptyState text="No scores yet." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="count" fill="#0891b2" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Tier breakdown</CardTitle>
          {completed.length === 0 ? (
            <EmptyState text="No tiers yet." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={tierCounts}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={60}
                  label
                >
                  {tierCounts.map((t, i) => (
                    <Cell key={i} fill={TIER_COLORS[t.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: 10 }}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Pitch-deck print mode link
// ---------------------------------------------------------------------
function PrintDeckLink() {
  return (
    <p className="text-center pt-4">
      <a
        href="/mvs/admin/pitch"
        className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-700"
      >
        Print pitch deck view →
      </a>
    </p>
  );
}

// ---------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------
function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="mvs-mono text-xs font-semibold text-zinc-900 uppercase tracking-[0.22em] mb-3">
      {label}
    </h2>
  );
}

function Tile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mvs-display text-3xl font-bold text-zinc-900 mt-1 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-zinc-200 rounded-xl p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
      {children}
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-2 p-6 border border-dashed border-zinc-300 rounded-lg bg-zinc-50 text-sm text-zinc-500">
      {text}
    </div>
  );
}

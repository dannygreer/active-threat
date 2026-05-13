'use client';

// Certification pass-rate stat + score-distribution histogram + tier
// breakdown pie. Extracted from DashboardClient.tsx so the Dashboard's
// Section C and the Phase 3 admin page can both render these without
// duplicating Recharts code.
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
import type { ExamCertification } from '@/lib/dashboard';

interface Props {
  certification: ExamCertification[];
}

export default function CertificationCharts({ certification }: Props) {
  const completed = certification.filter((c) => c.score_percent != null);
  const passed = completed.filter((c) => c.pass === true).length;
  const passPct =
    completed.length === 0 ? 0 : Math.round((100 * passed) / completed.length);

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
  // Donut palette aligned with the rest of admin: deep cyan for the
  // pass tiers (matches the Pre/Post bars), warm zinc for borderline,
  // dark red for fail. No bright greens or yellows.
  const TIER_COLORS: Record<(typeof tiers)[number], string> = {
    high: '#164e63',          // cyan-900
    certified: '#0891b2',     // cyan-600 (admin accent)
    borderline: '#a1a1aa',    // zinc-400
    not_certified: '#7f1d1d', // red-900
  };
  const TIER_LABELS: Record<(typeof tiers)[number], string> = {
    high: 'High',
    certified: 'Certified',
    borderline: 'Borderline',
    not_certified: 'Not certified',
  };
  const tierData = tierCounts.map((t) => ({
    ...t,
    displayName: TIER_LABELS[t.name],
  }));

  return (
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
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={tierData}
                dataKey="value"
                nameKey="displayName"
                innerRadius={48}
                outerRadius={75}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {tierData.map((t, i) => (
                  <Cell key={i} fill={TIER_COLORS[t.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconSize={10}
                iconType="square"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
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

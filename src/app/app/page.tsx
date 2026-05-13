import Link from 'next/link';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PHASE_META } from '@/lib/phases';

export const dynamic = 'force-dynamic';

type EnrollmentRow = {
  id: string;
  phase: 'pre' | 'post' | 'practice';
  completed_at: string | null;
  assessments: { code: string } | null;
};

export default async function StudentHome() {
  const { profile } = await requireStudent('/app');
  const supabase = await createClient();

  const { data } = await supabase
    .from('enrollments')
    .select('id, phase, completed_at, assessments(code)');

  const rows = (data ?? []) as unknown as EnrollmentRow[];

  // Phase 1 = active_threat pre. Phase 2 = active_threat post.
  // Phase 3 = any of the 6 phase-3 codes (all phase='post').
  const phase1 = rows.find(
    (r) => r.assessments?.code === 'active_threat_v1' && r.phase === 'pre',
  );
  const phase2 = rows.find(
    (r) => r.assessments?.code === 'active_threat_v1' && r.phase === 'post',
  );
  const phase3Rows = rows.filter(
    (r) =>
      r.assessments?.code != null &&
      PHASE_META.phase_3.assessmentCodes.includes(r.assessments.code) &&
      r.phase === 'post',
  );

  const phase1Done = !!phase1?.completed_at;
  const phase2Done = !!phase2?.completed_at;
  const phase3Done =
    phase3Rows.length > 0 && phase3Rows.every((r) => r.completed_at != null);

  const phase1State = phase1
    ? phase1Done
      ? 'done'
      : 'active'
    : 'missing';
  const phase2State = phase2
    ? phase2Done
      ? 'done'
      : phase1Done
      ? 'active'
      : 'locked'
    : 'missing';
  const phase3State =
    phase3Rows.length === 0
      ? 'missing'
      : phase3Done
      ? 'done'
      : phase2Done
      ? 'active'
      : 'locked';

  const greeting = profile.full_name?.split(' ')[0] || 'Welcome';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Session day
        </p>
        <h1 className="mvs-display text-3xl font-bold text-zinc-900 mt-1">
          Hi, {greeting}.
        </h1>
        <p className="text-sm text-zinc-600 mt-2">
          Three phases today. Complete each one in order — the next phase
          unlocks when you finish the previous.
        </p>
      </div>

      <PhaseCard
        number={1}
        title={PHASE_META.phase_1.name}
        description="Baseline measurement before training. Quick branching scenario."
        state={phase1State}
        href={phase1 ? `/app/take/${phase1.id}` : null}
      />
      <PhaseCard
        number={2}
        title={PHASE_META.phase_2.name}
        description="Retake the same scenario at the end of the day. We measure how your decisions changed."
        state={phase2State}
        href={phase2 ? `/app/take/${phase2.id}` : null}
      />
      <PhaseCard
        number={3}
        title={PHASE_META.phase_3.name}
        description="End-of-day certification: written test + five video scenarios. Each one starts automatically when the previous finishes."
        state={phase3State}
        href="/app/phase-3/next"
      />
    </div>
  );
}

function PhaseCard({
  number,
  title,
  description,
  state,
  href,
}: {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  state: 'active' | 'locked' | 'done' | 'missing';
  href: string | null;
}) {
  const tone =
    state === 'active'
      ? 'border-cyan-700 bg-white shadow-sm'
      : state === 'done'
      ? 'border-emerald-200 bg-emerald-50/40'
      : 'border-zinc-200 bg-zinc-50 opacity-70';

  const cta =
    state === 'active' ? (
      <Link
        href={href ?? '#'}
        className="mvs-mono px-5 py-3 bg-zinc-900 text-white rounded-lg text-sm uppercase tracking-widest hover:bg-zinc-800 transition-colors"
      >
        Start →
      </Link>
    ) : state === 'done' ? (
      <span className="mvs-mono px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs uppercase tracking-widest">
        Complete ✓
      </span>
    ) : state === 'locked' ? (
      <span className="mvs-mono px-3 py-1.5 bg-zinc-200 text-zinc-500 rounded-full text-xs uppercase tracking-widest">
        Locked
      </span>
    ) : (
      <span className="mvs-mono px-3 py-1.5 bg-zinc-200 text-zinc-500 rounded-full text-xs uppercase tracking-widest">
        Not assigned
      </span>
    );

  return (
    <section
      className={`border-2 rounded-2xl p-6 flex items-start justify-between gap-4 transition-colors ${tone}`}
    >
      <div className="flex-1 min-w-0">
        <p className="mvs-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Phase {number}
        </p>
        <h2 className="mvs-display text-xl font-bold text-zinc-900 mt-1">
          {title}
        </h2>
        <p className="text-sm text-zinc-600 mt-2">{description}</p>
      </div>
      <div className="shrink-0">{cta}</div>
    </section>
  );
}

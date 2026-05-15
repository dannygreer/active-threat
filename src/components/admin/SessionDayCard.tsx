'use client';

// Live-session moderator control on the org detail page. The moderator
// keeps this open during a session and flips each phase on when the
// room should advance — that's the ONLY gate on the student landing
// (no auto completion lock). Phase 1 is always on. Phases are
// sequential: Phase 3 can't open while Phase 2 is closed; closing
// Phase 2 cascades Phase 3 closed.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setOrgSessionPhase } from '@/actions/orgs';
import { PHASE_META } from '@/lib/phases';

export default function SessionDayCard({
  orgId,
  initialPhase,
}: {
  orgId: string;
  initialPhase: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<number>(initialPhase);
  const [pending, startTransition] = useTransition();

  const apply = (next: 1 | 2 | 3) => {
    const prev = phase;
    setPhase(next); // optimistic
    startTransition(async () => {
      try {
        await setOrgSessionPhase(orgId, next);
        router.refresh();
      } catch (e) {
        setPhase(prev); // rollback
        window.alert(e instanceof Error ? e.message : 'Update failed');
      }
    });
  };

  const rows: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: PHASE_META.phase_1.name },
    { n: 2, label: PHASE_META.phase_2.name },
    { n: 3, label: PHASE_META.phase_3.name },
  ];

  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-6">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h2 className="mvs-mono text-xs font-semibold text-zinc-900 uppercase tracking-[0.22em]">
          Session Day
        </h2>
        {pending && (
          <span className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-400">
            Saving…
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 mb-4">
        Flip a phase on when the room should start it. Students see it
        unlock on their landing page immediately.
      </p>

      <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-lg">
        {rows.map(({ n, label }) => {
          const enabled = n <= phase;
          // Phase 1 always on. Phase N enable requires N-1 enabled.
          const locked = n === 1 || (n > 1 && phase < n - 1);
          const toggle = () => {
            if (n === 1) return;
            if (enabled) apply((n - 1) as 1 | 2 | 3); // close this + above
            else apply(n); // open up to this phase
          };
          return (
            <div
              key={n}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Phase {n}
                </p>
                <p className="text-sm text-zinc-900 mt-0.5">{label}</p>
              </div>
              <button
                type="button"
                onClick={toggle}
                disabled={pending || locked}
                aria-pressed={enabled}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  enabled ? 'bg-[#016FD4]' : 'bg-zinc-300'
                } ${
                  pending || locked
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                title={
                  n === 1
                    ? 'Phase 1 is always available'
                    : locked
                      ? `Enable Phase ${n - 1} first`
                      : enabled
                        ? `Disable Phase ${n}`
                        : `Enable Phase ${n}`
                }
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

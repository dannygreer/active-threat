# Day 11 Prompt — Video player integration + Day 10 cleanup

Paste this into Claude Code (cwd = repo root).

Days 1-10 shipped the full LMS architecture including Phase 1 Freeze (multi-marker events, scenario tags, revisable commitment, scenario classification). Day 10.5 seeded the 5 doctor-delivered scenarios. Today (Day 11) we integrate the video player so the scenarios can show MP4s when they're ready, and close out the three known gaps from Day 10's handoff.

Read these in order before any code:
1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/phase1_freeze.md`
4. `worklog.md` — especially Day 10 ("Known gaps") and Day 10.5 entries
5. `docs/needs_doctor.md`

**Test asset available:** `public/scenarios/test.mp4` (5.59 seconds, 1920×1080, H.264/AAC, 6MB). Danny dropped this in for Day 11's E2E test — it's a Synthesia render from a prior video iteration that isn't doctrinally usable as final content, but is perfect for verifying the playback flow. Real production videos will be swapped in via Supabase Storage URLs as they're produced.

You are running with `--dangerously-skip-permissions`. Plan to work autonomously for **3 hours**.

## Branch
Branch from `main` as `feat/video-player-and-cleanup`. Verify Day 10.5 (`feat/seed-scenarios-v1` or similar) has merged — the 5 scenarios should exist in the DB and `getActiveScenario()` should be renamed to `getWalkInScenario()` and hard-bound to `active_threat_v1`. If Day 10.5 hasn't shipped yet, see Phase A.

## Doctrine — video playback rules

Per Dr. Scully's authoring rules (`MVS LMS FULL PACKAGE.docx`):
- **No overlays, no narration, no music** — the video itself is the stimulus
- **No skip, no scrub, no replay** — students see it once at delivered pace
- **No "instructions" screen before the video** — guidance signals are forbidden
- **Static camera, neutral affect** — production concern, but the player should NOT add chrome that adds visual stimuli

The video player is intentionally **plain**: no controls bar, no progress indicator, no volume slider. It plays once, then questions appear. The only affordance is a "Begin" button shown when autoplay is blocked (mobile Safari).

## Scope today

Six things, in this order:

1. Migration `0010_video_url.sql` — adds `video_url` + `video_duration_seconds` columns to `scenarios`.
2. `<ScenarioVideo>` component — HTML5 player with the doctrine constraints.
3. Wire into the scenario runner — video plays before Q1; questions are gated on `ended` event.
4. **Day 10 cleanup #1:** wire the MC option marker editor UI (server action exists from Day 10; needs the per-option 8-marker checkbox grid in admin).
5. **Day 10 cleanup #2:** verify `getActiveScenario()` was renamed to `getWalkInScenario()` and hard-bound to `active_threat_v1` (Day 10.5 task — confirm done; do it now if not).
6. Subagent review focused on doctrine compliance + the no-leak / no-replay guarantees.

### Phase A — Foundation check (~10 min)
1. `git checkout main && git pull`. `git checkout -b feat/video-player-and-cleanup`.
2. `npm install` → `npm run build`.
3. **Verify Day 10.5 prerequisites:**
   ```sql
   select count(*) from scenarios where scenario_id in (
     'conversation_velocity_v1','perception_narrowing_v1','escalation_loop_v1',
     'team_velocity_v1','recovery_drift_v1'
   );
   -- expect: 5
   ```
   If 0, Day 10.5 hasn't run. Either run it now (`psql ... -f supabase/seeds/scenarios_v1.sql`) or log to `docs/needs_human.md` and stop after Phase B; the video integration is meaningful only with the scenarios seeded.

4. Search the codebase for stale references:
   ```bash
   grep -rn "getActiveScenario" src/
   ```
   If any remain (i.e., Day 10.5's refactor wasn't completed), that's Phase E.5 below.

### Phase B — Migration 0010 (~20 min)

Create `supabase/migrations/0010_video_url.sql`:

```sql
-- 0010_video_url.sql
-- Adds video metadata to scenarios. Phase 1 Freeze + Day 10.5 already shipped
-- the multi-marker architecture and seeded the 5 new scenarios; this adds the
-- last column needed before video MP4s can be served.

alter table scenarios
  add column video_url text,                       -- Supabase Storage public URL (or any HTTPS MP4 URL)
  add column video_duration_seconds int;           -- hint for preload + integrity check; null if no video

-- Active-threat scenario has no video (text-only walk-in baseline). Leave NULL.
-- The 5 new scenarios get URLs populated via admin UI as MP4s land in Storage.

-- Constraint: if video_url is set, duration must also be set (helps catch
-- admin UI mistakes where someone pastes a URL without filling duration).
alter table scenarios
  add constraint video_url_requires_duration
  check ((video_url is null) = (video_duration_seconds is null));
```

Apply via `npx supabase db push`. Verify the constraint by trying an invalid update in SQL editor (should fail).

Add 2 vitest cases in a new `tests/video.spec.ts`:
- Setting `video_url` without `video_duration_seconds` violates the constraint ✓
- Setting both, or neither, both succeed ✓

### Phase C — `<ScenarioVideo>` component (~75 min)

Create `src/components/quiz/ScenarioVideo.tsx`. Doctrine-compliant HTML5 video player:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  durationSeconds: number;     // for preload + integrity
  onEnded: () => void;          // called when playback completes
}

export function ScenarioVideo({ src, durationSeconds, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [endedFired, setEndedFired] = useState(false);

  // Attempt autoplay on mount; show "Begin" button if blocked.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;          // doctrine: sound IS the signal in conversation scenarios
    const tryPlay = async () => {
      try {
        await v.play();
      } catch {
        setNeedsTapToPlay(true);
      }
    };
    tryPlay();
  }, []);

  // Doctrinal guards — no scrub, no replay, no fast-forward.
  // We don't render controls, but defensive event handlers catch keyboard / programmatic tampering.
  const onSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    // Allow seeking only forward from current playback position (which natural playback does);
    // reject any backwards seek or jump past current playhead.
    // Simplest implementation: snap currentTime back to itself if user attempts seek.
    // (Browsers fire `seeking` when programmatic OR user interaction moves the time.)
    if (Math.abs(v.currentTime - v.played.end(v.played.length - 1 || 0)) > 0.5) {
      v.currentTime = v.played.end(v.played.length - 1 || 0);
    }
  };

  const handleEnded = () => {
    if (endedFired) return;       // debounce
    setEndedFired(true);
    onEnded();
  };

  const handleBegin = async () => {
    setNeedsTapToPlay(false);
    await videoRef.current?.play();
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onSeeking={onSeeking}
        // NO controls attribute, NO controlsList — this is intentional
        className="w-full bg-black rounded"
      />
      {needsTapToPlay && (
        <button
          onClick={handleBegin}
          className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-lg rounded"
          aria-label="Begin scenario"
        >
          Begin
        </button>
      )}
    </div>
  );
}
```

Key constraints encoded:
- No `controls` attribute → no scrub bar, no replay, no volume
- `playsInline` + no fullscreen-on-play → keeps the player inline so the page background (zero-distraction dark) remains the visual context
- `onSeeking` handler defensively snaps back any rogue seek — this catches programmatic tampering via devtools and keyboard arrows (arrow keys advance video time on a focused `<video>`)
- `onEnded` is debounced via `endedFired` state so it can only fire once per mount
- "Begin" button only shows if autoplay is blocked (mobile Safari, sometimes Firefox); single click, then removed

### Phase D — Wire into the scenario runner (~45 min)

In `src/components/quiz/Quiz.tsx`:

1. Read `scenario.videoUrl` (assuming the type is updated to expose it — also add `videoDurationSeconds`)
2. Add a new step value `'video' | 'reading' | 'answering' | 'results'` and `'title'` (the existing values)
3. When a scenario has `videoUrl`:
   - Skip the `'title'` step if it was already set (for authenticated student path it's skipped per Day 4)
   - Mount `<ScenarioVideo>` first as step `'video'`
   - On `onEnded`, transition to `'reading'` (or directly to `'answering'` for the new scenarios, since their `screen_text` is redundant with the video they just watched)
4. When a scenario has NO `videoUrl` (e.g., active-threat):
   - Existing behavior: `'reading'` step shows `screen_text`, then `'answering'`

**Important call:** for scenarios that have a video, do we still show `screen_text` afterward? The 5 new scenarios have setup text in `screen_text` from the Day 10.5 seed, but that text becomes redundant if the video shows the same situation. Recommend: when `videoUrl` is set, skip the `'reading'` step and go straight from `'video'` to `'answering'`. Keep `screen_text` populated as accessibility fallback / for admin reference, but don't show it during a video-led delivery.

5. Update `src/lib/db.ts` to include `video_url` and `video_duration_seconds` in the scenario fetch.

6. Update the scenario type in `src/types/index.ts`:
   ```ts
   export interface Scenario {
     // ... existing fields
     videoUrl: string | null;
     videoDurationSeconds: number | null;
   }
   ```

### Phase E — Day 10 cleanup (~45 min)

#### E.1 MC option marker editor UI (~30 min)
Day 10 shipped the per-option 8-marker checkbox grid for scenario options (`screen_options.triggers_markers`). The same data exists on `mc_options.triggers_markers` (Day 10's migration added it), and a server action to update it was wired, but the admin UI grid was never built.

In whatever admin component renders the MC test bank questions for editing (likely `src/components/admin/...`), add the same 8-checkbox grid per `mc_option`, calling the existing server action. Pattern should mirror exactly what was done for `screen_options` in Day 10 — same 8 marker keys, same component shape if possible.

#### E.2 `getActiveScenario` → `getWalkInScenario` rename verification (~10 min)
Run `grep -rn "getActiveScenario" src/`. If any matches remain:
- Rename function in `src/lib/db.ts` to `getWalkInScenario`
- Replace its query with `.eq('scenario_id', 'active_threat_v1').single()` (hard-bound)
- Update every call site

If no matches remain, Day 10.5 already did this. Skip.

#### E.3 Skip `presented_options` server-rederivation
Day 10 noted this as a known gap. It's academic until randomization ships in Phase 2. Don't address today; just document in `worklog.md` that it's still deferred.

### Phase F — Subagent review (~20 min)

Launch a Task with this brief:

> Independently review the video player + Day 10 cleanup on branch `feat/video-player-and-cleanup`. Specifically check:
> 1. Does `<ScenarioVideo>` correctly prevent: scrubbing via keyboard arrows, seeking via devtools, replay after the video ends, fast-forward, skip via clicking far ahead on a touch device? Cite the defensive code paths.
> 2. Can `onEnded` fire more than once per mount, causing duplicate transitions to `'answering'`?
> 3. Is the "Begin" button correctly removed after autoplay succeeds, so it doesn't appear during playback as a visible overlay?
> 4. Does the runner correctly skip the `'reading'` step when a scenario has `video_url`, so students don't see redundant setup text after watching the video?
> 5. For active-threat (no video), is the original `'reading' → 'answering'` flow intact?
> 6. Reaction time capture: does Q1's `startTimeRef` start AFTER the video ends, not when the page first loads? Trace the timing.
> 7. The `video_url_requires_duration` constraint — does it actually fire on the right combinations? Spot-check with a constraint-violating update attempt.
> Report findings with file:line references.

Address findings. Items 1, 2, 6 are real doctrine violations if they fail.

### Phase G — End-to-end test (~15 min)

A test MP4 is already in the repo at `public/scenarios/test.mp4` (5.59s, 1920×1080, H.264/AAC). Use it for E2E verification:

1. Set Scenario 1's `video_url` + `video_duration_seconds`:
   ```sql
   update scenarios
      set video_url = '/scenarios/test.mp4',
          video_duration_seconds = 6
    where scenario_id = 'conversation_velocity_v1';
   ```
   Note: `/scenarios/test.mp4` works both locally (served by Next.js from `public/`) AND in production (Vercel serves `public/` content at the root). No Supabase Storage URL needed for the placeholder.

2. As a test student with an enrollment for `scenario_conversation_velocity_v1`, take the assessment.

3. Verify the full flow:
   - Page loads → video starts playing automatically (or "Begin" button appears on iOS)
   - Video plays through (~6 seconds)
   - Try pressing arrow keys during playback — should NOT scrub
   - Try right-clicking the video — should not show controls
   - Video ends → Q1 appears
   - Q1's reaction time starts AFTER the video ends (not when the page loaded)
   - `onEnded` fires exactly once (check: refresh mid-video and watch for duplicate question transitions)

4. Verify active-threat (no `video_url`) STILL works as text-only — that's the regression guard for the walk-in path.

**Note on the test asset:** Danny is replacing this MP4 with real per-scenario videos as they're produced. The file is committed to the repo as a temporary placeholder. Once production MP4s are uploaded to Supabase Storage, the `scenarios.video_url` values get updated to the Supabase URLs and `public/scenarios/test.mp4` can be deleted.

### Phase H — Stop cleanly (~15 min)

1. Append `worklog.md`: what shipped, RLS impact, subagent findings, what video URLs are still empty.
2. Update `docs/needs_human.md`: any required env or Supabase Storage bucket configuration ("ensure `scenarios` bucket is public; verify CORS allows the production domain").
3. Update `docs/needs_doctor.md`: video URLs aren't blocked on the doctor — they're a Danny task once the MP4s exist. Note that.
4. `npm run build` — must pass.
5. Commit: `feat: video player integration + Day 10 cleanup`.
6. Push.
7. Print chat summary: video player ready, MC marker editor wired, Day 10.5 verified or done, what Day 12 will do (cohort go-live prep if doctor delivered cohort details, otherwise final polish + analytics dashboard preview).

## Day 11 acceptance criteria
- `0010_video_url.sql` applied; constraint enforced.
- `<ScenarioVideo>` renders, plays a video, fires `onEnded` exactly once when complete, and defensively blocks seek/replay.
- Scenario runner correctly branches on `videoUrl`: video-led scenarios skip the `'reading'` step; text-only scenarios (active-threat) preserve original behavior.
- MC option marker editor UI is wired alongside the existing scenario option editor.
- `getActiveScenario` → `getWalkInScenario` rename confirmed complete (or done now).
- Subagent findings (especially 1, 2, 6) addressed.
- `npm run build` passes; branch pushed.

## Things to watch
- **Autoplay policies vary by browser.** Safari iOS won't autoplay with sound. Chrome/Firefox usually allow it after a user interaction with the page. The "Begin" button is the fallback path; verify it appears reliably on iOS.
- **Reaction time anchor.** The doctrine says RT is measured from the question's paint to the user's click. The video ends → `'answering'` step mounts → Q1's `AnswerScreen` sets `startTimeRef = useRef(Date.now())` on mount. That's correct. Don't accidentally start the timer earlier (e.g., when the video starts playing).
- **No replay means no replay.** If a student refreshes the page mid-video, they should see the video AGAIN from the start (because the session is per-mount, not per-enrollment). That's actually fine — it doesn't violate doctrine, since they haven't yet started answering. Once they reach Q1, refresh should NOT restart the video — refresh should land them mid-assessment. Verify the session-resume logic from Day 7 still works.
- **Don't ship full-screen video.** Doctrine says no distracting affordances; full-screen mode adds a "tap to exit" overlay that's a guidance signal. Inline only.
- **The `screen_text` redundancy.** For the 5 new scenarios, `screen_text` was seeded with placeholder narrative on Day 10.5. The video replaces that for student delivery. The `screen_text` stays in the DB for admin reference and for accessibility (screen readers), but isn't shown to students during the video-led flow.

Go.

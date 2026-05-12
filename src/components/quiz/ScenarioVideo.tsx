'use client';

import { useEffect, useRef, useState } from 'react';

// Doctrine-compliant scenario video player (Phase 1 Freeze + Day 11):
//   - No controls bar, no progress indicator, no volume slider.
//   - No scrub, no replay, no fast-forward — student sees it once at pace.
//   - No fullscreen overlay (Safari's `tap to exit` is itself a guidance cue).
//   - Inline. Static framing. The video itself is the stimulus.
//
// The only affordance is a "Begin" tap target shown when autoplay is blocked
// (mobile Safari / sometimes Firefox without a prior user gesture). Once
// playback starts, the button is removed and the surface goes silent UI-wise.
//
// onEnded fires AT MOST ONCE per mount (debounced) so the runner can safely
// transition to the next step without worrying about duplicate triggers.

interface Props {
  src: string;
  durationSeconds: number;
  onEnded: () => void;
}

export default function ScenarioVideo({ src, durationSeconds, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSafeTimeRef = useRef(0);
  const endedFiredRef = useRef(false);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    const tryPlay = async () => {
      try {
        await v.play();
        if (!cancelled) setNeedsTapToPlay(false);
      } catch {
        if (!cancelled) setNeedsTapToPlay(true);
      }
    };
    tryPlay();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track the "high water mark" of natural playback. Any seek backwards or
  // any jump forward beyond a small drift past this water mark gets snapped
  // back. This catches:
  //   - keyboard arrow keys (advance/rewind by 5s by default)
  //   - devtools `video.currentTime = …` tampering
  //   - touch-scrub on the timeline (which we don't render, but some
  //     browsers expose it via accessibility shortcuts)
  const onTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.currentTime > lastSafeTimeRef.current) {
      // Allow forward drift up to 1 second (covers natural playback chunks).
      if (v.currentTime - lastSafeTimeRef.current < 1) {
        lastSafeTimeRef.current = v.currentTime;
      }
    }
  };

  const onSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Snap back EVEN after ended — protects the brief window between the
    // ended event and component unmount where the user could otherwise
    // rewind and re-trigger playback.
    const v = e.currentTarget;
    const drift = v.currentTime - lastSafeTimeRef.current;
    // Tolerate <0.5s drift (browser quantization on play resume). Reject
    // anything else — snap back to the high-water mark, which forces the
    // playhead to where natural playback last reached.
    if (drift > 0.5 || drift < -0.1) {
      v.currentTime = lastSafeTimeRef.current;
    }
  };

  // Reviewer MAJOR #1: <video> is focusable; Tab + arrow keys seek (and
  // briefly paint a future frame before onSeeking snaps back). Swallow the
  // keyboard shortcuts entirely. Also kept tabIndex={-1} below so Tab won't
  // land focus on the element in the first place.
  const onKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    const KEYS_TO_BLOCK = new Set([
      ' ', 'Spacebar',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
      'k', 'K', // YouTube-style play/pause
      'j', 'J', 'l', 'L', // YouTube-style 10s seek
      'f', 'F', // fullscreen toggle (we don't render the button, but defensive)
    ]);
    if (KEYS_TO_BLOCK.has(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleEnded = () => {
    if (endedFiredRef.current) return;
    endedFiredRef.current = true;
    onEnded();
  };

  const handleBegin = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
      setNeedsTapToPlay(false);
    } catch {
      // Stay in begin state if playback still blocked.
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        tabIndex={-1}
        data-expected-duration={durationSeconds}
        onEnded={handleEnded}
        onSeeking={onSeeking}
        onTimeUpdate={onTimeUpdate}
        onKeyDown={onKeyDown}
        // Right-click menu would expose "Save video as / Loop / Show controls"
        // — disable. The `onContextMenu={e => e.preventDefault()}` is the
        // standard React way to suppress without disabling globally.
        onContextMenu={(e) => e.preventDefault()}
        className="w-full bg-black"
        // Intentionally NO `controls`, NO `controlsList`, NO `disablePictureInPicture`
        // — and crucially no autoplay attribute (we trigger via JS so we can
        // detect the blocked-autoplay case and show the Begin overlay).
      />
      {needsTapToPlay && (
        <button
          type="button"
          onClick={handleBegin}
          className="absolute inset-0 flex items-center justify-center bg-black/85 text-white text-lg uppercase tracking-[0.25em] mvs-mono"
          aria-label="Begin scenario"
        >
          Begin ›
        </button>
      )}
    </div>
  );
}

'use client';

import { useRef, useCallback } from 'react';
import CountdownTimer from './CountdownTimer';
import type { ScenarioScreen as ScenarioScreenType } from '@/types';

const BG_IMAGES = ['/bg-q1.jpg', '/bg-q2.jpg', '/bg-q3.jpg'];

// ── Read phase: scenario text + Continue button (no timer) ──

interface ReadScreenProps {
  screen: ScenarioScreenType;
  screenNumber: number;
  onContinue: () => void;
}

export function ReadScreen({ screen, screenNumber, onContinue }: ReadScreenProps) {
  const bgImage = BG_IMAGES[(screenNumber - 1) % BG_IMAGES.length];

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-6">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative w-full max-w-2xl space-y-8">
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 bg-white/20 text-white">
            Step {screenNumber}
          </span>
        </div>

        <div className="bg-white/90 border border-zinc-200 rounded-xl p-8 space-y-4">
          <h2 className="text-lg font-medium text-zinc-500 uppercase tracking-wide">
            Scenario
          </h2>
          <p className="text-xl text-zinc-900 leading-relaxed whitespace-pre-line">
            {screen.text}
          </p>
        </div>

        {screen.prompt && (
          <p className="text-xl font-bold text-white">
            {screen.prompt}
          </p>
        )}

        <button
          onClick={onContinue}
          className="w-full py-3 rounded-lg font-medium text-lg transition-colors bg-white text-zinc-900 hover:bg-zinc-100"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ── Answer phase: options + countdown timer ──

interface AnswerScreenProps {
  screen: ScenarioScreenType;
  screenNumber: number;
  onResponse: (optionLabel: string | null, rtMs: number, timedOut: boolean) => void;
}

export function AnswerScreen({ screen, screenNumber, onResponse }: AnswerScreenProps) {
  const startTimeRef = useRef(Date.now());
  const answeredRef = useRef(false);

  const bgImage = BG_IMAGES[(screenNumber - 1) % BG_IMAGES.length];

  const handleSelect = useCallback(
    (label: string) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      const elapsed = Date.now() - startTimeRef.current;
      onResponse(label, elapsed, false);
    },
    [onResponse],
  );

  const handleTimeout = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const elapsed = Date.now() - startTimeRef.current;
    onResponse(null, elapsed, true);
  }, [onResponse]);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-6">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 bg-red-900/60" />

      <div className="relative w-full max-w-2xl space-y-6">
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 bg-white/20 text-white">
            Step {screenNumber}
          </span>
        </div>

        <div className="flex justify-center">
          <CountdownTimer seconds={screen.timerSeconds} onTimeout={handleTimeout} />
        </div>

        <div className="space-y-3">
          {screen.options.map((option) => (
            <button
              key={option.label}
              onClick={() => handleSelect(option.label)}
              className="w-full text-left px-6 py-4 bg-white border border-zinc-200 rounded-xl text-lg text-zinc-900 transition-all hover:border-zinc-900 hover:bg-zinc-50 hover:shadow-sm"
            >
              <span className="font-medium text-zinc-400 mr-3">
                {option.label}.
              </span>
              {option.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

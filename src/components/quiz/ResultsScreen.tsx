'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ScreenResponse } from '@/types';

interface ResultsScreenProps {
  firstName: string;
  responses: ScreenResponse[];
  // Where to send the student after this screen. Phase 3 sub-
  // assessments pass /app/phase-3/next so the battery auto-chains;
  // standalone runs default to /app (the session-day landing).
  nextHref?: string;
}

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

export default function ResultsScreen({
  firstName,
  responses,
  nextHref = '/app',
}: ResultsScreenProps) {
  const router = useRouter();
  const isChain = nextHref !== '/app';
  const totalTime = responses.reduce((sum, r) => sum + r.rtMs, 0);

  useEffect(() => {
    if (!isChain) return;
    const id = window.setTimeout(() => router.replace(nextHref), 1500);
    return () => window.clearTimeout(id);
  }, [isChain, nextHref, router]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Assessment Complete
          </h1>
          <p className="text-zinc-600 text-lg">
            Thank you, {firstName}. Your responses have been recorded.
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Your Responses
          </h2>
          {responses.map((r, i) => (
            <div
              key={i}
              className="border-t border-zinc-200 pt-4 first:border-0 first:pt-0"
            >
              <p className="text-sm text-zinc-500 font-medium">
                Step {i + 1}
              </p>
              <p className="text-zinc-900 mt-1">
                {r.timedOut
                  ? 'No response (time expired)'
                  : `${r.optionLabel}. ${r.optionText}`}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Response time: {formatTime(r.rtMs)}
                {r.timedOut && ' (timed out)'}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center text-zinc-500">
          Total response time: {formatTime(totalTime)}
        </div>

        <div className="text-center pt-2">
          <Link
            href={nextHref}
            className="inline-block px-5 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            {isChain ? 'Continue →' : 'Back to your session'}
          </Link>
        </div>
      </div>
    </div>
  );
}

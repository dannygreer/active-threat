'use client';

import { questions, getAnswerText } from '@/lib/questions';
import type { QuizState } from '@/types';

interface ResultsScreenProps {
  state: QuizState;
}

function formatTime(ms: number): string {
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

export default function ResultsScreen({ state }: ResultsScreenProps) {
  const totalTime = state.times.reduce((sum, t) => sum + t, 0);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Assessment Complete</h1>
          <p className="text-zinc-600 text-lg">
            Thank you, {state.firstName}. Your responses have been recorded.
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Your Responses</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="border-t border-zinc-200 pt-4 first:border-0 first:pt-0">
              <p className="text-sm text-zinc-500 font-medium">Question {q.id}</p>
              <p className="text-zinc-900 mt-1">{getAnswerText(i, state.answers[i])}</p>
              <p className="text-sm text-zinc-500 mt-1">Response time: {formatTime(state.times[i])}</p>
            </div>
          ))}
        </div>

        <div className="text-center text-zinc-500">
          Total response time: {formatTime(totalTime)}
        </div>
      </div>
    </div>
  );
}

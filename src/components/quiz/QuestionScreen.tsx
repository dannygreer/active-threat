'use client';

import type { Question } from '@/types';

interface QuestionScreenProps {
  question: Question;
  onContinue: () => void;
}

export default function QuestionScreen({ question, onContinue }: QuestionScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm font-medium mb-4">
            Question {question.id} of 3
          </span>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-8 space-y-4">
          <h2 className="text-lg font-medium text-zinc-500 uppercase tracking-wide">Scenario</h2>
          <p className="text-xl text-zinc-900 leading-relaxed whitespace-pre-line">
            {question.scenario}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium text-lg transition-colors hover:bg-zinc-800"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

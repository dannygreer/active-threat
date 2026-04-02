'use client';

import type { Question } from '@/types';

const BG_IMAGES: Record<number, string> = {
  1: '/bg-q1.jpg',
};

const OVERLAY_CLASSES: Record<number, string> = {
  1: 'bg-white/60',
};

interface QuestionScreenProps {
  question: Question;
  onContinue: () => void;
}

export default function QuestionScreen({ question, onContinue }: QuestionScreenProps) {
  const bgImage = BG_IMAGES[question.id];
  const overlayClass = OVERLAY_CLASSES[question.id];

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-6">
      {bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale"
          style={{ backgroundImage: `url('${bgImage}')` }}
        />
      )}
      {bgImage && <div className={`absolute inset-0 ${overlayClass}`} />}
      <div className="relative w-full max-w-2xl space-y-8">
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

        <p className="text-xl font-bold text-zinc-900">
          {question.prompt}
        </p>

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

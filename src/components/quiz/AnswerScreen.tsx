'use client';

import { useEffect, useRef } from 'react';
import type { Question } from '@/types';
import Stopwatch from './Stopwatch';

const BG_IMAGES: Record<number, string> = {
  1: '/bg-q1.jpg',
  2: '/bg-q2.jpg',
  3: '/bg-q3.jpg',
};

const OVERLAY_CLASSES: Record<number, string> = {
  1: 'bg-red-900/60',
  2: 'bg-red-900/60',
  3: 'bg-red-900/60',
};

interface AnswerScreenProps {
  question: Question;
  onAnswer: (answerIndex: number, timeMs: number) => void;
}

export default function AnswerScreen({ question, onAnswer }: AnswerScreenProps) {
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [question.id]);

  const handleSelect = (index: number) => {
    const elapsed = Date.now() - startTimeRef.current;
    onAnswer(index, elapsed);
  };

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
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${bgImage ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
            Question {question.id} of 3
          </span>
        </div>

        <div className="flex justify-center">
          <Stopwatch />
        </div>

        <div className="space-y-3">
          {question.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className="w-full text-left px-6 py-4 bg-white border border-zinc-200 rounded-xl text-lg text-zinc-900 transition-all hover:border-zinc-900 hover:bg-zinc-50 hover:shadow-sm"
            >
              <span className="font-medium text-zinc-400 mr-3">
                {String.fromCharCode(65 + index)}.
              </span>
              {answer}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

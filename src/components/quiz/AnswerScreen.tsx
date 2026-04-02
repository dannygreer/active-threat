'use client';

import { useEffect, useRef } from 'react';
import type { Question } from '@/types';
import Stopwatch from './Stopwatch';

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

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <Stopwatch />

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm font-medium mb-4">
            Question {question.id} of 3
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">{question.prompt}</h2>
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

'use client';

import { useState, useCallback } from 'react';
import type { QuizStep, QuizState } from '@/types';
import { questions } from '@/lib/questions';
import { submitQuizResult } from '@/actions/quiz';
import TitleScreen from './TitleScreen';
import QuestionScreen from './QuestionScreen';
import AnswerScreen from './AnswerScreen';
import ResultsScreen from './ResultsScreen';

const STEP_ORDER: QuizStep[] = ['title', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'results'];

export default function Quiz() {
  const [step, setStep] = useState<QuizStep>('title');
  const [state, setState] = useState<QuizState>({
    firstName: '',
    lastName: '',
    answers: [],
    times: [],
  });

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [step]);

  const handleTitle = useCallback((firstName: string, lastName: string) => {
    setState((prev) => ({ ...prev, firstName, lastName }));
    setStep('q1');
  }, []);

  const handleAnswer = useCallback(
    async (answerIndex: number, timeMs: number) => {
      const newAnswers = [...state.answers, answerIndex];
      const newTimes = [...state.times, timeMs];

      setState((prev) => ({
        ...prev,
        answers: newAnswers,
        times: newTimes,
      }));

      if (newAnswers.length === 3) {
        await submitQuizResult({
          firstName: state.firstName,
          lastName: state.lastName,
          answers: newAnswers,
          times: newTimes,
        });
      }

      nextStep();
    },
    [state, nextStep]
  );

  const questionIndex = step === 'q1' || step === 'a1' ? 0 : step === 'q2' || step === 'a2' ? 1 : 2;

  switch (step) {
    case 'title':
      return <TitleScreen onContinue={handleTitle} />;
    case 'q1':
    case 'q2':
    case 'q3':
      return <QuestionScreen question={questions[questionIndex]} onContinue={nextStep} />;
    case 'a1':
    case 'a2':
    case 'a3':
      return <AnswerScreen question={questions[questionIndex]} onAnswer={handleAnswer} />;
    case 'results':
      return <ResultsScreen state={state} />;
  }
}

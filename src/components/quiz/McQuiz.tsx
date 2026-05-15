'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import McRunner from './McRunner';
import PreviewBanner from './PreviewBanner';
import { submitMcAssessment, submitMcAssessmentByToken } from '@/actions/quiz';
import type { McQuestion, McResponse, Phase } from '@/types';

type Step = 'in_progress' | 'submitting' | 'results' | 'error';

interface McQuizProps {
  questions: McQuestion[];
  // Auth-mode props (admin or pre-authenticated student testing path).
  enrollmentId?: string;
  studentId?: string;
  phase?: Phase;
  assessmentCode?: string;
  participantId?: string;
  // Day 5b — token-URL mode (no auth). When set, the byToken action
  // derives enrollment, student, phase, and code server-side.
  token?: string;
  // Preview mode (admin QA). Same UI + timing, but the final submit() is
  // skipped — no rows touch responses_long / enrollments. Renders the
  // PreviewBanner at the top.
  previewMode?: boolean;
  // Where to send the student after submit. Defaults to /app (the
  // session-day landing). Phase 3 sub-assessments override to
  // /app/phase-3/next so the battery auto-chains.
  nextHref?: string;
}

export default function McQuiz({
  questions,
  enrollmentId,
  studentId,
  phase,
  assessmentCode,
  participantId,
  token,
  previewMode,
  nextHref = '/app',
}: McQuizProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('in_progress');
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<McResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = useCallback(
    async (final: McResponse[]) => {
      // Preview mode: skip the submission and jump straight to results.
      // The runner has full in-memory responses but nothing persists.
      if (previewMode) {
        setStep('results');
        return;
      }
      setStep('submitting');
      try {
        if (token) {
          await submitMcAssessmentByToken({ token, responses: final });
        } else if (enrollmentId && studentId && assessmentCode && phase && participantId) {
          await submitMcAssessment({
            enrollmentId,
            studentId,
            assessmentCode,
            phase,
            participantId,
            responses: final,
          });
        } else {
          throw new Error('Missing submission context');
        }
        setStep('results');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Submission failed';
        setErrorMessage(msg);
        setStep('error');
      }
    },
    [previewMode, token, enrollmentId, studentId, assessmentCode, phase, participantId]
  );

  const handleResponse = useCallback(
    (
      optionLabel: 'A' | 'B' | 'C' | 'D' | null,
      optionId: string | null,
      rtMs: number,
      timedOut: boolean
    ) => {
      const current = questions[index];
      const next: McResponse = {
        questionId: current.id,
        sequence: current.sequence,
        optionLabel,
        optionId,
        rtMs,
        timedOut,
      };
      const updated = [...responses, next];
      setResponses(updated);
      if (index + 1 < questions.length) {
        setIndex(index + 1);
      } else {
        submit(updated);
      }
    },
    [index, questions, responses, submit]
  );

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[60vh] text-zinc-500">
        No questions available for this assessment.
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[60vh] bg-zinc-950 mvs-mono text-xs uppercase tracking-widest text-zinc-400">
        Submitting your responses…
      </div>
    );
  }

  if (step === 'results') {
    return (
      <ResultsScreen
        nextHref={nextHref}
        previewMode={!!previewMode}
        router={router}
      />
    );
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] bg-zinc-950 px-6">
        <div
          className="w-full max-w-md bg-zinc-950/60 backdrop-blur-sm p-8 text-center space-y-4"
          style={{ border: '1px solid rgba(248,113,113,0.4)' }}
        >
          <h1 className="mvs-display text-xl font-bold uppercase tracking-wide text-zinc-100">
            Submission failed
          </h1>
          <p className="text-zinc-400 text-sm">{errorMessage}</p>
          <Link
            href="/app"
            className="inline-block mt-2 mvs-mono text-[11px] uppercase tracking-widest text-[#F87171] hover:text-[#fca5a5]"
          >
            Back to assignments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {previewMode && <PreviewBanner />}
      <McRunner
        key={questions[index].id}
        question={questions[index]}
        total={questions.length}
        onResponse={handleResponse}
      />
    </>
  );
}

function ResultsScreen({
  nextHref,
  previewMode,
  router,
}: {
  nextHref: string;
  previewMode: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const isChain = nextHref !== '/app';
  // Real student flow auto-advances into the next Phase 3 sub-assessment
  // after a beat. In preview the admin should click intentionally to
  // walk into Part 2 — no surprise auto-jump.
  useEffect(() => {
    if (!isChain || previewMode) return;
    const id = window.setTimeout(() => router.replace(nextHref), 1200);
    return () => window.clearTimeout(id);
  }, [isChain, previewMode, nextHref, router]);

  const message = isChain
    ? previewMode
      ? 'Part 1 complete. Continue to the video scenarios.'
      : 'Loading the next part of your session…'
    : 'Thanks. Your responses are recorded.';
  const cta = isChain
    ? previewMode
      ? 'Continue to scenarios →'
      : 'Continue →'
    : 'Back to assignments';

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 min-h-[60vh] px-6 py-10">
      <div className="absolute inset-0 bg-zinc-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,#0e1422_0%,#050810_60%,#000_100%)]" />

      <div className="relative z-10 w-full max-w-md">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#4FA9F0]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#4FA9F0]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#4FA9F0]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#4FA9F0]" />
        <div
          className="relative bg-zinc-950/60 backdrop-blur-sm p-8 text-center space-y-4"
          style={{ border: '1px solid rgba(1,111,212,0.33)' }}
        >
          <h1 className="mvs-display text-2xl font-bold uppercase tracking-wide text-zinc-100">
            Submitted
          </h1>
          <p className="text-zinc-400 text-sm">{message}</p>
          <Link
            href={nextHref}
            className="inline-block mt-2 px-5 py-3 mvs-mono text-sm uppercase tracking-widest bg-[#016FD4] text-white hover:bg-[#0a5fb0] transition-colors"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

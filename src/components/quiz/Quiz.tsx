'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  Scenario,
  Phase,
  ScreenResponse,
  PresentedOption,
} from '@/types';
import { submitAssessment, submitAssessmentByToken } from '@/actions/quiz';
import TitleScreen from './TitleScreen';
import { ReadScreen, AnswerScreen, type AnswerEvent } from './ScenarioScreen';
import ResultsScreen from './ResultsScreen';
import ScenarioVideo from './ScenarioVideo';

// Day 11: scenarios with `videoUrl` open in the 'video' step. When the
// video ends, the runner advances directly to 'answering' (skipping the
// 'reading' step — the video already delivered the situation; the
// `screen_text` would be redundant post-video). Text-only scenarios like
// active_threat_v1 keep the original 'reading' → 'answering' flow.
type Step = 'title' | 'video' | 'reading' | 'answering' | 'results';

interface QuizProps {
  scenario: Scenario | null;
  // Day 4 — enrollment context (set when invoked from /app/take/[id]).
  // Presence of `enrollmentId` causes the title screen to be skipped and
  // identity to be prefilled from the authenticated session.
  enrollmentId?: string;
  studentId?: string;
  prefillFirstName?: string;
  prefillLastName?: string;
  prefillPhase?: Phase;
  // Day 5b — token-URL mode (no auth). Set by /take/[token] route. When
  // present, submission goes through submitAssessmentByToken which derives
  // enrollment + student from the token server-side.
  token?: string;
}

export default function Quiz({
  scenario,
  enrollmentId,
  studentId,
  prefillFirstName,
  prefillLastName,
  prefillPhase,
  token,
}: QuizProps) {
  const isEnrolled = !!enrollmentId || !!token;
  // Initial step: video-led scenarios open in 'video'; everything else keeps
  // the prior behavior (reading for enrolled flow, title for anonymous walk-in).
  const initialStep: Step = scenario?.videoUrl
    ? isEnrolled
      ? 'video'
      : 'title'
    : isEnrolled
      ? 'reading'
      : 'title';
  const [step, setStep] = useState<Step>(initialStep);
  const [firstName, setFirstName] = useState(prefillFirstName ?? '');
  const [lastName, setLastName] = useState(prefillLastName ?? '');
  const [phase, setPhase] = useState<Phase>(prefillPhase ?? 'pre');
  const [currentScreenId, setCurrentScreenId] = useState(
    isEnrolled && scenario ? scenario.entryScreenId : ''
  );
  const [branchPath, setBranchPath] = useState('');
  const [responses, setResponses] = useState<ScreenResponse[]>([]);
  const [screenIndex, setScreenIndex] = useState(0);
  // Phase 1 Freeze: revisable mode emits multiple events per screen. The
  // counter resets per screen via the AnswerScreen `key` prop remount, but
  // we track it in a ref so the collator can assign revision_number without
  // a re-render race.
  const revisionCountRef = useRef(0);

  if (!scenario) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-zinc-500 text-lg">
          No active scenario configured. Please contact an administrator.
        </p>
      </div>
    );
  }

  const handleTitle = useCallback(
    (fn: string, ln: string, p: Phase) => {
      setFirstName(fn);
      setLastName(ln);
      setPhase(p);
      setCurrentScreenId(scenario.entryScreenId);
      setScreenIndex(0);
      setBranchPath('');
      setResponses([]);
      revisionCountRef.current = 0;
      // Video-led scenarios go to 'video'; text-only go to 'reading'.
      setStep(scenario.videoUrl ? 'video' : 'reading');
    },
    [scenario],
  );

  const handleContinueToAnswer = useCallback(() => {
    setStep('answering');
  }, []);

  // Day 11: video ended → straight to 'answering' (skip 'reading').
  // The AnswerScreen's startTimeRef anchors when AnswerScreen mounts, so
  // Q1's RT correctly begins from the moment the question UI paints, NOT
  // from page load.
  const handleVideoEnded = useCallback(() => {
    setStep('answering');
  }, []);

  // Collate AnswerEvent -> ScreenResponse. In locked mode this fires once
  // per screen (kind='commit'). In revisable mode it fires once per Change
  // (kind='revise') plus once on Continue (kind='commit'); the collator
  // increments revision_number on each event and only advances to the next
  // screen when kind='commit'.
  const handleAnswerEvent = useCallback(
    async (event: AnswerEvent) => {
      const currentScreen = scenario.screens[currentScreenId];
      const presentedOptions: PresentedOption[] =
        currentScreen?.options.map((o) => ({
          id: o.id,
          label: o.label,
          text: o.text,
        })) ?? [];

      const newPath = event.optionLabel
        ? branchPath
          ? `${branchPath}-${event.optionLabel}`
          : event.optionLabel
        : branchPath;

      const selectedOption = event.optionLabel
        ? currentScreen?.options.find((o) => o.label === event.optionLabel)
        : null;

      const revisionNumber = revisionCountRef.current;
      const response: ScreenResponse = {
        screenId: currentScreenId,
        optionLabel: event.optionLabel,
        optionText: selectedOption?.text ?? null,
        optionId: event.optionId,
        rtMs: event.rtMs,
        timedOut: event.timedOut,
        // branch_path on revisions is the path AT THE MOMENT of that pick.
        // For revisions, we use the original screen's branchPath (no advance).
        // For commits, we use the new path (the one that branches forward).
        branchPath: event.kind === 'commit' ? newPath : branchPath,
        presentedOptions,
        isRevision: revisionNumber > 0,
        revisionNumber,
      };

      const newResponses = [...responses, response];
      setResponses(newResponses);

      if (event.kind === 'revise') {
        // Stay on this screen, bump revision count, await next event.
        revisionCountRef.current = revisionNumber + 1;
        return;
      }

      // kind === 'commit' — terminal pick for this screen. Advance or finish.
      setBranchPath(newPath);
      revisionCountRef.current = 0;

      let nextScreenId: string | null = null;
      if (selectedOption) {
        nextScreenId = selectedOption.nextScreenId;
      } else {
        // Timed out, no pick — follow first option's route as default path.
        nextScreenId = currentScreen?.options[0]?.nextScreenId ?? null;
      }

      if (nextScreenId && scenario.screens[nextScreenId]) {
        setCurrentScreenId(nextScreenId);
        setScreenIndex((prev) => prev + 1);
        setStep('reading');
        return;
      }

      // Terminal screen — submit data and show results
      const totalTime = newResponses.reduce((sum, r) => sum + r.rtMs, 0);
      const participantId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now()}`;

      try {
        if (token) {
          await submitAssessmentByToken({
            token,
            scenarioId: scenario.scenarioId,
            scenarioVersion: scenario.version,
            branchPath: newPath,
            responses: newResponses,
            totalTime,
          });
        } else {
          await submitAssessment({
            participantId,
            firstName,
            lastName,
            phase,
            scenarioId: scenario.scenarioId,
            scenarioVersion: scenario.version,
            branchPath: newPath,
            responses: newResponses,
            totalTime,
            enrollmentId,
            studentId,
          });
        }
      } catch (e) {
        console.error('Failed to submit assessment:', e);
      }

      setStep('results');
    },
    [
      branchPath,
      responses,
      currentScreenId,
      scenario,
      firstName,
      lastName,
      phase,
      enrollmentId,
      studentId,
      token,
    ],
  );

  const screen = scenario.screens[currentScreenId];

  switch (step) {
    case 'title':
      return <TitleScreen onContinue={handleTitle} />;
    case 'video': {
      if (!scenario.videoUrl || scenario.videoDurationSeconds == null) {
        // Defensive: should never happen — initialStep guards this — but if
        // a scenario somehow lands here without a video, fall through to
        // the text-only reading path so the student isn't stuck.
        return (
          <ReadScreen
            key={`read-${currentScreenId}`}
            screen={screen!}
            screenNumber={screenIndex + 1}
            onContinue={handleContinueToAnswer}
          />
        );
      }
      return (
        <div className="flex items-center justify-center flex-1 px-6 py-12 bg-black">
          <ScenarioVideo
            src={scenario.videoUrl}
            durationSeconds={scenario.videoDurationSeconds}
            onEnded={handleVideoEnded}
          />
        </div>
      );
    }
    case 'reading': {
      if (!screen) {
        return (
          <div className="flex items-center justify-center flex-1">
            <p className="text-zinc-500">
              Error: Screen &quot;{currentScreenId}&quot; not found.
            </p>
          </div>
        );
      }
      return (
        <ReadScreen
          key={`read-${currentScreenId}`}
          screen={screen}
          screenNumber={screenIndex + 1}
          onContinue={handleContinueToAnswer}
        />
      );
    }
    case 'answering': {
      if (!screen) {
        return (
          <div className="flex items-center justify-center flex-1">
            <p className="text-zinc-500">
              Error: Screen &quot;{currentScreenId}&quot; not found.
            </p>
          </div>
        );
      }
      return (
        <AnswerScreen
          key={`answer-${currentScreenId}`}
          screen={screen}
          screenNumber={screenIndex + 1}
          commitmentMode={scenario.commitmentMode}
          onResponse={handleAnswerEvent}
        />
      );
    }
    case 'results':
      return <ResultsScreen firstName={firstName} responses={responses} />;
  }
}

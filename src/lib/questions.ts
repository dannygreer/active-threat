import type { Question } from '@/types';

export const questions: Question[] = [
  {
    id: 1,
    scenario:
      'You are at work in a large office building during a normal weekday.\n\nYou hear what sounds like loud popping noises from another part of the building. Several people nearby stop and look around. No official announcement has been made.',
    prompt: 'What is your initial reaction?',
    answers: [
      'Pause and try to gather more information',
      'Move toward the sound to see what is happening',
      'Begin leaving the area immediately',
      'Call 911 right away',
    ],
  },
  {
    id: 2,
    scenario:
      'You now hear multiple rapid pops and people start running from down the hallway. Someone yells, "He\'s got a gun!"',
    prompt: 'What do you do now?',
    answers: [
      'Continue trying to confirm what is happening',
      'Move quickly to find a secure place to hide',
      'Run toward an exit without stopping',
      'Call 911 while staying in place',
    ],
  },
  {
    id: 3,
    scenario:
      'You hear footsteps approaching rapidly from your direction. People nearby are panicking.\n\nYou must act immediately.',
    prompt: 'What is your immediate action?',
    answers: [
      'Run toward the nearest exit',
      'Enter a room and secure it if possible',
      'Hide in place without moving',
      'Confront the threat if encountered',
    ],
  },
];

export function getAnswerText(questionIndex: number, answerIndex: number): string {
  return questions[questionIndex]?.answers[answerIndex] ?? 'Unknown';
}

export type QuizStep = 'title' | 'q1' | 'a1' | 'q2' | 'a2' | 'q3' | 'a3' | 'results';

export interface Question {
  id: number;
  scenario: string;
  prompt: string;
  answers: string[];
}

export interface QuizState {
  firstName: string;
  lastName: string;
  answers: number[];
  times: number[];
}

export interface QuizResult {
  id: number;
  first_name: string;
  last_name: string;
  answer_1: number;
  answer_2: number;
  answer_3: number;
  time_1_ms: number;
  time_2_ms: number;
  time_3_ms: number;
  total_time_ms: number;
  completed_at: string;
}

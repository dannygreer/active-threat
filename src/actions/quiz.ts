'use server';

import { insertResult } from '@/lib/db';

export async function submitQuizResult(data: {
  firstName: string;
  lastName: string;
  answers: number[];
  times: number[];
}) {
  if (!data.firstName || !data.lastName) {
    throw new Error('Name is required');
  }
  if (data.answers.length !== 3 || data.times.length !== 3) {
    throw new Error('Must have 3 answers and 3 times');
  }

  await insertResult(data);
}

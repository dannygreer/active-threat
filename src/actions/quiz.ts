'use server';

import { insertResult, deleteResult } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

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

export async function deleteQuizResult(id: number): Promise<void> {
  const isAdmin = await verifySession();
  if (!isAdmin) throw new Error('Unauthorized');
  await deleteResult(id);
  revalidatePath('/active-threat/admin');
}

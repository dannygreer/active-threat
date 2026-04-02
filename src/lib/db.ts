import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key);
}

export interface QuizResultRow {
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

export async function insertResult(data: {
  firstName: string;
  lastName: string;
  answers: number[];
  times: number[];
}) {
  const totalTime = data.times.reduce((sum, t) => sum + t, 0);
  const { error } = await getClient().from('quiz_results').insert({
    first_name: data.firstName,
    last_name: data.lastName,
    answer_1: data.answers[0],
    answer_2: data.answers[1],
    answer_3: data.answers[2],
    time_1_ms: data.times[0],
    time_2_ms: data.times[1],
    time_3_ms: data.times[2],
    total_time_ms: totalTime,
  });
  if (error) throw new Error(error.message);
}

export async function getAllResults(): Promise<QuizResultRow[]> {
  const { data, error } = await getClient()
    .from('quiz_results')
    .select('*')
    .order('completed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as QuizResultRow[];
}

export async function deleteResult(id: number): Promise<void> {
  const { error } = await getClient()
    .from('quiz_results')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getAverageTime(): Promise<number | null> {
  const { data, error } = await getClient()
    .from('quiz_results')
    .select('total_time_ms');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  const sum = data.reduce((acc, row) => acc + row.total_time_ms, 0);
  return sum / data.length;
}

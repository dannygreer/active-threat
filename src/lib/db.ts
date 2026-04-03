import { createClient } from '@supabase/supabase-js';
import type {
  Scenario,
  ScenarioScreen,
  ResponseLongRow,
  ResponseWideRow,
  ResponseTag,
  ScenarioListItem,
} from '@/types';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key);
}

// ============================================================
// SCENARIO LOADING
// ============================================================

export async function getActiveScenario(): Promise<Scenario | null> {
  const client = getClient();

  const { data: scenario, error: sErr } = await client
    .from('scenarios')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (sErr || !scenario) return null;

  const { data: screens, error: scrErr } = await client
    .from('scenario_screens')
    .select('*')
    .eq('scenario_fk', scenario.id)
    .order('sort_order');

  if (scrErr || !screens || screens.length === 0) return null;

  const screenDbIds = screens.map((s: Record<string, unknown>) => s.id as string);

  const { data: options, error: optErr } = await client
    .from('screen_options')
    .select('*')
    .in('screen_fk', screenDbIds)
    .order('sort_order');

  if (optErr) return null;
  const allOptions = options ?? [];

  const screenMap: Record<string, ScenarioScreen> = {};
  for (const scr of screens) {
    const scrOpts = allOptions
      .filter((o: Record<string, unknown>) => o.screen_fk === scr.id)
      .map((o: Record<string, unknown>) => ({
        id: o.id as string,
        label: o.option_label as string,
        text: o.option_text as string,
        nextScreenId: (o.next_screen_id as string) ?? null,
      }));

    screenMap[scr.screen_id as string] = {
      id: scr.screen_id as string,
      dbId: scr.id as string,
      text: scr.screen_text as string,
      timerSeconds: scr.timer_seconds as number,
      sortOrder: scr.sort_order as number,
      options: scrOpts,
    };
  }

  return {
    dbId: scenario.id as string,
    scenarioId: scenario.scenario_id as string,
    version: scenario.version as string,
    title: scenario.title as string,
    entryScreenId: scenario.entry_screen_id as string,
    screens: screenMap,
  };
}

// ============================================================
// RESPONSE SUBMISSION
// ============================================================

export async function insertResponsesLong(
  rows: Omit<ResponseLongRow, 'id' | 'timestamp'>[],
) {
  const { error } = await getClient().from('responses_long').insert(rows);
  if (error) throw new Error(error.message);
}

export async function insertResponseWide(
  row: Omit<ResponseWideRow, 'id' | 'completed_at'>,
) {
  const { error } = await getClient().from('responses_wide').insert(row);
  if (error) throw new Error(error.message);
}

// ============================================================
// RESPONSE QUERIES
// ============================================================

export async function getAllResponsesWide(): Promise<ResponseWideRow[]> {
  const { data, error } = await getClient()
    .from('responses_wide')
    .select('*')
    .order('completed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResponseWideRow[];
}

export async function getAllResponsesLong(): Promise<ResponseLongRow[]> {
  const { data, error } = await getClient()
    .from('responses_long')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResponseLongRow[];
}

export async function deleteResponseByParticipant(wideId: number): Promise<void> {
  const client = getClient();

  const { data: row } = await client
    .from('responses_wide')
    .select('participant_id')
    .eq('id', wideId)
    .single();

  if (row) {
    await client
      .from('responses_long')
      .delete()
      .eq('participant_id', row.participant_id);
  }

  const { error } = await client
    .from('responses_wide')
    .delete()
    .eq('id', wideId);
  if (error) throw new Error(error.message);
}

// ============================================================
// RESPONSE TAGS
// ============================================================

export async function getResponseTags(scenarioFk: string): Promise<ResponseTag[]> {
  const { data, error } = await getClient()
    .from('response_tags')
    .select('*')
    .eq('scenario_fk', scenarioFk);
  if (error) throw new Error(error.message);
  return (data ?? []) as ResponseTag[];
}

export async function getResponseTagMap(
  scenarioFk: string,
): Promise<Record<string, string>> {
  const tags = await getResponseTags(scenarioFk);
  const map: Record<string, string> = {};
  for (const t of tags) {
    map[`${t.screen_id}:${t.option_label}`] = t.response_category;
  }
  return map;
}

export async function upsertResponseTag(tag: {
  scenario_fk: string;
  screen_id: string;
  option_label: string;
  response_category: string;
}): Promise<void> {
  const { error } = await getClient()
    .from('response_tags')
    .upsert(tag, { onConflict: 'scenario_fk,screen_id,option_label' });
  if (error) throw new Error(error.message);
}

export async function deleteResponseTag(
  scenarioFk: string,
  screenId: string,
  optionLabel: string,
): Promise<void> {
  const { error } = await getClient()
    .from('response_tags')
    .delete()
    .eq('scenario_fk', scenarioFk)
    .eq('screen_id', screenId)
    .eq('option_label', optionLabel);
  if (error) throw new Error(error.message);
}

// ============================================================
// SCENARIO MANAGEMENT (Admin)
// ============================================================

export async function getAllScenarios(): Promise<ScenarioListItem[]> {
  const { data, error } = await getClient()
    .from('scenarios')
    .select('id, scenario_id, version, title, is_active')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScenarioListItem[];
}

export async function setActiveScenario(id: string): Promise<void> {
  const client = getClient();
  await client.from('scenarios').update({ is_active: false }).neq('id', '');
  const { error } = await client
    .from('scenarios')
    .update({ is_active: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateScreenText(
  screenDbId: string,
  text: string,
): Promise<void> {
  const { error } = await getClient()
    .from('scenario_screens')
    .update({ screen_text: text })
    .eq('id', screenDbId);
  if (error) throw new Error(error.message);
}

export async function updateScreenTimer(
  screenDbId: string,
  seconds: number,
): Promise<void> {
  const { error } = await getClient()
    .from('scenario_screens')
    .update({ timer_seconds: seconds })
    .eq('id', screenDbId);
  if (error) throw new Error(error.message);
}

export async function updateOptionText(
  optionDbId: string,
  text: string,
): Promise<void> {
  const { error } = await getClient()
    .from('screen_options')
    .update({ option_text: text })
    .eq('id', optionDbId);
  if (error) throw new Error(error.message);
}

export async function updateOptionRoute(
  optionDbId: string,
  nextScreenId: string | null,
): Promise<void> {
  const { error } = await getClient()
    .from('screen_options')
    .update({ next_screen_id: nextScreenId })
    .eq('id', optionDbId);
  if (error) throw new Error(error.message);
}

export async function addScreen(
  scenarioFk: string,
  screenId: string,
  text: string,
  timerSeconds: number,
  sortOrder: number,
): Promise<string> {
  const { data, error } = await getClient()
    .from('scenario_screens')
    .insert({
      scenario_fk: scenarioFk,
      screen_id: screenId,
      screen_text: text,
      timer_seconds: timerSeconds,
      sort_order: sortOrder,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function addOption(
  screenFk: string,
  label: string,
  text: string,
  nextScreenId: string | null,
  sortOrder: number,
): Promise<void> {
  const { error } = await getClient()
    .from('screen_options')
    .insert({
      screen_fk: screenFk,
      option_label: label,
      option_text: text,
      next_screen_id: nextScreenId,
      sort_order: sortOrder,
    });
  if (error) throw new Error(error.message);
}

export async function deleteScreen(screenDbId: string): Promise<void> {
  const { error } = await getClient()
    .from('scenario_screens')
    .delete()
    .eq('id', screenDbId);
  if (error) throw new Error(error.message);
}

export async function deleteOption(optionDbId: string): Promise<void> {
  const { error } = await getClient()
    .from('screen_options')
    .delete()
    .eq('id', optionDbId);
  if (error) throw new Error(error.message);
}

// ============================================================
// LEGACY — existing quiz_results (preserved, not extended)
// ============================================================

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

'use server';

import { verifySession } from '@/lib/session';
import {
  setActiveScenario,
  updateScreenText,
  updateScreenTimer,
  updateOptionText,
  updateOptionRoute,
  addScreen,
  addOption,
  deleteScreen,
  deleteOption,
  upsertResponseTag,
} from '@/lib/db';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const isAdmin = await verifySession();
  if (!isAdmin) throw new Error('Unauthorized');
}

export async function adminSetActiveScenario(id: string) {
  await requireAdmin();
  await setActiveScenario(id);
  revalidatePath('/active-threat/admin');
}

export async function adminUpdateScreenText(screenDbId: string, text: string) {
  await requireAdmin();
  await updateScreenText(screenDbId, text);
  revalidatePath('/active-threat/admin');
}

export async function adminUpdateScreenTimer(screenDbId: string, seconds: number) {
  await requireAdmin();
  await updateScreenTimer(screenDbId, seconds);
  revalidatePath('/active-threat/admin');
}

export async function adminUpdateOptionText(optionDbId: string, text: string) {
  await requireAdmin();
  await updateOptionText(optionDbId, text);
  revalidatePath('/active-threat/admin');
}

export async function adminUpdateOptionRoute(optionDbId: string, nextScreenId: string | null) {
  await requireAdmin();
  await updateOptionRoute(optionDbId, nextScreenId);
  revalidatePath('/active-threat/admin');
}

export async function adminAddScreen(
  scenarioFk: string,
  screenId: string,
  text: string,
  timerSeconds: number,
  sortOrder: number,
) {
  await requireAdmin();
  await addScreen(scenarioFk, screenId, text, timerSeconds, sortOrder);
  revalidatePath('/active-threat/admin');
}

export async function adminAddOption(
  screenFk: string,
  label: string,
  text: string,
  nextScreenId: string | null,
  sortOrder: number,
) {
  await requireAdmin();
  await addOption(screenFk, label, text, nextScreenId, sortOrder);
  revalidatePath('/active-threat/admin');
}

export async function adminDeleteScreen(screenDbId: string) {
  await requireAdmin();
  await deleteScreen(screenDbId);
  revalidatePath('/active-threat/admin');
}

export async function adminDeleteOption(optionDbId: string) {
  await requireAdmin();
  await deleteOption(optionDbId);
  revalidatePath('/active-threat/admin');
}

export async function adminUpsertResponseTag(
  scenarioFk: string,
  screenId: string,
  optionLabel: string,
  category: string,
) {
  await requireAdmin();
  await upsertResponseTag({
    scenario_fk: scenarioFk,
    screen_id: screenId,
    option_label: optionLabel,
    response_category: category,
  });
  revalidatePath('/active-threat/admin');
}

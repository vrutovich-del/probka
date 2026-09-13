import { useSyncExternalStore } from 'react';
import { getSetting, setSetting } from '../db/db';
import { applyLanguage, currentLanguage, guessLanguage, initI18n, type Language } from './index';

/**
 * The one place the UI language changes. `chosen` is null until the first-launch picker has been used;
 * until then i18n runs on a guess so the picker can render itself.
 */
let chosen: Language | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reads the saved language and starts i18n. Storage trouble is logged, never fatal. */
export async function bootLanguage(): Promise<void> {
  try {
    chosen = (await getSetting('language')) ?? null;
  } catch (error) {
    console.error('Could not read settings', error);
  }
  await initI18n(chosen ?? guessLanguage());
}

export async function setLanguage(lng: Language): Promise<void> {
  await applyLanguage(lng);
  chosen = lng;
  notify();
  try {
    await setSetting('language', lng);
  } catch (error) {
    console.error('Could not save the language', error);
  }
}

export function useLanguage(): { lang: Language; chosen: boolean } {
  const lang = useSyncExternalStore(subscribe, currentLanguage);
  const isChosen = useSyncExternalStore(subscribe, () => chosen !== null);
  return { lang, chosen: isChosen };
}

import { useSyncExternalStore } from 'react';

/** One short message at a time, at the top of the screen, gone after 1.8 s (prototype `toastMsg`). */
const DURATION_MS = 1800;

let current: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function showToast(text: string): void {
  clearTimeout(timer);
  current = text;
  emit();
  timer = setTimeout(() => {
    current = null;
    emit();
  }, DURATION_MS);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useToast(): string | null {
  return useSyncExternalStore(subscribe, () => current);
}

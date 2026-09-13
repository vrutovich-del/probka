import { useSyncExternalStore } from 'react';

/** A bottom message with one action, e.g. "Cap deleted · UNDO". One at a time; a new one replaces the old. */
export interface Snack {
  text: string;
  action?: { label: string; run: () => void };
}

let current: Snack | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function showSnack(snack: Snack, durationMs = 5000): void {
  clearTimeout(timer);
  current = snack;
  emit();
  timer = setTimeout(hideSnack, durationMs);
}

export function hideSnack(): void {
  clearTimeout(timer);
  current = null;
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSnack(): Snack | null {
  return useSyncExternalStore(subscribe, () => current);
}

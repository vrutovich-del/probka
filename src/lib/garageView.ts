import { useSyncExternalStore } from 'react';
import type { Condition } from '../db/db';

/** Sort and filter of the garage grid. Kept outside React so coming back from a cap restores the same view. */
export type GarageSort = 'newest' | 'rarity' | 'brand' | 'az';
export const SORTS: GarageSort[] = ['newest', 'rarity', 'brand', 'az'];

export interface GarageView {
  sort: GarageSort;
  /** A condition to show only, or null for all. */
  condition: Condition | null;
}

let view: GarageView = { sort: 'newest', condition: null };
const listeners = new Set<() => void>();

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setGarageView(next: Partial<GarageView>): void {
  view = { ...view, ...next };
  for (const fn of listeners) fn();
}

export function useGarageView(): GarageView {
  return useSyncExternalStore(subscribe, () => view);
}

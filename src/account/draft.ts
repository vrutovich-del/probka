import { useSyncExternalStore } from 'react';
import { DEFAULT_AVATAR, type AvatarKey } from './avatars';

/**
 * What screens 05 and 06 are carrying between them, and the recovery code on its way to the one
 * screen that shows it. A store rather than route state: the code must never be in a URL, and the
 * nickname must survive the parental gate opening over the screen.
 */

interface Draft {
  nickname: string;
  avatar: AvatarKey;
  /** Where the child came in from, so Cancel goes back there. */
  from: string;
  /** Shown once on the recovery screen, then dropped. Never written to storage. */
  recoveryCode: string | null;
}

const EMPTY: Draft = { nickname: '', avatar: DEFAULT_AVATAR, from: '/profile', recoveryCode: null };

let draft: Draft = EMPTY;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function accountDraft(): Draft {
  return draft;
}

export function updateDraft(patch: Partial<Draft>): void {
  draft = { ...draft, ...patch };
  notify();
}

/** Starts a fresh account flow from `from`. */
export function startDraft(from: string): void {
  draft = { ...EMPTY, from };
  notify();
}

export function clearDraft(): void {
  draft = EMPTY;
  notify();
}

export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, accountDraft);
}

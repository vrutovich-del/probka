import type { TKey } from '../i18n';

/**
 * What the nickname line under the field says, screen 05. The prototype's own rules, with one
 * change: a nickname that looks like a real name blocks Continue instead of only warning. The
 * brief's first rule is that no real names are stored, and a child who is told twice still taps on.
 *
 * "Taken" is not here: only the server knows, and asking it while the child types would be a way
 * to walk the list of children. It comes back from the account call instead.
 */

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;

/** `Ivan_P`, `Anna Smith` — a capitalised word followed by another capital, as the prototype reads it. */
const LOOKS_LIKE_A_NAME = /^[A-ZА-ЯЁЇІЄҐ][a-zа-яёїієґ]+_?[A-ZА-ЯЁЇІЄҐ]/u;

export type NicknameState = 'empty' | 'short' | 'long' | 'spaces' | 'realname' | 'ok';

export function nicknameState(value: string): NicknameState {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  if (/\s/u.test(trimmed)) return 'spaces';
  const length = [...trimmed].length;
  if (length < NICKNAME_MIN) return 'short';
  if (length > NICKNAME_MAX) return 'long';
  if (LOOKS_LIKE_A_NAME.test(trimmed)) return 'realname';
  return 'ok';
}

/**
 * The problem to show under the field, or null when there is none. A nickname that passes these
 * rules gets no line at all: the prototype's green "Available!" is a promise only the server can
 * make, and it makes it when the account is created.
 */
export function nicknameMessage(state: NicknameState): TKey | null {
  switch (state) {
    case 'empty':
      return null;
    case 'short':
      return 'nick.short';
    case 'long':
      return 'nick.long';
    case 'spaces':
      return 'nick.spaces';
    case 'realname':
      return 'nick.realname';
    case 'ok':
      return null;
  }
}

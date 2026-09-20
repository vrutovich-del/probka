import { useSyncExternalStore } from 'react';
import { apiJson, hasServer } from '../api/client';
import { getSetting, setSetting, type AccountRecord } from '../db/db';
import type { AvatarKey } from './avatars';

/**
 * The account this phone belongs to, and the token that proves it.
 *
 * Both are read once at boot and kept in memory, like the language: a screen must be able to ask
 * "is there an account?" while it renders. A phone with no account is a guest, which is the whole
 * of Phase 1 and stays a working app — nothing here is on the path of adding a cap.
 */

let account: AccountRecord | null = null;
let token: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reads the saved account before the first paint. Storage trouble is logged, never fatal. */
export async function bootAccount(): Promise<void> {
  try {
    account = (await getSetting('account')) ?? null;
    token = (await getSetting('deviceToken')) ?? null;
  } catch (error) {
    console.error('Could not read the account', error);
  }
}

export function currentAccount(): AccountRecord | null {
  return account;
}

/** The bearer for API calls, or null when this phone is a guest. */
export function deviceToken(): string | null {
  return token;
}

/** Whether accounts can exist at all: a build with no server is the Phase 1 app. */
export function accountsAvailable(): boolean {
  return hasServer();
}

/** Stores the account and its token, and tells every screen. */
export async function saveSession(next: AccountRecord, nextToken: string): Promise<void> {
  account = next;
  token = nextToken;
  notify();
  await setSetting('account', next);
  await setSetting('deviceToken', nextToken);
}

export function useAccount(): AccountRecord | null {
  return useSyncExternalStore(subscribe, currentAccount);
}

export type CreateAccountResult =
  | { ok: true; account: AccountRecord; recoveryCode: string }
  | { ok: false; error: 'offline' | 'nickname_taken' | 'invalid' | 'rate_limited' | 'server' };

interface CreatedAccount {
  account: AccountRecord;
  deviceToken: string;
  recoveryCode: string;
}

/**
 * Creates the account on the server and remembers it here. The recovery code is returned to be
 * shown once and never stored: if it were kept on the phone, losing the phone would lose it too.
 */
export async function createAccount(nickname: string, avatar: AvatarKey): Promise<CreateAccountResult> {
  const result = await apiJson<CreatedAccount>('/api/accounts', { method: 'POST', body: { nickname, avatar } });
  if (!result.ok) {
    const error =
      result.error === 'nickname_taken' || result.error === 'invalid' || result.error === 'rate_limited'
        ? result.error
        : result.status === 0
          ? 'offline'
          : 'server';
    return { ok: false, error };
  }
  await saveSession(result.data.account, result.data.deviceToken);
  return { ok: true, account: result.data.account, recoveryCode: result.data.recoveryCode };
}

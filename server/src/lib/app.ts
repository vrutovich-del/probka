import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { accounts, deviceTokens, type Account } from '../db/schema';
import { hash } from './codes';
import { allow, callerKey, retryAfter } from './rateLimit';

/** What every route in this Worker is typed against: the bindings, plus the account a token proved. */
export type AppEnv = { Bindings: Env; Variables: { account: Account } };

export function database(env: Env) {
  return drizzle(env.DB);
}

/** A row of `accounts` as the outside world may see it: no hashes, no nickname key. */
export function publicAccount(account: Account) {
  return {
    id: account.id,
    nickname: account.nickname,
    avatar: account.avatar,
    friendCode: account.friendCode,
    createdAt: account.createdAt,
  };
}

/** A device token is written back at most once every twelve hours; D1 allows 100k writes a day. */
const LAST_SEEN_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Proves the bearer token and hands the route the account behind it. */
export const requireAccount = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return c.json({ error: 'no_token' }, 401);

  const db = database(c.env);
  const tokenHash = await hash(token);
  const row = await db
    .select({ account: accounts, lastSeenAt: deviceTokens.lastSeenAt })
    .from(deviceTokens)
    .innerJoin(accounts, eq(deviceTokens.accountId, accounts.id))
    .where(eq(deviceTokens.tokenHash, tokenHash))
    .get();
  if (!row) return c.json({ error: 'bad_token' }, 401);

  const nowMs = Date.now();
  if (nowMs - row.lastSeenAt > LAST_SEEN_INTERVAL_MS) {
    await db.update(deviceTokens).set({ lastSeenAt: nowMs }).where(eq(deviceTokens.tokenHash, tokenHash)).run();
  }
  c.set('account', row.account);
  await next();
});

/**
 * Counts one hit against a bucket and, when it is spent, answers 429 — the caller gets no work done
 * on its behalf and no hint about what exists. `null` means the request may go on.
 */
export function limited(c: Context<AppEnv>, bucket: string, limit: number, windowMs: number): Response | null {
  const key = `${bucket}:${callerKey(c.req.raw)}`;
  if (allow(key, limit, windowMs)) return null;
  return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': String(retryAfter(key)) });
}

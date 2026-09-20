import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { accounts, deviceTokens, transferCodes } from '../db/schema';
import { database, limited, publicAccount, type AppEnv } from '../lib/app';
import { hash, newDeviceToken, parseLongCode } from '../lib/codes';

/**
 * Moving a garage to another phone. Two codes open this door and nothing else does: the recovery
 * code shown once when the account was made, and a one-time code the creators can mint when that
 * paper is lost. Both are sixteen characters out of a 32-letter alphabet — eighty bits — and this
 * route is rate-limited on top, because it is the only route where guessing would be worth anything.
 */
export const transferRoutes = new Hono<AppEnv>();

transferRoutes.post('/transfer', async (c) => {
  const over = limited(c, 'transfer', 10, 60 * 60 * 1000);
  if (over) return over;

  const body = await c.req.json<{ code?: unknown }>().catch(() => null);
  const code = typeof body?.code === 'string' ? parseLongCode(body.code) : null;
  if (!code) return c.json({ error: 'invalid_code' }, 400);

  const db = database(c.env);
  const codeHash = await hash(code);

  // The recovery code stays valid for as long as the account exists: it is the parent's copy.
  let account = await db.select().from(accounts).where(eq(accounts.recoveryHash, codeHash)).get();

  if (!account) {
    const ticket = await db
      .select()
      .from(transferCodes)
      .where(and(eq(transferCodes.codeHash, codeHash), isNull(transferCodes.usedAt)))
      .get();
    if (!ticket || ticket.expiresAt < Date.now()) return c.json({ error: 'unknown_code' }, 404);
    account = await db.select().from(accounts).where(eq(accounts.id, ticket.accountId)).get();
    if (!account) return c.json({ error: 'unknown_code' }, 404);
    await db.update(transferCodes).set({ usedAt: Date.now() }).where(eq(transferCodes.codeHash, codeHash)).run();
  }

  // The phone that had the account keeps its own token: an account is allowed several, and a child
  // who moves to a new phone has usually not lost the old one.
  const token = newDeviceToken();
  const now = Date.now();
  await db
    .insert(deviceTokens)
    .values({ tokenHash: await hash(token), accountId: account.id, createdAt: now, lastSeenAt: now })
    .run();

  return c.json({ account: publicAccount(account), deviceToken: token });
});

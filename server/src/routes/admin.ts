import { Hono } from 'hono';
import { eq, like, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { accounts, caps, deviceTokens, friendRequests, friendships, photos, transferCodes } from '../db/schema';
import { database, type AppEnv } from '../lib/app';
import { hash, newRecoveryCode, parseFriendCode } from '../lib/codes';
import { deletePhotoObjects } from '../lib/photos';

/**
 * The creators' own door: find a child's account, mint them a way back in, look at what is stored,
 * delete it, and tidy the cap types two children spelled differently.
 *
 * It is guarded by `ADMIN_TOKEN`, set with `wrangler secret put` and known to nobody else. There is
 * no page for it on the published site on purpose — a secret typed into the app would be a secret
 * inside a public JavaScript bundle. `server/README.md` has the commands.
 */

const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const expected = c.env.ADMIN_TOKEN;
  // No secret set means no admin surface at all, rather than an open one.
  if (!expected) return c.json({ error: 'admin_disabled' }, 503);
  const header = c.req.header('Authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!given || !constantTimeEqual(given, expected)) return c.json({ error: 'forbidden' }, 403);
  await next();
});

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('/admin/*', requireAdmin);

/** Find an account by its invite code or by nickname (exact, or a fragment with `*`). */
adminRoutes.get('/admin/accounts', async (c) => {
  const db = database(c.env);
  const code = c.req.query('code');
  const nickname = c.req.query('nickname');

  let rows;
  if (code) {
    const parsed = parseFriendCode(code);
    if (!parsed) return c.json({ error: 'invalid_code' }, 400);
    rows = await db.select().from(accounts).where(eq(accounts.friendCode, parsed)).all();
  } else if (nickname) {
    const pattern = nickname.includes('*') ? nickname.replace(/\*/g, '%') : nickname;
    rows = await db.select().from(accounts).where(like(accounts.nicknameKey, pattern.toLowerCase())).all();
  } else {
    rows = await db.select().from(accounts).orderBy(accounts.createdAt).all();
  }

  const described = [];
  for (const account of rows) described.push(await describe(db, account.id, account));
  return c.json({ accounts: described });
});

/**
 * Mint a one-time code, good for a day. Written down and read out to the parent; the server keeps
 * only its hash, exactly as it keeps the recovery code.
 */
adminRoutes.post('/admin/accounts/:id/transfer-code', async (c) => {
  const db = database(c.env);
  const id = c.req.param('id');
  const account = await db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!account) return c.json({ error: 'not_found' }, 404);

  const code = newRecoveryCode();
  const now = Date.now();
  await db
    .insert(transferCodes)
    .values({ codeHash: await hash(code), accountId: id, createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000, usedAt: null })
    .run();
  return c.json({ code, expiresAt: now + 24 * 60 * 60 * 1000, account: { id, nickname: account.nickname } });
});

/** Everything one account holds, so it can be looked at before anything is deleted. */
adminRoutes.get('/admin/accounts/:id/caps', async (c) => {
  const db = database(c.env);
  const id = c.req.param('id');
  const rows = await db.select().from(caps).where(eq(caps.accountId, id)).all();
  const pictures = await db.select().from(photos).where(eq(photos.accountId, id)).all();
  return c.json({
    caps: rows.map((cap) => ({
      id: cap.id,
      brand: cap.brand,
      product: cap.product,
      condition: cap.condition,
      dupes: cap.dupes,
      foundOn: cap.foundOn,
      place: cap.place,
      createdAt: cap.createdAt,
      photos: pictures.filter((p) => p.capId === cap.id).map((p) => p.id),
    })),
  });
});

/** Delete one cap and its photographs. */
adminRoutes.delete('/admin/caps/:id', async (c) => {
  const db = database(c.env);
  const id = c.req.param('id');
  const pictures = await db.select({ id: photos.id }).from(photos).where(eq(photos.capId, id)).all();
  await deletePhotoObjects(c.env, pictures.map((p) => p.id));
  await db.delete(photos).where(eq(photos.capId, id)).run();
  await db.delete(caps).where(eq(caps.id, id)).run();
  return c.json({ deleted: { cap: id, photos: pictures.length } });
});

/**
 * Delete an account and everything behind it: caps, photographs, friendships, requests, tokens.
 * There is no grace period here — the seven days of screen 33b belong to a child deleting their own
 * account in the app, not to the creators removing one on request.
 */
adminRoutes.delete('/admin/accounts/:id', async (c) => {
  const db = database(c.env);
  const id = c.req.param('id');
  const account = await db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!account) return c.json({ error: 'not_found' }, 404);

  const pictures = await db.select({ id: photos.id }).from(photos).where(eq(photos.accountId, id)).all();
  await deletePhotoObjects(c.env, pictures.map((p) => p.id));
  // D1 does not enforce foreign keys the way Postgres does, so every table is cleared by hand.
  await db.delete(photos).where(eq(photos.accountId, id)).run();
  await db.delete(caps).where(eq(caps.accountId, id)).run();
  await db.delete(friendships).where(eq(friendships.accountId, id)).run();
  await db.delete(friendships).where(eq(friendships.friendId, id)).run();
  await db.delete(friendRequests).where(eq(friendRequests.fromId, id)).run();
  await db.delete(friendRequests).where(eq(friendRequests.toId, id)).run();
  await db.delete(transferCodes).where(eq(transferCodes.accountId, id)).run();
  await db.delete(deviceTokens).where(eq(deviceTokens.accountId, id)).run();
  await db.delete(accounts).where(eq(accounts.id, id)).run();
  return c.json({ deleted: { account: id, nickname: account.nickname, photos: pictures.length } });
});

/**
 * Two children typed the same cap differently ("zhiguli" and "Жигули "). This rewrites one spelling
 * into the other across every garage, which is what a catalogue will do properly one day. Case and
 * surrounding spaces are ignored when matching; `dryRun` says what would change without changing it.
 */
adminRoutes.post('/admin/types/merge', async (c) => {
  const db = database(c.env);
  const body = await c.req
    .json<{ fromBrand?: string; fromProduct?: string; toBrand?: string | null; toProduct?: string; dryRun?: boolean }>()
    .catch(() => null);
  const fromBrand = (body?.fromBrand ?? '').trim().toLowerCase();
  const fromProduct = (body?.fromProduct ?? '').trim().toLowerCase();
  if (!fromBrand && !fromProduct) return c.json({ error: 'invalid' }, 400);

  const rows = await db.select().from(caps).all();
  const matching = rows.filter(
    (cap) =>
      (cap.brand ?? '').trim().toLowerCase() === fromBrand && (cap.product ?? '').trim().toLowerCase() === fromProduct,
  );
  if (body?.dryRun) {
    return c.json({ dryRun: true, would: matching.map((cap) => ({ id: cap.id, accountId: cap.accountId })) });
  }

  const toBrand = body?.toBrand === null ? null : (body?.toBrand ?? '').trim() || null;
  const toProduct = (body?.toProduct ?? '').trim();
  for (const cap of matching) {
    await db
      .update(caps)
      .set({ brand: toBrand, product: toProduct, updatedAt: Date.now() })
      .where(eq(caps.id, cap.id))
      .run();
  }
  return c.json({ merged: matching.length, brand: toBrand, product: toProduct });
});

/** One account with the numbers that say what is behind it. */
async function describe(db: ReturnType<typeof database>, id: string, account: typeof accounts.$inferSelect) {
  const counted = await db
    .select({
      caps: sql<number>`(select count(*) from caps where caps.account_id = ${id})`,
      photos: sql<number>`(select count(*) from photos where photos.account_id = ${id})`,
      friends: sql<number>`(select count(*) from friendships where friendships.account_id = ${id})`,
      devices: sql<number>`(select count(*) from device_tokens where device_tokens.account_id = ${id})`,
    })
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  return {
    id: account.id,
    nickname: account.nickname,
    avatar: account.avatar,
    friendCode: account.friendCode,
    createdAt: account.createdAt,
    counts: counted ?? { caps: 0, photos: 0, friends: 0, devices: 0 },
  };
}

/** Comparison that does not finish early on the first wrong character. */
function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { accounts, caps, codeAttempts, friendRequests, friendships, photos } from '../db/schema';
import { database, limited, requireAccount, type AppEnv } from '../lib/app';
import { newAccountId, parseFriendCode } from '../lib/codes';

/**
 * Friends, by invite code and nothing else: no search, no directory, no way to ask the server
 * whether a nickname exists. A code is six characters out of a billion, and the only thing that
 * makes guessing them impossible is the counter below — which lives in D1, not in memory, because
 * a Worker isolate is recycled far too often to hold a security limit.
 */

/** Tries per account per hour. A child types a code from a scrap of paper; ten is generous. */
const CODE_TRIES = 10;
const CODE_WINDOW_MS = 60 * 60 * 1000;

export const friendRoutes = new Hono<AppEnv>();

friendRoutes.use('/friends', requireAccount);
friendRoutes.use('/friends/*', requireAccount);

/**
 * Everyone this account knows, with the caps each of them owns — brand, product, when and how many,
 * which is what the friends list, the badges and the leaderboard are counted from. The phone counts
 * them with the same code it counts its own garage with, so the two can never drift apart.
 */
friendRoutes.get('/friends', async (c) => {
  const me = c.get('account');
  const db = database(c.env);

  const links = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(eq(friendships.accountId, me.id))
    .all();
  const ids = links.map((l) => l.friendId);

  const people = ids.length
    ? await db
        .select({ id: accounts.id, nickname: accounts.nickname, avatar: accounts.avatar })
        .from(accounts)
        .where(inArray(accounts.id, ids))
        .all()
    : [];
  const theirCaps = ids.length
    ? await db
        .select({ accountId: caps.accountId, brand: caps.brand, product: caps.product, createdAt: caps.createdAt, dupes: caps.dupes })
        .from(caps)
        .where(inArray(caps.accountId, ids))
        .all()
    : [];

  const incoming = await db
    .select({ id: friendRequests.id, createdAt: friendRequests.createdAt, from: accounts })
    .from(friendRequests)
    .innerJoin(accounts, eq(friendRequests.fromId, accounts.id))
    .where(eq(friendRequests.toId, me.id))
    .all();
  const outgoing = await db
    .select({ id: friendRequests.id, createdAt: friendRequests.createdAt, to: accounts })
    .from(friendRequests)
    .innerJoin(accounts, eq(friendRequests.toId, accounts.id))
    .where(eq(friendRequests.fromId, me.id))
    .all();

  return c.json({
    friends: people.map((person) => ({
      ...person,
      caps: theirCaps
        .filter((cap) => cap.accountId === person.id)
        .map((cap) => ({ brand: cap.brand, product: cap.product, createdAt: cap.createdAt, dupes: cap.dupes })),
    })),
    incoming: incoming.map((r) => ({ id: r.id, createdAt: r.createdAt, person: person(r.from) })),
    outgoing: outgoing.map((r) => ({ id: r.id, createdAt: r.createdAt, person: person(r.to) })),
  });
});

/** Send a request by invite code. */
friendRoutes.post('/friends/requests', async (c) => {
  const me = c.get('account');
  // A cheap first line by address, before the durable per-account counter does the real work.
  const over = limited(c, 'codes', 30, 60 * 60 * 1000);
  if (over) return over;

  const db = database(c.env);
  if (!(await takeCodeAttempt(db, me.id))) return c.json({ error: 'rate_limited' }, 429);

  const body = await c.req.json<{ code?: unknown }>().catch(() => null);
  const code = typeof body?.code === 'string' ? parseFriendCode(body.code) : null;
  if (!code) return c.json({ error: 'invalid_code' }, 400);
  if (code === me.friendCode) return c.json({ error: 'own_code' }, 400);

  const them = await db.select().from(accounts).where(eq(accounts.friendCode, code)).get();
  if (!them) return c.json({ error: 'unknown_code' }, 404);

  const already = await db
    .select({ accountId: friendships.accountId })
    .from(friendships)
    .where(and(eq(friendships.accountId, me.id), eq(friendships.friendId, them.id)))
    .get();
  if (already) return c.json({ error: 'already_friends' }, 409);

  // They asked first and this is the answer: two children who exchange codes become friends without
  // either of them having to find a request screen.
  const theirs = await db
    .select({ id: friendRequests.id })
    .from(friendRequests)
    .where(and(eq(friendRequests.fromId, them.id), eq(friendRequests.toId, me.id)))
    .get();
  if (theirs) {
    await makeFriends(db, me.id, them.id);
    return c.json({ status: 'friends', person: person(them) }, 200);
  }

  const mine = await db
    .select({ id: friendRequests.id })
    .from(friendRequests)
    .where(and(eq(friendRequests.fromId, me.id), eq(friendRequests.toId, them.id)))
    .get();
  if (mine) return c.json({ error: 'already_sent' }, 409);

  await db
    .insert(friendRequests)
    .values({ id: newAccountId(), fromId: me.id, toId: them.id, createdAt: Date.now() })
    .run();
  return c.json({ status: 'sent', person: person(them) }, 201);
});

/** Accept a request that was sent to me. */
friendRoutes.post('/friends/requests/:id/accept', async (c) => {
  const me = c.get('account');
  const db = database(c.env);
  const request = await db.select().from(friendRequests).where(eq(friendRequests.id, c.req.param('id'))).get();
  if (!request || request.toId !== me.id) return c.json({ error: 'not_found' }, 404);
  await makeFriends(db, me.id, request.fromId);
  return c.json({ status: 'friends' });
});

/** "Not now" from the recipient, or the sender taking it back. Either way the request is gone. */
friendRoutes.delete('/friends/requests/:id', async (c) => {
  const me = c.get('account');
  const db = database(c.env);
  const request = await db.select().from(friendRequests).where(eq(friendRequests.id, c.req.param('id'))).get();
  if (!request) return c.body(null, 204);
  if (request.toId !== me.id && request.fromId !== me.id) return c.json({ error: 'not_found' }, 404);
  await db.delete(friendRequests).where(eq(friendRequests.id, request.id)).run();
  return c.body(null, 204);
});

/**
 * A friend's garage, read-only. Where the cap was found and when are left out of the answer
 * entirely — "notes and places stay private" is not a thing to hide in the interface, it is a thing
 * not to send.
 */
friendRoutes.get('/friends/:id/caps', async (c) => {
  const me = c.get('account');
  const friendId = c.req.param('id');
  const db = database(c.env);
  if (!(await areFriends(db, me.id, friendId))) return c.json({ error: 'not_found' }, 404);

  const them = await db.select().from(accounts).where(eq(accounts.id, friendId)).get();
  if (!them) return c.json({ error: 'not_found' }, 404);

  const rows = await db.select().from(caps).where(eq(caps.accountId, friendId)).all();
  const pictures = await db.select().from(photos).where(eq(photos.accountId, friendId)).all();
  return c.json({
    person: person(them),
    caps: rows.map((cap) => ({
      id: cap.id,
      createdAt: cap.createdAt,
      brand: cap.brand,
      product: cap.product,
      shape: cap.shape,
      country: cap.country,
      condition: cap.condition,
      dupes: cap.dupes,
      useCutout: cap.useCutout === 1,
      photos: pictures
        .filter((p) => p.capId === cap.id)
        .map((p) => ({ id: p.id, role: p.role, hasCutout: p.hasCutout === 1, hasThumb: p.hasThumb === 1 })),
    })),
  });
});

/** Whether these two are friends — the one check every friend-only answer goes through. */
export async function areFriends(
  db: ReturnType<typeof database>,
  accountId: string,
  otherId: string,
): Promise<boolean> {
  if (accountId === otherId) return false;
  const row = await db
    .select({ accountId: friendships.accountId })
    .from(friendships)
    .where(and(eq(friendships.accountId, accountId), eq(friendships.friendId, otherId)))
    .get();
  return row !== undefined;
}

function person(account: { id: string; nickname: string; avatar: string }) {
  return { id: account.id, nickname: account.nickname, avatar: account.avatar };
}

/** Both rows, and any request either way is spent. */
async function makeFriends(db: ReturnType<typeof database>, a: string, b: string): Promise<void> {
  const createdAt = Date.now();
  await db.insert(friendships).values({ accountId: a, friendId: b, createdAt }).onConflictDoNothing().run();
  await db.insert(friendships).values({ accountId: b, friendId: a, createdAt }).onConflictDoNothing().run();
  await db.delete(friendRequests).where(and(eq(friendRequests.fromId, a), eq(friendRequests.toId, b))).run();
  await db.delete(friendRequests).where(and(eq(friendRequests.fromId, b), eq(friendRequests.toId, a))).run();
}

/** Counts one code attempt against the account's hour. False means it has had enough for now. */
async function takeCodeAttempt(db: ReturnType<typeof database>, accountId: string): Promise<boolean> {
  const now = Date.now();
  const row = await db.select().from(codeAttempts).where(eq(codeAttempts.accountId, accountId)).get();
  if (!row || now - row.windowStart > CODE_WINDOW_MS) {
    await db
      .insert(codeAttempts)
      .values({ accountId, windowStart: now, count: 1 })
      .onConflictDoUpdate({ target: codeAttempts.accountId, set: { windowStart: now, count: 1 } })
      .run();
    return true;
  }
  if (row.count >= CODE_TRIES) return false;
  await db
    .update(codeAttempts)
    .set({ count: row.count + 1 })
    .where(eq(codeAttempts.accountId, accountId))
    .run();
  return true;
}

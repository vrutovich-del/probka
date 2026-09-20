import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { caps, photos, type Cap } from '../db/schema';
import { database, requireAccount, type AppEnv } from '../lib/app';
import { deletePhotoObjects } from '../lib/photos';

/** What the phone may say about a cap. Anything else it sends is ignored. */
interface CapInput {
  id?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  foundOn?: unknown;
  place?: unknown;
  condition?: unknown;
  brand?: unknown;
  product?: unknown;
  shape?: unknown;
  country?: unknown;
  dupes?: unknown;
  useCutout?: unknown;
}

interface PhotoInput {
  id?: unknown;
  role?: unknown;
  width?: unknown;
  height?: unknown;
  bbox?: unknown;
  rimColor?: unknown;
}

export const capRoutes = new Hono<AppEnv>();

capRoutes.use('/caps', requireAccount);
capRoutes.use('/caps/*', requireAccount);

/** The whole garage, for a phone that is starting empty (a transfer, item 5). */
capRoutes.get('/caps', async (c) => {
  const account = c.get('account');
  const db = database(c.env);
  const rows = await db.select().from(caps).where(eq(caps.accountId, account.id)).all();
  const pictures = await db.select().from(photos).where(eq(photos.accountId, account.id)).all();
  return c.json({
    caps: rows.map(publicCap),
    photos: pictures.map((p) => ({
      id: p.id,
      capId: p.capId,
      role: p.role,
      width: p.width,
      height: p.height,
      bbox: p.bbox ? (JSON.parse(p.bbox) as unknown) : null,
      rimColor: p.rimColor,
      variants: {
        original: p.hasOriginal === 1,
        cutout: p.hasCutout === 1,
        thumb: p.hasThumb === 1,
      },
    })),
  });
});

/**
 * Write one cap and the metadata of its photos. The phone sends the whole cap every time, so a
 * retry is safe and the last state wins — except for the catalogue fields, which the server keeps
 * once it has them, per the sitemap's conflict rule. The answer carries the stored row back, so
 * the phone can adopt whatever the server decided.
 */
capRoutes.put('/caps/:id', async (c) => {
  const account = c.get('account');
  const id = c.req.param('id');
  const body = await c.req.json<{ cap?: CapInput; photos?: PhotoInput[] }>().catch(() => null);
  const input = body?.cap;
  if (!input || input.id !== id) return c.json({ error: 'invalid' }, 400);

  const cap = readCap(id, account.id, input);
  if (!cap) return c.json({ error: 'invalid' }, 400);

  const db = database(c.env);
  const existing = await db.select().from(caps).where(eq(caps.id, id)).get();
  if (existing && existing.accountId !== account.id) return c.json({ error: 'not_found' }, 404);
  if (existing && existing.updatedAt > cap.updatedAt) return c.json({ cap: publicCap(existing) });

  if (existing) {
    // Catalogue fields: what the server already knows stays. Notes and photos: the phone decides.
    await db
      .update(caps)
      .set({
        updatedAt: cap.updatedAt,
        foundOn: cap.foundOn,
        place: cap.place,
        condition: cap.condition,
        dupes: cap.dupes,
        useCutout: cap.useCutout,
        brand: existing.brand ?? cap.brand,
        product: existing.product || cap.product,
        shape: existing.shape ?? cap.shape,
        country: existing.country ?? cap.country,
      })
      .where(eq(caps.id, id))
      .run();
  } else {
    await db.insert(caps).values(cap).run();
  }

  const list = Array.isArray(body?.photos) ? body.photos : [];
  for (const raw of list) {
    const photo = readPhoto(raw, id, account.id, cap.createdAt);
    if (!photo) continue;
    const known = await db.select({ id: photos.id }).from(photos).where(eq(photos.id, photo.id)).get();
    if (known) {
      await db
        .update(photos)
        .set({ width: photo.width, height: photo.height, bbox: photo.bbox, rimColor: photo.rimColor })
        .where(and(eq(photos.id, photo.id), eq(photos.accountId, account.id)))
        .run();
    } else {
      await db.insert(photos).values(photo).run();
    }
  }

  const stored = await db.select().from(caps).where(eq(caps.id, id)).get();
  return c.json({ cap: stored ? publicCap(stored) : publicCap(cap) });
});

/**
 * Delete a cap. Its photos go from the bucket in the same breath — the owner's decision: only an
 * account gets a grace period, a single cap does not.
 */
capRoutes.delete('/caps/:id', async (c) => {
  const account = c.get('account');
  const id = c.req.param('id');
  const db = database(c.env);
  const cap = await db.select({ accountId: caps.accountId }).from(caps).where(eq(caps.id, id)).get();
  // Already gone is a success: the phone must be able to stop asking.
  if (!cap) return c.body(null, 204);
  if (cap.accountId !== account.id) return c.json({ error: 'not_found' }, 404);

  const pictures = await db.select({ id: photos.id }).from(photos).where(eq(photos.capId, id)).all();
  await deletePhotoObjects(
    c.env,
    pictures.map((p) => p.id),
  );
  await db.delete(photos).where(eq(photos.capId, id)).run();
  await db.delete(caps).where(eq(caps.id, id)).run();
  return c.body(null, 204);
});

/** Takes a row as stored or as about to be stored — the fields a phone is allowed to see are the same. */
export function publicCap(cap: Cap | typeof caps.$inferInsert) {
  return {
    id: cap.id,
    createdAt: cap.createdAt,
    updatedAt: cap.updatedAt,
    foundOn: cap.foundOn,
    place: cap.place,
    condition: cap.condition,
    brand: cap.brand ?? null,
    product: cap.product,
    shape: cap.shape ?? null,
    country: cap.country ?? null,
    dupes: cap.dupes,
    useCutout: cap.useCutout === 1,
  };
}

const CONDITIONS = ['mint', 'worn', 'dented', 'dirty'];
const SHAPES = ['crown', 'aluminium', 'plastic', 'other'];
const ROLES = ['top', 'side'];

function readCap(id: string, accountId: string, input: CapInput): typeof caps.$inferInsert | null {
  const createdAt = int(input.createdAt);
  const updatedAt = int(input.updatedAt);
  const condition = str(input.condition);
  if (createdAt === null || updatedAt === null || !CONDITIONS.includes(condition ?? '')) return null;
  const foundOn = str(input.foundOn);
  if (!foundOn || !/^\d{4}-\d{2}-\d{2}$/.test(foundOn)) return null;
  const shape = str(input.shape);
  if (shape !== null && !SHAPES.includes(shape)) return null;
  const country = str(input.country);
  if (country !== null && !/^[A-Z]{2}$/.test(country)) return null;
  return {
    id,
    accountId,
    createdAt,
    updatedAt,
    foundOn,
    place: cut(str(input.place) ?? '', 200),
    condition: condition as string,
    brand: input.brand === null ? null : cut(str(input.brand) ?? '', 60) || null,
    product: cut(str(input.product) ?? '', 60),
    shape,
    country,
    dupes: Math.min(Math.max(int(input.dupes) ?? 1, 1), 999),
    useCutout: input.useCutout ? 1 : 0,
  };
}

function readPhoto(
  input: PhotoInput,
  capId: string,
  accountId: string,
  createdAt: number,
): typeof photos.$inferInsert | null {
  const id = str(input.id);
  const role = str(input.role);
  if (!id || !role || !ROLES.includes(role)) return null;
  return {
    id,
    capId,
    accountId,
    role,
    width: Math.max(int(input.width) ?? 0, 0),
    height: Math.max(int(input.height) ?? 0, 0),
    bbox: input.bbox && typeof input.bbox === 'object' ? JSON.stringify(input.bbox) : null,
    rimColor: str(input.rimColor),
    createdAt,
  };
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function int(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function cut(value: string, max: number): string {
  return [...value.trim()].slice(0, max).join('');
}

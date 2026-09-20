import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { photos } from '../db/schema';
import { database, requireAccount, type AppEnv } from '../lib/app';
import { isVariant, objectKey, type Variant } from '../lib/photos';
import { areFriends } from './friends';

/** A cap photo at ≤1024 px; a camera original is the big one and still nowhere near this. */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Only pictures, and only ever served back as the type they came in as. A phone may hand over
 * image/heic from its camera, so the check is the prefix rather than a list — but anything that is
 * not an image is refused, because this Worker's own origin must never serve a document someone else
 * chose the type of.
 */
function imageType(header: string | undefined): string | null {
  const type = (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  return /^image\/[a-z0-9.+-]+$/.test(type) ? type : null;
}

export const photoRoutes = new Hono<AppEnv>();

photoRoutes.use('/photos/*', requireAccount);

/** Upload one variant. The row must already exist — it arrives with the cap. */
photoRoutes.put('/photos/:id/:variant', async (c) => {
  const account = c.get('account');
  const id = c.req.param('id');
  const variant = c.req.param('variant');
  if (!isVariant(variant)) return c.json({ error: 'invalid' }, 400);

  const db = database(c.env);
  const photo = await db.select().from(photos).where(eq(photos.id, id)).get();
  if (!photo || photo.accountId !== account.id) return c.json({ error: 'not_found' }, 404);

  const type = imageType(c.req.header('Content-Type'));
  if (!type) return c.json({ error: 'bad_type' }, 415);

  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: 'empty' }, 400);
  if (body.byteLength > MAX_BYTES) return c.json({ error: 'too_large' }, 413);

  await c.env.PHOTOS.put(objectKey(id, variant), body, { httpMetadata: { contentType: type } });
  await db.update(photos).set(variantFlag(variant)).where(eq(photos.id, id)).run();
  return c.json({ ok: true });
});

/**
 * Read one variant. The owner gets all of them. A friend gets the cutout and the garage tile — the
 * cap on its own — but never the camera original, which is whatever else was in the frame: a room,
 * a hand, a school desk. Nobody else gets anything, and "not yours" answers 404 rather than 403, so
 * the API never confirms that an id exists.
 */
photoRoutes.get('/photos/:id/:variant', async (c) => {
  const account = c.get('account');
  const id = c.req.param('id');
  const variant = c.req.param('variant');
  if (!isVariant(variant)) return c.json({ error: 'invalid' }, 400);

  const db = database(c.env);
  const photo = await db.select().from(photos).where(eq(photos.id, id)).get();
  if (!photo) return c.json({ error: 'not_found' }, 404);
  if (photo.accountId !== account.id) {
    const allowed = variant !== 'original' && (await areFriends(db, account.id, photo.accountId));
    if (!allowed) return c.json({ error: 'not_found' }, 404);
  }

  const object = await c.env.PHOTOS.get(objectKey(id, variant));
  if (!object) return c.json({ error: 'not_found' }, 404);
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Length': String(object.size),
      // A child's photograph: never in a shared cache. `Vary` keeps the phone's own cache from
      // handing one account's photo to a request made with another account's token — two children
      // on one phone is exactly the case this project has to expect.
      'Cache-Control': 'private, max-age=3600',
      Vary: 'Authorization',
      'X-Content-Type-Options': 'nosniff',
      ETag: object.httpEtag,
    },
  });
});

function variantFlag(variant: Variant) {
  if (variant === 'original') return { hasOriginal: 1 };
  if (variant === 'cutout') return { hasCutout: 1 };
  return { hasThumb: 1 };
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import { database, limited, type AppEnv, type Bindings } from './lib/app';
import { accountRoutes } from './routes/accounts';
import { capRoutes } from './routes/caps';
import { friendRoutes } from './routes/friends';
import { transferRoutes } from './routes/transfer';
import { adminRoutes } from './routes/admin';
import { photoRoutes } from './routes/photos';

/** The published app, and the only browser origin allowed to read this API. */
const SITE_ORIGIN = 'https://vrutovich-del.github.io';

/** Vite's dev and preview servers. Allowed only while the Worker itself runs on this machine. */
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

/** A key nothing ever writes: HEAD on it answers "the bucket is there" without touching an object. */
const R2_PROBE_KEY = 'health/probe';

const app = new Hono<AppEnv>();

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      if (origin === SITE_ORIGIN) return origin;
      return c.env.ENVIRONMENT === 'development' && DEV_ORIGINS.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  }),
);

/**
 * Is the Worker up, is D1 bound and migrated, is the bucket bound. 503 when any of it is not,
 * so a deploy that forgot `wrangler d1 migrations apply` says so instead of failing later
 * under a child's first cap.
 *
 * Open to anyone, so it is rate-limited: past six calls a minute it answers 429 without touching
 * the database or the bucket, and the free tier's daily budget is not something a stranger can spend.
 */
app.get('/api/health', async (c) => {
  const over = limited(c, 'health', 6, 60 * 1000);
  if (over) return over;

  const [db, r2] = await Promise.all([checkDb(c.env), checkR2(c.env.PHOTOS)]);
  const ok = db.ok && r2.ok;
  return c.json({ ok, time: new Date().toISOString(), db, r2 }, ok ? 200 : 503);
});

app.route('/api', accountRoutes);
app.route('/api', capRoutes);
app.route('/api', friendRoutes);
app.route('/api', transferRoutes);
app.route('/api', adminRoutes);
app.route('/api', photoRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));

app.onError((err, c) => {
  // Error logs are the only telemetry this project allows; read them live with `wrangler tail`.
  console.error(err);
  return c.json({ error: 'internal' }, 500);
});

export default app;

type DbCheck = { ok: true; migrations: number } | { ok: false; error: string };

async function checkDb(env: Bindings): Promise<DbCheck> {
  try {
    const db = database(env);
    await db.run(sql`select 1`);
    return { ok: true, migrations: await countMigrations(db) };
  } catch (err) {
    return { ok: false, error: describe(err) };
  }
}

/**
 * How many migrations wrangler has applied here. Its bookkeeping table only appears with the
 * first one, so "no table" honestly means zero rather than an error.
 */
async function countMigrations(db: ReturnType<typeof database>): Promise<number> {
  const table = await db.get<{ n: number }>(
    sql`select count(*) as n from sqlite_master where type = 'table' and name = 'd1_migrations'`,
  );
  if (!table?.n) return 0;
  const applied = await db.get<{ n: number }>(sql`select count(*) as n from d1_migrations`);
  return applied?.n ?? 0;
}

async function checkR2(binding: R2Bucket): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await binding.head(R2_PROBE_KEY);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describe(err) };
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

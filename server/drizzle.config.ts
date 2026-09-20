import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit only writes the SQL: it compares `schema.ts` with the snapshot under
 * `migrations/meta/` and emits the difference as the next numbered file. Applying it is
 * wrangler's job (`npm run db:apply:local` / `:remote`), which is also what keeps the local
 * and the deployed database on the same footing — no database credentials live here.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});

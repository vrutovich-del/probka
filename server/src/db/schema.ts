/**
 * The database, as Drizzle sees it. D1 is SQLite, so every table is declared with
 * `sqliteTable` from `drizzle-orm/sqlite-core`, and photos never live here — they go to R2.
 *
 * Empty for now: the first tables (accounts and their device tokens) belong to item 2, and
 * inventing them a round early would only have to be guessed twice. `npm run db:generate`
 * turns whatever is exported here into SQL under `migrations/`.
 */

export {};

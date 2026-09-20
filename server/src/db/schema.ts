/**
 * The database, as Drizzle sees it. D1 is SQLite, so every table is declared with
 * `sqliteTable` from `drizzle-orm/sqlite-core`, and photos never live here — they go to R2.
 *
 * What is stored about a child: a nickname, one of six avatar shapes, an invite code and the
 * caps. No e-mail, no phone, no real name, no password. An account is proved by a device token,
 * and can be recovered with a code the parent keeps — both are held as SHA-256 hashes, so the
 * database itself cannot be replayed against the API.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull(),
  /** The nickname folded to lower case: what "taken" is decided on, so two children cannot differ by case alone. */
  nicknameKey: text('nickname_key').notNull().unique(),
  /** One of the six avatar keys the client offers. */
  avatar: text('avatar').notNull(),
  /** `K7M-4QZ`, from an alphabet with no 0/O/1/I. The only way to be found by another child. */
  friendCode: text('friend_code').notNull().unique(),
  /** SHA-256 of the recovery code, which is shown once and then exists only on the parent's paper. */
  recoveryHash: text('recovery_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const deviceTokens = sqliteTable(
  'device_tokens',
  {
    /** SHA-256 of the bearer token. The token itself is only ever in the phone that was given it. */
    tokenHash: text('token_hash').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
  },
  (t) => [index('device_tokens_account').on(t.accountId)],
);

export type Account = typeof accounts.$inferSelect;

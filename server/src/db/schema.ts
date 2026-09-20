/**
 * The database, as Drizzle sees it. D1 is SQLite, so every table is declared with
 * `sqliteTable` from `drizzle-orm/sqlite-core`, and photos never live here — they go to R2.
 *
 * What is stored about a child: a nickname, one of six avatar shapes, an invite code and the
 * caps. No e-mail, no phone, no real name, no password. An account is proved by a device token,
 * and can be recovered with a code the parent keeps — both are held as SHA-256 hashes, so the
 * database itself cannot be replayed against the API.
 */
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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

/**
 * A cap, as one child's garage holds it. The split that matters is in the sitemap's conflict rule:
 * the catalogue fields (brand, product, shape, country) are the server's to decide once a catalogue
 * exists, and the rest — where it was found, what shape it is in, the photos — belong to the phone.
 */
export const caps = sqliteTable(
  'caps',
  {
    /** The id the phone made. Ids are UUIDs, so one child's cap cannot collide with another's. */
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    /** Device clock, on the last change the phone made. Older writes are ignored. */
    updatedAt: integer('updated_at').notNull(),
    foundOn: text('found_on').notNull(),
    place: text('place').notNull(),
    condition: text('condition').notNull(),
    brand: text('brand'),
    product: text('product').notNull(),
    shape: text('shape'),
    country: text('country'),
    dupes: integer('dupes').notNull(),
    useCutout: integer('use_cutout').notNull(),
  },
  (t) => [index('caps_account').on(t.accountId)],
);

/**
 * A photo's metadata. The pixels are in R2 under `photos/<id>/<variant>`, and the only way to them
 * is a Worker route that checks the token first — the bucket has no public address at all.
 */
export const photos = sqliteTable(
  'photos',
  {
    id: text('id').primaryKey(),
    capId: text('cap_id')
      .notNull()
      .references(() => caps.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** The cutout's bounding box as JSON, or null — the 3D cap is built from it. */
    bbox: text('bbox'),
    rimColor: text('rim_color'),
    /** Which variants have actually landed in the bucket; a phone uploads them one at a time. */
    hasOriginal: integer('has_original').notNull().default(0),
    hasCutout: integer('has_cutout').notNull().default(0),
    hasThumb: integer('has_thumb').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('photos_cap').on(t.capId), index('photos_account').on(t.accountId)],
);

/**
 * Friendship, held as two rows — one each way — so "who are my friends" is one indexed lookup and
 * never a query that has to look at both columns.
 */
export const friendships = sqliteTable(
  'friendships',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    friendId: text('friend_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.friendId] }), index('friendships_account').on(t.accountId)],
);

/** One child has typed another's invite code and is waiting to be let in. */
export const friendRequests = sqliteTable(
  'friend_requests',
  {
    id: text('id').primaryKey(),
    fromId: text('from_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    toId: text('to_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('friend_requests_pair').on(t.fromId, t.toId), index('friend_requests_to').on(t.toId)],
);

/**
 * How many invite codes an account has tried lately. In the database rather than in an isolate's
 * memory: this is the counter that stops a code being guessed, and it has to survive the Worker
 * being recycled — which happens constantly.
 */
export const codeAttempts = sqliteTable('code_attempts', {
  accountId: text('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull(),
});

/**
 * A one-time code that turns into a device token: the way back into a garage when the recovery
 * code the parent kept is gone too. Only the creators can mint one, and it is worth using once,
 * within a day.
 */
export const transferCodes = sqliteTable(
  'transfer_codes',
  {
    codeHash: text('code_hash').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
  },
  (t) => [index('transfer_codes_account').on(t.accountId)],
);

export type Account = typeof accounts.$inferSelect;
export type Cap = typeof caps.$inferSelect;
export type Photo = typeof photos.$inferSelect;

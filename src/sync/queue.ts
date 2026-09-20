import { db, type SyncOpRecord } from '../db/db';

/**
 * The list of things the server has not been told yet, in IndexedDB so it survives the app being
 * closed mid-upload — which, on a phone in a pocket, is the normal case rather than the exception.
 *
 * An op names a cap; it carries no copy of it. Whatever the garage holds at the moment the op is
 * sent is what goes up, so five edits in a row cost one upload and a retry never sends stale data.
 */

export type SyncKind = SyncOpRecord['kind'];

function keyOf(kind: SyncKind, capId: string): string {
  return `${kind}:${capId}`;
}

/**
 * Adds an op, or replaces the one already queued for that cap. `delayMs` holds it back — a deleted
 * cap waits out its UNDO window before the server is told, so an undo inside those five seconds
 * costs nothing and takes no photograph out of the bucket.
 */
export async function enqueue(kind: SyncKind, capId: string, delayMs = 0): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.syncQueue, async () => {
    if (kind === 'cap.delete') {
      // A deleted cap has nothing left to upload.
      await db.syncQueue.delete(keyOf('cap', capId));
    } else {
      // A cap that comes back (undo) cancels its own delete.
      await db.syncQueue.delete(keyOf('cap.delete', capId));
    }
    const key = keyOf(kind, capId);
    const existing = await db.syncQueue.get(key);
    await db.syncQueue.put({
      key,
      kind,
      capId,
      createdAt: existing?.createdAt ?? now,
      attempts: 0,
      after: now + delayMs,
    });
  });
}

/** Queues every cap in the garage — what happens the moment a guest becomes an account. */
export async function enqueueEverything(): Promise<number> {
  const ids = await db.caps.toCollection().primaryKeys();
  for (const id of ids) await enqueue('cap', id);
  return ids.length;
}

export async function queueLength(): Promise<number> {
  return db.syncQueue.count();
}

/** The next op that is due, or undefined while everything is waiting out its backoff. */
export async function nextOp(now = Date.now()): Promise<SyncOpRecord | undefined> {
  const due = await db.syncQueue.orderBy('createdAt').filter((op) => op.after <= now).first();
  return due;
}

export async function dropOp(key: string): Promise<void> {
  await db.syncQueue.delete(key);
}

/** One failure: the op waits longer each time, up to five minutes. */
export async function backOff(op: SyncOpRecord): Promise<void> {
  const attempts = op.attempts + 1;
  const wait = Math.min(5 * 60_000, 2_000 * 2 ** Math.min(attempts, 8));
  await db.syncQueue.put({ ...op, attempts, after: Date.now() + wait });
}

/** Everything is dropped when an account goes away: the ops name caps this phone no longer owns. */
export async function clearQueue(): Promise<void> {
  await db.syncQueue.clear();
}

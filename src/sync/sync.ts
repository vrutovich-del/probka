import { useSyncExternalStore } from 'react';
import { currentAccount, deviceToken } from '../account/account';
import { apiFetch, apiJson, hasServer } from '../api/client';
import { db, type CapRecord, type PhotoRecord } from '../db/db';
import { useLiveQuery } from '../db/useLiveQuery';
import { backOff, dropOp, enqueueEverything, nextOp } from './queue';

/**
 * The uploader. It walks the queue one op at a time, and every failure is expected: a phone in a
 * pocket is offline more often than not. Nothing here is on the path of adding a cap — the garage
 * is written first and the server is told afterwards, which is what "offline first" means.
 */

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

let state: SyncState = 'off';
let running = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setState(next: SyncState): void {
  if (state === next) return;
  state = next;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Whether this phone has anywhere to sync to at all. */
function canSync(): boolean {
  return hasServer() && currentAccount() !== null && deviceToken() !== null;
}

/** Starts the uploader and keeps it awake: on launch, when the network returns, and after each change. */
export function startSync(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => kick());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') kick();
    });
  }
  kick();
}

/** Asks the uploader to have another go, now. Safe to call from anywhere, as often as you like. */
export function kick(): void {
  void run();
}

async function run(): Promise<void> {
  if (running) return;
  if (!canSync()) {
    setState('off');
    return;
  }
  running = true;
  try {
    for (;;) {
      const token = deviceToken();
      if (!token) return void setState('off');
      const op = await nextOp();
      if (!op) {
        const left = await db.syncQueue.count();
        setState(left === 0 ? 'idle' : navigator.onLine ? 'error' : 'offline');
        scheduleRetry();
        return;
      }
      if (!navigator.onLine) {
        setState('offline');
        scheduleRetry();
        return;
      }
      setState('syncing');
      const outcome = op.kind === 'cap.delete' ? await sendDelete(op.capId, token) : await sendCap(op.capId, token);
      if (outcome === 'done' || outcome === 'drop') {
        await dropOp(op.key);
      } else if (outcome === 'unauthorised') {
        // The token is no longer good for anything; stop rather than hammer the server.
        setState('error');
        return;
      } else {
        await backOff(op);
        setState(navigator.onLine ? 'error' : 'offline');
        scheduleRetry();
        return;
      }
    }
  } catch (error) {
    console.error('Sync failed', error);
    setState('error');
    scheduleRetry();
  } finally {
    running = false;
  }
}

/** One more go when the earliest waiting op is due; a minute is the longest this ever sleeps. */
function scheduleRetry(): void {
  clearTimeout(timer);
  void (async () => {
    const left = await db.syncQueue.count();
    if (left === 0) return;
    const earliest = await db.syncQueue.orderBy('createdAt').first();
    const wait = Math.min(60_000, Math.max(2_000, (earliest?.after ?? 0) - Date.now()));
    timer = setTimeout(() => kick(), wait);
  })();
}

type Outcome = 'done' | 'drop' | 'retry' | 'unauthorised';

interface StoredCap {
  brand: string | null;
  product: string;
  shape: CapRecord['shape'];
  country: string | null;
}

async function sendCap(capId: string, token: string): Promise<Outcome> {
  const cap = await db.caps.get(capId);
  // Deleted while it waited: the delete op is what the server needs to hear, not this.
  if (!cap) return 'drop';
  const photos = await db.photos.where('capId').equals(capId).toArray();
  const thumb = await db.thumbs.get(capId);

  const result = await apiJson<{ cap: StoredCap }>(`/api/caps/${capId}`, {
    method: 'PUT',
    token,
    body: {
      cap: {
        id: cap.id,
        createdAt: cap.createdAt,
        updatedAt: cap.updatedAt ?? cap.createdAt,
        foundOn: cap.foundOn,
        place: cap.place,
        condition: cap.condition,
        brand: cap.brand,
        product: cap.product,
        shape: cap.shape,
        country: cap.country,
        dupes: cap.dupes,
        useCutout: cap.useCutout,
      },
      photos: photos.map((p) => ({
        id: p.id,
        role: p.role,
        width: p.width,
        height: p.height,
        bbox: p.bbox,
        rimColor: p.rimColor,
      })),
    },
  });
  if (!result.ok) return classify(result.status);

  await adoptCatalogue(cap, result.data.cap);

  for (const photo of photos) {
    if (photo.synced) continue;
    if (!(await sendPhoto(photo, photo.role === 'top' ? (thumb?.blob ?? null) : null, token))) return 'retry';
    await db.photos.update(photo.id, { synced: Date.now() });
  }
  return 'done';
}

/**
 * "Server wins the catalogue, the device wins photos and notes" (sitemap 35). Written straight to
 * the garage without queueing anything: this is the server's own answer coming back, not a change
 * the child made.
 */
async function adoptCatalogue(cap: CapRecord, stored: StoredCap): Promise<void> {
  const changed =
    stored.brand !== cap.brand ||
    stored.product !== cap.product ||
    stored.shape !== cap.shape ||
    stored.country !== cap.country;
  if (!changed) return;
  await db.caps.update(cap.id, {
    brand: stored.brand,
    product: stored.product,
    shape: stored.shape,
    country: stored.country,
  });
}

/** The pixels: the original always, the cutout when there is one, and the garage tile with the top photo. */
async function sendPhoto(photo: PhotoRecord, thumb: Blob | null, token: string): Promise<boolean> {
  if (!(await putBlob(`/api/photos/${photo.id}/original`, photo.original, token))) return false;
  if (photo.cutout && !(await putBlob(`/api/photos/${photo.id}/cutout`, photo.cutout, token))) return false;
  if (thumb && !(await putBlob(`/api/photos/${photo.id}/thumb`, thumb, token))) return false;
  return true;
}

async function putBlob(path: string, blob: Blob, token: string): Promise<boolean> {
  try {
    const response = await apiFetch(path, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        // A camera file carries its own type; anything the browser could not name goes up as PNG,
        // which is what this app writes.
        'Content-Type': blob.type.startsWith('image/') ? blob.type : 'image/png',
      },
      body: blob,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendDelete(capId: string, token: string): Promise<Outcome> {
  const result = await apiJson(`/api/caps/${capId}`, { method: 'DELETE', token });
  if (result.ok) return 'done';
  // Gone already is the outcome we wanted.
  if (result.status === 404) return 'done';
  return classify(result.status);
}

/** A refusal the server will repeat forever is dropped; anything else is worth another try. */
function classify(status: number): Outcome {
  if (status === 401) return 'unauthorised';
  if (status === 400 || status === 404 || status === 413 || status === 415) return 'drop';
  return 'retry';
}

/**
 * The guest garage becoming the account's: every cap already on the phone is queued, nothing is
 * written and nothing deleted. This is the whole of the "merge" the link sheet promises.
 */
export async function uploadExistingGarage(): Promise<number> {
  const queued = await enqueueEverything();
  kick();
  return queued;
}

export interface SyncStatus {
  state: SyncState;
  /** Caps still to upload. Undefined until the queue has been read. */
  pending: number | undefined;
}

export function useSyncStatus(): SyncStatus {
  const live = useSyncExternalStore(subscribe, () => state);
  const pending = useLiveQuery(() => db.syncQueue.count(), []);
  return { state: live, pending };
}

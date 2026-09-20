import { saveSession } from './account';
import { apiFetch, apiJson } from '../api/client';
import { db, type AccountRecord, type CapRecord, type PhotoRecord } from '../db/db';
import { uploadExistingGarage } from '../sync/sync';
import type { Box } from '../cutout/types';

/**
 * Moving a garage onto this phone. The child types the recovery code their parent kept — or the
 * one-time code we minted for them when that paper is gone — and the phone gets its own token and
 * then pulls the whole garage down: caps, photographs, tiles.
 *
 * Whatever is already on this phone is left alone. A garage is only ever added to.
 */

export type TransferError = 'invalid_code' | 'unknown_code' | 'rate_limited' | 'offline' | 'server';

export interface TransferProgress {
  /** Caps written so far, and how many there are in total. */
  done: number;
  total: number;
}

export type TransferResult =
  | { ok: true; account: AccountRecord; caps: number; missed: number }
  | { ok: false; error: TransferError };

interface ServerCap {
  id: string;
  createdAt: number;
  updatedAt: number;
  foundOn: string;
  place: string;
  condition: CapRecord['condition'];
  brand: string | null;
  product: string;
  shape: CapRecord['shape'];
  country: string | null;
  dupes: number;
  useCutout: boolean;
}

interface ServerPhoto {
  id: string;
  capId: string;
  role: PhotoRecord['role'];
  width: number;
  height: number;
  bbox: Box | null;
  rimColor: string | null;
  variants: { original: boolean; cutout: boolean; thumb: boolean };
}

export async function transferGarage(
  code: string,
  onProgress?: (progress: TransferProgress) => void,
): Promise<TransferResult> {
  const claimed = await apiJson<{ account: AccountRecord; deviceToken: string }>('/api/transfer', {
    method: 'POST',
    body: { code },
  });
  if (!claimed.ok) {
    const known: TransferError[] = ['invalid_code', 'unknown_code', 'rate_limited'];
    const error = known.find((e) => e === claimed.error) ?? (claimed.status === 0 ? 'offline' : 'server');
    return { ok: false, error };
  }

  const { account, deviceToken } = claimed.data;
  await saveSession(account, deviceToken);

  // Whatever was already on this phone belongs to this account now, and this account's server has
  // never seen it — not even the parts a previous account had uploaded. The upload marks come off
  // and every cap is queued again, which is the same merge that creating an account does.
  await db.photos.toCollection().modify((photo) => {
    photo.synced = undefined;
  });
  await uploadExistingGarage();

  const garage = await apiJson<{ caps: ServerCap[]; photos: ServerPhoto[] }>('/api/caps', { token: deviceToken });
  // The account is this phone's now even if the garage cannot be fetched this minute; the caps come
  // down on the next attempt rather than the whole transfer failing.
  if (!garage.ok) return { ok: true, account, caps: 0, missed: 0 };

  const { caps, photos } = garage.data;
  let done = 0;
  let missed = 0;
  onProgress?.({ done, total: caps.length });

  for (const cap of caps) {
    const mine = photos.filter((p) => p.capId === cap.id);
    const downloaded: PhotoRecord[] = [];
    let thumb: Blob | null = null;
    let whole = true;

    for (const photo of mine) {
      const original = photo.variants.original ? await download(photo.id, 'original', deviceToken) : null;
      const cutout = photo.variants.cutout ? await download(photo.id, 'cutout', deviceToken) : null;
      if (photo.variants.thumb && !thumb) thumb = await download(photo.id, 'thumb', deviceToken);
      if (!original) {
        whole = false;
        continue;
      }
      downloaded.push({
        id: photo.id,
        capId: cap.id,
        role: photo.role,
        original,
        cutout,
        thumb: null,
        width: photo.width,
        height: photo.height,
        bbox: photo.bbox,
        rimColor: photo.rimColor,
        cutoutMs: null,
        inferMs: null,
        device: null,
        // Everything here came from the server, so there is nothing to send back up.
        synced: Date.now(),
      });
    }

    if (!whole) missed += 1;

    await db.transaction('rw', db.caps, db.photos, db.thumbs, async () => {
      await db.caps.put({
        id: cap.id,
        createdAt: cap.createdAt,
        updatedAt: cap.updatedAt,
        foundOn: cap.foundOn,
        place: cap.place,
        condition: cap.condition,
        brand: cap.brand,
        product: cap.product,
        shape: cap.shape,
        country: cap.country,
        dupes: cap.dupes,
        useCutout: cap.useCutout,
      });
      if (downloaded.length) await db.photos.bulkPut(downloaded);
      if (thumb) await db.thumbs.put({ capId: cap.id, blob: thumb });
    });

    done += 1;
    onProgress?.({ done, total: caps.length });
  }

  return { ok: true, account, caps: caps.length, missed };
}

async function download(photoId: string, variant: string, token: string): Promise<Blob | null> {
  try {
    const response = await apiFetch(`/api/photos/${photoId}/${variant}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

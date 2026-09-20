import { newId } from '../lib/id';
import type { CutoutResult } from '../cutout/types';
import { db, type CapRecord, type CapShape, type Condition, type PhotoRecord, type PhotoRole, type ThumbRecord } from './db';

export interface CapType {
  brand: string | null;
  product: string;
  shape: CapShape | null;
  country: string | null;
}

export interface CapPhotoInput {
  role: PhotoRole;
  original: Blob;
  /** null when the cutout failed or was rejected. */
  cutout: CutoutResult | null;
}

export interface NewCap {
  type: CapType;
  condition: Condition;
  foundOn: string;
  place: string;
  useCutout: boolean;
  photos: CapPhotoInput[];
  /** Garage tile image; from the cutout when there is one, else made from the original. */
  thumb: Blob | null;
}

/** Writes a cap, its photos and its tile atomically; returns the new cap's id. */
export async function saveCap(input: NewCap): Promise<string> {
  const capId = newId();
  const cap: CapRecord = {
    id: capId,
    createdAt: Date.now(),
    foundOn: input.foundOn,
    place: input.place.trim(),
    condition: input.condition,
    brand: input.type.brand?.trim() || null,
    product: input.type.product.trim(),
    shape: input.type.shape,
    country: input.type.country,
    dupes: 1,
    useCutout: input.useCutout,
  };
  const photos: PhotoRecord[] = input.photos.map((p) => ({
    id: newId(),
    capId,
    role: p.role,
    original: p.original,
    cutout: p.cutout?.cutout ?? null,
    thumb: null,
    width: p.cutout?.stats.width ?? 0,
    height: p.cutout?.stats.height ?? 0,
    bbox: p.cutout?.stats.bbox ?? null,
    rimColor: p.cutout?.stats.rimColor ?? null,
    cutoutMs: p.cutout?.timing?.totalMs ?? null,
    inferMs: p.cutout?.timing?.inferMs ?? null,
    device: p.cutout?.timing?.device ?? null,
  }));
  await db.transaction('rw', db.caps, db.photos, db.thumbs, async () => {
    await db.caps.add(cap);
    await db.photos.bulkAdd(photos);
    if (input.thumb) await db.thumbs.add({ capId, blob: input.thumb });
  });
  return capId;
}

/** Distinct brands already in the garage, for the manual-entry suggestions. */
export async function knownBrands(): Promise<string[]> {
  const brands = await db.caps.orderBy('brand').uniqueKeys();
  return brands.filter((b): b is string => typeof b === 'string' && b.length > 0);
}

const fold = (s: string | null | undefined) => (s ?? '').trim().toLocaleLowerCase();

/** A cap of the same brand and product, if the garage already has one (screen 11). */
export async function findSameType(type: CapType): Promise<CapRecord | undefined> {
  if (!type.brand && !type.product) return undefined;
  return db.caps.filter((c) => fold(c.brand) === fold(type.brand) && fold(c.product) === fold(type.product)).first();
}

export async function setDupes(id: string, dupes: number): Promise<void> {
  await db.caps.update(id, { dupes: Math.max(1, dupes) });
}

/** Everything that belongs to one cap, so a delete can be undone. */
export interface CapBundle {
  cap: CapRecord;
  photos: PhotoRecord[];
  thumb: ThumbRecord | undefined;
}

export async function removeCap(id: string): Promise<CapBundle | null> {
  return db.transaction('rw', db.caps, db.photos, db.thumbs, async () => {
    const cap = await db.caps.get(id);
    if (!cap) return null;
    const photos = await db.photos.where('capId').equals(id).toArray();
    const thumb = await db.thumbs.get(id);
    await db.photos.where('capId').equals(id).delete();
    await db.thumbs.delete(id);
    await db.caps.delete(id);
    return { cap, photos, thumb };
  });
}

export async function restoreCap(bundle: CapBundle): Promise<void> {
  await db.transaction('rw', db.caps, db.photos, db.thumbs, async () => {
    await db.caps.put(bundle.cap);
    await db.photos.bulkPut(bundle.photos);
    if (bundle.thumb) await db.thumbs.put(bundle.thumb);
  });
}

/** Distinct (brand · product) pairs — the "known cap types" a collection is measured against until there is a catalog. */
export function typeKey(cap: Pick<CapRecord, 'brand' | 'product'>): string {
  // Unit separator: a brand or product can contain anything a child types, but not a control character.
  return `${fold(cap.brand)}${fold(cap.product)}`;
}

import { newId } from '../lib/id';
import type { CutoutResult } from '../cutout/types';
import { db, type CapRecord, type CapShape, type Condition, type PhotoRecord, type PhotoRole } from './db';

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
}

/** Writes a cap and its photos atomically; returns the new cap's id. */
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
    thumb: p.cutout?.thumb ?? null,
    width: p.cutout?.stats.width ?? 0,
    height: p.cutout?.stats.height ?? 0,
    bbox: p.cutout?.stats.bbox ?? null,
    rimColor: p.cutout?.stats.rimColor ?? null,
    cutoutMs: p.cutout?.timing.totalMs ?? null,
    inferMs: p.cutout?.timing.inferMs ?? null,
    device: p.cutout?.timing.device ?? null,
  }));
  await db.transaction('rw', db.caps, db.photos, async () => {
    await db.caps.add(cap);
    await db.photos.bulkAdd(photos);
  });
  return capId;
}

/** Distinct brands already in the garage, for the manual-entry suggestions. */
export async function knownBrands(): Promise<string[]> {
  const brands = await db.caps.orderBy('brand').uniqueKeys();
  return brands.filter((b): b is string => typeof b === 'string' && b.length > 0);
}

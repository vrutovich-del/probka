import Dexie, { type EntityTable } from 'dexie';
import type { AvatarKey } from '../account/avatars';
import type { Language } from '../i18n/languages';
import type { Box, CutoutDevice } from '../cutout/types';

/** The account this phone belongs to, as the server described it when it was created. */
export interface AccountRecord {
  id: string;
  nickname: string;
  avatar: AvatarKey;
  /** `K7M-4QZ` — what a friend types to send a request. */
  friendCode: string;
  createdAt: number;
}

/** Everything persisted from Settings. */
export interface Settings {
  language: Language;
  /** Absent until the child saves the garage to an account (Phase 2, screens 05–06). */
  account: AccountRecord;
  /** The bearer that proves this phone may act for that account. Never leaves the phone. */
  deviceToken: string;
}

type SettingKey = keyof Settings;

interface SettingRow {
  key: SettingKey;
  value: Settings[SettingKey];
}

/** Values match the chip keys in the strings table (condition.tags.*, manual.geo.*). */
export type Condition = 'mint' | 'worn' | 'dented' | 'dirty';
export type CapShape = 'crown' | 'aluminium' | 'plastic' | 'other';

export interface CapRecord {
  id: string;
  createdAt: number;
  /** ISO date the cap was found, from the condition screen. */
  foundOn: string;
  place: string;
  condition: Condition;
  /** null = not identified yet. */
  brand: string | null;
  product: string;
  shape: CapShape | null;
  /** ISO 3166-1 alpha-2, or null. */
  country: string | null;
  /** ×N on the tile; 1 for a single cap. */
  dupes: number;
  /** false when the user kept the original photo or the cutout failed. */
  useCutout: boolean;
}

export type PhotoRole = 'top' | 'side';

export interface PhotoRecord {
  id: string;
  capId: string;
  role: PhotoRole;
  /** The file exactly as the camera or gallery gave it. */
  original: Blob;
  /** PNG at ≤1024, alpha from the mask, RGB untouched. null if the cutout failed. */
  cutout: Blob | null;
  /** PNG ≤256 of the cutout (or of the original when there is no cutout). */
  thumb: Blob | null;
  /** Working size of `cutout`. */
  width: number;
  height: number;
  bbox: Box | null;
  rimColor: string | null;
  /** How long the cutout took on this phone (total, and the model inference alone), for the pilot's timing report. */
  cutoutMs: number | null;
  inferMs: number | null;
  device: CutoutDevice | null;
}

/** The garage tile image of one cap, kept apart from the heavy photos so a grid loads only these. */
export interface ThumbRecord {
  capId: string;
  blob: Blob;
}

export const db = new Dexie('cap-garage') as Dexie & {
  settings: EntityTable<SettingRow, 'key'>;
  caps: EntityTable<CapRecord, 'id'>;
  photos: EntityTable<PhotoRecord, 'id'>;
  thumbs: EntityTable<ThumbRecord, 'capId'>;
};

db.version(1).stores({
  settings: 'key',
});

db.version(2).stores({
  settings: 'key',
  caps: 'id, createdAt, brand',
  photos: 'id, capId, [capId+role]',
});

db.version(3)
  .stores({
    settings: 'key',
    caps: 'id, createdAt, brand',
    photos: 'id, capId, [capId+role]',
    thumbs: 'capId',
  })
  .upgrade(async (tx) => {
    // Thumbs used to live on the top photo; move them so the grid never reads photo blobs.
    const photos = await tx.table<PhotoRecord>('photos').toArray();
    const thumbs = photos
      .filter((p) => p.role === 'top' && p.thumb)
      .map((p) => ({ capId: p.capId, blob: p.thumb as Blob }));
    await tx.table<ThumbRecord>('thumbs').bulkPut(thumbs);
  });

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K] | undefined> {
  const row = await db.settings.get(key);
  return row?.value as Settings[K] | undefined;
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

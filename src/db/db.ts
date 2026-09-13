import Dexie, { type EntityTable } from 'dexie';
import type { Language } from '../i18n/languages';
import type { Box, CutoutDevice } from '../cutout/types';

/** Everything persisted from Settings. */
export interface Settings {
  language: Language;
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

export const db = new Dexie('cap-garage') as Dexie & {
  settings: EntityTable<SettingRow, 'key'>;
  caps: EntityTable<CapRecord, 'id'>;
  photos: EntityTable<PhotoRecord, 'id'>;
};

db.version(1).stores({
  settings: 'key',
});

db.version(2).stores({
  settings: 'key',
  caps: 'id, createdAt, brand',
  photos: 'id, capId, [capId+role]',
});

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K] | undefined> {
  const row = await db.settings.get(key);
  return row?.value as Settings[K] | undefined;
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

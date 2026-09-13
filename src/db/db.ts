import Dexie, { type EntityTable } from 'dexie';
import type { Language } from '../i18n/languages';

/** Everything persisted from Settings. Caps, photos, badges and the sync queue get their tables in the items that need them. */
export interface Settings {
  language: Language;
}

type SettingKey = keyof Settings;

interface SettingRow {
  key: SettingKey;
  value: Settings[SettingKey];
}

export const db = new Dexie('cap-garage') as Dexie & {
  settings: EntityTable<SettingRow, 'key'>;
};

db.version(1).stores({
  settings: 'key',
});

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K] | undefined> {
  const row = await db.settings.get(key);
  return row?.value as Settings[K] | undefined;
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

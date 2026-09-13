/** Order matches the language picker (screen 02). */
export const LANGUAGES = ['en', 'ru', 'uk'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Each language named in itself — an endonym is the same in every UI language, so it is data, not a string key. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

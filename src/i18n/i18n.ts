import i18next from 'i18next';
import { LANGUAGES, isLanguage, type Language } from './languages';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

type PluralSuffix = '_zero' | '_one' | '_two' | '_few' | '_many' | '_other';
type BaseKey<K> = K extends `${infer B}${PluralSuffix}` ? B : K;

/** Every key in en.json, with plural suffixes folded away — a typo fails the typecheck. */
export type TKey = BaseKey<keyof typeof en>;

/** Values for `{placeholder}`s. `n` doubles as i18next's `count` unless `count` is given. */
export type TValues = { n?: number; count?: number; [placeholder: string]: string | number | undefined };

export async function initI18n(lng: Language): Promise<void> {
  await i18next.init({
    lng,
    fallbackLng: 'en',
    supportedLngs: LANGUAGES,
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      uk: { translation: uk },
    },
    // Keys are flat: the design table has keys that are both a string and a prefix.
    keySeparator: false,
    nsSeparator: false,
    // Placeholders are written {n}, exactly as in the design table.
    interpolation: { prefix: '{', suffix: '}', escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });
  document.documentElement.lang = lng;
}

export function translate(key: TKey, values?: TValues): string {
  const options = values && values.n !== undefined && values.count === undefined ? { ...values, count: values.n } : values;
  return String(i18next.t(key, options));
}

/** The translation of a key in a specific language, regardless of the current one. */
export function translateIn(lng: Language, key: TKey): string {
  return String(i18next.getFixedT(lng)(key));
}

export function currentLanguage(): Language {
  const lng = i18next.language;
  return isLanguage(lng) ? lng : 'en';
}

export async function applyLanguage(lng: Language): Promise<void> {
  await i18next.changeLanguage(lng);
  document.documentElement.lang = lng;
}

/** Best guess for the first-launch picker itself; the picker still decides. */
export function guessLanguage(): Language {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag.split('-')[0]?.toLowerCase();
    if (isLanguage(primary)) return primary;
  }
  return 'en';
}

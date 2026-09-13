import { useCallback } from 'react';
import { translate, type TKey, type TValues } from './i18n';
import { useLanguage } from './languageStore';

/** `t` re-renders its component when the language changes. */
export function useT(): { t: (key: TKey, values?: TValues) => string; lang: ReturnType<typeof useLanguage>['lang'] } {
  const { lang } = useLanguage();
  // `lang` is a dependency on purpose: a new function identity is what re-renders memoized children.
  const t = useCallback((key: TKey, values?: TValues) => translate(key, values), [lang]);
  return { t, lang };
}

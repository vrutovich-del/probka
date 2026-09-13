import type { Language } from '../i18n';

/** "12 Sep 2026" in the UI language, from a YYYY-MM-DD string. */
export function formatDate(isoDate: string, lang: Language): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
}

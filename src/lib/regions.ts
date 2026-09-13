import type { Language } from '../i18n/languages';

/** ISO 3166-1 alpha-2 codes. Names come from the browser via Intl.DisplayNames, so nothing here needs translating. */
const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW';

export interface Region {
  code: string;
  name: string;
}

const cache = new Map<Language, Region[]>();

/** Every region the browser can name in `lang`, sorted by that name. */
export function regions(lang: Language): Region[] {
  const hit = cache.get(lang);
  if (hit) return hit;
  const names = new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' });
  const collator = new Intl.Collator(lang);
  const list = CODES.split(' ')
    .map((code) => ({ code, name: names.of(code) ?? '' }))
    .filter((r) => r.name !== '' && r.name !== r.code)
    .sort((a, b) => collator.compare(a.name, b.name));
  cache.set(lang, list);
  return list;
}

export function regionName(code: string, lang: Language): string {
  return regions(lang).find((r) => r.code === code)?.name ?? code;
}

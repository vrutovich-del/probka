#!/usr/bin/env node
// Regenerates src/i18n/locales/en.json from the design's strings table and checks ru/uk against it.
//
//   node scripts/strings-to-json.mjs
//
// Source of truth for English copy: design/…/Strings & Open Questions.dc.html (the DATA array).
// The table is written for people, so a few rows need rules to become app keys:
//   • "a.x / a.y"  with  "X / Y"        → a.x = X, a.y = Y   (a part without a dot inherits the previous prefix)
//   • "consent.b1..b4"                   → consent.b1 … consent.b4, value split on " · "
//   • rows whose value is a " · " list   → sub-keys listed in LISTS
//   • rows the table shortens with "…"   → full sentence from the prototype screen, see FULL_TEXT
//   • strings whose noun changes with a count → key_one / key_other (i18next JSON v4), see PLURALS
// Keys the app needs that the table does not list live in APP_KEYS, each with where its English comes from.
// ru.json and uk.json are hand-maintained; this script only reports missing/extra keys and placeholder mismatches.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABLE = path.join(root, 'design/core-loop-prototype-review/project/Strings & Open Questions.dc.html');
const LOCALES = path.join(root, 'src/i18n/locales');
const OTHER_LANGS = ['ru', 'uk'];

/** Rows whose English value is a " · " list. Order matches the table. */
const LISTS = {
  'garage.seg': ['caps', 'collections'],
  'garage.stats': ['caps', 'brands', 'rarest'],
  'garage.sort': ['newest', 'rarity', 'brand', 'az'],
  'detail.actions': ['share', 'edit', 'delete'],
  'cutout.labels': ['before', 'after'],
  'identify.conf': ['likely', 'possible'],
  'manual.fields': ['brand', 'product', 'shape'],
  'manual.geo': ['crown', 'aluminium', 'plastic', 'other'],
  'condition.tags': ['mint', 'worn', 'dented', 'dirty'],
  'friends.pending': ['title', 'accept', 'decline'],
  'addfriend.mycode': ['title', 'copy', 'share'],
  'addfriend.enter': ['label', 'cta'],
  'leaderboard.metrics': ['rarest', 'count', 'badges'],
  'duel.wait': ['title', 'body', 'cancel'],
  'profile.rows': ['badges', 'stats', 'language', 'settings', 'edit'],
  'stats.sections': ['time', 'brands', 'tiers'],
};

/** Rows that need their own splitting. */
const SPLIT = {
  // "Flash on·off" → two labels (Cap Garage.dc.html line 1080)
  'cam.flash': (v) => {
    const [on, off] = v.split('·');
    return { 'cam.flash.on': on, 'cam.flash.off': `${on.split(' ')[0]} ${off}` };
  },
  // "1. … 2. … 3. …" → three steps; the screen adds the numbers
  'perm.denied.steps': (v) =>
    Object.fromEntries(v.split(/\s*\d\.\s+/).filter(Boolean).map((s, i) => [`perm.denied.step${i + 1}`, s])),
  // "Privacy policy · Terms" is one row on screen 33
  'settings.rows': (v) => {
    const p = v.split(' · ');
    return {
      'settings.rows.language': p[0],
      'settings.rows.sound': p[1],
      'settings.rows.haptics': p[2],
      'settings.rows.originals': p[3],
      'settings.rows.sync': p[4],
      'settings.rows.export': p[5],
      'settings.rows.legal': p.slice(6).join(' · '),
    };
  },
};

/** Rows the table ends with "…"; full sentence from the prototype screen (line in Cap Garage.dc.html). */
const FULL_TEXT = {
  'guestwall.body':
    'You’re a guest — your garage lives only on this phone. Save it to an account to add friends and duel.', // 518
  'delete.body':
    'Everything is kept for 7 days — sign back in to undo. After that, caps, badges and friends are gone for good.', // 764
  'update.body': 'This version is too old to sync caps safely. Grab the new one — it takes a minute.', // 549
};

/**
 * Strings whose noun changes with a count. `one` is the English singular the table does not spell out;
 * `_other` is always the table text. ru/uk must supply one/few/many/other.
 */
const PLURALS = {
  'garage.stats.caps': { one: 'cap' },
  'garage.stats.brands': { one: 'brand' },
  'collections.progress': { one: '{n} of {total} known cap' },
  'offline.banner': { one: 'Offline · {n} cap waiting to upload' },
  'settings.sync.offline': {},
};

/** Keys the table does not list. English from the prototype screens (line in Cap Garage.dc.html) or the sitemap. */
const APP_KEYS = {
  'tabs.garage': 'Garage', // 567
  'tabs.friends': 'Friends', // 568
  'tabs.duel': 'Duel', // 572
  'tabs.profile': 'Profile', // 573
  'tabs.add': 'Add a cap', // Sitemap.dc.html, section C
  'profile.title': 'Profile', // 358
  'settings.title': 'Settings', // 527
  'duel.title': 'Duel', // 267
};

// ── read the table ──────────────────────────────────────────────────────────
const html = readFileSync(TABLE, 'utf8');
const match = /DATA = (\[[\s\S]*?\]);\s*QUESTIONS/.exec(html);
if (!match) throw new Error(`Could not find the DATA array in ${TABLE}`);
// The literal is plain JS (single quotes, \u escapes) written by the design tool, not JSON.
const groups = new Function(`return ${match[1]}`)();

// ── expand rows into flat keys ──────────────────────────────────────────────
const en = {};
const problems = [];

function emit(key, value) {
  if (key in en) problems.push(`duplicate key ${key}`);
  en[key] = value;
}

function expandPair(key, value) {
  if (key in SPLIT) {
    for (const [k, v] of Object.entries(SPLIT[key](value))) expandPair(k, v);
    return;
  }
  if (key in LISTS) {
    const items = value.split(' · ');
    if (items.length !== LISTS[key].length) {
      problems.push(`${key}: ${items.length} items but ${LISTS[key].length} sub-keys`);
      return;
    }
    LISTS[key].forEach((sub, i) => expandPair(`${key}.${sub}`, items[i]));
    return;
  }
  if (key in FULL_TEXT) value = FULL_TEXT[key];
  if (key in PLURALS) {
    emit(`${key}_one`, PLURALS[key].one ?? value);
    emit(`${key}_other`, value);
    return;
  }
  emit(key, value);
}

function expandRow(rawKey, rawValue) {
  // "consent.b1..b4" — the stem's last letters may repeat before the second number
  const range = /^(.*?)(\d+)\.\.\D*(\d+)$/.exec(rawKey);
  if (range) {
    const [, stem, from, to] = range;
    const items = rawValue.split(' · ');
    const n = Number(to) - Number(from) + 1;
    if (items.length !== n) return problems.push(`${rawKey}: ${items.length} items for a range of ${n}`);
    items.forEach((v, i) => expandPair(`${stem}${Number(from) + i}`, v));
    return;
  }
  const keys = rawKey.split(' / ');
  if (keys.length === 1) return expandPair(rawKey, rawValue);
  const values = rawValue.split(' / ');
  if (values.length !== keys.length) return problems.push(`${rawKey}: ${keys.length} keys but ${values.length} values`);
  let prefix = '';
  keys.forEach((k, i) => {
    const full = k.includes('.') ? k : prefix + k;
    prefix = full.slice(0, full.lastIndexOf('.') + 1);
    expandPair(full, values[i]);
  });
}

for (const [, rows] of groups) for (const [k, v] of rows) expandRow(k, v);
for (const [k, v] of Object.entries(APP_KEYS)) emit(k, v);

if (problems.length) {
  console.error('Table rows that did not expand cleanly:\n  ' + problems.join('\n  '));
  process.exit(1);
}

writeFileSync(path.join(LOCALES, 'en.json'), JSON.stringify(en, null, 2) + '\n');
console.log(`en.json: ${Object.keys(en).length} keys (${Object.keys(APP_KEYS).length} app-added)`);

// ── check ru / uk ───────────────────────────────────────────────────────────
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKeys = new Set(Object.keys(en).map((k) => k.replace(PLURAL_SUFFIX, '')));
const pluralBases = new Set(Object.keys(en).filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, '')));
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

let failed = false;
for (const lang of OTHER_LANGS) {
  const file = path.join(LOCALES, `${lang}.json`);
  if (!existsSync(file)) {
    console.error(`${lang}.json: missing`);
    failed = true;
    continue;
  }
  const dict = JSON.parse(readFileSync(file, 'utf8'));
  const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
  const expected = new Set();
  for (const base of baseKeys) {
    if (pluralBases.has(base)) for (const c of categories) expected.add(`${base}_${c}`);
    else expected.add(base);
  }
  const missing = [...expected].filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !expected.has(k));
  const badPlaceholders = Object.keys(dict).filter((k) => {
    const ref = en[k] ?? en[`${k.replace(PLURAL_SUFFIX, '')}_other`];
    return ref !== undefined && placeholders(ref) !== placeholders(dict[k]);
  });
  const report = [];
  if (missing.length) report.push(`missing ${missing.length}: ${missing.join(', ')}`);
  if (extra.length) report.push(`extra ${extra.length}: ${extra.join(', ')}`);
  if (badPlaceholders.length) report.push(`placeholders differ: ${badPlaceholders.join(', ')}`);
  if (report.length) {
    failed = true;
    console.error(`${lang}.json:\n  ${report.join('\n  ')}`);
  } else {
    console.log(`${lang}.json: complete (${Object.keys(dict).length} keys)`);
  }
}
process.exit(failed ? 1 : 0);

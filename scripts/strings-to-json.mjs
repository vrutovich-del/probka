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
  'collections.unidentified': { one: '{n} cap is waiting to be identified' },
  'profile.stats.badges': { one: 'badge' },
  'settings.sync.working': { one: 'Uploading · {n} cap left' },
  'settings.sync.error': { one: 'Cannot reach the server · {n} cap waiting' },
  'transfer.done': { one: 'Your garage is here — {n} cap' },
  'transfer.partly': { one: 'Your garage is here — {n} cap, {missed} still to come' },
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
  // Add-a-cap flow (item 2)
  'cam.gallery': 'gallery', // 594
  'processing.download': 'Downloading the cutout tool · {n}%', // new: first-use download, no design copy
  'processing.offlineFirst': 'The cutout tool needs internet the first time. Your cap is kept as photographed.', // new
  'cutout.keptToast': 'Original kept — no cutout', // 1086
  'identify.unidentified': 'Not identified yet', // 1083
  'manual.back': 'Matches', // 657
  'manual.brandPlaceholder': 'Start typing…', // 659
  'manual.productPlaceholder': 'e.g. Lemonade', // 661
  'manual.fields.country': 'Country', // new: field asked for by the brief, not in the prototype
  'manual.countryNone': 'Not sure', // new: empty option of the country picker
  'manual.save': 'Save cap type', // 669
  'condition.pendingUnrated': 'Unverified — rarity comes after review', // 1106
  'condition.foundOn': 'Found on', // 682
  'condition.placePlaceholder': 'e.g. near school', // 683
  'reveal.unrated': 'Unrated — tier comes after review', // 1122
  // Garage (item 3)
  'rarity.common': 'Common', // Design System.dc.html, rarity scale
  'rarity.uncommon': 'Uncommon',
  'rarity.rare': 'Rare',
  'rarity.epic': 'Epic',
  'rarity.legendary': 'Legendary',
  'rarity.unrated': 'Unrated',
  'garage.filter.all': 'All', // 44
  'collections.unidentified': '{n} caps are waiting to be identified', // 992, plural
  'detail.foundDate': 'Found {date}', // detail.found without the place (1012)
  // Badges (item 4). The eight names come from badgeDefs (952); the units the prototype appends to a
  // counter (' Zhiguli', ' Rare', ' duels', ' days') become their own progress strings so a translator
  // can decline the noun. 'badges.setPending' has no design copy: the table has no locked-badge note.
  'badges.name.firstCap': 'First Cap', // 953
  'badges.name.tenFinder': 'Ten Finder', // 954
  'badges.name.halfHundred': 'Half Hundred', // 955
  'badges.name.brandLoyal': 'Brand Loyal', // 956
  'badges.name.rareHunter': 'Rare Hunter', // 957
  'badges.name.setComplete': 'Set Complete', // 958
  'badges.name.duelist': 'Duelist', // 959
  'badges.name.streak7': 'Streak 7', // 960
  'badges.progress.brand': '{n}/{total} {brand}', // 956, the brand named instead of hard-coded Zhiguli
  'badges.progress.rare': '{n}/{total} rare', // 957
  'badges.progress.duels': '{n}/{total} duels', // 959
  'badges.progress.days': '{n}/{total} days', // 960
  'badges.setPending': 'Waiting for the catalog', // new: a set has no size until the catalog exists
  'profile.stats.badges': 'badges', // 367, plural
  'profile.badgesEarned': '{n} earned', // 369
  // Sample cap (item 5). The brief asks for it; neither the prototype nor the table has a word for it.
  'settings.rows.sample': 'Load a sample cap', // new
  'settings.sample.added': 'Sample cap added', // new
  'settings.sample.view': 'VIEW', // new: the snackbar action, capitals like detail.undo
  'settings.sample.already': 'The sample is already in your garage', // new
  'settings.sample.failed': 'Could not load the sample', // new
  // Storage full (item 6). The brief asks for the state; the design has no screen or copy for it.
  'save.full': 'The phone is out of space. Free some up and tap Add again — the photo is still here.', // new
  'save.failed': 'Could not save the cap. Tap Add again.', // new
  // Account, nickname and parental consent (Phase 2, item 2). Screens 05–06 of the prototype.
  'nick.placeholder': 'e.g. cap_hunter', // 464
  'nick.short': 'Too short — at least 3 characters', // 1143
  'nick.long': 'Too long — 16 max', // 1143
  'nick.spaces': 'No spaces', // 1143
  'nick.avatar': 'Pick an avatar', // 467
  'nick.cta': 'Continue', // 474
  'consent.intro': 'Cap Garage is built for young collectors. Before your child starts:', // 481
  'consent.once': 'Shown once, in your chosen language.', // 487
  'gate.body.account': 'Continuing needs a parent.', // 1147
  'gate.cancel': 'Cancel', // 741
  'guestwall.note': 'Nothing gets deleted — guest caps merge in.', // 520
  'link.cta': 'Save my garage', // new: the sheet's own button; the prototype had Apple and Google there
  'account.creating': 'Creating your garage…', // new
  'account.failed': 'Could not create the account. Try again.', // new
  'account.offline': 'No internet — try again when you are back online.', // new
  'recovery.title': 'Your recovery code', // new: the account has no e-mail, so this is the only way back
  'recovery.body':
    'Give this to a parent to keep. It is the only way back into this garage from another phone, and it is shown once.', // new
  'recovery.copy': 'Copy', // new
  'recovery.copied': 'Copied', // new
  'recovery.copyFailed': 'Could not copy — write it down from the screen.', // new
  'recovery.cta': 'It is written down', // new
  'friends.empty': 'No friends yet — add one with an invite code.', // new: the table has no empty state for 19
  'duel.later': 'Duels come later — friends first.', // new: the duel is its own round, and the tab must not pretend
  // Sync, the offline banner and the export (Phase 2, item 3). The table has the two settled states
  // (settings.sync.ok / .offline) and the banner; these are the two it does not name, plus one failure.
  'settings.sync.working': 'Uploading · {n} caps left', // new, plural
  'settings.sync.error': 'Cannot reach the server · {n} caps waiting', // new, plural
  'settings.export.failed': 'Could not build the export file.', // new
  // Friends (Phase 2, item 4). Screens 19–23; the table names most of them, these are the rest.
  'friends.seg.board': 'Leaderboard', // 180
  'friends.loading': 'Loading…', // new
  'friends.error': 'Could not reach the server. Tap to try again.', // new
  'friends.waiting': 'Waiting for {nick} to answer.', // new: the prototype has no outgoing-request state
  'gate.body.friends': 'Adding friends needs a parent.', // 1030
  'addfriend.title': 'Add a friend', // 228
  'addfriend.or': '— or —', // 235
  'addfriend.placeholder': 'e.g. B2R-9TX', // 236
  'addfriend.sent': 'Request sent to {nick}', // new
  'addfriend.nowFriends': 'You and {nick} are friends now', // new: both children entered each other's code
  'addfriend.unknown': 'No one has that code', // new
  'addfriend.own': 'That is your own code', // new
  'addfriend.already': 'You are already friends', // new
  'addfriend.pending': 'You have already asked', // new
  'addfriend.tooMany': 'Too many tries — wait a little', // new
  'addfriend.failed': 'Could not send the request. Try again.', // new
  'friendgarage.empty': 'No caps here yet.', // new
  // Moving a garage to another phone (Phase 2, item 5). Neither the prototype nor the table has this
  // screen: the owner replaced Apple and Google with a code, and this is the door that code opens.
  'transfer.title': 'Move a garage to this phone', // new
  'transfer.body':
    'Type the recovery code we showed when the garage was made — a parent will have it written down. Lost it? We can make you a new one.', // new
  'transfer.placeholder': 'ABCD-EFGH-JKLM-NPQR', // new
  'transfer.cta': 'Bring my garage here', // new
  'transfer.busy': 'Bringing it over…', // new
  'transfer.working': '{n} of {total} caps', // new
  'transfer.done': 'Your garage is here — {n} caps', // new, plural
  'transfer.partly': 'Your garage is here — {n} caps, {missed} still to come', // new, plural
  'transfer.unknown': 'That code does not open anything', // new
  'transfer.failed': 'Could not move the garage. Try again.', // new
  'transfer.note': 'Nothing already on this phone is removed.', // new
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
for (const [k, v] of Object.entries(APP_KEYS)) expandPair(k, v);

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

import brandLoyalArt from '../assets/badges/brand-loyal.webp';
import duelistArt from '../assets/badges/duelist.webp';
import firstCapArt from '../assets/badges/first-cap.webp';
import halfHundredArt from '../assets/badges/half-hundred.webp';
import rareHunterArt from '../assets/badges/rare-hunter.webp';
import setCompleteArt from '../assets/badges/set-complete.webp';
import streak7Art from '../assets/badges/streak-7.webp';
import tenFinderArt from '../assets/badges/ten-finder.webp';
import type { CapRecord } from '../db/db';
import type { TKey, TValues } from '../i18n';
import { capTier, TIERS } from './rarity';

/**
 * The eight badges of the prototype (`badgeDefs` in Cap Garage.dc.html), in its order. Everything is
 * derived from the garage on the spot — nothing about a badge is stored, so a deleted cap takes its
 * progress back with it and there is no second copy of the truth to keep in step.
 */
export type BadgeId =
  | 'firstCap'
  | 'tenFinder'
  | 'halfHundred'
  | 'brandLoyal'
  | 'rareHunter'
  | 'setComplete'
  | 'duelist'
  | 'streak7';

interface BadgeDef {
  /** Owner-supplied art, background cleaned and squared to 256 px; a locked tile greys it out. */
  art: string;
  nameKey: TKey;
  /** null: only the catalog can say how many caps a set holds, so the tile carries a note, not "0/6". */
  need: number | null;
  progressKey: TKey;
}

const DEFS: Record<BadgeId, BadgeDef> = {
  firstCap: { art: firstCapArt, nameKey: 'badges.name.firstCap', need: 1, progressKey: 'badges.progress' },
  tenFinder: { art: tenFinderArt, nameKey: 'badges.name.tenFinder', need: 10, progressKey: 'badges.progress' },
  halfHundred: { art: halfHundredArt, nameKey: 'badges.name.halfHundred', need: 50, progressKey: 'badges.progress' },
  brandLoyal: { art: brandLoyalArt, nameKey: 'badges.name.brandLoyal', need: 10, progressKey: 'badges.progress.brand' },
  rareHunter: { art: rareHunterArt, nameKey: 'badges.name.rareHunter', need: 1, progressKey: 'badges.progress.rare' },
  setComplete: { art: setCompleteArt, nameKey: 'badges.name.setComplete', need: null, progressKey: 'badges.progress' },
  duelist: { art: duelistArt, nameKey: 'badges.name.duelist', need: 10, progressKey: 'badges.progress.duels' },
  streak7: { art: streak7Art, nameKey: 'badges.name.streak7', need: 7, progressKey: 'badges.progress.days' },
};

const ORDER = Object.keys(DEFS) as BadgeId[];

export interface BadgeState {
  id: BadgeId;
  art: string;
  nameKey: TKey;
  progressKey: TKey;
  earned: boolean;
  /** How far the garage has got towards `need`. */
  have: number;
  need: number | null;
  /** The brand `have` counts, when there is one (Brand Loyal). */
  brand: string | null;
}

export function badgeNameKey(id: BadgeId): TKey {
  return DEFS[id].nameKey;
}

export function badgeArt(id: BadgeId): string {
  return DEFS[id].art;
}

/** Every badge with its real progress — locked ones included, as the brief asks. */
export function badgeStates(caps: CapRecord[]): BadgeState[] {
  const total = caps.reduce((n, cap) => n + cap.dupes, 0);
  const loyal = topBrand(caps);
  const have: Record<BadgeId, number> = {
    firstCap: total,
    tenFinder: total,
    halfHundred: total,
    brandLoyal: loyal.count,
    // Nothing is Rare while every cap is Unrated; the filter starts counting the day `capTier` reads a cap.
    rareHunter: caps.filter(() => TIERS[capTier()].rank >= TIERS.rare.rank).length,
    // The catalog decides what a set is, so there is no numerator either.
    setComplete: 0,
    // Duels are Phase 3 and nothing records one yet, so this is honestly zero.
    duelist: 0,
    streak7: longestStreak(caps),
  };
  return ORDER.map((id) => {
    const def = DEFS[id];
    return {
      id,
      art: def.art,
      nameKey: def.nameKey,
      // Brand Loyal has no brand to name until one cap carries one.
      progressKey: id === 'brandLoyal' && loyal.brand === null ? 'badges.progress' : def.progressKey,
      earned: def.need !== null && have[id] >= def.need,
      have: have[id],
      need: def.need,
      brand: id === 'brandLoyal' ? loyal.brand : null,
    };
  });
}

/** "Earned!", "7/10 Zhiguli", or the note that a set waits for the catalog. */
export function badgeProgress(badge: BadgeState, t: (key: TKey, values?: TValues) => string): string {
  if (badge.earned) return t('badges.earned');
  if (badge.need === null) return t('badges.setPending');
  return t(badge.progressKey, { n: Math.min(badge.have, badge.need), total: badge.need, brand: badge.brand ?? '' });
}

export function earnedBadges(caps: CapRecord[]): BadgeId[] {
  return badgeStates(caps)
    .filter((badge) => badge.earned)
    .map((badge) => badge.id);
}

/** What the garage did not have before the find and has now — the reveal screen's unlock stack. */
export function newlyEarned(before: CapRecord[], after: CapRecord[]): BadgeId[] {
  const had = new Set(earnedBadges(before));
  return earnedBadges(after).filter((id) => !had.has(id));
}

/** The brand with the most caps behind it (duplicates counted, as the garage's own caps stat counts them). */
function topBrand(caps: CapRecord[]): { brand: string | null; count: number } {
  const byBrand = new Map<string, { brand: string; count: number }>();
  for (const cap of caps) {
    const brand = cap.brand?.trim();
    if (!brand) continue;
    const entry = byBrand.get(brand.toLocaleLowerCase()) ?? { brand, count: 0 };
    entry.count += cap.dupes;
    byBrand.set(brand.toLocaleLowerCase(), entry);
  }
  let best: { brand: string; count: number } | null = null;
  for (const entry of byBrand.values()) if (!best || entry.count > best.count) best = entry;
  return best ?? { brand: null, count: 0 };
}

/**
 * The longest run of consecutive days on which a cap was added, ever. A day is a calendar day on the
 * phone's own clock, taken from when the cap reached the app rather than from the found-on date the
 * child can edit. Longest-ever rather than current, so a badge already won is never taken back.
 */
function longestStreak(caps: CapRecord[]): number {
  const days = [...new Set(caps.map((cap) => localDay(cap.createdAt)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    previous = day;
    if (run > best) best = run;
  }
  return best;
}

/** Days since the epoch in the phone's own calendar — dividing the timestamp itself breaks across DST. */
function localDay(ms: number): number {
  const date = new Date(ms);
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

import { typeKey } from '../../db/caps';
import type { CapRecord, Condition, ThumbRecord } from '../../db/db';
import type { Language } from '../../i18n';
import { capTier, TIERS, type Tier } from '../../lib/rarity';
import { SORTS, type GarageSort } from '../../lib/garageView';

export { SORTS };

const fold = (s: string | null) => (s ?? '').trim().toLocaleLowerCase();

export interface GarageStats {
  /** Caps counting duplicates. */
  caps: number;
  brands: number;
  rarest: Tier;
}

export function garageStats(caps: CapRecord[]): GarageStats {
  const brands = new Set<string>();
  let total = 0;
  let rarest: Tier = 'unrated';
  for (const cap of caps) {
    total += cap.dupes;
    if (cap.brand) brands.add(fold(cap.brand));
    const tier = capTier();
    if (TIERS[tier].rank > TIERS[rarest].rank) rarest = tier;
  }
  return { caps: total, brands: brands.size, rarest };
}

/** Conditions present in the garage, in the strings-table order, for the filter chips. */
export function conditionsPresent(caps: CapRecord[]): Condition[] {
  const order: Condition[] = ['mint', 'worn', 'dented', 'dirty'];
  const present = new Set(caps.map((c) => c.condition));
  return order.filter((c) => present.has(c));
}

export function sortCaps(caps: CapRecord[], sort: GarageSort, lang: Language): CapRecord[] {
  const collator = new Intl.Collator(lang);
  const byNewest = (a: CapRecord, b: CapRecord) => b.createdAt - a.createdAt;
  const byBrand = (a: CapRecord, b: CapRecord) => {
    if (!a.brand !== !b.brand) return a.brand ? -1 : 1; // unidentified last
    return collator.compare(a.brand ?? '', b.brand ?? '') || collator.compare(a.product, b.product) || byNewest(a, b);
  };
  const list = [...caps];
  switch (sort) {
    case 'newest':
      return list.sort(byNewest);
    case 'rarity':
      return list.sort((a, b) => TIERS[capTier()].rank - TIERS[capTier()].rank || byNewest(a, b));
    case 'brand':
      return list.sort(byBrand);
    case 'az':
      return list.sort((a, b) => {
        if (!a.brand !== !b.brand) return a.brand ? -1 : 1;
        return collator.compare(`${a.brand ?? ''} ${a.product}`, `${b.brand ?? ''} ${b.product}`) || byNewest(a, b);
      });
  }
}

/** Enough dashed spots to finish the current row and add one more (never fewer than three). */
export function placeholderCount(shown: number): number {
  return ((3 - (shown % 3)) % 3) + 3;
}

export function thumbMap(thumbs: ThumbRecord[] | undefined): Map<string, Blob> {
  return new Map((thumbs ?? []).map((t) => [t.capId, t.blob]));
}

export interface BrandGroup {
  /** As the user first typed it. */
  brand: string;
  key: string;
  caps: CapRecord[];
  /** Distinct cap types of this brand the user has entered — the "known caps" until a catalog exists. */
  types: number;
}

export function groupByBrand(caps: CapRecord[], lang: Language): { groups: BrandGroup[]; unidentified: number } {
  const groups = new Map<string, BrandGroup>();
  let unidentified = 0;
  for (const cap of [...caps].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!cap.brand) {
      unidentified++;
      continue;
    }
    const key = fold(cap.brand);
    const group = groups.get(key) ?? { brand: cap.brand, key, caps: [], types: 0 };
    group.caps.push(cap);
    groups.set(key, group);
  }
  for (const g of groups.values()) g.types = new Set(g.caps.map(typeKey)).size;
  const collator = new Intl.Collator(lang);
  return { groups: [...groups.values()].sort((a, b) => collator.compare(a.brand, b.brand)), unidentified };
}

export function brandKey(brand: string): string {
  return fold(brand);
}

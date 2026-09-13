import type { IconName } from '../components/Icon';
import type { TKey } from '../i18n';

/** Rarity tiers from the design system: shape + colour + label, always all three. Phase 1 only knows Unrated. */
export type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unrated';

export interface TierStyle {
  icon: IconName;
  /** CSS variable holding the tier colour. */
  color: string;
  labelKey: TKey;
  /** Higher is rarer; Unrated sorts last. */
  rank: number;
}

export const TIERS: Record<Tier, TierStyle> = {
  common: { icon: 'tier-common', color: 'var(--color-rarity-common)', labelKey: 'rarity.common', rank: 1 },
  uncommon: { icon: 'tier-uncommon', color: 'var(--color-rarity-uncommon)', labelKey: 'rarity.uncommon', rank: 2 },
  rare: { icon: 'tier-rare', color: 'var(--color-rarity-rare)', labelKey: 'rarity.rare', rank: 3 },
  epic: { icon: 'tier-epic', color: 'var(--color-rarity-epic)', labelKey: 'rarity.epic', rank: 4 },
  legendary: { icon: 'tier-legendary', color: 'var(--color-rarity-legendary)', labelKey: 'rarity.legendary', rank: 5 },
  unrated: { icon: 'unrated', color: 'var(--color-rarity-unrated)', labelKey: 'rarity.unrated', rank: 0 },
};

/** Every cap is Unrated until the catalog and its nightly rarity job exist (Phase 2). */
export function capTier(): Tier {
  return 'unrated';
}

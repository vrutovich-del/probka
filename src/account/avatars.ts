import type { IconName } from '../components/Icon';

/**
 * The six avatars of screen 05. The prototype draws them as the glyphs ● ■ ▲ ◆ ★ ◌ in six colours;
 * those glyphs are already inline SVG here (the rarity shapes), so an avatar is one of them plus a
 * colour token. No photographs, no uploads: a child's face is exactly what this app must not hold.
 */
export const AVATARS = [
  { key: 'circle', icon: 'tier-common', color: 'var(--color-rarity-common)' },
  { key: 'square', icon: 'tier-uncommon', color: 'var(--color-rarity-uncommon)' },
  { key: 'triangle', icon: 'tier-rare', color: 'var(--color-rarity-rare)' },
  { key: 'diamond', icon: 'tier-epic', color: 'var(--color-rarity-epic)' },
  { key: 'star', icon: 'tier-legendary', color: 'var(--color-rarity-legendary)' },
  { key: 'ring', icon: 'unrated', color: 'var(--color-text-primary)' },
] as const satisfies ReadonlyArray<{ key: string; icon: IconName; color: string }>;

export type AvatarKey = (typeof AVATARS)[number]['key'];

export const DEFAULT_AVATAR: AvatarKey = 'circle';

/** The avatar's shape and colour; falls back to the first one for a key from a newer version. */
export function avatarStyle(key: string): { icon: IconName; color: string } {
  const found = AVATARS.find((a) => a.key === key) ?? AVATARS[0];
  return { icon: found.icon, color: found.color };
}

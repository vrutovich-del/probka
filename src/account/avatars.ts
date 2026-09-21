import alienArt from '../assets/avatars/alien.webp';
import birdArt from '../assets/avatars/bird.webp';
import bulbArt from '../assets/avatars/bulb.webp';
import chefArt from '../assets/avatars/chef.webp';
import dogArt from '../assets/avatars/dog.webp';
import grannyArt from '../assets/avatars/granny.webp';
import kidArt from '../assets/avatars/kid.webp';
import monsterArt from '../assets/avatars/monster.webp';

/**
 * The avatars of screen 05: eight faces the owner drew, plus the dashed circle for a child who
 * wants none of them. Faces, not photographs — a child's own face is exactly what this app must
 * never hold, and a picked character is something to show a friend instead.
 *
 * The art is cut from the owner's sheet by `scripts/crop-avatars.py`, a one-off like the badge art.
 */
export const AVATARS = [
  { key: 'alien', art: alienArt },
  { key: 'monster', art: monsterArt },
  { key: 'chef', art: chefArt },
  { key: 'kid', art: kidArt },
  { key: 'bird', art: birdArt },
  { key: 'dog', art: dogArt },
  { key: 'granny', art: grannyArt },
  { key: 'bulb', art: bulbArt },
  /** No face: the dashed circle, drawn as an icon rather than a picture. */
  { key: 'plain', art: null },
] as const satisfies ReadonlyArray<{ key: string; art: string | null }>;

export type AvatarKey = (typeof AVATARS)[number]['key'];

export const DEFAULT_AVATAR: AvatarKey = 'alien';

/** The picture for a key, or null for the plain one. An unknown key — an older account, a newer
 * version — falls back to the first face rather than rendering nothing. */
export function avatarArt(key: string): string | null {
  const found = AVATARS.find((a) => a.key === key);
  if (found) return found.art;
  return key === 'plain' ? null : AVATARS[0].art;
}

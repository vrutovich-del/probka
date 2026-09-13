/**
 * The prototype draws its icons with text glyphs (⌂ ◎ ◈ ◉ ✓ +). Golos Text has none of them, so they are
 * inline SVG here — the same shape on every phone. Sized to the glyph's font-size in the prototype.
 */
import type { ReactElement } from 'react';

export type IconName =
  | 'garage'
  | 'friends'
  | 'duel'
  | 'profile'
  | 'plus'
  | 'minus'
  | 'check'
  | 'close'
  | 'sort'
  | 'unrated'
  | 'tier-common'
  | 'tier-uncommon'
  | 'tier-rare'
  | 'tier-epic'
  | 'tier-legendary';

const PATHS: Record<IconName, ReactElement> = {
  garage: <path d="M3.5 11 12 3.5l8.5 7.5V20.5h-17z" />,
  friends: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  duel: (
    <>
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />
      <path d="M12 7.5 16.5 12 12 16.5 7.5 12z" fill="currentColor" stroke="none" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 4.5v15M4.5 12h15" strokeWidth="2.2" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" strokeWidth="2.4" />,
  minus: <path d="M5 12h14" strokeWidth="2" />,
  close: <path d="M6 6l12 12M18 6 6 18" strokeWidth="2" />,
  sort: <path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" strokeWidth="2" />,
  unrated: <circle cx="12" cy="12" r="8.5" strokeDasharray="3.4 3.4" />,
  // Rarity glyphs ● ■ ▲ ◆ ★, filled with the current colour.
  'tier-common': <circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" />,
  'tier-uncommon': <rect x="4.5" y="4.5" width="15" height="15" fill="currentColor" stroke="none" />,
  'tier-rare': <path d="M12 3.5 21 20H3z" fill="currentColor" stroke="none" />,
  'tier-epic': <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="currentColor" stroke="none" />,
  'tier-legendary': (
    <path d="m12 2.8 2.8 6.1 6.6.7-4.9 4.5 1.4 6.6L12 17.4l-5.9 3.3 1.4-6.6-4.9-4.5 6.6-.7z" fill="currentColor" stroke="none" />
  ),
};

export function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

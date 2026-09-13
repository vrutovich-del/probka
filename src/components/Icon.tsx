/**
 * The prototype draws its icons with text glyphs (⌂ ◎ ◈ ◉ ✓ +). Golos Text has none of them, so they are
 * inline SVG here — the same shape on every phone. Sized to the glyph's font-size in the prototype.
 */
import type { ReactElement } from 'react';

export type IconName = 'garage' | 'friends' | 'duel' | 'profile' | 'plus' | 'check';

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

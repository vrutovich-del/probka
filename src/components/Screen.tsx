import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useT } from '../i18n/useT';
import type { TKey } from '../i18n';
import { cx } from './cx';
import styles from './Screen.module.css';

type Variant =
  | 'root' // a tab's home screen: 14px 16px 20px, gap 14
  | 'pushed' // a screen reached from a tab: back link on top, 10px 16px 20px, gap 10
  | 'centered' // content centered in the viewport, 24px, gap 12
  | 'flow'; // a step of the add-a-cap flow: 16px, gap 12, CTA at the bottom

export function Screen({ variant, children, className }: { variant: Variant; children?: ReactNode; className?: string }) {
  return <div className={cx(styles.screen, styles[variant], className)}>{children}</div>;
}

/** Pushes what follows to the bottom of a flow screen. */
export function Spacer() {
  return <div className={styles.spacer} />;
}

/** 24/800 on tab roots, 22/800 on pushed screens — as the prototype sizes them. */
export function ScreenTitle({ children, size = 'root' }: { children: ReactNode; size?: 'root' | 'pushed' }) {
  return <h1 className={cx(styles.title, size === 'pushed' && styles.titlePushed)}>{children}</h1>;
}

/** "‹ Label" in primary, as on every pushed screen. The tap area is extended to 48px without moving the text. */
export function BackLink({ to, labelKey }: { to: string; labelKey: TKey }) {
  const { t } = useT();
  return (
    <Link to={to} className={styles.back}>
      ‹ {t(labelKey)}
    </Link>
  );
}

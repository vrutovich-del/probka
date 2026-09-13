import type { ReactNode } from 'react';
import styles from './Ring.module.css';

/** Completion ring: a conic fill over a dark track, with a label in the middle (collection cards, brand page). */
export function Ring({ percent, size, children, ground }: { percent: number; size: number; children: ReactNode; ground?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  const inner = Math.round(size * 0.77);
  return (
    <div
      className={styles.ring}
      style={{ width: size, height: size, background: `conic-gradient(var(--color-primary) ${p}%, var(--color-ring-track) 0)` }}
      role="img"
      aria-label={`${Math.round(p)}%`}
    >
      <div className={styles.inner} style={{ width: inner, height: inner, background: ground }}>
        {children}
      </div>
    </div>
  );
}

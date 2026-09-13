import type { ReactNode } from 'react';
import styles from './BottomSheet.module.css';

/** Modal sheet from the bottom (screens 11, 33b, 37). Tapping the scrim dismisses it. */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className={styles.layer}>
      <button type="button" className={styles.scrim} aria-label={title} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

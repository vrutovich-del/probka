import { Link } from 'react-router';
import styles from './Row.module.css';

/** A settings/profile row: label, optional value, chevron. Prototype screens 30 and 33. */
export function Row({ to, label, value }: { to: string; label: string; value?: string }) {
  return (
    <Link to={to} className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.trail}>
        {value !== undefined && <span className={styles.value}>{value}</span>}
        <span className={styles.chevron}>›</span>
      </span>
    </Link>
  );
}

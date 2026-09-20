import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './Row.module.css';

interface RowProps {
  label: string;
  value?: string;
  /** Where the row leads. Give `onClick` instead for a row that does something in place. */
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/** A settings/profile row: label, optional value, chevron. Prototype screens 30 and 33. */
export function Row({ to, onClick, label, value, disabled }: RowProps) {
  const body: ReactNode = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.trail}>
        {value !== undefined && <span className={styles.value}>{value}</span>}
        <span className={styles.chevron}>›</span>
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={styles.row}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.row} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}

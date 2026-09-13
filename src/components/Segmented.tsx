import { cx } from './cx';
import styles from './Segmented.module.css';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

/** Two-or-more-way switch (Caps · Collections, Before · After). The selected pill is filled, the rest are bare text. */
export function Segmented<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'md' | 'sm';
}) {
  return (
    <div className={cx(styles.group, size === 'sm' && styles.sm)} role="group">
      {segments.map((s) => (
        <button
          key={s.value}
          type="button"
          className={cx(styles.segment, s.value === value && styles.selected)}
          aria-pressed={s.value === value}
          onClick={() => onChange(s.value)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

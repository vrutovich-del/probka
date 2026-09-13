import { Icon } from './Icon';
import { cx } from './cx';
import styles from './ChoiceChips.module.css';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/** One-of chips (cap shape, condition). Selected = green + a check, so colour is never the only cue. */
export function ChoiceChips<T extends string>({
  choices,
  value,
  onChange,
}: {
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.row} role="group">
      {choices.map((c) => {
        const selected = c.value === value;
        return (
          <button
            key={c.value}
            type="button"
            className={cx(styles.chip, selected && styles.selected)}
            aria-pressed={selected}
            onClick={() => onChange(c.value)}
          >
            {selected && <Icon name="check" size={12} />}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

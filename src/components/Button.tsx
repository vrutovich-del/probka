import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Button.module.css';

type Variant = 'primary' | 'outline' | 'text';
/** lg = 17px flow CTAs · md = 16px sheet buttons · sm = 15px split rows, as the prototype sizes them. */
type Size = 'lg' | 'md' | 'sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'lg', block = false, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    />
  );
}

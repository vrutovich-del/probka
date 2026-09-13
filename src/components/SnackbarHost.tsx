import { hideSnack, useSnack } from './snackbar';
import styles from './SnackbarHost.module.css';

/** Sits above the tab bar (prototype: 92px from the bottom). */
export function SnackbarHost() {
  const snack = useSnack();
  if (!snack) return null;
  return (
    <div className={styles.snack} role="status" aria-live="polite">
      <span className={styles.text}>{snack.text}</span>
      {snack.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            hideSnack();
            snack.action?.run();
          }}
        >
          {snack.action.label}
        </button>
      )}
    </div>
  );
}

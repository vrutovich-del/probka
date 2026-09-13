import { useToast } from './toast';
import styles from './ToastHost.module.css';

export function ToastHost() {
  const text = useToast();
  return (
    <div className={styles.host} role="status" aria-live="polite">
      {text !== null && <div className={styles.toast}>{text}</div>}
    </div>
  );
}

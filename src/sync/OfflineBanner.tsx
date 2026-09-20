import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useSyncStatus } from './sync';
import styles from './OfflineBanner.module.css';

/** `navigator.onLine`, as a value React can render. */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/**
 * Screen 34, at the top of every tab. It appears only when there is something to say: the phone is
 * offline and caps are waiting. Being offline with nothing owed is not news — the app works that way
 * by design — and a warning that is always on is a warning nobody reads.
 */
export function OfflineBanner() {
  const { t } = useT();
  const online = useOnline();
  const { state, pending } = useSyncStatus();
  const waiting = pending ?? 0;
  if (online || state === 'off' || waiting === 0) return null;
  return (
    <div className={styles.banner} role="status">
      <span className={styles.dot} />
      {t('offline.banner', { n: waiting })}
    </div>
  );
}

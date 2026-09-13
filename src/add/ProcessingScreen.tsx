import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Screen } from '../components/Screen';
import { showToast } from '../components/toast';
import { useT } from '../i18n/useT';
import { useObjectUrl } from '../lib/objectUrl';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './ProcessingScreen.module.css';

/**
 * Screen 13. Waits for the worker: first-ever use shows the model download as a filling ring, then the
 * spinner while the mask is computed. A failed cutout keeps the original and moves on (sitemap 35).
 */
export function ProcessingScreen() {
  const { t } = useT();
  const { state, progress, process } = useAddFlow();
  const navigate = useNavigate();
  const photoUrl = useObjectUrl(state.top);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!state.top || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const timer = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100);
    void process().then(({ top }) => {
      clearInterval(timer);
      if (top) {
        navigate('/add/review', { replace: true });
      } else {
        showToast(t(navigator.onLine ? 'cutout.keptToast' : 'processing.offlineFirst'));
        navigate('/add/identify', { replace: true });
      }
    });
    return () => clearInterval(timer);
  }, [state.top, process, navigate, t]);

  const downloading = progress?.phase === 'download' && progress.total > 0 && progress.loaded < progress.total;
  const percent = downloading ? Math.floor((progress.loaded / progress.total) * 100) : 0;

  return (
    <RequireStep when={state.top !== null}>
      <Screen variant="centered">
        <div className={styles.stage}>
          <div
            className={downloading ? styles.ringProgress : styles.ringSpin}
            style={downloading ? { ['--p' as string]: `${percent}%` } : undefined}
          />
          {photoUrl && <img className={styles.photo} src={photoUrl} alt="" draggable={false} />}
        </div>
        <h1 className={styles.title}>{t('processing.title')}</h1>
        <p className={styles.note}>{t('processing.note')}</p>
        {downloading && <p className={styles.download}>{t('processing.download', { n: percent })}</p>}
        <p className={styles.elapsed}>{elapsed.toFixed(1)} s</p>
      </Screen>
    </RequireStep>
  );
}

import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { useT } from '../i18n/useT';
import { useObjectUrl } from '../lib/objectUrl';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './CutoutReviewScreen.module.css';

/** Screen 14: the original beside the cutout of the top photo. */
export function CutoutReviewScreen() {
  const { t } = useT();
  const { state, review, reset } = useAddFlow();
  const navigate = useNavigate();
  const beforeUrl = useObjectUrl(state.top);
  const afterUrl = useObjectUrl(state.topCut?.cutout);

  const accept = () => {
    review(true);
    navigate('/add/identify');
  };
  const keepOriginal = () => {
    review(false);
    navigate('/add/identify');
  };
  const retake = () => {
    reset();
    navigate('/add/top', { replace: true });
  };

  // Pilot readout: how long this phone took, and on what. Numbers only, no copy to translate.
  const timing = state.topCut?.timing;
  const timingLine = timing
    ? `${(timing.totalMs / 1000).toFixed(1)} s · infer ${(timing.inferMs / 1000).toFixed(1)} s · ${timing.device}`
    : null;

  return (
    <RequireStep when={state.processed && state.topCut !== null}>
      <Screen variant="flow" className={styles.screen}>
        <ScreenTitle size="pushed">{t('cutout.title')}</ScreenTitle>
        <div className={styles.compare}>
          <figure className={styles.panel}>
            <div className={styles.before}>{beforeUrl && <img src={beforeUrl} alt="" draggable={false} />}</div>
            <figcaption className={styles.captionBefore}>{t('cutout.labels.before')}</figcaption>
          </figure>
          <figure className={styles.panel}>
            <div className={styles.after}>{afterUrl && <img src={afterUrl} alt="" draggable={false} />}</div>
            <figcaption className={styles.captionAfter}>{t('cutout.labels.after')}</figcaption>
          </figure>
        </div>
        <div className={styles.actions}>
          <Button block onClick={accept}>
            {t('cutout.ok')}
          </Button>
          <Button variant="outline" size="sm" block onClick={retake}>
            {t('cutout.retake')}
          </Button>
          <Button variant="text" block onClick={keepOriginal}>
            {t('cutout.keep')}
          </Button>
          {timingLine && <div className={styles.timing}>{timingLine}</div>}
        </div>
      </Screen>
    </RequireStep>
  );
}

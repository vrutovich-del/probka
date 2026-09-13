import { useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/useT';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './CaptureScreen.module.css';

/**
 * Screen 12, top then side. Capture goes through the phone's own camera via a file input — the path that
 * works on iOS Safari, Android Chrome and installed PWAs alike. Flash and "cap detected" belong to a live
 * preview and arrive with it.
 */
export function CaptureScreen({ step }: { step: 'top' | 'side' }) {
  const { t } = useT();
  const { state, setTop, setSide } = useAddFlow();
  const navigate = useNavigate();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (step === 'top') {
      setTop(file);
      navigate('/add/side');
    } else {
      setSide(file);
      navigate('/add/processing');
    }
  };

  const skipSide = () => {
    setSide(null);
    navigate('/add/processing');
  };

  return (
    <RequireStep when={step === 'top' || state.top !== null}>
      <div className={styles.screen}>
        <div className={styles.header}>
          <button type="button" className={styles.close} aria-label={t('dup.cancel')} onClick={() => navigate('/garage', { replace: true })}>
            <Icon name="close" size={16} />
          </button>
          <div className={styles.step}>{t(step === 'top' ? 'cam.step1' : 'cam.step2')}</div>
          <div className={styles.headerSpacer} />
        </div>

        <div className={styles.viewfinder}>
          <div className={styles.guide} />
        </div>

        <div className={styles.hints}>{t('cam.hints')}</div>

        <div className={styles.controls}>
          <button type="button" className={styles.gallery} onClick={() => galleryInput.current?.click()}>
            {t('cam.gallery')}
          </button>
          <button type="button" className={styles.shutter} aria-label={t('tabs.add')} onClick={() => cameraInput.current?.click()}>
            <span className={styles.shutterInner} />
          </button>
          {step === 'side' ? (
            <button type="button" className={styles.skip} onClick={skipSide}>
              {t('cam.skip')}
            </button>
          ) : (
            <div className={styles.controlSpacer} />
          )}
        </div>

        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
    </RequireStep>
  );
}

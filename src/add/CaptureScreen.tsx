import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/useT';
import { RequireStep, useAddFlow } from './AddFlow';
import { useCamera } from './useCamera';
import styles from './CaptureScreen.module.css';

/**
 * Screen 12, top then side. The viewfinder is the camera itself: the stream opens with the screen and
 * the shutter takes a frame from it. Where that is refused — an older browser, a denied permission, a
 * camera another app is holding — the shutter opens the phone's own camera app instead, which is the
 * path Phase 1 shipped and still works.
 */
export function CaptureScreen({ step }: { step: 'top' | 'side' }) {
  const { t } = useT();
  const { state, setTop, setSide } = useAddFlow();
  const navigate = useNavigate();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const camera = useCamera(true);
  const [busy, setBusy] = useState(false);

  const accept = (file: File) => {
    if (step === 'top') {
      setTop(file);
      navigate('/add/side');
    } else {
      setSide(file);
      navigate('/add/processing');
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) accept(file);
  };

  /** The shutter: a frame from the live stream, or the phone's camera app when there is none. */
  const shoot = async () => {
    if (busy) return;
    if (camera.state !== 'live') {
      cameraInput.current?.click();
      return;
    }
    setBusy(true);
    const file = await camera.grab();
    setBusy(false);
    // A frame that did not come back means the stream died between the tap and the grab; the camera
    // app is the way through rather than a button that does nothing.
    if (file) accept(file);
    else cameraInput.current?.click();
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
          <video
            ref={camera.video}
            className={styles.preview}
            hidden={camera.state !== 'live'}
            playsInline
            autoPlay
            muted
          />
          <div className={styles.guide} />
        </div>

        <div className={styles.hints}>{t('cam.hints')}</div>

        <div className={styles.controls}>
          <button type="button" className={styles.gallery} onClick={() => galleryInput.current?.click()}>
            {t('cam.gallery')}
          </button>
          <button type="button" className={styles.shutter} aria-label={t('tabs.add')} onClick={() => void shoot()}>
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

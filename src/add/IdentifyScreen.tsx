import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen, ScreenTitle, Spacer } from '../components/Screen';
import { useT } from '../i18n/useT';
import { RequireStep, useAddFlow } from './AddFlow';
import styles from './IdentifyScreen.module.css';

/**
 * Screen 15. Without a catalog (Phase 2) the only match is "Not identified yet": confirming it saves the cap
 * as unidentified, "None of these" opens manual entry.
 */
export function IdentifyScreen() {
  const { t } = useT();
  const { state, identify } = useAddFlow();
  const navigate = useNavigate();

  const confirm = () => {
    identify(null);
    navigate('/add/condition');
  };

  return (
    <RequireStep when={state.processed}>
      <Screen variant="flow">
        <ScreenTitle size="pushed">{t('identify.title')}</ScreenTitle>
        <p className={styles.sub}>{t('identify.sub')}</p>
        <div className={styles.candidate} aria-current="true">
          <span className={styles.placeholder}>
            <Icon name="unrated" size={22} />
          </span>
          <span className={styles.candidateTitle}>{t('identify.unidentified')}</span>
          <Icon name="check" size={18} />
        </div>
        <button type="button" className={styles.none} onClick={() => navigate('/add/manual')}>
          {t('identify.none')}
          <span className={styles.chevron}>›</span>
        </button>
        <Spacer />
        <Button block onClick={confirm}>
          {t('identify.confirm')}
        </Button>
      </Screen>
    </RequireStep>
  );
}

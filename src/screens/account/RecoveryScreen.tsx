import { Navigate, useNavigate } from 'react-router';
import { clearDraft, useDraft } from '../../account/draft';
import { Button } from '../../components/Button';
import { Screen, ScreenTitle, Spacer } from '../../components/Screen';
import { showToast } from '../../components/toast';
import { useT } from '../../i18n/useT';
import { copyText } from '../../lib/clipboard';
import styles from './AccountFlow.module.css';

/**
 * The recovery code, shown once and never stored on the phone — keeping it here would mean a lost
 * phone loses it too, which is the one thing it exists to survive. If the paper is lost as well,
 * the admin transfer code (item 5) is the way back.
 */
export function RecoveryScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { recoveryCode } = useDraft();
  // Reloading this screen, or reaching it later, has nothing to show: the code exists once.
  if (!recoveryCode) return <Navigate to="/profile" replace />;

  const copy = async () => {
    showToast(t((await copyText(recoveryCode)) ? 'recovery.copied' : 'recovery.copyFailed'));
  };

  const done = () => {
    clearDraft();
    navigate('/profile', { replace: true });
  };

  return (
    <Screen variant="flow">
      <ScreenTitle size="pushed">{t('recovery.title')}</ScreenTitle>
      <p className={styles.intro}>{t('recovery.body')}</p>
      <p className={styles.code}>{recoveryCode}</p>
      <Button variant="outline" size="md" onClick={() => void copy()}>
        {t('recovery.copy')}
      </Button>
      <Spacer />
      <Button block onClick={done}>
        {t('recovery.cta')}
      </Button>
    </Screen>
  );
}

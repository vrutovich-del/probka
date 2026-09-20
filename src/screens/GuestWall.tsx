import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { accountsAvailable } from '../account/account';
import { startDraft } from '../account/draft';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useT } from '../i18n/useT';
import styles from './GuestWall.module.css';

/**
 * Screen 20b, shown on the Friends and Duel tabs while this phone is a guest. Its button opens the
 * link sheet (37) and then the account flow. A build with no server keeps the wall without the
 * button: an account is not something the app can pretend to offer.
 */
export function GuestWall() {
  const { t } = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const start = () => {
    startDraft(pathname);
    navigate('/account/new');
  };

  return (
    <Screen variant="centered">
      <div className={styles.icon}>
        <Icon name="friends" size={24} />
      </div>
      <h1 className={styles.title}>{t('guestwall.title')}</h1>
      <p className={styles.body}>{t('guestwall.body')}</p>
      {accountsAvailable() && (
        <>
          <Button size="md" onClick={() => setSheetOpen(true)}>
            {t('guestwall.cta')}
          </Button>
          <p className={styles.note}>{t('guestwall.note')}</p>
        </>
      )}

      {sheetOpen && (
        <BottomSheet title={t('link.title')} onClose={() => setSheetOpen(false)}>
          <p className={styles.sheetBody}>{t('link.body')}</p>
          <Button block size="md" onClick={start}>
            {t('link.cta')}
          </Button>
          <Button block size="md" variant="text" onClick={() => setSheetOpen(false)}>
            {t('gate.cancel')}
          </Button>
        </BottomSheet>
      )}
    </Screen>
  );
}

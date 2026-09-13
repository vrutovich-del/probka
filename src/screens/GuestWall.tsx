import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useT } from '../i18n/useT';
import styles from './GuestWall.module.css';

/**
 * Screen 20b, shown on the Friends and Duel tabs while there are no accounts (Phase 1).
 * The "Save your garage" button and its merge note come with account linking in Phase 2.
 */
export function GuestWall() {
  const { t } = useT();
  return (
    <Screen variant="centered">
      <div className={styles.icon}>
        <Icon name="friends" size={24} />
      </div>
      <h1 className={styles.title}>{t('guestwall.title')}</h1>
      <p className={styles.body}>{t('guestwall.body')}</p>
    </Screen>
  );
}

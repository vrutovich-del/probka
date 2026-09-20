import { useAccount } from '../account/account';
import { Screen } from '../components/Screen';
import { useT } from '../i18n/useT';
import { GuestWall } from './GuestWall';
import styles from './GuestWall.module.css';

/**
 * The duel tab. A guest sees the wall (20b); an account sees the truth — the duel is its own round,
 * after friends work on real phones, and nothing here is playable yet.
 */
export function DuelScreen() {
  const { t } = useT();
  const account = useAccount();
  if (!account) return <GuestWall />;
  return (
    <Screen variant="centered">
      <h1 className={styles.title}>{t('duel.title')}</h1>
      <p className={styles.body}>{t('duel.later')}</p>
    </Screen>
  );
}

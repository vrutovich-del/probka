import { useAccount } from '../../account/account';
import { Screen, ScreenTitle } from '../../components/Screen';
import { useT } from '../../i18n/useT';
import { GuestWall } from '../GuestWall';
import styles from './FriendsScreen.module.css';

/**
 * Screen 19. A phone with no account still gets the guest wall (20b); an account gets its friends,
 * which in this item is an honest none — sending and accepting requests is item 4, and a button
 * that cannot do anything yet would be worse than no button.
 */
export function FriendsScreen() {
  const { t } = useT();
  const account = useAccount();
  if (!account) return <GuestWall />;
  return (
    <Screen variant="root">
      <ScreenTitle>{t('friends.title')}</ScreenTitle>
      <p className={styles.empty}>{t('friends.empty')}</p>
      <p className={styles.note}>{t('friends.note')}</p>
    </Screen>
  );
}

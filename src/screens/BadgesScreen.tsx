import { BackLink, Screen, ScreenTitle } from '../components/Screen';
import { cx } from '../components/cx';
import { db } from '../db/db';
import { useLiveQuery } from '../db/useLiveQuery';
import { useT } from '../i18n/useT';
import { badgeProgress, badgeStates } from '../lib/badges';
import styles from './BadgesScreen.module.css';

/** Screen 31: all eight badges. A locked one shows its real progress rather than hiding what it asks for. */
export function BadgesScreen() {
  const { t } = useT();
  const caps = useLiveQuery(() => db.caps.toArray(), []);
  return (
    <Screen variant="pushed">
      <BackLink to="/profile" labelKey="profile.title" />
      <ScreenTitle size="pushed">{t('profile.rows.badges')}</ScreenTitle>
      <div className={styles.grid}>
        {caps &&
          badgeStates(caps).map((badge) => (
            <div key={badge.id} className={cx(styles.tile, badge.earned ? styles.earned : styles.locked)}>
              <img className={styles.art} src={badge.art} alt="" width={56} height={56} draggable={false} />
              <span className={styles.name}>{t(badge.nameKey)}</span>
              <span className={styles.progress}>{badgeProgress(badge, t)}</span>
            </div>
          ))}
      </div>
    </Screen>
  );
}

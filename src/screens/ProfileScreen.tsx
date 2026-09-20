import { Row } from '../components/Row';
import { Screen, ScreenTitle } from '../components/Screen';
import { db } from '../db/db';
import { useLiveQuery } from '../db/useLiveQuery';
import { LANGUAGE_NAMES } from '../i18n';
import { useT } from '../i18n/useT';
import { earnedBadges } from '../lib/badges';
import { garageStats } from './garage/garageData';
import styles from './ProfileScreen.module.css';

/** Screen 30. The nickname block and the Stats screen need an account and a catalog; they come later. */
export function ProfileScreen() {
  const { t, lang } = useT();
  const caps = useLiveQuery(() => db.caps.toArray(), []);
  const stats = garageStats(caps ?? []);
  const earned = earnedBadges(caps ?? []).length;
  // A tile stays empty until the garage has been read, so the screen never shows a zero it does not mean.
  const value = (n: number) => (caps ? String(n) : '');
  return (
    <Screen variant="root">
      <ScreenTitle>{t('profile.title')}</ScreenTitle>

      <div className={styles.stats}>
        <Stat value={value(stats.caps)} label={t('garage.stats.caps', { n: stats.caps })} />
        <Stat value={value(stats.brands)} label={t('garage.stats.brands', { n: stats.brands })} />
        <Stat value={value(earned)} label={t('profile.stats.badges', { n: earned })} />
      </div>

      <Row to="/profile/badges" label={t('profile.rows.badges')} value={t('profile.badgesEarned', { n: earned })} />
      <Row to="/profile/settings" label={t('profile.rows.settings')} />
      <Row to="/profile/language" label={t('profile.rows.language')} value={LANGUAGE_NAMES[lang]} />
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

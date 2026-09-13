import { Row } from '../components/Row';
import { Screen, ScreenTitle } from '../components/Screen';
import { LANGUAGE_NAMES } from '../i18n';
import { useT } from '../i18n/useT';

/** Screen 30. Badges (item 4), the stats row and the nickname block come with their own items. */
export function ProfileScreen() {
  const { t, lang } = useT();
  return (
    <Screen variant="root">
      <ScreenTitle>{t('profile.title')}</ScreenTitle>
      <Row to="/profile/settings" label={t('profile.rows.settings')} />
      <Row to="/profile/language" label={t('profile.rows.language')} value={LANGUAGE_NAMES[lang]} />
    </Screen>
  );
}

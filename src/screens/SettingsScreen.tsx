import { Row } from '../components/Row';
import { BackLink, Screen, ScreenTitle } from '../components/Screen';
import { LANGUAGE_NAMES } from '../i18n';
import { useT } from '../i18n/useT';

/** Screen 33. Only Language works without a backend; the other rows arrive with their items. */
export function SettingsScreen() {
  const { t, lang } = useT();
  return (
    <Screen variant="pushed">
      <BackLink to="/profile" labelKey="profile.title" />
      <ScreenTitle size="pushed">{t('settings.title')}</ScreenTitle>
      <Row to="/profile/settings/language" label={t('settings.rows.language')} value={LANGUAGE_NAMES[lang]} />
    </Screen>
  );
}

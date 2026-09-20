import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Row } from '../components/Row';
import { BackLink, Screen, ScreenTitle } from '../components/Screen';
import { showSnack } from '../components/snackbar';
import { showToast } from '../components/toast';
import { LANGUAGE_NAMES } from '../i18n';
import { useT } from '../i18n/useT';
import { addSampleCap, SAMPLE_LABEL } from '../lib/sampleCap';
import { isStorageFull } from '../lib/storage';

/** Screen 33. Language and the sample cap work without a backend; the other rows arrive with their items. */
export function SettingsScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const loadSample = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await addSampleCap();
      if (result.status === 'already') {
        showToast(t('settings.sample.already'));
        return;
      }
      showSnack({
        text: t('settings.sample.added'),
        action: { label: t('settings.sample.view'), run: () => navigate(`/garage/cap/${result.id}`) },
      });
    } catch (error) {
      console.error('Could not load the sample cap', error);
      showToast(t(isStorageFull(error) ? 'save.full' : 'settings.sample.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen variant="pushed">
      <BackLink to="/profile" labelKey="profile.title" />
      <ScreenTitle size="pushed">{t('settings.title')}</ScreenTitle>
      <Row to="/profile/settings/language" label={t('settings.rows.language')} value={LANGUAGE_NAMES[lang]} />
      <Row
        label={t('settings.rows.sample')}
        value={SAMPLE_LABEL}
        disabled={loading}
        onClick={() => void loadSample()}
      />
    </Screen>
  );
}

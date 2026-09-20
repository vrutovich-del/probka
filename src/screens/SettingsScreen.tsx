import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Row } from '../components/Row';
import { BackLink, Screen, ScreenTitle } from '../components/Screen';
import { showSnack } from '../components/snackbar';
import { showToast } from '../components/toast';
import { LANGUAGE_NAMES } from '../i18n';
import type { TKey } from '../i18n';
import { useT } from '../i18n/useT';
import { exportCollection } from '../lib/exportCollection';
import { addSampleCap, SAMPLE_LABEL } from '../lib/sampleCap';
import { isStorageFull } from '../lib/storage';
import { kick, useSyncStatus, type SyncState } from '../sync/sync';

/** Screen 33. A row appears when what it does is real; the rest arrive with their items. */
export function SettingsScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { state, pending } = useSyncStatus();

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

  const exportAll = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportCollection();
    } catch (error) {
      console.error('Could not export the collection', error);
      showToast(t('settings.export.failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen variant="pushed">
      <BackLink to="/profile" labelKey="profile.title" />
      <ScreenTitle size="pushed">{t('settings.title')}</ScreenTitle>
      <Row to="/profile/settings/language" label={t('settings.rows.language')} value={LANGUAGE_NAMES[lang]} />
      {state !== 'off' && (
        <Row
          label={t('settings.rows.sync')}
          value={t(syncMessage(state), { n: pending ?? 0 })}
          onClick={() => kick()}
        />
      )}
      <Row label={t('settings.rows.export')} disabled={exporting} onClick={() => void exportAll()} />
      <Row
        label={t('settings.rows.sample')}
        value={SAMPLE_LABEL}
        disabled={loading}
        onClick={() => void loadSample()}
      />
    </Screen>
  );
}

/** What the sync row says. Tapping it tries again, whatever it says. */
function syncMessage(state: SyncState): TKey {
  switch (state) {
    case 'syncing':
      return 'settings.sync.working';
    case 'offline':
      return 'settings.sync.offline';
    case 'error':
      return 'settings.sync.error';
    default:
      return 'settings.sync.ok';
  }
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createAccount } from '../../account/account';
import { updateDraft, useDraft } from '../../account/draft';
import { nicknameState } from '../../account/nickname';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { ParentalGate } from '../../components/ParentalGate';
import { BackLink, Screen, ScreenTitle, Spacer } from '../../components/Screen';
import { showToast } from '../../components/toast';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n';
import styles from './AccountFlow.module.css';

const BULLETS: TKey[] = ['consent.b1', 'consent.b2', 'consent.b3', 'consent.b4'];

/**
 * Screen 06, and where the account is actually made: the parental gate opens over this screen, and
 * only an adult's answer starts the one call that creates it. The recovery code comes back from that
 * call and goes straight to the screen that shows it once.
 */
export function ConsentScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const draft = useDraft();
  const [gateOpen, setGateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setGateOpen(false);
    if (busy) return;
    setBusy(true);
    try {
      const result = await createAccount(draft.nickname.trim(), draft.avatar);
      if (result.ok) {
        updateDraft({ recoveryCode: result.recoveryCode });
        navigate('/account/recovery', { replace: true });
        return;
      }
      if (result.error === 'nickname_taken') {
        showToast(t('nick.taken'));
        navigate('/account/new', { replace: true });
        return;
      }
      showToast(t(result.error === 'offline' ? 'account.offline' : 'account.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen variant="flow">
      <BackLink to="/account/new" labelKey="nick.title" />
      <ScreenTitle size="pushed">{t('consent.title')}</ScreenTitle>
      <p className={styles.intro}>{t('consent.intro')}</p>
      <ul className={styles.bullets}>
        {BULLETS.map((key) => (
          <li key={key} className={styles.bullet}>
            <Icon name="check" size={13} /> {t(key)}
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>{t('consent.once')}</p>

      <Spacer />
      <Button
        block
        disabled={busy || nicknameState(draft.nickname) !== 'ok'}
        onClick={() => setGateOpen(true)}
      >
        {t(busy ? 'account.creating' : 'consent.cta')}
      </Button>

      {gateOpen && (
        <ParentalGate bodyKey="gate.body.account" onPass={() => void create()} onCancel={() => setGateOpen(false)} />
      )}
    </Screen>
  );
}

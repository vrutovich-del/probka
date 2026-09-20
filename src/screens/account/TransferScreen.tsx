import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { accountsAvailable, useAccount } from '../../account/account';
import { transferGarage, type TransferError, type TransferProgress } from '../../account/transfer';
import { Button } from '../../components/Button';
import { BackLink, Screen, ScreenTitle, Spacer } from '../../components/Screen';
import { showToast } from '../../components/toast';
import type { TKey } from '../../i18n';
import { useT } from '../../i18n/useT';
import styles from './AccountFlow.module.css';

/**
 * "Move my garage to this phone": the recovery code the parent kept, or the one-time code we mint
 * when that is lost too. It is reachable before there is any account — a child holding a new phone
 * should get their garage back, not start an empty one.
 */
export function TransferScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const account = useAccount();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<TransferProgress>();

  if (!accountsAvailable()) return <Navigate to="/garage" replace />;
  // A phone that already has an account has nothing to move onto it.
  if (account && !busy) return <Navigate to="/profile" replace />;

  const run = async () => {
    if (busy || code.trim().length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    const result = await transferGarage(code.trim(), setProgress);
    setBusy(false);
    setProgress(undefined);
    if (!result.ok) {
      showToast(t(errorKey(result.error)));
      return;
    }
    showToast(
      result.missed > 0
        ? t('transfer.partly', { n: result.caps, missed: result.missed })
        : t('transfer.done', { n: result.caps }),
    );
    navigate('/garage', { replace: true });
  };

  return (
    <Screen variant="flow">
      <BackLink to="/profile" labelKey="profile.title" />
      <ScreenTitle size="pushed">{t('transfer.title')}</ScreenTitle>
      <p className={styles.intro}>{t('transfer.body')}</p>

      <input
        className={styles.input}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t('transfer.placeholder')}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={24}
        aria-label={t('transfer.title')}
        disabled={busy}
      />

      {progress && progress.total > 0 && (
        <p className={styles.rules}>{t('transfer.working', { n: progress.done, total: progress.total })}</p>
      )}

      <Spacer />
      <Button block disabled={busy || code.trim().length === 0} onClick={() => void run()}>
        {t(busy ? 'transfer.busy' : 'transfer.cta')}
      </Button>
      <p className={styles.footnote}>{t('transfer.note')}</p>
    </Screen>
  );
}

function errorKey(error: TransferError): TKey {
  switch (error) {
    case 'rate_limited':
      return 'addfriend.tooMany';
    case 'offline':
      return 'account.offline';
    case 'invalid_code':
    case 'unknown_code':
      return 'transfer.unknown';
    default:
      return 'transfer.failed';
  }
}

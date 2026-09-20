import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAccount } from '../../account/account';
import { Button } from '../../components/Button';
import { BackLink, Screen, ScreenTitle } from '../../components/Screen';
import { showToast } from '../../components/toast';
import { sendCode, type SendCodeError } from '../../friends/api';
import type { TKey } from '../../i18n';
import { useT } from '../../i18n/useT';
import { canShare, copyText, shareText } from '../../lib/clipboard';
import styles from './AddFriendScreen.module.css';

/**
 * Screen 20. Your own code to read out, and a field for someone else's — the only way anyone finds
 * anyone in this app. No search, no suggestions, no list of children anywhere.
 */
export function AddFriendScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const account = useAccount();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!account) return null;

  const copy = async () => {
    showToast(t((await copyText(account.friendCode)) ? 'recovery.copied' : 'recovery.copyFailed'));
  };

  const share = async () => {
    if (!(await shareText(account.friendCode))) await copy();
  };

  const send = async () => {
    if (busy || !code.trim()) return;
    setBusy(true);
    const result = await sendCode(code.trim());
    setBusy(false);
    if (result.ok) {
      showToast(t(result.status === 'friends' ? 'addfriend.nowFriends' : 'addfriend.sent', { nick: result.person.nickname }));
      setCode('');
      navigate('/friends');
      return;
    }
    showToast(t(errorKey(result.error)));
  };

  return (
    <Screen variant="pushed">
      <BackLink to="/friends" labelKey="friends.title" />
      <ScreenTitle size="pushed">{t('addfriend.title')}</ScreenTitle>

      <div className={styles.card}>
        <p className={styles.cardLabel}>{t('addfriend.mycode.title')}</p>
        <p className={styles.code}>{account.friendCode}</p>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" block onClick={() => void copy()}>
            {t('addfriend.mycode.copy')}
          </Button>
          {canShare() && (
            <Button variant="outline" size="sm" block onClick={() => void share()}>
              {t('addfriend.mycode.share')}
            </Button>
          )}
        </div>
      </div>

      <p className={styles.or}>{t('addfriend.or')}</p>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('addfriend.enter.label')}</span>
        <input
          className={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('addfriend.placeholder')}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={9}
        />
      </label>

      <Button block disabled={busy || code.trim().length === 0} onClick={() => void send()}>
        {t('addfriend.enter.cta')}
      </Button>

      <p className={styles.note}>{t('addfriend.note')}</p>
    </Screen>
  );
}

function errorKey(error: SendCodeError): TKey {
  switch (error) {
    case 'invalid_code':
    case 'unknown_code':
      return 'addfriend.unknown';
    case 'own_code':
      return 'addfriend.own';
    case 'already_friends':
      return 'addfriend.already';
    case 'already_sent':
      return 'addfriend.pending';
    case 'rate_limited':
      return 'addfriend.tooMany';
    case 'offline':
      return 'account.offline';
    default:
      return 'addfriend.failed';
  }
}

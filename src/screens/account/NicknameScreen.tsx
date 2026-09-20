import { useNavigate } from 'react-router';
import { AVATARS } from '../../account/avatars';
import { updateDraft, useDraft } from '../../account/draft';
import { nicknameMessage, nicknameState, NICKNAME_MAX } from '../../account/nickname';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { BackLink, Screen, ScreenTitle, Spacer } from '../../components/Screen';
import { cx } from '../../components/cx';
import { useT } from '../../i18n/useT';
import styles from './AccountFlow.module.css';

/** Screen 05. The nickname and the avatar are the only two things this app learns about a child. */
export function NicknameScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const draft = useDraft();
  const state = nicknameState(draft.nickname);
  const message = nicknameMessage(state);

  return (
    <Screen variant="flow">
      <BackLink to={draft.from} labelKey="gate.cancel" />
      <ScreenTitle size="pushed">{t('nick.title')}</ScreenTitle>

      <input
        className={styles.input}
        value={draft.nickname}
        onChange={(e) => updateDraft({ nickname: e.target.value })}
        placeholder={t('nick.placeholder')}
        // One over the limit, so "too long" can be shown rather than silently swallowing a keystroke.
        maxLength={NICKNAME_MAX + 1}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label={t('nick.title')}
      />
      {message && (
        <p className={styles.problem}>
          <Icon name="close" size={12} /> {t(message)}
        </p>
      )}
      <p className={styles.rules}>{t('nick.rules')}</p>
      <p className={styles.merge}>{t('link.body')}</p>

      <p className={styles.sectionLabel}>{t('nick.avatar')}</p>
      <div className={styles.avatars} role="radiogroup" aria-label={t('nick.avatar')}>
        {AVATARS.map((avatar) => {
          const selected = avatar.key === draft.avatar;
          return (
            <button
              key={avatar.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={avatar.key}
              className={cx(styles.avatar, selected && styles.avatarSelected)}
              style={{ color: avatar.color }}
              onClick={() => updateDraft({ avatar: avatar.key })}
            >
              <Icon name={avatar.icon} size={19} />
            </button>
          );
        })}
      </div>

      <Spacer />
      <Button block disabled={state !== 'ok'} onClick={() => navigate('/account/consent')}>
        {t('nick.cta')}
      </Button>
    </Screen>
  );
}

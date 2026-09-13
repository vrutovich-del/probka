import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { BackLink, Screen, ScreenTitle } from '../components/Screen';
import { cx } from '../components/cx';
import { LANGUAGES, LANGUAGE_NAMES, translateIn, type Language, type TKey } from '../i18n';
import { setLanguage } from '../i18n/languageStore';
import { useT } from '../i18n/useT';
import styles from './LanguageScreen.module.css';

interface Back {
  to: string;
  labelKey: TKey;
}

/**
 * Screen 02. Without `back` it is the first-launch picker: centered, the title repeated in the other two
 * languages, and a choice leads to the Garage. With `back` it is the switch reached from Profile or Settings.
 */
export function LanguageScreen({ back }: { back?: Back }) {
  const { t, lang } = useT();
  const navigate = useNavigate();

  const choose = async (next: Language) => {
    await setLanguage(next);
    if (!back) navigate('/garage', { replace: true });
  };

  const otherTitles = LANGUAGES.filter((l) => l !== lang)
    .map((l) => translateIn(l, 'lang.title'))
    .join(' · ');

  const options = (
    <div className={styles.list} role="group">
      {LANGUAGES.map((l) => {
        const current = l === lang;
        return (
          <button
            key={l}
            type="button"
            className={cx(styles.option, current && styles.current)}
            aria-current={current ? 'true' : undefined}
            onClick={() => void choose(l)}
          >
            <span className={styles.chip}>{l.toUpperCase()}</span>
            <span className={styles.name}>{LANGUAGE_NAMES[l]}</span>
            <span className={styles.trail}>{current ? <Icon name="check" size={18} /> : '›'}</span>
          </button>
        );
      })}
    </div>
  );

  if (back) {
    return (
      <Screen variant="pushed" className={styles.pushed}>
        <BackLink to={back.to} labelKey={back.labelKey} />
        <ScreenTitle size="pushed">{t('lang.title')}</ScreenTitle>
        {options}
      </Screen>
    );
  }

  return (
    <Screen variant="centered" className={styles.first}>
      <ScreenTitle>{t('lang.title')}</ScreenTitle>
      <p className={styles.sub} lang="">
        {otherTitles}
      </p>
      {options}
    </Screen>
  );
}

import { useState } from 'react';
import { Icon } from './Icon';
import { cx } from './cx';
import { useT } from '../i18n/useT';
import type { TKey } from '../i18n';
import styles from './ParentalGate.module.css';

/** 6 × 7, with the prototype's three answers in the prototype's order. */
const ANSWERS = [36, 42, 48] as const;
const CORRECT = 42;

/**
 * The prototype's "Quick check for a grown-up": one multiplication a child of this age has not met
 * yet, in front of anything the brief says needs a parent. A wrong answer says so and lets them try
 * again — it is a speed bump, not a lock, and it is never the only protection on anything.
 */
export function ParentalGate({ bodyKey, onPass, onCancel }: { bodyKey: TKey; onPass: () => void; onCancel: () => void }) {
  const { t } = useT();
  const [wrong, setWrong] = useState(false);
  return (
    <div className={styles.layer}>
      <button type="button" className={styles.scrim} aria-label={t('gate.cancel')} onClick={onCancel} />
      <div
        className={cx(styles.dialog, wrong && styles.dialogWrong)}
        role="dialog"
        aria-modal="true"
        aria-label={t('gate.title')}
      >
        <h2 className={styles.title}>{t('gate.title')}</h2>
        <p className={styles.body}>
          {t(bodyKey)} {t('gate.q')}
        </p>
        <div className={styles.answers}>
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              className={styles.answer}
              onClick={() => (answer === CORRECT ? onPass() : setWrong(true))}
            >
              {answer}
            </button>
          ))}
        </div>
        {wrong && (
          <p className={styles.wrong}>
            <Icon name="close" size={12} /> {t('gate.wrong')}
          </p>
        )}
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {t('gate.cancel')}
        </button>
      </div>
    </div>
  );
}

import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { db, type CapRecord } from '../db/db';
import { useLiveQuery } from '../db/useLiveQuery';
import { useT } from '../i18n/useT';
import { useObjectUrl } from '../lib/objectUrl';
import { capTier, TIERS } from '../lib/rarity';
import styles from './DuplicateSheet.module.css';

/** Screen 11: the garage already has this type. Count it (×N), keep it as its own cap, or go back. */
export function DuplicateSheet({
  existing,
  onDuplicate,
  onSeparate,
  onCancel,
}: {
  existing: CapRecord;
  onDuplicate: () => void;
  onSeparate: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const thumb = useLiveQuery(() => db.thumbs.get(existing.id), [existing.id]);
  const url = useObjectUrl(thumb?.blob);
  const tier = TIERS[capTier()];
  return (
    <BottomSheet title={t('dup.title')} onClose={onCancel}>
      <div className={styles.card}>
        <span className={styles.thumb}>{url && <img src={url} alt="" draggable={false} />}</span>
        <span className={styles.text}>
          <span className={styles.title}>{[existing.brand, existing.product].filter(Boolean).join(' · ')}</span>
          <span className={styles.sub} style={{ color: tier.color }}>
            <Icon name={tier.icon} size={12} />
            {t(tier.labelKey)}
          </span>
        </span>
      </div>
      <Button size="md" block onClick={onDuplicate}>
        {t('dup.x2')}
      </Button>
      <Button variant="outline" size="sm" block className={styles.separate} onClick={onSeparate}>
        <span className={styles.separateText}>
          {t('dup.separate')}
          <span className={styles.separateSub}>{t('dup.separate.sub')}</span>
        </span>
      </Button>
      <Button variant="text" block onClick={onCancel}>
        {t('dup.cancel')}
      </Button>
    </BottomSheet>
  );
}

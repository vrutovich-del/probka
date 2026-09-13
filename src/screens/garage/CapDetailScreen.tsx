import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { Cap3D, type CapTexture } from '../../components/Cap3D';
import { Icon } from '../../components/Icon';
import { BackLink } from '../../components/Screen';
import { Segmented } from '../../components/Segmented';
import { showSnack } from '../../components/snackbar';
import { removeCap, restoreCap, setDupes } from '../../db/caps';
import { db, type PhotoRecord } from '../../db/db';
import { useLiveQuery } from '../../db/useLiveQuery';
import { useT } from '../../i18n/useT';
import { formatDate } from '../../lib/format';
import { useObjectUrl } from '../../lib/objectUrl';
import { capTier, TIERS } from '../../lib/rarity';
import { regionName } from '../../lib/regions';
import styles from './CapDetailScreen.module.css';

type View = 'before' | 'after';

/** "BEFORE" → "Before": the strings table has the review captions in capitals. */
function titleCase(s: string, lang: string): string {
  return s.charAt(0) + s.slice(1).toLocaleLowerCase(lang);
}

function texture(url: string | null, photo: PhotoRecord | undefined, cutout: boolean): CapTexture | null {
  if (!url || !photo) return null;
  return cutout ? { url, width: photo.width, height: photo.height, bbox: photo.bbox } : { url, width: 0, height: 0, bbox: null };
}

/** Screen 10: the cap on its pedestal, its facts, duplicates, delete with a 5-second undo. */
export function CapDetailScreen() {
  const { t, lang } = useT();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const cap = useLiveQuery(() => db.caps.get(id).then((c) => c ?? null), [id]);
  const photos = useLiveQuery(() => db.photos.where('capId').equals(id).toArray(), [id]);
  const [view, setView] = useState<View>('after');
  const [busy, setBusy] = useState(false);

  const top = photos?.find((p) => p.role === 'top');
  const side = photos?.find((p) => p.role === 'side');
  const hasCutout = Boolean(cap?.useCutout && top?.cutout);
  const topCutoutUrl = useObjectUrl(hasCutout ? top?.cutout : null);
  const topOriginalUrl = useObjectUrl(top?.original);
  const sideCutoutUrl = useObjectUrl(side?.cutout);

  if (cap === null) return <Navigate to="/garage" replace />;
  if (!cap) return <div className={styles.screen} />;

  const tier = TIERS[capTier()];
  const showing: View = hasCutout ? view : 'after';
  const topTexture = hasCutout ? texture(topCutoutUrl, top, true) : texture(topOriginalUrl, top, false);
  const sideTexture = side?.cutout ? texture(sideCutoutUrl, side, true) : null;

  const changeDupes = (delta: number) => void setDupes(cap.id, cap.dupes + delta);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    const bundle = await removeCap(cap.id);
    navigate('/garage', { replace: true });
    if (bundle) {
      showSnack({
        text: t('detail.deleted'),
        action: { label: t('detail.undo'), run: () => void restoreCap(bundle) },
      });
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.bar}>
        <BackLink to="/garage" labelKey="tabs.garage" />
        <span className={styles.soon}>{t('detail.3dsoon')}</span>
      </div>

      <div className={styles.viewer}>
        {showing === 'after' ? (
          topTexture && (
            <Cap3D top={topTexture} side={sideTexture} sideColor={top?.rimColor} radius={88} interactive />
          )
        ) : (
          <div className={styles.beforeWrap}>
            <div className={styles.before}>{topOriginalUrl && <img src={topOriginalUrl} alt="" draggable={false} />}</div>
          </div>
        )}
        <div className={styles.pedestal} />
        <span className={styles.hint}>{t('detail.viewer.hint')}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {cap.brand ? (
              <>
                {cap.brand} {cap.product && <span className={styles.product}>{cap.product}</span>}
              </>
            ) : (
              t('identify.unidentified')
            )}
          </h1>
          {hasCutout && (
            <Segmented<View>
              size="sm"
              segments={[
                { value: 'before', label: titleCase(t('cutout.labels.before'), lang) },
                { value: 'after', label: titleCase(t('cutout.labels.after'), lang) },
              ]}
              value={view}
              onChange={setView}
            />
          )}
        </div>

        <div className={styles.rarity}>
          <span style={{ color: tier.color }} className={styles.rarityIcon}>
            <Icon name={tier.icon} size={14} />
          </span>
          <span>{t('detail.unrated')}</span>
        </div>

        <div className={styles.chips}>
          <span className={styles.chipPrimary}>{t(`condition.tags.${cap.condition}`)}</span>
          {cap.shape && <span className={styles.chip}>{t(`manual.geo.${cap.shape}`)}</span>}
          {cap.country && <span className={styles.chip}>{regionName(cap.country, lang)}</span>}
        </div>

        <p className={styles.found}>
          {cap.place
            ? t('detail.found', { date: formatDate(cap.foundOn, lang), place: cap.place })
            : t('detail.foundDate', { date: formatDate(cap.foundOn, lang) })}
        </p>

        <div className={styles.dupes}>
          <span className={styles.dupesLabel}>{t('detail.dupes')}</span>
          <span className={styles.dupesControls}>
            <button type="button" className={styles.round} onClick={() => changeDupes(-1)} disabled={cap.dupes <= 1} aria-label="−">
              <Icon name="minus" size={14} />
            </button>
            <span className={styles.dupesValue}>×{cap.dupes}</span>
            <button type="button" className={styles.roundPrimary} onClick={() => changeDupes(1)} aria-label="+">
              <Icon name="plus" size={14} />
            </button>
          </span>
        </div>

        <Button variant="danger" size="sm" block disabled={busy} onClick={() => void remove()}>
          {t('detail.actions.delete')}
        </Button>
      </div>
    </div>
  );
}

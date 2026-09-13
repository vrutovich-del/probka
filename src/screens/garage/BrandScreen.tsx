import { Navigate, useParams } from 'react-router';
import { CapTile } from '../../components/CapTile';
import { Ring } from '../../components/Ring';
import { BackLink, Screen } from '../../components/Screen';
import { db } from '../../db/db';
import { useLiveQuery } from '../../db/useLiveQuery';
import { useT } from '../../i18n/useT';
import { brandKey, groupByBrand, thumbMap } from './garageData';
import styles from './BrandScreen.module.css';

/** Screen 09b: one brand's caps. Grey catalog silhouettes come with the catalog (Phase 2). */
export function BrandScreen() {
  const { t, lang } = useT();
  const { brand = '' } = useParams();
  const caps = useLiveQuery(() => db.caps.toArray(), []);
  const thumbs = useLiveQuery(() => db.thumbs.toArray(), []);
  if (!caps) return <Screen variant="pushed" />;

  const group = groupByBrand(caps, lang).groups.find((g) => g.key === brandKey(brand));
  if (!group) return <Navigate to="/garage/collections" replace />;
  const thumbsById = thumbMap(thumbs);
  const n = group.types;

  return (
    <Screen variant="pushed" className={styles.screen}>
      <BackLink to="/garage/collections" labelKey="garage.seg.collections" />
      <div className={styles.head}>
        <Ring percent={100} size={64} ground="var(--color-bg-base)">
          <span className={styles.ringLabel}>
            {n}/{n}
          </span>
        </Ring>
        <div className={styles.text}>
          <h1 className={styles.brand}>{group.brand}</h1>
          <p className={styles.sub}>{t('collections.progress', { n, total: n, count: n })}</p>
        </div>
      </div>
      <div className={styles.grid}>
        {group.caps.map((cap) => (
          <CapTile key={cap.id} cap={cap} thumb={thumbsById.get(cap.id)} />
        ))}
      </div>
    </Screen>
  );
}

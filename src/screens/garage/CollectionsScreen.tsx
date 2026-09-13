import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Ring } from '../../components/Ring';
import { Screen } from '../../components/Screen';
import { db } from '../../db/db';
import { useLiveQuery } from '../../db/useLiveQuery';
import { useT } from '../../i18n/useT';
import { useObjectUrl } from '../../lib/objectUrl';
import { GarageHeader } from './GarageHeader';
import { groupByBrand, thumbMap, type BrandGroup } from './garageData';
import styles from './CollectionsScreen.module.css';

/**
 * Screen 09. Until there is a catalog, a brand's "known caps" are the distinct types the user has entered,
 * so every ring is full — the honest number, not a guess.
 */
export function CollectionsScreen() {
  const { t, lang } = useT();
  const caps = useLiveQuery(() => db.caps.toArray(), []);
  const thumbs = useLiveQuery(() => db.thumbs.toArray(), []);
  const { groups, unidentified } = groupByBrand(caps ?? [], lang);
  const thumbsById = thumbMap(thumbs);

  return (
    <Screen variant="root">
      <GarageHeader view="collections" />
      {groups.map((g) => (
        <BrandCard key={g.key} group={g} thumb={thumbsById.get(g.caps[0]?.id ?? '')} />
      ))}
      {unidentified > 0 && (
        <div className={styles.unidentified}>
          <Icon name="unrated" size={15} />
          {t('collections.unidentified', { n: unidentified })}
        </div>
      )}
      <div className={styles.more}>{t('collections.more')}</div>
    </Screen>
  );
}

function BrandCard({ group, thumb }: { group: BrandGroup; thumb: Blob | undefined }) {
  const { t } = useT();
  const url = useObjectUrl(thumb);
  const n = group.types;
  return (
    <Link to={`/garage/collections/${encodeURIComponent(group.brand)}`} className={styles.card}>
      <Ring percent={100} size={52}>
        {n}/{n}
      </Ring>
      <span className={styles.text}>
        <span className={styles.brand}>{group.brand}</span>
        <span className={styles.sub}>{t('collections.progress', { n, total: n, count: n })}</span>
      </span>
      {url && <img className={styles.thumb} src={url} alt="" draggable={false} />}
      <span className={styles.chevron}>›</span>
    </Link>
  );
}

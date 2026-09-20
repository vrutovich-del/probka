import { Link, useNavigate } from 'react-router';
import { accountsAvailable, useAccount } from '../../account/account';
import { Button } from '../../components/Button';
import { CapTile, PlaceholderTile } from '../../components/CapTile';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { cx } from '../../components/cx';
import { db, type Condition } from '../../db/db';
import { useLiveQuery } from '../../db/useLiveQuery';
import { useT } from '../../i18n/useT';
import { setGarageView, useGarageView } from '../../lib/garageView';
import { TIERS } from '../../lib/rarity';
import { GarageHeader } from './GarageHeader';
import { conditionsPresent, garageStats, placeholderCount, sortCaps, SORTS, thumbMap } from './garageData';
import styles from './GarageScreen.module.css';

/** Screen 08: stats, sort and filter chips, the grid with dashed spots — or the empty state. */
export function GarageScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const account = useAccount();
  const view = useGarageView();
  const caps = useLiveQuery(() => db.caps.toArray(), []);
  const thumbs = useLiveQuery(() => db.thumbs.toArray(), []);

  if (!caps) {
    return (
      <Screen variant="root">
        <GarageHeader view="caps" />
      </Screen>
    );
  }

  if (caps.length === 0) {
    return (
      <Screen variant="root">
        <GarageHeader view="caps" />
        <div className={styles.empty}>
          <div className={styles.emptyDisc} />
          <div className={styles.emptyPedestal} />
          <h2 className={styles.emptyTitle}>{t('garage.empty.title')}</h2>
          <p className={styles.emptyBody}>{t('garage.empty.body')}</p>
          <Button className={styles.emptyCta} onClick={() => navigate('/add')}>
            {t('garage.empty.cta')}
          </Button>
          {/* A child holding a new phone lands here on the first launch, and this is the only place
              they would look for the garage they already have. */}
          {!account && accountsAvailable() && (
            <Link to="/account/transfer" className={styles.emptyLink}>
              {t('transfer.title')}
            </Link>
          )}
        </div>
      </Screen>
    );
  }

  const stats = garageStats(caps);
  const rarest = TIERS[stats.rarest];
  const conditions = conditionsPresent(caps);
  const filtered = view.condition ? caps.filter((c) => c.condition === view.condition) : caps;
  const visible = sortCaps(filtered, view.sort, lang);
  const thumbsById = thumbMap(thumbs);
  const cycleSort = () => setGarageView({ sort: SORTS[(SORTS.indexOf(view.sort) + 1) % SORTS.length] ?? 'newest' });
  const filterChip = (value: Condition | null, label: string) => {
    const selected = view.condition === value;
    return (
      <button
        key={value ?? 'all'}
        type="button"
        className={cx(styles.chip, selected && styles.chipSelected)}
        aria-pressed={selected}
        onClick={() => setGarageView({ condition: value })}
      >
        {selected && <Icon name="check" size={11} />}
        {label}
      </button>
    );
  };

  return (
    <Screen variant="root">
      <GarageHeader view="caps" />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.caps}</span>
          <span className={styles.statLabel}>{t('garage.stats.caps', { n: stats.caps })}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.brands}</span>
          <span className={styles.statLabel}>{t('garage.stats.brands', { n: stats.brands })}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statTier} style={{ color: rarest.color }}>
            <Icon name={rarest.icon} size={14} />
            {t(rarest.labelKey)}
          </span>
          <span className={styles.statLabel}>{t('garage.stats.rarest')}</span>
        </div>
      </div>

      <div className={styles.chips}>
        <button type="button" className={cx(styles.chip, styles.sortChip)} onClick={cycleSort}>
          <Icon name="sort" size={12} />
          {t(`garage.sort.${view.sort}`)}
        </button>
        {filterChip(null, t('garage.filter.all'))}
        {conditions.map((c) => filterChip(c, t(`condition.tags.${c}`)))}
      </div>

      <div className={styles.grid}>
        {visible.map((cap) => (
          <CapTile key={cap.id} cap={cap} thumb={thumbsById.get(cap.id)} />
        ))}
        {Array.from({ length: placeholderCount(visible.length) }, (_, i) => (
          <PlaceholderTile key={`p${i}`} />
        ))}
      </div>
      <p className={styles.footnote}>{t('garage.placeholders')}</p>
    </Screen>
  );
}

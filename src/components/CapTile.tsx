import { Link } from 'react-router';
import type { CapRecord } from '../db/db';
import { useObjectUrl } from '../lib/objectUrl';
import { capTier, TIERS } from '../lib/rarity';
import { Icon } from './Icon';
import styles from './CapTile.module.css';

/** One square in the garage grid: tile image, rarity glyph top-right, ×N bottom-right when duplicated. */
export function CapTile({ cap, thumb }: { cap: CapRecord; thumb: Blob | undefined }) {
  const url = useObjectUrl(thumb);
  const tier = TIERS[capTier()];
  return (
    <Link to={`/garage/cap/${cap.id}`} className={styles.tile}>
      {url ? <img className={styles.image} src={url} alt="" draggable={false} /> : <span className={styles.disc} />}
      <span className={styles.tier} style={{ color: tier.color }}>
        <Icon name={tier.icon} size={12} />
      </span>
      {cap.dupes > 1 && <span className={styles.dupes}>×{cap.dupes}</span>}
    </Link>
  );
}

/** A dashed spot waiting for the next find. */
export function PlaceholderTile() {
  return (
    <div className={styles.placeholder} aria-hidden="true">
      <span className={styles.placeholderDisc} />
    </div>
  );
}

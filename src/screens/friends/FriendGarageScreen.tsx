import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { BackLink, Screen } from '../../components/Screen';
import { fetchFriendGarage, type FriendCap, type FriendGarage } from '../../friends/api';
import { PersonAvatar } from '../../friends/PersonAvatar';
import { useFriendPhoto } from '../../friends/useFriends';
import { useT } from '../../i18n/useT';
import { earnedBadges } from '../../lib/badges';
import { TIERS } from '../../lib/rarity';
import styles from './FriendGarageScreen.module.css';

/**
 * Screen 21: a friend's garage, read-only. Where a cap was found and when never arrive from the
 * server, so there is nothing here to hide — and the camera originals stay behind too; a tile is
 * the cap itself, which is what a friend came to see.
 */
export function FriendGarageScreen() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const [garage, setGarage] = useState<FriendGarage>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let live = true;
    void fetchFriendGarage(id).then((result) => {
      if (!live) return;
      if (result.ok) setGarage(result.data);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [id]);

  const caps = garage?.caps ?? [];
  const total = caps.reduce((n, cap) => n + cap.dupes, 0);
  const badges = earnedBadges(caps).length;

  return (
    <Screen variant="pushed">
      <BackLink to="/friends" labelKey="friends.title" />

      {garage && (
        <div className={styles.head}>
          <PersonAvatar avatar={garage.person.avatar} size={52} />
          <div className={styles.person}>
            <div className={styles.nickname}>{garage.person.nickname}</div>
            <div className={styles.sub}>
              {total} {t('garage.stats.caps', { n: total })} · {badges} {t('profile.stats.badges', { n: badges })}
            </div>
          </div>
        </div>
      )}

      {failed && <p className={styles.note}>{t('friends.error')}</p>}
      {!garage && !failed && <p className={styles.note}>{t('friends.loading')}</p>}

      {garage && caps.length === 0 && <p className={styles.note}>{t('friendgarage.empty')}</p>}

      {caps.length > 0 && (
        <div className={styles.grid}>
          {caps.map((cap) => (
            <FriendTile key={cap.id} cap={cap} />
          ))}
        </div>
      )}

      {garage && <p className={styles.note}>{t('friendgarage.note')}</p>}
    </Screen>
  );
}

/** One square. The picture is fetched with the token, so it arrives a moment after the tile does. */
function FriendTile({ cap }: { cap: FriendCap }) {
  const top = cap.photos.find((p) => p.role === 'top' && p.hasThumb) ?? cap.photos.find((p) => p.hasThumb);
  const url = useFriendPhoto(top?.id, 'thumb');
  const tier = TIERS.unrated;
  return (
    <div className={styles.tile}>
      {url ? (
        <img className={styles.image} src={url} alt={cap.product || cap.brand || ''} draggable={false} />
      ) : (
        <span className={styles.disc} />
      )}
      <span className={styles.tier} style={{ color: tier.color }}>
        <Icon name={tier.icon} size={12} />
      </span>
      {cap.dupes > 1 && <span className={styles.dupes}>×{cap.dupes}</span>}
    </div>
  );
}

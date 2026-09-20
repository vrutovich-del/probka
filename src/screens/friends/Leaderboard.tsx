import { useState } from 'react';
import { ChoiceChips } from '../../components/ChoiceChips';
import { Icon } from '../../components/Icon';
import { cx } from '../../components/cx';
import type { CapRecord } from '../../db/db';
import type { Friend } from '../../friends/api';
import { PersonAvatar } from '../../friends/PersonAvatar';
import { useT } from '../../i18n/useT';
import { earnedBadges } from '../../lib/badges';
import { TIERS } from '../../lib/rarity';
import styles from './Leaderboard.module.css';

type Metric = 'rarest' | 'count' | 'badges';

interface Row {
  key: string;
  nickname: string;
  avatar: string;
  caps: number;
  badges: number;
  me: boolean;
}

/**
 * Screen 23, among friends and nobody else. Two of its three metrics are real numbers; the third,
 * the rarest cap, is honestly the same for everyone — a tier needs twenty collectors to own a type,
 * and a circle of five will not produce one. The note under the list says exactly that rather than
 * inventing a ranking.
 */
export function Leaderboard({
  me,
  myCaps,
  friends,
}: {
  me: { nickname: string; avatar: string };
  myCaps: CapRecord[];
  friends: Friend[];
}) {
  const { t, lang } = useT();
  const [metric, setMetric] = useState<Metric>('count');

  const rows: Row[] = [
    {
      key: 'me',
      nickname: me.nickname,
      avatar: me.avatar,
      caps: myCaps.reduce((n, cap) => n + cap.dupes, 0),
      badges: earnedBadges(myCaps).length,
      me: true,
    },
    ...friends.map((friend) => ({
      key: friend.id,
      nickname: friend.nickname,
      avatar: friend.avatar,
      caps: friend.caps.reduce((n, cap) => n + cap.dupes, 0),
      badges: earnedBadges(friend.caps).length,
      me: false,
    })),
  ];

  const collator = new Intl.Collator(lang);
  const sorted = [...rows].sort((a, b) => {
    if (metric === 'count') return b.caps - a.caps || collator.compare(a.nickname, b.nickname);
    if (metric === 'badges') return b.badges - a.badges || collator.compare(a.nickname, b.nickname);
    // Nothing to rank by yet, so the order is the neutral one.
    return collator.compare(a.nickname, b.nickname);
  });

  const tier = TIERS.unrated;

  return (
    <div className={styles.board}>
      <ChoiceChips
        choices={[
          { value: 'rarest', label: t('leaderboard.metrics.rarest') },
          { value: 'count', label: t('leaderboard.metrics.count') },
          { value: 'badges', label: t('leaderboard.metrics.badges') },
        ]}
        value={metric}
        onChange={setMetric}
      />

      {sorted.map((row, index) => (
        <div key={row.key} className={cx(styles.row, row.me && styles.mine)}>
          <span className={styles.rank}>{metric === 'rarest' ? '·' : index + 1}</span>
          <PersonAvatar avatar={row.avatar} size={26} />
          <span className={styles.nickname}>{row.nickname}</span>
          <span className={styles.value}>
            {metric === 'count' && row.caps}
            {metric === 'badges' && row.badges}
            {metric === 'rarest' && (
              <span className={styles.tier} style={{ color: tier.color }}>
                <Icon name={tier.icon} size={11} /> {t('rarity.unrated')}
              </span>
            )}
          </span>
        </div>
      ))}

      {metric === 'rarest' && <p className={styles.note}>{t('detail.unrated')}</p>}
      <p className={styles.note}>{t('leaderboard.note')}</p>
    </div>
  );
}

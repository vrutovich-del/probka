import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAccount } from '../../account/account';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { ParentalGate } from '../../components/ParentalGate';
import { Screen, ScreenTitle } from '../../components/Screen';
import { Segmented } from '../../components/Segmented';
import { showToast } from '../../components/toast';
import { db } from '../../db/db';
import { useLiveQuery } from '../../db/useLiveQuery';
import { acceptRequest, declineRequest, type Friend, type FriendRequest } from '../../friends/api';
import { PersonAvatar } from '../../friends/PersonAvatar';
import { passFriendsGate, useFriends, useFriendsGate } from '../../friends/useFriends';
import { useT } from '../../i18n/useT';
import { earnedBadges } from '../../lib/badges';
import { TIERS } from '../../lib/rarity';
import { GuestWall } from '../GuestWall';
import { Leaderboard } from './Leaderboard';
import styles from './FriendsScreen.module.css';

type View = 'list' | 'board';

/**
 * Screen 19, with the leaderboard (23) as its second segment. A guest gets the wall; an account
 * gets its friends, but only after the parental gate — the brief puts a grown-up in front of the
 * friends side of the app, and this is the door.
 *
 * There is no Duel button on a friend's row, although the prototype has one: the duel is a later
 * round, and a button that does nothing is worse than no button.
 */
export function FriendsScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const account = useAccount();
  const gatePassed = useFriendsGate();
  const [view, setView] = useState<View>('list');
  const [busy, setBusy] = useState(false);
  const { page, loading, failed, reload } = useFriends(account !== null && gatePassed);
  const myCaps = useLiveQuery(() => db.caps.toArray(), []);

  if (!account) return <GuestWall />;

  const answer = async (request: FriendRequest, accept: boolean) => {
    if (busy) return;
    setBusy(true);
    const result = await (accept ? acceptRequest(request.id) : declineRequest(request.id));
    setBusy(false);
    if (!result.ok) {
      showToast(t(result.status === 0 ? 'account.offline' : 'friends.error'));
      return;
    }
    reload();
  };

  return (
    <Screen variant="root">
      <div className={styles.header}>
        <ScreenTitle>{t('friends.title')}</ScreenTitle>
        <Link to="/friends/add" className={styles.add}>
          {t('friends.add')}
        </Link>
      </div>

      <Segmented
        segments={[
          { value: 'list', label: t('friends.title') },
          { value: 'board', label: t('friends.seg.board') },
        ]}
        value={view}
        onChange={setView}
        size="sm"
      />

      {gatePassed && loading && !page && <p className={styles.note}>{t('friends.loading')}</p>}
      {gatePassed && failed && !page && (
        <button type="button" className={styles.retry} onClick={reload}>
          {t('friends.error')}
        </button>
      )}

      {page && view === 'list' && (
        <>
          {page.incoming.length > 0 && (
            <>
              <p className={styles.sectionLabel}>{t('friends.pending.title')}</p>
              {page.incoming.map((request) => (
                <div key={request.id} className={styles.request}>
                  <PersonAvatar avatar={request.person.avatar} />
                  <span className={styles.nickname}>{request.person.nickname}</span>
                  {/* The two answers sit on their own line: "Not now" in Russian and Ukrainian is
                      twice the English, and at 360 px a one-line row eats the nickname. */}
                  <div className={styles.answers}>
                    <Button size="sm" block disabled={busy} onClick={() => void answer(request, true)}>
                      {t('friends.pending.accept')}
                    </Button>
                    <Button size="sm" block variant="outline" disabled={busy} onClick={() => void answer(request, false)}>
                      {t('friends.pending.decline')}
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}

          {page.friends.map((friend) => (
            <FriendRow key={friend.id} friend={friend} />
          ))}

          {page.friends.length === 0 && <p className={styles.empty}>{t('friends.empty')}</p>}

          {page.outgoing.length > 0 && (
            <p className={styles.note}>
              {t('friends.waiting', { nick: page.outgoing.map((r) => r.person.nickname).join(', ') })}
            </p>
          )}

          <p className={styles.note}>{t('friends.note')}</p>
        </>
      )}

      {page && view === 'board' && (
        <Leaderboard me={{ nickname: account.nickname, avatar: account.avatar }} myCaps={myCaps ?? []} friends={page.friends} />
      )}

      {!gatePassed && (
        <ParentalGate bodyKey="gate.body.friends" onPass={passFriendsGate} onCancel={() => navigate('/garage')} />
      )}
    </Screen>
  );
}

/** One friend: avatar, nickname, and what their garage adds up to. */
function FriendRow({ friend }: { friend: Friend }) {
  const { t } = useT();
  const caps = friend.caps.reduce((n, cap) => n + cap.dupes, 0);
  const badges = earnedBadges(friend.caps).length;
  // Every cap is Unrated until the catalog exists, so the row says so with its shape and its word.
  const tier = TIERS.unrated;
  return (
    <Link to={`/friends/${friend.id}`} className={styles.row}>
      <PersonAvatar avatar={friend.avatar} />
      <span className={styles.person}>
        <span className={styles.nickname}>{friend.nickname}</span>
        <span className={styles.sub}>
          {caps} {t('garage.stats.caps', { n: caps })} · {badges} {t('profile.stats.badges', { n: badges })} ·{' '}
          <span className={styles.tier} style={{ color: tier.color }}>
            <Icon name={tier.icon} size={11} /> {t('rarity.unrated')}
          </span>
        </span>
      </span>
      <span className={styles.chevron}>›</span>
    </Link>
  );
}

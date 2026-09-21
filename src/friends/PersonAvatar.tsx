import { avatarArt } from '../account/avatars';
import { Icon } from '../components/Icon';
import { cx } from '../components/cx';
import styles from './PersonAvatar.module.css';

/**
 * The round avatar of screens 05, 19, 21 and 30: one of the eight faces, or the dashed circle for
 * a child who picked none. One component everywhere, so a friend's avatar is drawn exactly like
 * your own.
 */
export function PersonAvatar({ avatar, size = 40, className }: { avatar: string; size?: number; className?: string }) {
  const art = avatarArt(avatar);
  return (
    <span className={cx(styles.avatar, className)} style={{ width: size, height: size }} aria-hidden="true">
      {art ? (
        <img className={styles.art} src={art} alt="" draggable={false} />
      ) : (
        <Icon name="unrated" size={Math.round(size * 0.5)} />
      )}
    </span>
  );
}

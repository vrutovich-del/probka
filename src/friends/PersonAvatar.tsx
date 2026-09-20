import { avatarStyle } from '../account/avatars';
import { Icon } from '../components/Icon';
import styles from './PersonAvatar.module.css';

/** The round avatar of screens 19, 21 and 30: one of six shapes in its own colour. */
export function PersonAvatar({ avatar, size = 40 }: { avatar: string; size?: number }) {
  const { icon, color } = avatarStyle(avatar);
  return (
    <span className={styles.avatar} style={{ width: size, height: size, color }} aria-hidden="true">
      <Icon name={icon} size={Math.round(size * 0.38)} />
    </span>
  );
}

import { NavLink } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { useT } from '../i18n/useT';
import type { TKey } from '../i18n';
import { cx } from '../components/cx';
import styles from './TabBar.module.css';

interface Tab {
  to: string;
  icon: IconName;
  labelKey: TKey;
}

const LEFT: Tab[] = [
  { to: '/garage', icon: 'garage', labelKey: 'tabs.garage' },
  { to: '/friends', icon: 'friends', labelKey: 'tabs.friends' },
];
const RIGHT: Tab[] = [
  { to: '/duel', icon: 'duel', labelKey: 'tabs.duel' },
  { to: '/profile', icon: 'profile', labelKey: 'tabs.profile' },
];

function TabLink({ to, icon, labelKey }: Tab) {
  const { t } = useT();
  return (
    <NavLink to={to} className={({ isActive }) => cx(styles.tab, isActive && styles.active)}>
      <Icon name={icon} />
      <span className={styles.label}>{t(labelKey)}</span>
    </NavLink>
  );
}

export function TabBar() {
  const { t } = useT();
  return (
    <nav className={styles.bar}>
      {LEFT.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}
      <div className={styles.center}>
        {/* The add-a-cap flow arrives with item 2; until then the button is inert. */}
        <button type="button" className={styles.add} aria-label={t('tabs.add')} disabled>
          <Icon name="plus" size={30} />
        </button>
      </div>
      {RIGHT.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}
    </nav>
  );
}

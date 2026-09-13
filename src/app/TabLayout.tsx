import { Outlet } from 'react-router';
import { TabBar } from './TabBar';
import styles from './TabLayout.module.css';

export function TabLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

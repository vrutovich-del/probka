import { Outlet } from 'react-router';
import { SnackbarHost } from '../components/SnackbarHost';
import { TabBar } from './TabBar';
import styles from './TabLayout.module.css';

export function TabLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <TabBar />
      <SnackbarHost />
    </div>
  );
}

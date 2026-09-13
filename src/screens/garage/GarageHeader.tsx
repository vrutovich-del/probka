import { useNavigate } from 'react-router';
import { Segmented } from '../../components/Segmented';
import { ScreenTitle } from '../../components/Screen';
import { useT } from '../../i18n/useT';
import styles from './GarageHeader.module.css';

type View = 'caps' | 'collections';

/** "My Garage" with the Caps · Collections switch; the two views are routes so back returns to the same one. */
export function GarageHeader({ view }: { view: View }) {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <div className={styles.header}>
      <ScreenTitle>{t('garage.title')}</ScreenTitle>
      <Segmented<View>
        segments={[
          { value: 'caps', label: t('garage.seg.caps') },
          { value: 'collections', label: t('garage.seg.collections') },
        ]}
        value={view}
        onChange={(v) => navigate(v === 'caps' ? '/garage' : '/garage/collections', { replace: true })}
      />
    </div>
  );
}

import { Screen, ScreenTitle } from '../components/Screen';
import { useT } from '../i18n/useT';

/** Screen 08. The grid, sort, filters and empty state arrive with item 3. */
export function GarageScreen() {
  const { t } = useT();
  return (
    <Screen variant="root">
      <ScreenTitle>{t('garage.title')}</ScreenTitle>
    </Screen>
  );
}

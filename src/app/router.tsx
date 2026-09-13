import { createBrowserRouter, Navigate } from 'react-router';
import { RequireLanguage, FirstLaunchOnly } from './guards';
import { TabLayout } from './TabLayout';
import { GarageScreen } from '../screens/GarageScreen';
import { GuestWall } from '../screens/GuestWall';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LanguageScreen } from '../screens/LanguageScreen';

export const router = createBrowserRouter([
  {
    element: <FirstLaunchOnly />,
    children: [{ path: '/welcome/language', element: <LanguageScreen /> }],
  },
  {
    element: <RequireLanguage />,
    children: [
      {
        element: <TabLayout />,
        children: [
          { path: '/garage', element: <GarageScreen /> },
          { path: '/friends', element: <GuestWall /> },
          { path: '/duel', element: <GuestWall /> },
          { path: '/profile', element: <ProfileScreen /> },
          { path: '/profile/language', element: <LanguageScreen back={{ to: '/profile', labelKey: 'profile.title' }} /> },
          { path: '/profile/settings', element: <SettingsScreen /> },
          {
            path: '/profile/settings/language',
            element: <LanguageScreen back={{ to: '/profile/settings', labelKey: 'settings.title' }} />,
          },
        ],
      },
      { path: '*', element: <Navigate to="/garage" replace /> },
    ],
  },
]);

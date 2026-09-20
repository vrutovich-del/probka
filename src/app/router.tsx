import { createBrowserRouter, Navigate } from 'react-router';
import { RequireLanguage, FirstLaunchOnly } from './guards';
import { TabLayout } from './TabLayout';
import { GarageScreen } from '../screens/garage/GarageScreen';
import { CollectionsScreen } from '../screens/garage/CollectionsScreen';
import { BrandScreen } from '../screens/garage/BrandScreen';
import { CapDetailScreen } from '../screens/garage/CapDetailScreen';
import { GuestWall } from '../screens/GuestWall';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BadgesScreen } from '../screens/BadgesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { AddFlow } from '../add/AddFlow';
import { CaptureScreen } from '../add/CaptureScreen';
import { ProcessingScreen } from '../add/ProcessingScreen';
import { CutoutReviewScreen } from '../add/CutoutReviewScreen';
import { IdentifyScreen } from '../add/IdentifyScreen';
import { ManualEntryScreen } from '../add/ManualEntryScreen';
import { ConditionScreen } from '../add/ConditionScreen';
import { RevealScreen } from '../add/RevealScreen';

/** "/probka/" when published under a repository path, "/" in dev — react-router wants it without the slash. */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

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
          { path: '/garage/collections', element: <CollectionsScreen /> },
          { path: '/garage/collections/:brand', element: <BrandScreen /> },
          { path: '/garage/cap/:id', element: <CapDetailScreen /> },
          { path: '/friends', element: <GuestWall /> },
          { path: '/duel', element: <GuestWall /> },
          { path: '/profile', element: <ProfileScreen /> },
          { path: '/profile/badges', element: <BadgesScreen /> },
          { path: '/profile/language', element: <LanguageScreen back={{ to: '/profile', labelKey: 'profile.title' }} /> },
          { path: '/profile/settings', element: <SettingsScreen /> },
          {
            path: '/profile/settings/language',
            element: <LanguageScreen back={{ to: '/profile/settings', labelKey: 'settings.title' }} />,
          },
        ],
      },
      {
        // Add a cap (screens 12–18): a full-screen stack over the tabs.
        path: '/add',
        element: <AddFlow />,
        children: [
          { index: true, element: <Navigate to="/add/top" replace /> },
          { path: 'top', element: <CaptureScreen step="top" /> },
          { path: 'side', element: <CaptureScreen step="side" /> },
          { path: 'processing', element: <ProcessingScreen /> },
          { path: 'review', element: <CutoutReviewScreen /> },
          { path: 'identify', element: <IdentifyScreen /> },
          { path: 'manual', element: <ManualEntryScreen /> },
          { path: 'condition', element: <ConditionScreen /> },
          { path: 'reveal', element: <RevealScreen /> },
        ],
      },
      { path: '*', element: <Navigate to="/garage" replace /> },
    ],
  },
], { basename });

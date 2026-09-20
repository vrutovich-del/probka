import { Navigate, Outlet } from 'react-router';
import { accountsAvailable, useAccount } from '../account/account';
import { useLanguage } from '../i18n/languageStore';

/** Nothing renders until a language has been picked on first launch (screen 02). */
export function RequireLanguage() {
  const { chosen } = useLanguage();
  return chosen ? <Outlet /> : <Navigate to="/welcome/language" replace />;
}

/** The first-launch picker is not reachable again once a language is saved; Settings has its own. */
export function FirstLaunchOnly() {
  const { chosen } = useLanguage();
  return chosen ? <Navigate to="/garage" replace /> : <Outlet />;
}

/**
 * Screens 05–06 are for a phone that is still a guest, in a build that has a server to create the
 * account on. Anything else lands back where it came from rather than on a form that cannot work.
 */
export function RequireNoAccount() {
  const account = useAccount();
  if (!accountsAvailable()) return <Navigate to="/garage" replace />;
  return account ? <Navigate to="/profile" replace /> : <Outlet />;
}

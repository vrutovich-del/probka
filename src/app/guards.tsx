import { Navigate, Outlet } from 'react-router';
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

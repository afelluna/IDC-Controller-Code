import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthed } from './useAuth';

/**
 * Route guard for the tech-support areas (/dashboard, /settings). Redirects
 * to that area's own login page when no admin session is present — both
 * areas share the single device admin credential (see useAuth.ts), so
 * `loginPath` only decides where the redirect lands, not a distinct
 * permission check.
 */
export function RequireAuth({ children, loginPath }: { children: ReactNode; loginPath: string }) {
  if (!isAuthed()) {
    return <Navigate to={loginPath} replace />;
  }
  return <>{children}</>;
}

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthed } from './useAuth';

/**
 * Route guard for the tech-support area. Redirects to the login page when no
 * admin session is present. See useAuth.ts for the security caveats.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  if (!isAuthed()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

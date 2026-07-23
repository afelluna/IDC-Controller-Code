import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MonitorPage from './pages/MonitorPage';
import { RequireAuth } from './auth/RequireAuth';

// Tech-support/client areas are never reached on the kiosk monitor, so
// split them out of the main bundle and load on demand.
const TechLogin = lazy(() => import('./pages/TechLogin'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  return (
    // basename must match vite's `base` ('/new-monitor/') so routes resolve
    // when the app is deployed under that sub-path. import.meta.env.BASE_URL
    // is exactly that value, so this stays correct if the base ever changes.
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Suspense fallback={null}>
        <Routes>
          {/* Public kiosk monitor — intentionally has no link to /dashboard or /settings */}
          <Route path="/" element={<MonitorPage />} />

          {/* Client-facing dashboard: read-only thresholds + event log, no
              login — only /settings (IT support) is gated. */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* IT-support settings: editable thresholds, password change, event log */}
          <Route
            path="/settings/login"
            element={
              <TechLogin
                redirectTo="/settings"
                title="Tech support access"
                subtitle="Sign in with the device administrator credentials to configure thresholds and review the event log."
              />
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth loginPath="/settings/login">
                <SettingsPage />
              </RequireAuth>
            }
          />

          {/* Unknown routes fall back to the monitor */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

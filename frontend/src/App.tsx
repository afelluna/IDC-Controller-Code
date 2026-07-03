import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MonitorPage from './pages/MonitorPage';
import { RequireAuth } from './auth/RequireAuth';

// Admin area is maintenance-only and never reached on the kiosk monitor, so
// split it out of the main bundle and load it on demand.
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

export default function App() {
  return (
    // basename must match vite's `base` ('/new-monitor/') so routes resolve
    // when the app is deployed under that sub-path. import.meta.env.BASE_URL
    // is exactly that value, so this stays correct if the base ever changes.
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Suspense fallback={null}>
        <Routes>
          {/* Public kiosk monitor — intentionally has no link to /admin */}
          <Route path="/" element={<MonitorPage />} />

          {/* Tech-support area (deployment/maintenance only) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminPage />
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

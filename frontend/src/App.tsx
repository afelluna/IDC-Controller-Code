import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MonitorPage from './pages/MonitorPage';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import { RequireAuth } from './auth/RequireAuth';

export default function App() {
  return (
    // basename must match vite's `base` ('/new-monitor/') so routes resolve
    // when the app is deployed under that sub-path. import.meta.env.BASE_URL
    // is exactly that value, so this stays correct if the base ever changes.
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
    </BrowserRouter>
  );
}

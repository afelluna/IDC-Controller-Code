import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Monitor, LogOut } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import usherMarker from '../assets/usher-marker.svg';
import { ThresholdSettings } from '../components/admin/ThresholdSettings';
import { PeisThresholdSettings } from '../components/admin/PeisThresholdSettings';
import { ChangePassword } from '../components/admin/ChangePassword';
import { EventList } from '../components/admin/EventList';

/**
 * Tech-support dashboard — threshold configuration, admin password change, and
 * the event log. Guarded by RequireAuth; reached only by direct navigation.
 */
export default function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const theme = (localStorage.getItem('usher-theme') as 'light' | 'dark') || 'light';
    document.documentElement.dataset.theme = theme;
  }, []);

  const onLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="h-screen overflow-y-auto font-sans" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg px-2 h-9 shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #3a5a70 100%)' }}
          >
            <img src={usherMarker} alt="USHER" className="h-5 w-auto brightness-0 invert" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Tech support dashboard
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Device configuration &amp; event log
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <Monitor size={14} /> Monitor
          </Link>
          <button
            onClick={onLogout}
            className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ThresholdSettings />
          <ChangePassword />
        </div>
        <PeisThresholdSettings />
        <EventList />
      </main>
    </div>
  );
}

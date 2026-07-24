import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import usherMarker from '../assets/usher-marker.svg';
import { Icon } from '../components/ui/Icon';
import { ThresholdView } from '../components/admin/ThresholdView';
import { EventList } from '../components/admin/EventList';

/**
 * Client-facing dashboard — read-only threshold display and the event log.
 * No editing controls (no threshold form, no password change) and no
 * login — that gate only applies to the IT-support surface at /settings
 * (SettingsPage). Reached only by direct navigation; the kiosk monitor
 * never links here.
 */
export default function DashboardPage() {
  useEffect(() => {
    const theme = (localStorage.getItem('usher-theme') as 'light' | 'dark') || 'light';
    document.documentElement.dataset.theme = theme;
  }, []);

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
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-gradient-end) 100%)' }}
          >
            <img src={usherMarker} alt="USHER" className="h-5 w-auto brightness-0 invert" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Dashboard
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Device status &amp; event log
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <Icon name="monitor" size={14} /> Monitor
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
        <ThresholdView />
        <EventList />
      </main>
    </div>
  );
}

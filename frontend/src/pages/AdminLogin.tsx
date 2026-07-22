import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../auth/useAuth';
import usherMarker from '../assets/usher-marker.svg';

/**
 * Tech-support login. Posts to /loginUser; on success lands on /admin.
 * Reached only by navigating directly to /admin or /admin/login — the kiosk
 * monitor never links here.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The admin pages don't carry the kiosk theme toggle; honour the saved theme.
  useEffect(() => {
    const theme = (localStorage.getItem('usher-theme') as 'light' | 'dark') || 'light';
    document.documentElement.dataset.theme = theme;
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || !username || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await login(username, password);
      if (res.ok) {
        navigate('/admin', { replace: true });
      } else {
        setError(res.message || 'Invalid username or password');
      }
    } catch {
      setError('Could not reach the device. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <Card className="w-full max-w-sm" style={{ borderTop: '3px solid var(--brand)' }}>
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div
              className="flex items-center justify-center rounded-xl px-3 h-12"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-gradient-end) 100%)' }}
            >
              <img src={usherMarker} alt="USHER" className="h-6 w-auto brightness-0 invert" />
            </div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Tech support access
            </h1>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Sign in with the device administrator credentials to configure
              thresholds and review the event log.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Username
              </span>
              <div className="relative">
                <Icon name="user" size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                />
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Password
              </span>
              <div className="relative">
                <Icon name="lock" size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                />
              </div>
            </label>

            {error && (
              <p
                className="text-xs font-medium rounded-lg px-3 py-2"
                style={{ backgroundColor: 'rgba(193,96,92,0.12)', color: 'var(--status-error)' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand)', color: 'var(--text-on-accent)' }}
            >
              {loading && <Icon name="loader" size={15} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}

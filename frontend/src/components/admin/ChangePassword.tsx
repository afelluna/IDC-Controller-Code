import { useState, type FormEvent } from 'react';
import { KeyRound, Loader2, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { seismicApi } from '../../api/seismicApi';

/**
 * Change the device admin password (config_tbl.admin_def_pass via /changePass).
 * The backend only takes the new password; it does not verify the old one.
 */
export function ChangePassword() {
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const mismatch = confirm.length > 0 && newPass !== confirm;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (newPass !== confirm) {
      setMessage({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await seismicApi.changePassword(newPass);
      if (res.success) {
        setMessage({ type: 'ok', text: 'Password updated. Use it on your next sign-in.' });
        setNewPass('');
        setConfirm('');
      } else {
        setMessage({ type: 'err', text: res.message || 'Could not change password.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Could not reach the device.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <KeyRound size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Change admin password
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            New password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: `1px solid ${mismatch ? 'var(--status-error)' : 'var(--border-default)'}`,
            }}
          />
        </label>

        {message && (
          <p
            className="text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5"
            style={
              message.type === 'ok'
                ? { backgroundColor: 'rgba(94,140,106,0.12)', color: 'var(--status-live)' }
                : { backgroundColor: 'rgba(193,96,92,0.12)', color: 'var(--status-error)' }
            }
          >
            {message.type === 'ok' && <Check size={13} />}
            {message.text}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !newPass || !confirm || mismatch}
            className="rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)', color: '#ffffff' }}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </Card>
  );
}

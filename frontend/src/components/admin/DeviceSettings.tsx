import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { getDeviceInfo, saveDeviceInfo } from '../../lib/deviceInfo';

interface FormState {
  device_name: string;
  location: string;
  latitude: string;
  longitude: string;
}

const EMPTY: FormState = { device_name: '', location: '', latitude: '', longitude: '' };

/**
 * Device identity/location — name, location label, and lat/long. Feeds the
 * planned report-generation feature (an event log entry needs to say where
 * it happened), so this is IT-support-only, not shown on the client
 * dashboard.
 *
 * Stored in localStorage rather than the backend/DB: the gateway device's
 * deployed backend build predates the /updateDeviceInfo route and the DB
 * migration for these columns, so hitting it just fails ("could not reach
 * device"). Switch this to seismicApi.updateDeviceInfo once that backend is
 * redeployed.
 */
export function DeviceSettings() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const saved = getDeviceInfo();
    if (saved) {
      setForm({
        device_name: saved.device_name,
        location: saved.location,
        latitude: String(saved.latitude),
        longitude: String(saved.longitude),
      });
    }
  }, []);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      saveDeviceInfo({
        device_name: form.device_name,
        location: form.location,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setMessage({ type: 'ok', text: 'Device info saved on this browser.' });
    } catch {
      setMessage({ type: 'err', text: 'Could not save device info.' });
    } finally {
      setSaving(false);
    }
  };

  const incomplete = !form.device_name || !form.location || form.latitude === '' || form.longitude === '';

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Icon name="map-pin" size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Device identity &amp; location
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Device name
            </span>
            <input
              type="text"
              required
              value={form.device_name}
              onChange={(e) => onChange('device_name', e.target.value)}
              placeholder="e.g. USHER Tower A"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Location
            </span>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => onChange('location', e.target.value)}
              placeholder="e.g. Quezon City, Metro Manila"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Latitude
            </span>
            <input
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              required
              value={form.latitude}
              onChange={(e) => onChange('latitude', e.target.value)}
              placeholder="14.676041"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Longitude
            </span>
            <input
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              required
              value={form.longitude}
              onChange={(e) => onChange('longitude', e.target.value)}
              placeholder="121.043700"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>
        </div>

        {message && (
          <p
            className="text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5"
            style={
              message.type === 'ok'
                ? { backgroundColor: 'rgba(94,140,106,0.12)', color: 'var(--status-live)' }
                : { backgroundColor: 'rgba(193,96,92,0.12)', color: 'var(--status-error)' }
            }
          >
            {message.type === 'ok' && <Icon name="check" size={13} />}
            {message.text}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || incomplete}
            className="rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--text-on-accent)' }}
          >
            {saving && <Icon name="loader" size={15} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save device info'}
          </button>
        </div>
      </form>
    </Card>
  );
}

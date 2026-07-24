import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { getDeviceInfo, saveDeviceInfo } from '../../lib/deviceInfo';
import { seismicApi } from '../../api/seismicApi';

/**
 * Device/hardware identity — a friendly label for this monitoring unit, plus
 * read-only node/network info reported by the gateway itself. Purely
 * technical; the building being monitored lives in StructureSettings, which
 * is what report generation reads from.
 */
export function DeviceSettings() {
  const [deviceName, setDeviceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [nodeName, setNodeName] = useState<string | null>(null);
  const [serverIp, setServerIp] = useState<string | null>(null);

  useEffect(() => {
    const saved = getDeviceInfo();
    if (saved) setDeviceName(saved.device_name);

    seismicApi
      .getSensorConfig()
      .then((res) => {
        const data = res.data as any;
        setNodeName(data?.node_name ?? null);
        setServerIp(data?.server_ip ?? null);
      })
      .catch(() => {
        setNodeName(null);
        setServerIp(null);
      });
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      saveDeviceInfo({ device_name: deviceName });
      setMessage({ type: 'ok', text: 'Device name saved on this browser.' });
    } catch {
      setMessage({ type: 'err', text: 'Could not save device name.' });
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
        <Icon name="server" size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Device
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Device name
          </span>
          <input
            type="text"
            required
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. USHER Gateway 01"
            className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          />
        </label>

        <div className="grid grid-cols-2 gap-2 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ color: 'var(--text-muted)' }}>Node name</div>
          <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{nodeName ?? '—'}</div>
          <div style={{ color: 'var(--text-muted)' }}>Server IP</div>
          <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{serverIp ?? '—'}</div>
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
            disabled={saving || !deviceName}
            className="rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--text-on-accent)' }}
          >
            {saving && <Icon name="loader" size={15} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save device name'}
          </button>
        </div>
      </form>
    </Card>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { SlidersHorizontal, Loader2, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { seismicApi } from '../../api/seismicApi';

type Fields = 'warning' | 'warrant' | 'xthold' | 'ythold' | 'zthold';

const FIELD_META: { key: Fields; label: string; hint: string; step: string }[] = [
  { key: 'warning', label: 'Warning level', hint: 'PEIS level that raises a warning', step: '1' },
  { key: 'warrant', label: 'Alert level', hint: 'PEIS level that raises an alert', step: '1' },
  { key: 'xthold', label: 'X threshold', hint: 'X-axis acceleration threshold (g)', step: '0.0001' },
  { key: 'ythold', label: 'Y threshold', hint: 'Y-axis acceleration threshold (g)', step: '0.0001' },
  { key: 'zthold', label: 'Z threshold', hint: 'Z-axis acceleration threshold (g)', step: '0.0001' },
];

type FormState = Record<Fields, string>;

const EMPTY: FormState = { warning: '', warrant: '', xthold: '', ythold: '', zthold: '' };

export function ThresholdSettings() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await seismicApi.getSensorConfig();
      if (res.success && res.data) {
        const d = res.data as any;
        setForm({
          warning: String(d.warning ?? ''),
          warrant: String(d.warrant ?? ''),
          xthold: String(d.xthold ?? ''),
          ythold: String(d.ythold ?? ''),
          zthold: String(d.zthold ?? ''),
        });
      } else {
        setMessage({ type: 'err', text: res.message || 'Could not load current settings.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Could not reach the device.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const onChange = (key: Fields, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await seismicApi.updateThresholds({
        warning: Number(form.warning),
        warrant: Number(form.warrant),
        xthold: Number(form.xthold),
        ythold: Number(form.ythold),
        zthold: Number(form.zthold),
      });
      if (res.success) {
        setMessage({ type: 'ok', text: 'Thresholds updated.' });
        // Re-fetch so the form reflects what the device actually stored.
        await loadConfig();
      } else {
        setMessage({ type: 'err', text: res.message || 'Update failed.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Could not reach the device.' });
    } finally {
      setSaving(false);
    }
  };

  const incomplete = Object.values(form).some((v) => v === '');

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <SlidersHorizontal size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Intensity thresholds
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading current settings…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_META.map(({ key, label, hint, step }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
                <input
                  type="number"
                  step={step}
                  required
                  value={form[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>
              </label>
            ))}
          </div>
        )}

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
            disabled={saving || loading || incomplete}
            className="rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)', color: '#ffffff' }}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save thresholds'}
          </button>
        </div>
      </form>
    </Card>
  );
}

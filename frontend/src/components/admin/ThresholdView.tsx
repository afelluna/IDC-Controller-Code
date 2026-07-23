import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { seismicApi } from '../../api/seismicApi';

const FIELD_META = [
  { key: 'warning', label: 'Warrant 1', hint: 'PEIS level that raises Warrant 1' },
  { key: 'warrant', label: 'Warrant 2', hint: 'PEIS level that raises Warrant 2' },
  { key: 'xthold', label: 'X threshold', hint: 'X-axis acceleration threshold (g)' },
  { key: 'ythold', label: 'Y threshold', hint: 'Y-axis acceleration threshold (g)' },
  { key: 'zthold', label: 'Z threshold', hint: 'Z-axis acceleration threshold (g)' },
] as const;

type Values = Partial<Record<(typeof FIELD_META)[number]['key'], string>>;

/**
 * Read-only counterpart to ThresholdSettings — same data, no edit form.
 * Client-facing dashboard shows what the device is configured to, without
 * exposing the ability to change it (that stays IT-support-only, /settings).
 */
export function ThresholdView() {
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await seismicApi.getSensorConfig();
        if (res.success && res.data) {
          const d = res.data as any;
          setValues({
            warning: String(d.warning ?? '—'),
            warrant: String(d.warrant ?? '—'),
            xthold: String(d.xthold ?? '—'),
            ythold: String(d.ythold ?? '—'),
            zthold: String(d.zthold ?? '—'),
          });
        } else {
          setError(res.message || 'Could not load current settings.');
        }
      } catch {
        setError('Could not reach the device.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Icon name="sliders-horizontal" size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Intensity thresholds
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider ml-auto" style={{ color: 'var(--text-muted)' }}>
          Read-only
        </span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center" style={{ color: 'var(--text-muted)' }}>
            <Icon name="loader" size={16} className="animate-spin" /> Loading current settings…
          </div>
        ) : error ? (
          <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_META.map(({ key, label, hint }) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
                <span
                  className="rounded-lg px-3 py-2 text-sm font-mono"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {values[key]}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

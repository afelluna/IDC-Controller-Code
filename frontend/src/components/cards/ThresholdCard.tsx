import { useEffect, useState, type ReactNode } from 'react';
import { seismicApi } from '../../api/seismicApi';

interface ThresholdConfig {
  warning: number;
  warrant: number;
}

const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

interface RowProps {
  color: string;
  bg: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

function Row({ color, bg, icon, label, value }: RowProps) {
  return (
    <div
      className="summary-card flex items-center gap-3 px-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: 34, height: 34, backgroundColor: bg, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest leading-none mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </p>
        {value}
      </div>
    </div>
  );
}

export function ThresholdCard() {
  const [config, setConfig] = useState<ThresholdConfig | null>(null);

  useEffect(() => {
    seismicApi.getSensorConfig()
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as any;
          setConfig({
            warning: Number(d.warning ?? 0),
            warrant: Number(d.warrant ?? 0),
          });
        }
      })
      .catch(() => {/* monitor keeps running without threshold info */});
  }, []);

  return (
    <div className="h-full flex flex-col gap-1.5">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest px-1 shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Alert Thresholds
      </p>

      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        {/* WARRANT 1 */}
        <Row
          color="var(--status-warn)"
          bg="rgba(201,154,84,0.14)"
          icon={<IconAlert />}
          label="Warrant 1"
          value={
            <p className="font-mono text-[15px] font-bold leading-none" style={{ color: 'var(--status-warn)' }}>
              PEIS {config ? config.warning : '—'}
            </p>
          }
        />

        {/* WARRANT 2 */}
        <Row
          color="var(--status-error)"
          bg="rgba(193,96,92,0.14)"
          icon={<IconShield />}
          label="Warrant 2"
          value={
            <p className="font-mono text-[15px] font-bold leading-none" style={{ color: 'var(--status-error)' }}>
              PEIS {config ? config.warrant : '—'}
            </p>
          }
        />
      </div>
    </div>
  );
}

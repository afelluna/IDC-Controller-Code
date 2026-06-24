import { useEffect, useState } from 'react';
import { seismicApi } from '../../api/seismicApi';

interface ThresholdConfig {
  warning: number;
  warrant: number;
  xthold: number;
  ythold: number;
  zthold: number;
}

const IconAlert = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconShield = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCrosshair = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
  </svg>
);

// Max 3 decimals, strip trailing zeros
function fmtG(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}

interface RowProps {
  color: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function Row({ color, bg, icon, label, value }: RowProps) {
  return (
    <div
      className="summary-card flex items-center gap-1.5 px-2 py-1.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="flex items-center justify-center rounded shrink-0"
        style={{ width: 20, height: 20, backgroundColor: bg, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[9px] font-semibold uppercase tracking-widest leading-none mb-0.5"
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
            xthold:  Number(d.xthold  ?? 0),
            ythold:  Number(d.ythold  ?? 0),
            zthold:  Number(d.zthold  ?? 0),
          });
        }
      })
      .catch(() => {/* monitor keeps running without threshold info */});
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <p
        className="text-[9px] font-semibold uppercase tracking-widest px-1"
        style={{ color: 'var(--text-muted)' }}
      >
        Alert Thresholds
      </p>

      {/* WARNING */}
      <Row
        color="var(--status-warn)"
        bg="rgba(245,158,11,0.12)"
        icon={<IconAlert />}
        label="Warning"
        value={
          <p className="font-mono text-[11px] font-bold leading-none" style={{ color: 'var(--status-warn)' }}>
            PEIS {config ? config.warning : '—'}
          </p>
        }
      />

      {/* WARRANT */}
      <Row
        color="var(--status-error)"
        bg="rgba(239,68,68,0.12)"
        icon={<IconShield />}
        label="Warrant"
        value={
          <p className="font-mono text-[11px] font-bold leading-none" style={{ color: 'var(--status-error)' }}>
            PEIS {config ? config.warrant : '—'}
          </p>
        }
      />

      {/* THRESHOLD axes — stacked 3-col grid to fit ~126px column */}
      <Row
        color="var(--color-teal)"
        bg="rgba(109,196,186,0.12)"
        icon={<IconCrosshair />}
        label="Threshold (g)"
        value={
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis} className="flex flex-col items-start">
                <span
                  className="text-[8px] font-bold uppercase leading-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {axis}
                </span>
                <span
                  className="font-mono text-[9px] font-bold leading-tight"
                  style={{ color: 'var(--color-teal)' }}
                >
                  {config ? fmtG(config[`${axis}thold` as keyof ThresholdConfig]) : '—'}
                </span>
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}

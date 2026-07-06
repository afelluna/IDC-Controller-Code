import type { ReactNode } from 'react';

export interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  approximate?: boolean;
  accentColor: string;
}

export function MetricTile({ icon, label, value, approximate, accentColor }: MetricTileProps) {
  return (
    <div
      className="summary-card flex items-center gap-3 px-3"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{
          width: 30,
          height: 30,
          backgroundColor: `${accentColor}18`,
          color: accentColor,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-wide leading-tight mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </p>
        <p
          className="font-mono text-base font-bold leading-none truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {approximate && value !== '—' && (
            <span className="text-[11px] mr-0.5 opacity-50">~</span>
          )}
          {value}
        </p>
      </div>
    </div>
  );
}

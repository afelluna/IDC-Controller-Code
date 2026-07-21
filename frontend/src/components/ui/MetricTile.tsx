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
    <div className="summary-card flex flex-col justify-center px-3 py-2 min-h-0">
      <div className="min-w-0">
        <p
          className="flex items-start gap-2 text-[11px] font-bold uppercase leading-tight mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            className="flex items-center justify-center rounded-md shrink-0"
            style={{
              width: 22,
              height: 22,
              backgroundColor: `${accentColor}18`,
              color: accentColor,
            }}
          >
            {icon}
          </span>
          <span className="min-w-0 leading-tight">{label}</span>
        </p>
        <p
          className="font-mono text-lg font-bold leading-none truncate"
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

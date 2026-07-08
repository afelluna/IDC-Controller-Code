import { Wifi, Box, Server, Clock, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

type DotState = 'live' | 'scanning' | 'idle' | 'error';

interface StatusRow {
  label: string;
  value: string;
  dot: DotState;
}

interface StatusCardProps {
  status: StatusRow[];
}

const DOT_STYLE: Record<DotState, string> = {
  live:     'live',
  scanning: 'scanning',
  idle:     'idle',
  error:    'error',
};

// Purely presentational — maps the row's existing label text to a leading
// icon. Falls back to a neutral dot-less icon if a label doesn't match, so
// this stays safe if statusData in MonitorPage ever adds a new row.
const ROW_ICON: Record<string, LucideIcon> = {
  'Connection':  Wifi,
  'Node':        Box,
  'Server':      Server,
  'Last update': Clock,
};

export function StatusCard({ status }: StatusCardProps) {
  return (
    <Card className="p-3 h-full">
      {/* Header — title only. Live/offline state lives in the Connection row;
          repeating it up here was redundant. */}
      <div className="flex items-center shrink-0 mb-1">
        <h3
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Status
        </h3>
      </div>

      {/* Rows — icon + label left, value + dot right. justify-evenly spreads
          the extra room this card now has (Threshold/Summary shrank to grids)
          between rows instead of leaving it as dead margin top and bottom. */}
      <div className="flex-1 flex flex-col justify-evenly">
        {status.map((row, i) => {
          const Icon = ROW_ICON[row.label];
          return (
            <div
              key={i}
              className="flex justify-between items-center"
            >
              <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                {Icon && <Icon size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />}
                <span className="text-[11px] uppercase tracking-wide">{row.label}</span>
              </span>
              {/* Value first, dot last — dots form one aligned column at the
                  card's right edge regardless of each value's text width. */}
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[11px] font-semibold font-mono uppercase"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {row.value}
                </span>
                <span className={`status-dot ${DOT_STYLE[row.dot]}`} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

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
  isLive: boolean;
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

export function StatusCard({ status, isLive }: StatusCardProps) {
  return (
    <Card className="p-3 h-full">
      {/* Header — label left, live/offline badge right */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <h3
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Status
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${isLive ? 'live' : 'idle'}`} />
          <span
            className="text-[11px] font-bold"
            style={{ color: isLive ? 'var(--status-live)' : 'var(--status-idle)' }}
          >
            {isLive ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Rows — icon + label left, dot + value right. justify-evenly spreads
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
                <span className="text-[11px]">{row.label}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`status-dot ${DOT_STYLE[row.dot]}`} />
                <span
                  className="text-[11px] font-semibold font-mono"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {row.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

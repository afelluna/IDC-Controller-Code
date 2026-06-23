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

export function StatusCard({ status, isLive }: StatusCardProps) {
  return (
    <Card className="p-2 shrink-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Status
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${isLive ? 'live' : 'idle'}`} />
          <span
            className="text-[11px] font-semibold"
            style={{ color: isLive ? 'var(--status-live)' : 'var(--status-idle)' }}
          >
            {isLive ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Rows — label left, dot + value right */}
      <div className="flex flex-col">
        {status.map((row, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-1"
            style={{
              borderBottom: i < status.length - 1
                ? '1px solid var(--border-subtle)'
                : 'none',
            }}
          >
            <span
              className="text-[11px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {row.label}
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
        ))}
      </div>
    </Card>
  );
}

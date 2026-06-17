import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import type { StatusItem } from '../../types';

interface StatusCardProps {
  status: StatusItem[];
  isLive: boolean;
}

// Calm three-state palette — no red for non-critical states
const badgeStyles = {
  connected: {
    bg:    'bg-green-100',
    text:  'text-green-700',
    dot:   'bg-green-500 animate-pulse',
    label: 'Live',
  },
  warning: {      // Scanning / initializing — indigo, not orange/red
    bg:    'bg-indigo-100',
    text:  'text-indigo-600',
    dot:   'bg-indigo-400',
    label: 'Scanning',
  },
  error: {        // Offline / degraded — amber, not red (offline is not an emergency)
    bg:    'bg-amber-100',
    text:  'text-amber-700',
    dot:   'bg-amber-400',
    label: 'Offline',
  },
  neutral: {
    bg:    'bg-slate-100',
    text:  'text-slate-500',
    dot:   'bg-slate-400',
    label: '—',
  },
} as const;

export function StatusCard({ status, isLive }: StatusCardProps) {
  // Top border and header badge color follow live state
  const topBorderColor = isLive ? '#16a34a' : '#d97706';
  const headerBadge = isLive ? badgeStyles.connected : badgeStyles.error;

  return (
    <Card
      className="p-3 shrink-0"
      style={{ borderTop: `3px solid ${topBorderColor}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Status
        </h3>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5',
            headerBadge.bg,
            headerBadge.text
          )}
        >
          <span className={cn('w-2 h-2 rounded-full', headerBadge.dot)} />
          {isLive ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Status item rows */}
      <div className="flex flex-col gap-0.5">
        {status.map((item, i) => {
          const style = badgeStyles[item.status ?? 'neutral'];
          return (
            <div
              key={i}
              className="flex justify-between items-center py-1 last:border-0"
              style={{ borderBottom: i < status.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-bold',
                  style.bg,
                  style.text
                )}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

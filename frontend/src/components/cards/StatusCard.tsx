import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import type { StatusItem } from '../../types';

interface StatusCardProps {
  status: StatusItem[];
  isLive: boolean;
}

export function StatusCard({ status, isLive }: StatusCardProps) {
  return (
    <Card className="p-3 shrink-0" style={{ borderTop: '3px solid #37961e' }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Status</h3>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5',
            isLive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}
        >
          <span className={cn('w-2 h-2 rounded-full', isLive ? 'bg-green-500 animate-pulse' : 'bg-red-400')} />
          {isLive ? 'Live' : 'Offline'}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {status.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
            <span className="text-xs font-medium text-slate-400">{item.label}</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold',
                item.status === 'connected' && 'bg-green-100 text-green-700',
                item.status === 'warning'   && 'bg-orange-100 text-orange-700',
                item.status === 'error'     && 'bg-red-100 text-red-600',
                item.status === 'neutral'   && 'bg-slate-100 text-slate-600'
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

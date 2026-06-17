import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

interface StorageCardProps {
  usedGb: number;
  totalGb: number;
}

export function StorageCard({ usedGb, totalGb }: StorageCardProps) {
  const fillRatio = totalGb > 0 ? usedGb / totalGb : 0;
  const pct = Math.round(fillRatio * 100);

  function segmentColor(index: number): string {
    const filled = index <= fillRatio * 10;
    if (!filled) return 'bg-slate-200';
    if (fillRatio >= 0.8) return 'bg-red-500';
    if (fillRatio >= 0.6) return 'bg-orange-400';
    return 'bg-blue-500';
  }

  return (
    <Card className="p-3 shrink-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Storage</h3>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          fillRatio >= 0.8 ? 'bg-red-100 text-red-600' :
          fillRatio >= 0.6 ? 'bg-orange-100 text-orange-600' :
          'bg-blue-100 text-blue-600'
        )}>
          {pct}%
        </span>
      </div>
      <div className="flex gap-1 h-3 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className={cn('flex-1 rounded-sm transition-all', segmentColor(i))} />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-400">
        {usedGb.toFixed(1)} / {totalGb.toFixed(1)} GB used
      </span>
    </Card>
  );
}

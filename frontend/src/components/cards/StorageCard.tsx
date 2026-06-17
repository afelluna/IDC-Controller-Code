import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

interface StorageCardProps {
  usedGb: number;
  totalGb: number;
}

export function StorageCard({ usedGb, totalGb }: StorageCardProps) {
  const fillRatio = totalGb > 0 ? usedGb / totalGb : 0;
  const pct = Math.round(fillRatio * 100);

  // Color tiers: blue (ok) → amber (caution) → red (critical)
  function segmentColor(index: number): string {
    const filled = index <= fillRatio * 10;
    if (!filled) return '';  // uses CSS var via style prop
    if (fillRatio >= 0.8) return 'bg-red-500';
    if (fillRatio >= 0.6) return 'bg-amber-400';
    return 'bg-blue-400';
  }

  const badgeClasses =
    fillRatio >= 0.8 ? 'bg-red-100 text-red-700' :
    fillRatio >= 0.6 ? 'bg-amber-100 text-amber-700' :
    'bg-blue-100 text-blue-700';

  return (
    <Card className="p-3 shrink-0">
      <div className="flex justify-between items-center mb-2">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Storage
        </h3>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', badgeClasses)}>
          {pct}%
        </span>
      </div>

      {/* Segmented fill bar */}
      <div className="flex gap-1 h-3 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
          const color = segmentColor(i);
          return (
            <div
              key={i}
              className={cn('flex-1 rounded-sm transition-all', color || '')}
              style={!color ? { backgroundColor: 'var(--bg-elevated)' } : undefined}
            />
          );
        })}
      </div>

      <span
        className="font-mono text-xs font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {usedGb.toFixed(1)} / {totalGb.toFixed(1)} GB used
      </span>
    </Card>
  );
}

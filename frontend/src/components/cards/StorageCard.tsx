import { Card } from '../ui/Card';

interface StorageCardProps {
  usedGb: number;
  totalGb: number;
}

export function StorageCard({ usedGb, totalGb }: StorageCardProps) {
  const fillRatio = totalGb > 0 ? usedGb / totalGb : 0;
  const pct = Math.round(fillRatio * 100);

  // URP-aligned color tiers: green (ok) → amber (caution) → red (critical)
  function segmentFilled(index: number): boolean {
    return index <= fillRatio * 10;
  }
  function segmentColor(index: number): string {
    if (!segmentFilled(index)) return 'var(--bg-elevated)';
    if (fillRatio >= 0.8) return 'var(--status-error)';
    if (fillRatio >= 0.6) return 'var(--status-warn)';
    return 'var(--color-green)';
  }

  const pctColor =
    fillRatio >= 0.8 ? 'var(--status-error)' :
    fillRatio >= 0.6 ? 'var(--status-warn)' :
    'var(--color-green)';

  return (
    <Card className="p-2 shrink-0">
      <div className="flex justify-between items-center mb-2">
        <h3
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Storage
        </h3>
        <span
          className="text-[11px] font-bold font-mono"
          style={{ color: pctColor }}
        >
          {pct}%
        </span>
      </div>

      {/* Segmented fill bar */}
      <div className="flex gap-1 h-2.5 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{ backgroundColor: segmentColor(i) }}
          />
        ))}
      </div>

      <span
        className="font-mono text-[10px] font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {usedGb.toFixed(1)} / {totalGb.toFixed(1)} GB used
      </span>
    </Card>
  );
}

import { Card } from '../ui/Card';

interface StorageCardProps {
  usedGb: number;
  totalGb: number;
}

export function StorageCard({ usedGb, totalGb }: StorageCardProps) {
  const fillRatio = totalGb > 0 ? usedGb / totalGb : 0;
  const pct = Math.min(100, Math.round(fillRatio * 100));

  // URP-aligned color tiers: green (ok) → amber (caution) → red (critical)
  const tierColor =
    fillRatio >= 0.8 ? 'var(--status-error)' :
    fillRatio >= 0.6 ? 'var(--status-warn)' :
    'var(--color-green)';

  return (
    <Card className="p-2 gap-1">
      <h3
        className="text-[10px] font-semibold uppercase tracking-widest shrink-0"
        style={{ color: 'var(--text-secondary)' }}
      >
        Storage
      </h3>

      {/* Apple-style capacity bar — one thin rounded line, no ring or segments */}
      <div
        className="w-full rounded-full overflow-hidden shrink-0"
        style={{ height: 6, backgroundColor: 'var(--bg-elevated)' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: tierColor,
            borderRadius: 'inherit',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <span
        className="font-mono text-[10px] font-medium uppercase tracking-wide shrink-0 opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        {usedGb.toFixed(1)} GB OF {totalGb.toFixed(1)} GB USED
      </span>
    </Card>
  );
}

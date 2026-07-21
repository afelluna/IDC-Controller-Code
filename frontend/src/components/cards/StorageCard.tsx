import { Card } from '../ui/Card';

interface StorageCardProps {
  usedGb: number;
  totalGb: number;
}

export function StorageCard({ usedGb, totalGb }: StorageCardProps) {
  const fillRatio = totalGb > 0 ? usedGb / totalGb : 0;
  const pct = Math.min(100, Math.round(fillRatio * 100));

  const tierColor =
    fillRatio >= 0.8 ? 'var(--status-error)' :
    fillRatio >= 0.6 ? 'var(--status-warn)' :
    'var(--status-live)';

  return (
    <Card className="p-1.5 gap-0.5">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h3
          className="text-[11px] font-bold uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          Storage
        </h3>
        <span
          className="font-mono text-[12px] font-bold shrink-0"
          style={{ color: tierColor }}
        >
          {pct}%
        </span>
      </div>

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
        className="font-mono text-[11px] font-semibold uppercase shrink-0 opacity-90 text-left"
        style={{ color: 'var(--text-muted)' }}
      >
        {usedGb.toFixed(1)} GB OF {totalGb.toFixed(1)} GB USED
      </span>
    </Card>
  );
}

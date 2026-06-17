import { Card } from '../ui/Card';
import { INTENSITY_SCALE } from '../../constants';

interface IntensityLegendProps {
  currentLevel: number;
}

export function IntensityLegend({ currentLevel }: IntensityLegendProps) {
  return (
    <Card className="p-2.5 shrink-0">
      <div className="flex justify-between items-center mb-2">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Intensity Scale (PEIS)
        </h3>
        <span
          className="text-[11px] font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          Low → High Risk
        </span>
      </div>

      {/* Color bar with active-level pip indicator */}
      <div className="relative mb-3">
        <div
          className="flex w-full h-6 rounded-full overflow-visible"
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          {INTENSITY_SCALE.map((item) => (
            <div
              key={item.level}
              className="flex-1 h-full flex items-center justify-center relative"
              style={{ backgroundColor: item.color }}
            >
              <span
                className="text-[9px] font-black leading-none select-none"
                style={{ color: item.text }}
              >
                {item.level}
              </span>
            </div>
          ))}
        </div>

        {/* Active level pip — slides to match the current level position */}
        {currentLevel >= 1 && currentLevel <= 10 && (
          <div
            className="absolute -bottom-[7px] flex justify-center"
            style={{
              // Position pip centered on the active segment (each segment is 10% wide)
              left: `calc(${(currentLevel - 1) * 10}% + 5%)`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-md block"
              style={{ backgroundColor: 'var(--text-primary)' }}
            />
          </div>
        )}
      </div>

      {/* 2-column range reference table — permanent, always visible */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
        {INTENSITY_SCALE.map((item) => (
          <div key={item.level} className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              style={{
                backgroundColor: item.color,
                border: '1px solid rgba(0,0,0,0.10)',
                // Highlight the active level square
                boxShadow: item.level === currentLevel ? '0 0 0 2px var(--brand)' : 'none',
              }}
            />
            <span
              className="text-[10px] font-medium whitespace-nowrap leading-tight"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Lvl {item.level}
              </span>
              {' '}— <span className="font-mono">{item.range}</span> m/s²
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

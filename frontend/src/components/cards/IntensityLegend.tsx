import { Card } from '../ui/Card';
import { INTENSITY_SCALE } from '../../constants';

interface IntensityLegendProps {
  currentLevel: number;
}

export function IntensityLegend({ currentLevel }: IntensityLegendProps) {
  return (
    <Card className="p-2 shrink-0">
      <div className="flex justify-between items-center mb-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Intensity Scale (PEIS)
        </h3>
        <span
          className="text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          Low → High Risk
        </span>
      </div>

      {/* Slim color bar with level labels and active pip */}
      <div className="relative">
        <div
          className="flex w-full h-5 rounded-full overflow-hidden"
          style={{ border: '1px solid var(--border-default)' }}
        >
          {INTENSITY_SCALE.map((item) => (
            <div
              key={item.level}
              className="flex-1 h-full flex items-center justify-center relative"
              style={{
                backgroundColor: item.color,
                outline: item.level === currentLevel ? '2px solid var(--brand)' : 'none',
                outlineOffset: '-1px',
                zIndex: item.level === currentLevel ? 1 : 0,
              }}
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

        {/* Active level pip */}
        {currentLevel >= 1 && currentLevel <= 10 && (
          <div
            className="absolute -bottom-[6px] flex justify-center"
            style={{
              left: `calc(${(currentLevel - 1) * 10}% + 5%)`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <span
              className="w-2 h-2 rounded-full border-2 border-white shadow-md block"
              style={{ backgroundColor: 'var(--text-primary)' }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

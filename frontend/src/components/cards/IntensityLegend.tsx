import { Card } from '../ui/Card';
import { INTENSITY_SCALE } from '../../constants';

interface IntensityLegendProps {
  currentLevel: number;
}

// Vertical PEIS legend pole — a slim top-to-bottom color strip with the level
// number inside each segment. No title text (kiosk space is tight); the strip
// itself is the legend. Level 1 sits at the top, 10 at the bottom.
export function IntensityLegend({ currentLevel }: IntensityLegendProps) {
  return (
    <Card className="h-full w-full p-1.5">
      <div
        className="flex flex-col flex-1 min-h-0 rounded-full overflow-hidden"
        style={{ border: '1px solid var(--border-default)' }}
      >
        {INTENSITY_SCALE.map((item) => {
          const active = item.level === currentLevel;
          return (
            <div
              key={item.level}
              className="flex-1 min-h-0 flex items-center justify-center"
              style={{
                backgroundColor: item.color,
                outline: active ? '2px solid var(--brand)' : 'none',
                outlineOffset: '-2px',
                boxShadow: active ? '0 0 10px 2px rgba(56,189,248,0.6)' : 'none',
                zIndex: active ? 1 : 0,
              }}
            >
              <span
                className="text-[10px] font-bold leading-none select-none"
                style={{ color: item.text }}
              >
                {item.level}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

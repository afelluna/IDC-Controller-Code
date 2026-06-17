import { Card } from '../ui/Card';
import { INTENSITY_SCALE } from '../../constants';

export function IntensityLegend() {
  return (
    <Card className="p-2.5 shrink-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Intensity Scale (PEIS)
        </h3>
        <span className="text-[11px] font-medium text-slate-400">Low → High Risk</span>
      </div>

      {/* Color bar */}
      <div className="flex w-full h-6 rounded-full overflow-hidden border border-slate-200 mb-2">
        {INTENSITY_SCALE.map((item) => (
          <div
            key={item.level}
            className="flex-1 h-full flex items-center justify-center"
            style={{ backgroundColor: item.color }}
          >
            <span className="text-[10px] font-black leading-none" style={{ color: item.text }}>
              {item.level}
            </span>
          </div>
        ))}
      </div>

      {/* 2-column range table */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {INTENSITY_SCALE.map((item) => (
          <div key={item.level} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap leading-tight">
              <span className="font-bold text-slate-700">Lvl {item.level}</span> — {item.range} m/s²
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

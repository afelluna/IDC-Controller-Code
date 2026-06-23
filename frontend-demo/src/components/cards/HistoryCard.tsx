import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { INTENSITY_SCALE, getIntensityMessage } from '../../constants';
import type { SeismicAlert } from '../../types';

interface HistoryCardProps {
  alerts: SeismicAlert[];
  onSeeMore?: () => void;
}

function getShortLabel(level: number): string {
  const title = getIntensityMessage(level).title;
  return title.split(' ')[0];
}

export function HistoryCard({ alerts, onSeeMore }: HistoryCardProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0" style={{ borderTop: '3px solid #0869d9' }}>
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center">
          Seismic History
        </h2>
      </div>

      <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide">
        {alerts.map((alert) => {
          const scale = INTENSITY_SCALE.find(i => i.level === alert.intensity) || INTENSITY_SCALE[0];
          const label = getShortLabel(alert.intensity);
          return (
            <motion.div
              key={alert.id}
              whileHover={{ scale: 1.01 }}
              className={cn(
                'rounded-lg border flex flex-col transition-all shrink-0 overflow-hidden',
                alert.isCritical ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/60 border-slate-100'
              )}
            >
              <div className="h-1 w-full" style={{ backgroundColor: scale.color }} />
              <div className="px-2.5 py-2 flex justify-between items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400 leading-none">{alert.date}</span>
                  <span className="text-sm font-black text-slate-800 leading-tight">{alert.time}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold leading-none"
                    style={{ backgroundColor: scale.color, color: scale.text }}
                  >
                    {label} · {alert.intensity}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">{alert.acceleration}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={onSeeMore}
        className="w-full py-2 bg-slate-100 hover:bg-slate-200 transition-colors font-semibold uppercase tracking-widest text-xs flex items-center justify-center gap-1 shrink-0 text-slate-500"
      >
        See More <ChevronRight size={12} />
      </button>
    </Card>
  );
}

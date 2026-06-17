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

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-4">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <span className="text-lg" style={{ opacity: 0.4 }}>〰</span>
      </div>
      <p
        className="text-[11px] font-semibold"
        style={{ color: 'var(--text-secondary)' }}
      >
        No events recorded
      </p>
      <p
        className="text-[10px] mt-0.5 leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        Events appear here once<br />seismic activity is detected.
      </p>
    </div>
  );
}

export function HistoryCard({ alerts, onSeeMore }: HistoryCardProps) {
  return (
    <Card
      className="flex-1 flex flex-col min-h-0"
      style={{ borderTop: '3px solid var(--brand)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          Seismic History
        </h2>
      </div>

      {/* Event list or empty state */}
      <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide min-h-0">
        {alerts.length === 0 ? (
          <EmptyState />
        ) : (
          alerts.map((alert) => {
            const scale = INTENSITY_SCALE.find(i => i.level === alert.intensity) || INTENSITY_SCALE[0];
            const label = getShortLabel(alert.intensity);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-lg border flex flex-col shrink-0 overflow-hidden',
                )}
                style={{
                  backgroundColor: alert.isCritical ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)',
                  boxShadow: alert.isCritical ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {/* PEIS color swatch stripe */}
                <div className="h-1 w-full" style={{ backgroundColor: scale.color }} />

                <div className="px-2.5 py-2 flex justify-between items-center gap-2">
                  <div className="flex flex-col">
                    <span
                      className="font-mono text-[10px] font-medium leading-none"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {alert.date}
                    </span>
                    <span
                      className="font-mono text-[12px] font-bold leading-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {alert.time}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-bold leading-none"
                      style={{ backgroundColor: scale.color, color: scale.text }}
                    >
                      {label} · {alert.intensity}
                    </span>
                    <span
                      className="font-mono text-[10px] font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {alert.acceleration}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* See More footer */}
      <button
        onClick={onSeeMore}
        className="w-full py-2 font-semibold uppercase tracking-widest text-xs flex items-center justify-center gap-1 shrink-0 transition-colors"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
        }}
      >
        See More <ChevronRight size={12} />
      </button>
    </Card>
  );
}

// Future variant: swap Dominant Frequency + Max Displacement tiles for
// reliable buffer stats (peak velocity, RMS amplitude, PEIS duration)
// when MEMS double-integration is deemed too noisy for field use.

import { MetricTile } from '../ui/MetricTile';

interface SummaryCardProps {
  peakAccel: number;
  noOfEvents: number;
  dominantFreq: number | null;
  maxDisp: number | null;
}

// Inline SVG icons — avoids the lucide-react album.js bundle corruption
const IconActivity = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconWaves = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </svg>
);
const IconArrowUpDown = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <polyline points="17 7 12 2 7 7" />
    <polyline points="17 17 12 22 7 17" />
  </svg>
);

export function SummaryCard({ peakAccel, noOfEvents, dominantFreq, maxDisp }: SummaryCardProps) {
  const fmtAccel  = peakAccel > 0 ? peakAccel.toFixed(5) : '—';
  const fmtEvents = String(noOfEvents);
  const fmtFreq   = dominantFreq !== null ? dominantFreq.toFixed(2) : '—';
  const fmtDisp   = maxDisp !== null ? (maxDisp * 1000).toFixed(3) : '—';

  return (
    <div className="h-full flex flex-col gap-1.5">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest px-1 shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Summary
      </p>

      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        <MetricTile icon={<IconActivity />}    label="Peak Acceleration (m/s²)" value={fmtAccel}  accentColor="#4C6E8C" />
        <MetricTile icon={<IconWaves />}       label="Dominant Frequency (Hz)"  value={fmtFreq}   approximate accentColor="#6FA6A0" />
        <MetricTile icon={<IconCalendar />}    label="No. of Events"            value={fmtEvents} accentColor="#5E8C6A" />
        <MetricTile icon={<IconArrowUpDown />} label="Max Displacement (mm)"    value={fmtDisp}   approximate accentColor="#C99A54" />
      </div>
    </div>
  );
}

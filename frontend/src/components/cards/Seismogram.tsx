import { useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card } from '../ui/Card';
import { UplotReact, UplotReactHandle } from '../ui/UplotReact';
import type { SeismicDataResponse, SensorSample } from '../../api/types';
import uPlot from 'uplot';

interface SeismogramProps {
  livePoint: SeismicDataResponse | null;
  isLive: boolean;
  theme: 'light' | 'dark';
}

export interface SeismogramHandle {
  pushBatch: (samples: SensorSample[]) => void;
}

// The sensor streams ~125 samples per ~250ms batch (~500Hz). Plotting every
// raw sample packs so many points per pixel the line reads as a solid fill
// rather than a legible waveform. Keep 1 in DECIMATION samples — still
// smooth, but ~5x fewer points on screen — and size the rolling buffer for
// a readable ~12s look-back window at that decimated rate.
const DECIMATION = 5;
const MAX_DATAPOINTS = 1200;

// Each axis gets its own scale and its own horizontal band ("lane") of the
// plotting area, independently auto-ranged to its own amplitude. Real sensor
// data on X/Y/Z rarely lands on the exact same value, but at rest (or during
// tiny ambient noise) three near-identical near-zero traces drawn on a shared
// baseline visually merge into one line. Separating them into stacked lanes —
// the standard multi-channel seismograph technique — guarantees all three
// stay visible and distinguishable regardless of amplitude.
const LANE_GAP = 0.03;
const LANE_HEIGHT = (1 - LANE_GAP * 2) / 3;
const AXES = [
  { label: 'X AXIS', stroke: '#f87171', fill: 'rgba(248,113,113,0.20)', scale: 'sx', f0: 1 - LANE_HEIGHT, f1: 1 },
  { label: 'Y AXIS', stroke: '#38bdf8', fill: 'rgba(56,189,248,0.18)', scale: 'sy', f0: LANE_HEIGHT + LANE_GAP, f1: LANE_HEIGHT * 2 + LANE_GAP },
  { label: 'Z AXIS', stroke: '#34d399', fill: 'rgba(52,211,153,0.18)', scale: 'sz', f0: 0, f1: LANE_HEIGHT },
];

// Maps a scale's own auto-detected data extent to a fixed [f0, f1] fraction
// band of the shared pixel height, so each series occupies only its lane no
// matter how uPlot's per-scale auto-ranging linearly maps [min, max] to the
// full plot height. See derivation: position(v) = mid + (v/amp)*halfHeight
// must equal the standard (v - min) / (max - min) uPlot uses internally.
function laneRange(f0: number, f1: number) {
  return (_u: uPlot, dataMin: number, dataMax: number): [number, number] => {
    const maxAbs = Math.max(Math.abs(dataMin), Math.abs(dataMax));
    const amp = Math.max(maxAbs * 1.2, 0.0005);
    const mid = (f0 + f1) / 2;
    const halfHeight = (f1 - f0) / 2;
    const span = amp / halfHeight;
    return [-mid * span, (1 - mid) * span];
  };
}

// Bottom-fraction -> CSS `top` percentage (fractions run bottom=0/top=1, CSS runs top=0/bottom=1).
const toCssTop = (f: number) => `${(1 - f) * 100}%`;
const LANE_DIVIDERS = [AXES[2].f1 + LANE_GAP / 2, AXES[1].f1 + LANE_GAP / 2].map(toCssTop);
const LANE_LABEL_TOPS = AXES.map(a => toCssTop((a.f0 + a.f1) / 2));

// uPlot options are plain JS, not CSS — can't read custom properties, so the
// two plotting-well palettes are mirrored here from index.css's :root /
// [data-theme="dark"] tokens.
const CHART_PALETTE = {
  light: { well: '#ffffff', grid: '#e7edec', tick: '#d7e1e0', axisText: '#93a3a6', scrim: 'rgba(255,255,255,0.6)' },
  dark:  { well: '#0a121c', grid: 'rgba(140,180,220,0.14)', tick: 'rgba(140,180,220,0.28)', axisText: '#7e93a8', scrim: 'rgba(10,16,24,0.72)' },
};

export const Seismogram = forwardRef<SeismogramHandle, SeismogramProps>(
function Accelerograph({ livePoint, isLive, theme }, ref) {
  const palette = CHART_PALETTE[theme];
  const chartRef = useRef<UplotReactHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // High-performance rolling buffer for uPlot
  const chartDataRef = useRef<[number[], number[], number[], number[]]>([[], [], [], []]);
  const rafRef = useRef<number>(0);

  // Queue of samples waiting to be drained onto the chart
  const pendingRef = useRef<SensorSample[]>([]);
  // How many samples to drain per 16.7ms animation frame (~60fps).
  // Recomputed on each batch so drain rate tracks actual sensor cadence.
  const samplesPerFrameRef = useRef<number>(4);

  // Drain callback — stable via ref to avoid closure issues inside rAF loop.
  const drainRef = useRef<() => void>(() => {});
  useEffect(() => {
    drainRef.current = () => {
      rafRef.current = 0;
      const pending = pendingRef.current;
      if (!pending.length || !chartRef.current?.instance) return;

      const count = Math.min(samplesPerFrameRef.current, pending.length);
      const buf = chartDataRef.current;
      for (let i = 0; i < count; i++) {
        const s = pending.shift()!;
        buf[0].push(s.timestamp / 1000);
        buf[1].push(s.x);
        buf[2].push(s.y);
        buf[3].push(s.z);
      }
      const excess = buf[0].length - MAX_DATAPOINTS;
      if (excess > 0) {
        buf[0].splice(0, excess);
        buf[1].splice(0, excess);
        buf[2].splice(0, excess);
        buf[3].splice(0, excess);
      }
      chartRef.current.instance.setData(buf);

      if (pending.length > 0) {
        rafRef.current = requestAnimationFrame(() => drainRef.current());
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    pushBatch(rawSamples: SensorSample[]) {
      if (!rawSamples.length) return;

      // Thin the batch before it ever reaches the chart buffer — see DECIMATION note above.
      const samples = rawSamples.length > DECIMATION
        ? rawSamples.filter((_, i) => i % DECIMATION === 0)
        : rawSamples;
      if (!samples.length) return;

      // Compute drain rate: samples / frames-per-batch (at 60fps / 16.67ms)
      if (samples.length > 1) {
        const batchSpan = samples[samples.length - 1].timestamp - samples[0].timestamp || 545;
        samplesPerFrameRef.current = Math.max(1, Math.ceil(samples.length / (batchSpan / 16.67)));
      }

      // Cap queue at 2 batches to prevent lag buildup; discard oldest excess
      const cap = samples.length * 2;
      if (pendingRef.current.length > cap) {
        pendingRef.current.splice(0, pendingRef.current.length - cap);
      }
      pendingRef.current.push(...samples);

      // Start drain loop if not already running
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => drainRef.current());
      }
    },
  }));

  // Single-point fallback (mock/demo mode only)
  useEffect(() => {
    if (!livePoint?.raw || livePoint.rawSamples?.length) return;
    const { time, x, y, z } = livePoint.raw;
    const buf = chartDataRef.current;
    buf[0].push(time / 1000);
    buf[1].push(x);
    buf[2].push(y);
    buf[3].push(z);
    while (buf[0].length > MAX_DATAPOINTS) {
      buf[0].shift(); buf[1].shift(); buf[2].shift(); buf[3].shift();
    }
    if (chartRef.current?.instance) chartRef.current.instance.setData(buf);
  }, [livePoint]);

  const options: uPlot.Options = useMemo(() => ({
    width: 600,
    height: 300,
    padding: [10, 6, 0, 2],
    legend: { show: false },
    cursor: {
      show: false,
    },
    select: { show: false },
    scales: {
      x: { time: true },
      sx: { range: laneRange(AXES[0].f0, AXES[0].f1) },
      sy: { range: laneRange(AXES[1].f0, AXES[1].f1) },
      sz: { range: laneRange(AXES[2].f0, AXES[2].f1) },
    },
    // Only the time axis is shown — a single shared numeric axis can't
    // meaningfully label three independently-scaled lanes, and exact values
    // are already covered by the live X/Y/Z/GND readout above the chart.
    axes: [
      {
        size: 20,
        font: '10px "JetBrains Mono", monospace',
        stroke: palette.axisText,
        grid: { stroke: palette.grid, width: 1, dash: [4, 4] },
        ticks: { show: true, stroke: palette.tick, size: 4 },
        space: 50,
        values: (self, ticks) => ticks.map(t => {
          const d = new Date(t * 1000);
          return `${d.getSeconds().toString().padStart(2, '0')}s`;
        }),
      },
    ],
    series: [
      {},
      ...AXES.map(a => ({
        label: a.label,
        stroke: a.stroke,
        fill: a.fill,
        width: 1.75,
        points: { show: false },
        scale: a.scale,
      })),
    ],
  }), [theme]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    pendingRef.current = [];
  }, []);

  // Resize handling via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current?.instance) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          chartRef.current.instance.setSize({ width, height });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Live per-axis readout — the resultant (ground) is derived from the same
  // x/y/z the readout displays, so it always agrees with what's on screen
  // rather than sourcing from the batch's separately-tracked peak.
  const liveX = livePoint?.raw?.x ?? null;
  const liveY = livePoint?.raw?.y ?? null;
  const liveZ = livePoint?.raw?.z ?? null;
  const liveGround = liveX !== null && liveY !== null && liveZ !== null
    ? Math.sqrt(liveX * liveX + liveY * liveY + liveZ * liveZ)
    : null;
  const fmt = (v: number | null) => v !== null ? v.toFixed(5) : '—';

  return (
    <Card className="p-2 flex-1 min-h-0 flex flex-col gap-1.5">
      {/* Live X/Y/Z/Ground readout — replaces the old static chart title */}
      <div className="flex items-center justify-center gap-4 shrink-0 px-1">
        {[
          { label: 'X', value: liveX, color: AXES[0].stroke },
          { label: 'Y', value: liveY, color: AXES[1].stroke },
          { label: 'Z', value: liveZ, color: AXES[2].stroke },
          { label: 'GND', value: liveGround, color: 'var(--brand)' },
        ].map((a) => (
          <span key={a.label} className="flex items-baseline gap-1 font-mono">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: a.color }}>
              {a.label}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {fmt(a.value)}
            </span>
            <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>G</span>
          </span>
        ))}
      </div>

      {/* Chart container — dark plotting well, dashed gridlines do the work */}
      <div className="flex-1 w-full relative min-h-0">
        <div
          ref={containerRef}
          className="absolute inset-0 uplot-container rounded-md overflow-hidden"
          style={{ backgroundColor: palette.well, border: '1px solid var(--border-subtle)' }}
        >
          <UplotReact
            ref={chartRef}
            options={options}
            data={chartDataRef.current}
            className="w-full h-full"
          />

          {/* Lane dividers + labels — confined to the plotting area (excludes
              the ~20px time-axis strip at the bottom via inset). Purely a
              visual aid: the actual separation comes from each series having
              its own auto-scaled band (see laneRange above), not from these
              lines. */}
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 10, bottom: 20 }}>
            {LANE_DIVIDERS.map((top, i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{ top, height: 1, backgroundColor: palette.grid }}
              />
            ))}
            {AXES.map((a, i) => (
              <span
                key={a.label}
                className="absolute font-mono text-[8px] font-bold uppercase"
                style={{ top: LANE_LABEL_TOPS[i], left: 4, transform: 'translateY(-50%)', color: a.stroke, opacity: 0.75 }}
              >
                {a.label[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Disconnected overlay */}
        {!isLive && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-md"
            style={{ backgroundColor: palette.scrim, backdropFilter: 'blur(2px)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              No Signal
            </span>
          </div>
        )}
      </div>

      {/* Bottom legend — X AXIS / Y AXIS / Z AXIS */}
      <div className="flex justify-center items-center gap-6 shrink-0">
        {AXES.map(a => (
          <div key={a.label} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full shrink-0"
              style={{ width: 16, height: 3, backgroundColor: a.stroke }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: a.stroke }}
            >
              {a.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
});


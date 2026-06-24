import { useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card } from '../ui/Card';
import { UplotReact, UplotReactHandle } from '../ui/UplotReact';
import type { SeismicDataResponse, SensorSample } from '../../api/types';
import uPlot from 'uplot';

interface SeismogramProps {
  livePoint: SeismicDataResponse | null;
  isLive: boolean;
}

export interface SeismogramHandle {
  pushBatch: (samples: SensorSample[]) => void;
}

const MAX_DATAPOINTS = 2250;

const AXES = [
  { label: 'X AXIS', stroke: '#ef4444', fill: 'rgba(239,68,68,0.25)' },
  { label: 'Y AXIS', stroke: '#3b82f6', fill: 'rgba(59,130,246,0.20)' },
  { label: 'Z AXIS', stroke: '#10b981', fill: 'rgba(16,185,129,0.20)' },
];

export const Seismogram = forwardRef<SeismogramHandle, SeismogramProps>(
function Accelerograph({ livePoint, isLive }, ref) {
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
    pushBatch(samples: SensorSample[]) {
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
    padding: [8, 8, 0, 8],
    legend: { show: false },
    cursor: {
      show: false,
    },
    select: { show: false },
    scales: {
      x: { time: true },
      y: {
        range: (u, dataMin, dataMax) => {
          const maxAbs = Math.max(Math.abs(dataMin), Math.abs(dataMax));
          const finalMax = Math.max(maxAbs * 1.2, 0.0005);
          return [-finalMax, finalMax];
        },
      },
    },
    axes: [
      {
        size: 28,
        font: '10px Arial',
        stroke: '#94a3b8',
        grid: { stroke: 'rgba(148,163,184,0.15)', width: 1 },
        ticks: { show: true, stroke: 'rgba(148,163,184,0.25)', size: 3 },
        space: 50,
        values: (self, ticks) => ticks.map(t => {
          const d = new Date(t * 1000);
          return `${d.getSeconds().toString().padStart(2, '0')}s`;
        }),
      },
      {
        size: 46,
        font: '10px Arial',
        stroke: '#94a3b8',
        grid: { stroke: 'rgba(148,163,184,0.15)', width: 1 },
        ticks: { show: true, stroke: 'rgba(148,163,184,0.25)', size: 3 },
        space: 28,
      },
    ],
    series: [
      {},
      ...AXES.map(a => ({
        label: a.label,
        stroke: a.stroke,
        fill: a.fill,
        width: 1.5,
        points: { show: false },
      })),
    ],
  }), []);

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

  return (
    <Card className="p-2 flex-1 min-h-0 flex flex-col">
      {/* Header — title only */}
      <div className="mb-1 shrink-0">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Accelerograph
        </h3>
      </div>

      {/* Chart container — dark well */}
      <div className="flex-1 w-full relative min-h-0">
        <div
          ref={containerRef}
          className="absolute inset-0 uplot-container rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <UplotReact
            ref={chartRef}
            options={options}
            data={chartDataRef.current}
            className="w-full h-full"
          />
        </div>

        {/* Disconnected overlay */}
        {!isLive && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              No Signal
            </span>
          </div>
        )}
      </div>

      {/* Bottom legend — X AXIS / Y AXIS / Z AXIS */}
      <div className="flex justify-center items-center gap-5 pt-1.5 shrink-0">
        {AXES.map(a => (
          <div key={a.label} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-sm shrink-0"
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


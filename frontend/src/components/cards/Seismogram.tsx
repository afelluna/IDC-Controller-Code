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

// Samples arrive from useWebSocket already decimated to ~250 sps (its
// TARGET_SPS) — that rate is chosen for peak/threshold-detection accuracy,
// which is safety-relevant and wants as much resolution as affordable.
// Plotting is a different concern: at ~250 sps a 10s window packs 2500
// points into a panel maybe 500-600px wide (~4-5 points/pixel), which reads
// as dense fuzz rather than bold, legible strokes. Thin again, here,
// chart-only, to roughly 1 point per pixel — this never touches the
// higher-fidelity stream used for intensity/threshold detection upstream.
const INCOMING_SPS = 250; // must match useWebSocket.ts's TARGET_SPS
const PLOT_SPS = 60;
const PLOT_DECIMATION = Math.max(1, Math.round(INCOMING_SPS / PLOT_SPS));
const MAX_DATAPOINTS = PLOT_SPS * 10;

// X/Y/Z overlaid on one shared full-height plot, distinguished only by
// color — not three lanes/panels each getting a squeezed fraction of the
// height. On a small kiosk viewport (800x480), splitting into separate
// panels left each trace only ~1/3 of an already-small card, reading as
// tiny with lots of surrounding dead space. Overlapping reclaims that
// headroom for every trace at once, and drops two of the three canvas
// instances — lighter for the RPi4 too.
const AXES = [
  { label: 'X AXIS', stroke: '#f87171' },
  { label: 'Y AXIS', stroke: '#38bdf8' },
  { label: 'Z AXIS', stroke: '#34d399' },
];

// Sizes the panel to the data's actual extent, not to a fixed [-x, x] band
// through zero. Accelerometer readings commonly carry a small DC bias (sensor
// offset/mounting), so the real min/max often sit entirely on one side of
// zero — forcing symmetry around zero then reserves an equal, empty band on
// the other side for values that never occur, which is exactly the "dead
// space at the bottom" this was producing.
function fullRange(_u: uPlot, dataMin: number, dataMax: number): [number, number] {
  const span = Math.max(dataMax - dataMin, 0.001);
  const pad = span * 0.15;
  return [dataMin - pad, dataMax + pad];
}

const CHART_PALETTE = {
  light: { well: '#ffffff' },
  dark: { well: '#0a121c' },
};

export const Seismogram = forwardRef<SeismogramHandle, SeismogramProps>(
  function Accelerograph({ livePoint, isLive, theme }, ref) {
    const palette = CHART_PALETTE[theme];
    const chartRef = useRef<UplotReactHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // High-performance rolling buffer for uPlot: [times, xs, ys, zs]. Passed
    // to UplotReact as a stable reference (created once, mutated in place,
    // never reassigned) — a fresh array/tuple here on every render would
    // retrigger UplotReact's own setData effect every render and stomp the
    // chart back to empty between drain-loop frames. That was the actual
    // cause of an earlier flicker bug: a plain re-render clearing the chart,
    // not the data itself misbehaving.
    const chartDataRef = useRef<[number[], number[], number[], number[]]>([[], [], [], []]);
    const rafRef = useRef<number>(0);

    const pendingRef = useRef<SensorSample[]>([]);
    const samplesPerFrameRef = useRef<number>(4);

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

        // Chart-only thinning — see PLOT_DECIMATION note above.
        const samples = rawSamples.length > PLOT_DECIMATION
          ? rawSamples.filter((_, i) => i % PLOT_DECIMATION === 0)
          : rawSamples;
        if (!samples.length) return;

        if (samples.length > 1) {
          const batchSpan = samples[samples.length - 1].timestamp - samples[0].timestamp || 545;
          samplesPerFrameRef.current = Math.max(1, Math.ceil(samples.length / (batchSpan / 16.67)));
        }

        const cap = samples.length * 2;
        if (pendingRef.current.length > cap) {
          pendingRef.current.splice(0, pendingRef.current.length - cap);
        }
        pendingRef.current.push(...samples);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [livePoint]);

    const options = useMemo(() => ({
      width: 600,
      height: 300,
      // Minimal padding — the traces should fill the panel edge-to-edge.
      padding: [2, 2, 2, 2] as [number, number, number, number],
      legend: { show: false },
      cursor: { show: false },
      select: { show: false },
      scales: {
        x: { time: true },
        // One shared scale for all three series — uPlot auto-ranges to
        // whichever axis is currently swinging the widest, so all three
        // overlap in the same full-height space instead of each getting a
        // fixed fraction of it.
        y: { range: fullRange },
      },
      // No axes/gridlines — the color-coded legend row below is what makes
      // the three overlaid traces distinguishable, not chart chrome.
      axes: [{ show: false }, { show: false }],
      series: [
        {},
        ...AXES.map(a => ({ label: a.label, stroke: a.stroke, width: 1.25, points: { show: false } })),
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
      <Card className="p-2 flex-1 min-h-0 flex flex-col gap-1">
        {/* Live X/Y/Z/Ground readout */}
        <div className="flex items-center justify-center gap-4 shrink-0 px-1">
          {[
            { label: 'X', value: liveX, color: AXES[0].stroke },
            { label: 'Y', value: liveY, color: AXES[1].stroke },
            { label: 'Z', value: liveZ, color: AXES[2].stroke },
            { label: 'GND', value: liveGround, color: 'var(--brand)' },
          ].map((a) => (
            <span key={a.label} className="flex items-baseline gap-1 font-mono">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: a.color }}>
                {a.label}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fmt(a.value)}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>G</span>
            </span>
          ))}
        </div>

        {/* Single full-height plotting well — X/Y/Z overlaid, distinguished
            by color, so every trace gets the whole panel's amplitude range
            instead of a squeezed fraction of it. */}
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
          </div>

          {/* Disconnected overlay */}
          {!isLive && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-md"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(10,16,24,0.72)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}
            >
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
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
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: a.stroke }}
              >
                {a.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    );
  }
);

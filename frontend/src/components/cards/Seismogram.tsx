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
  light: { well: '#ffffff', grid: '#e7edec', tick: '#d7e1e0', axisText: '#93a3a6' },
  dark: { well: '#0a121c', grid: 'rgba(140,180,220,0.14)', tick: 'rgba(140,180,220,0.28)', axisText: '#7e93a8' },
};

export const Seismogram = forwardRef<SeismogramHandle, SeismogramProps>(
  function Accelerograph({ livePoint, isLive, theme }, ref) {
    const palette = CHART_PALETTE[theme];
    const chartRef = useRef<UplotReactHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // High-performance rolling buffer for uPlot: [times, xs, ys, zs]. Passed
    // to UplotReact as a stable reference (created once, mutated in place,
    // never reassigned) — a fresh array/tuple here on every render would
    // retrigger UplotReact's own setData effect every render and stomp the
    // chart back to empty between paints. That was the actual cause of an
    // earlier flicker bug: a plain re-render clearing the chart, not the
    // data itself misbehaving.
    const chartDataRef = useRef<[number[], number[], number[], number[]]>([[], [], [], []]);
    const rafRef = useRef<number>(0);
    const dirtyRef = useRef(false);

    // Per-axis DC baseline (mounting/gravity offset), removed before a
    // sample ever reaches the chart buffer. Real X/Y/Z accelerometer output
    // rarely shares a common zero — each axis carries its own static
    // offset — so plotting raw values puts each trace at a different
    // height instead of overlapping. A slow exponential baseline tracks
    // that offset per axis and gets subtracted for the chart only (the
    // live X/Y/Z/GND readout above still shows true raw values), so all
    // three traces oscillate around the same shared centerline the way a
    // real seismograph overlay does — actual ground-motion swings are far
    // faster than BASELINE_ALPHA can track, so they aren't smoothed away.
    const BASELINE_ALPHA = 0.002;
    const baselineRef = useRef<{ x: number | null; y: number | null; z: number | null }>({
      x: null, y: null, z: null,
    });

    // Grouped batching: each incoming socket batch is appended to the
    // buffer in one shot (not trickled sample-by-sample across many
    // animation frames — that approach traded latency for smoothness,
    // holding the newest sample off-screen until the whole batch had
    // drained, up to a full ~250ms batch period later). A batch just marks
    // the buffer dirty; the actual setData()/repaint is coalesced to at
    // most once per animation frame, so back-to-back batches arriving
    // faster than paint still collapse into a single repaint instead of
    // one setData() call each. Net effect: new data is on screen within a
    // frame (~16ms) of arriving, and bursts don't cause redundant repaints.
    const flushRef = useRef<() => void>(() => {});
    useEffect(() => {
      flushRef.current = () => {
        rafRef.current = 0;
        if (!dirtyRef.current || !chartRef.current?.instance) return;
        dirtyRef.current = false;
        chartRef.current.instance.setData(chartDataRef.current);
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

        const buf = chartDataRef.current;
        const base = baselineRef.current;
        for (const s of samples) {
          if (base.x === null) { base.x = s.x; base.y = s.y; base.z = s.z; }
          else {
            base.x += (s.x - base.x) * BASELINE_ALPHA;
            base.y += (s.y - base.y) * BASELINE_ALPHA;
            base.z += (s.z - base.z) * BASELINE_ALPHA;
          }
          buf[0].push(s.timestamp / 1000);
          buf[1].push(s.x - base.x);
          buf[2].push(s.y - base.y);
          buf[3].push(s.z - base.z);
        }
        const excess = buf[0].length - MAX_DATAPOINTS;
        if (excess > 0) {
          buf[0].splice(0, excess);
          buf[1].splice(0, excess);
          buf[2].splice(0, excess);
          buf[3].splice(0, excess);
        }

        dirtyRef.current = true;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => flushRef.current());
        }
      },
    }));

    // Single-point fallback (mock/demo mode only)
    useEffect(() => {
      if (!livePoint?.raw || livePoint.rawSamples?.length) return;
      const { time, x, y, z } = livePoint.raw;
      const buf = chartDataRef.current;
      const base = baselineRef.current;
      if (base.x === null) { base.x = x; base.y = y; base.z = z; }
      else {
        base.x += (x - base.x) * BASELINE_ALPHA;
        base.y += (y - base.y) * BASELINE_ALPHA;
        base.z += (z - base.z) * BASELINE_ALPHA;
      }
      buf[0].push(time / 1000);
      buf[1].push(x - base.x);
      buf[2].push(y - base.y);
      buf[3].push(z - base.z);
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
      // No built-in legend row (the color-coded key below the chart already
      // does that job) — hover values are rendered by the custom tooltip
      // driven by hooks.setCursor below, closer to the old Angular/Highcharts
      // hover-to-inspect experience than uPlot's default legend table.
      legend: { show: false },
      cursor: {
        show: true,
        x: true,
        y: false,
        points: { show: true, size: 6, width: 1 },
        drag: { x: false, y: false, setScale: false },
      },
      select: { show: false },
      scales: {
        x: { time: true },
        // One shared scale for all three series — uPlot auto-ranges to
        // whichever axis is currently swinging the widest, so all three
        // overlap in the same full-height space instead of each getting a
        // fixed fraction of it.
        y: { range: fullRange },
      },
      // No axes/gridlines/labels — the color-coded legend row below is
      // what makes the three overlaid traces distinguishable, and exact
      // values come from the live readout above and the hover tooltip, not
      // chart chrome.
      axes: [{ show: false }, { show: false }],
      series: [
        {},
        ...AXES.map(a => ({ label: a.label, stroke: a.stroke, width: 1.25, points: { show: false } })),
      ],
      hooks: {
        setCursor: [
          (u: uPlot) => {
            const tt = tooltipRef.current;
            const well = containerRef.current;
            if (!tt || !well) return;

            const idx = u.cursor.idx;
            const left = u.cursor.left;
            const top = u.cursor.top;
            if (idx == null || left == null || top == null || left < 0) {
              tt.style.display = 'none';
              return;
            }

            const buf = chartDataRef.current;
            const t = buf[0][idx];
            if (t == null) {
              tt.style.display = 'none';
              return;
            }
            const x = buf[1][idx];
            const y = buf[2][idx];
            const z = buf[3][idx];
            const time = new Date(t * 1000);
            const hh = String(time.getHours()).padStart(2, '0');
            const mm = String(time.getMinutes()).padStart(2, '0');
            const ss = String(time.getSeconds()).padStart(2, '0');
            const ms = String(time.getMilliseconds()).padStart(3, '0');

            tt.innerHTML = `
              <div style="font-weight:700;opacity:0.7;margin-bottom:2px;">${hh}:${mm}:${ss}.${ms}</div>
              <div style="color:${AXES[0].stroke}">X&nbsp; ${x.toFixed(5)} G</div>
              <div style="color:${AXES[1].stroke}">Y&nbsp; ${y.toFixed(5)} G</div>
              <div style="color:${AXES[2].stroke}">Z&nbsp; ${z.toFixed(5)} G</div>
            `;
            tt.style.display = 'block';

            // Position near the cursor, clamped so it never overflows the
            // plotting well (right/bottom edges especially, since the cursor
            // tends to sit near them while scanning recent data).
            const wellW = well.clientWidth;
            const wellH = well.clientHeight;
            const ttW = tt.offsetWidth;
            const ttH = tt.offsetHeight;
            let tx = left + 12;
            let ty = top + 12;
            if (tx + ttW > wellW) tx = left - ttW - 12;
            if (ty + ttH > wellH) ty = top - ttH - 12;
            tt.style.left = `${Math.max(0, tx)}px`;
            tt.style.top = `${Math.max(0, ty)}px`;
          },
        ],
      },
    }), [palette]);

    useEffect(() => () => {
      cancelAnimationFrame(rafRef.current);
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

            {/* Hover tooltip — X/Y/Z at the cursored sample, positioned by
                hooks.setCursor above. Hidden by default; display is toggled
                per-frame as the cursor moves on/off the plot. */}
            <div
              ref={tooltipRef}
              className="absolute z-20 pointer-events-none rounded-md px-2 py-1.5 font-mono text-[11px] leading-tight"
              style={{
                display: 'none',
                backgroundColor: theme === 'dark' ? 'rgba(10,16,24,0.92)' : 'rgba(255,255,255,0.96)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
              }}
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

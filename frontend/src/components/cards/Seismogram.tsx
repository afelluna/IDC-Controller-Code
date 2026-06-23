import { useMemo, useRef, useEffect } from 'react';
import { Card } from '../ui/Card';
import { UplotReact, UplotReactHandle } from '../ui/UplotReact';
import type { SeismicDataResponse } from '../../api/types';
import uPlot from 'uplot';

interface SeismogramProps {
  livePoint: SeismicDataResponse | null;
  isLive: boolean;
}

const MAX_DATAPOINTS = 200;

const AXES = [
  { label: 'X AXIS', stroke: '#ef4444', fill: 'rgba(239,68,68,0.25)' },
  { label: 'Y AXIS', stroke: '#3b82f6', fill: 'rgba(59,130,246,0.20)' },
  { label: 'Z AXIS', stroke: '#10b981', fill: 'rgba(16,185,129,0.20)' },
];

export function Seismogram({ livePoint, isLive }: SeismogramProps) {
  const chartRef = useRef<UplotReactHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // High-performance rolling buffer for uPlot
  const chartDataRef = useRef<[number[], number[], number[], number[]]>([[], [], [], []]);

  // Handle incoming live point
  useEffect(() => {
    if (livePoint?.raw) {
      const { time, x, y, z } = livePoint.raw;
      const data = chartDataRef.current;

      data[0].push(time / 1000);
      data[1].push(x);
      data[2].push(y);
      data[3].push(z);

      if (data[0].length > MAX_DATAPOINTS) {
        data[0].shift();
        data[1].shift();
        data[2].shift();
        data[3].shift();
      }

      if (chartRef.current?.instance) {
        chartRef.current.instance.setData(data);
      }
    }
  }, [livePoint]);

  const options: uPlot.Options = useMemo(() => ({
    width: 600,
    height: 300,
    padding: [8, 8, 0, 8],
    cursor: {
      show: true,
      points: { show: false },
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
          Seismogram
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
}

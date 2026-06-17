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

export function Seismogram({ livePoint, isLive }: SeismogramProps) {
  const chartRef = useRef<UplotReactHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a ref to track current colors for uPlot updates
  const axisColor = 'rgba(148, 163, 184, 0.5)'; // slate-400 with alpha
  const gridColor = 'rgba(148, 163, 184, 0.1)';

  // High-performance rolling buffer for uPlot
  const chartDataRef = useRef<[number[], number[], number[], number[]]>([[], [], [], []]);

  // Handle incoming live point
  useEffect(() => {
    if (livePoint?.raw) {
      const { time, x, y, z } = livePoint.raw;
      const data = chartDataRef.current;

      // 1. Append new data
      data[0].push(time / 1000);
      data[1].push(x);
      data[2].push(y);
      data[3].push(z);

      // 2. Enforce FIFO rolling window
      if (data[0].length > MAX_DATAPOINTS) {
        data[0].shift();
        data[1].shift();
        data[2].shift();
        data[3].shift();
      }

      // 3. Update chart directly (bypasses React reconciliation)
      if (chartRef.current?.instance) {
        chartRef.current.instance.setData(data);
      }
    }
  }, [livePoint]);

  const options: uPlot.Options = useMemo(() => ({
    width: 600,
    height: 300,
    padding: [10, 10, 0, 10],
    cursor: {
      show: true,
      points: { show: false },
    },
    select: {
      show: false,
    },
    scales: {
      x: {
        time: true,
      },
      y: {
        range: (u, dataMin, dataMax) => {
          const maxAbs = Math.max(Math.abs(dataMin), Math.abs(dataMax));
          const minThreshold = 0.0005;
          const paddedMax = maxAbs * 1.2;
          const finalMax = Math.max(paddedMax, minThreshold);
          return [-finalMax, finalMax];
        },
      },
    },
    axes: [
      {
        size: 30,
        font: '10px Arial',
        stroke: '#94a3b8',
        grid: { stroke: 'rgba(148, 163, 184, 0.1)', width: 1 },
        ticks: { show: true, stroke: 'rgba(148, 163, 184, 0.2)', size: 4 },
        space: 50,
        values: (self, ticks) => ticks.map(t => {
          const d = new Date(t * 1000);
          return `${d.getSeconds().toString().padStart(2, '0')}s`;
        }),
      },
      {
        size: 50,
        font: '10px Arial',
        stroke: '#94a3b8',
        grid: { stroke: 'rgba(148, 163, 184, 0.1)', width: 1 },
        ticks: { show: true, stroke: 'rgba(148, 163, 184, 0.2)', size: 4 },
        space: 30,
      },
    ],
    series: [
      {},
      {
        label: 'Axis X',
        stroke: '#ef4444',   // red-500
        width: 1.5,
        points: { show: false },
      },
      {
        label: 'Axis Y',
        stroke: '#3b82f6',   // blue-500
        width: 1.5,
        points: { show: false },
      },
      {
        label: 'Axis Z',
        stroke: '#10b981',   // emerald-500
        width: 1.5,
        points: { show: false },
      },
    ],
  }), []);

  // Resize handling via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current?.instance) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          chartRef.current.instance.setSize({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <Card className="p-3 flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-1.5 shrink-0">
        <div className="flex items-center gap-3">
          <h3
            className="text-xs font-semibold uppercase tracking-widest text-slate-400"
          >
            Seismogram
          </h3>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className="w-3 h-px bg-red-500 inline-block" />
              X
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className="w-3 h-px bg-blue-500 inline-block" />
              Y
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className="w-3 h-px bg-emerald-500 inline-block" />
              Z
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
          <span
            className="text-[11px] font-medium text-slate-400"
          >
            {isLive ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-1 w-full relative min-h-0 pb-1">
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
            style={{ backgroundColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(2px)' }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest text-slate-400"
            >
              No Signal
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

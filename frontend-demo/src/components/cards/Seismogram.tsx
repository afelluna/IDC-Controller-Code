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

      // 3. Update chart directly
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
        stroke: '#94a3b8',
        grid: { stroke: '#e2e8f0', width: 1 },
        ticks: { show: true, stroke: '#e2e8f0', size: 4 },
        space: 50, // Roughly 10s intervals
        values: (self, ticks) => ticks.map(t => {
          const d = new Date(t * 1000);
          return `${d.getSeconds().toString().padStart(2, '0')}s`;
        }),
      },
      {
        stroke: '#94a3b8',
        grid: { stroke: '#e2e8f0', width: 1 },
        ticks: { show: true, stroke: '#e2e8f0', size: 4 },
        size: 55,
        space: 30, // Forces more ticks (approx 0.10 spacing)
      },
    ],
    series: [
      {},
      {
        label: 'Axis X',
        stroke: '#ef4444', // Red
        width: 1.5,
        points: { show: false },
      },
      {
        label: 'Axis Y',
        stroke: '#0869d9', // Brand Blue
        width: 1.5,
        points: { show: false },
      },
      {
        label: 'Axis Z',
        stroke: '#10b981', // Emerald
        width: 1.5,
        points: { show: false },
      },
    ],
  }), []);

  // Resize handling
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
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Seismogram</h3>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className="w-3 h-px bg-red-500 inline-block" />
              X
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className="w-3 h-px bg-blue-600 inline-block" />
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
          <span className="text-[11px] font-medium text-slate-400">{isLive ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full relative min-h-0">
        <div ref={containerRef} className="absolute inset-0 uplot-container">
          <UplotReact
            ref={chartRef}
            options={options}
            data={chartDataRef.current}
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  );
}

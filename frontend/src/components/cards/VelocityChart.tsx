import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';
import type { VelocityDataPoint } from '../../types';

interface VelocityChartProps {
  data: VelocityDataPoint[];
  isLive: boolean;
}

export function VelocityChart({ data, isLive }: VelocityChartProps) {
  const { startTime, latestTime, ticks } = useMemo(() => {
    const last = data.length > 0 ? Math.max(...data.map(d => d.time)) : Date.now();
    const windowSizeMs = 60 * 1000;
    const start = last - windowSizeMs;

    const tickArray = [];
    const firstTick = Math.ceil(start / 10000) * 10000;
    for (let t = firstTick; t <= last; t += 10000) {
      tickArray.push(t);
    }

    return { startTime: start, latestTime: last, ticks: tickArray };
  }, [data]);

  const formatTime = (time: number) => {
    const d = new Date(time);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-3 flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-1.5 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Seismogram</h3>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="w-5 h-px bg-black inline-block" />
              Vel +
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="w-5 h-px bg-emerald-500 inline-block" />
              Vel −
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-[11px] font-medium text-slate-400">{isLive ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              type="number"
              domain={[startTime, latestTime]}
              ticks={ticks}
              tickFormatter={formatTime}
              stroke="#cbd5e1"
              tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
              dy={8}
            />
            <YAxis
              domain={[-10, 10]}
              ticks={[-10, -5, 0, 5, 10]}
              axisLine={false}
              tickLine={false}
              stroke="#cbd5e1"
              tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
              width={30}
            />
            <defs>
              <linearGradient id="colorVelBlack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000000" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVelGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="velocity"
              stroke="#1e293b"
              strokeWidth={2}
              fill="url(#colorVelBlack)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="velocityNeg"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#colorVelGreen)"
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

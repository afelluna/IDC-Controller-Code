import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';
import type { HistogramDataPoint } from '../../types';

interface HistogramCardProps {
  data: HistogramDataPoint[];
}

export function HistogramCard({ data }: HistogramCardProps) {
  return (
    <Card className="p-3 h-36 shrink-0">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Activity History</h3>
        <span className="text-[11px] font-medium text-slate-400">Last 2 months</span>
      </div>
      <div className="h-[90px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <XAxis
              dataKey="week"
              hide={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(val) => val.replace('PEIS ', '')}
            />
            <YAxis
              tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={26}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '12px' }}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

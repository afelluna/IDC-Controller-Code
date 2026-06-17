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
  const hasData = data.some(d => d.value > 0);

  return (
    <Card className="p-3 h-36 shrink-0">
      <div className="flex justify-between items-center mb-1">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Activity History
        </h3>
        <span
          className="text-[11px] font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          Last 2 months
        </span>
      </div>

      {hasData ? (
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
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(val) => val.replace('PEIS ', '')}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 500, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={26}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'var(--border-subtle)' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[90px] flex items-center justify-center">
          <p
            className="text-[10px] text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            No activity yet
          </p>
        </div>
      )}
    </Card>
  );
}

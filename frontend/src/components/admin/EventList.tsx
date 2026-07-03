import { useEffect, useMemo, useState } from 'react';
import { ListOrdered, Loader2, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { seismicApi } from '../../api/seismicApi';
import { INTENSITY_SCALE } from '../../constants';

interface HistoryRow {
  event_unique_id: string;
  path: string;
  status: string;
  intensity: number;
  timestamp: number;
}

const PAGE_SIZE = 20; // matches the legacy Angular table (tblRow=20)

function fmtDate(ts: number) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleDateString();
}
function fmtTime(ts: number) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleTimeString();
}

export function EventList() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await seismicApi.getAllHistoryMax();
      if (res.success && res.data?.history) {
        setRows(res.data.history as HistoryRow[]);
      } else {
        setRows([]);
        setError(res.message || 'No history available.');
      }
    } catch {
      setError('Could not reach the device.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Global text filter across the visible fields.
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [fmtDate(r.timestamp), fmtTime(r.timestamp), String(r.intensity), r.status, r.path]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 whenever the filter changes the result set.
  useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center justify-between gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <ListOrdered size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Event log
          </h2>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} event{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 w-40"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>
          <button
            onClick={load}
            title="Refresh"
            className="rounded-lg p-1.5 transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading events…
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No matching events.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ color: 'var(--text-secondary)' }}>
                  {['Date', 'Time', 'PEIS', 'Status', 'Source File'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 py-2"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const scale = INTENSITY_SCALE.find((i) => i.level === r.intensity) || INTENSITY_SCALE[0];
                  return (
                    <tr key={r.event_unique_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.timestamp)}</td>
                      <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{fmtTime(r.timestamp)}</td>
                      <td className="px-3 py-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ backgroundColor: scale.color, color: scale.text }}
                        >
                          {r.intensity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{r.status}</td>
                      <td className="px-3 py-2 font-mono text-[11px] truncate max-w-[280px]" style={{ color: 'var(--text-muted)' }} title={r.path}>
                        {r.path}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && filtered.length > 0 && (
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-lg p-1.5 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-lg p-1.5 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

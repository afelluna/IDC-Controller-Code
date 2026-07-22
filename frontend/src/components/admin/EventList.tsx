import { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
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
// YYYY-MM-DD in the viewer's local timezone, to match an <input type="date">
// value — Date#toISOString() is UTC and would shift the day near midnight.
function dateInputValue(ts: number) {
  const d = new Date(ts);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

const PEIS_LEVELS = INTENSITY_SCALE.map((s) => s.level);

export function EventList() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFull, setLoadingFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullError, setFullError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [peisFilter, setPeisFilter] = useState('');
  const [page, setPage] = useState(1);
  // Whether `rows` currently holds the full (unbounded) scan or just the
  // fast, recent-only default — drives the "Load full history" affordance.
  const [showingAll, setShowingAll] = useState(false);

  // Default load: the same bounded /getHistoryMax the live dashboard's 30s
  // poll already uses (fast, fileCount-capped). /getAllHistoryMax scans
  // every event ever recorded on the device — on a unit with a lot of
  // history that's a multi-second-to-minutes scan, so it must never fire
  // automatically on page load. Full history is opt-in only, below.
  const load = async () => {
    setLoading(true);
    setError(null);
    setFullError(null);
    setShowingAll(false);
    try {
      const res = await seismicApi.getHistoryMax();
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

  const loadFull = async () => {
    setLoadingFull(true);
    setFullError(null);
    try {
      const res = await seismicApi.getAllHistoryMax();
      if (res.success && res.data?.history) {
        setRows(res.data.history as HistoryRow[]);
        setShowingAll(true);
      } else {
        setFullError(res.message || 'No full history available.');
      }
    } catch {
      setFullError('Could not load full history — the device may still be busy scanning older files.');
    } finally {
      setLoadingFull(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // The backend doesn't sort by real event time — it relies on filesystem
  // listing order, which breaks whenever a file's recorded timestamp
  // doesn't match its directory position (e.g. an RPi clock that was wrong
  // when a file was written shows up as a "recent" file). Always re-sort by
  // the row's own timestamp here rather than trusting the array order the
  // API returned, then apply the date/PEIS filters on top.
  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.filter((r) => {
      if (dateFilter && dateInputValue(r.timestamp) !== dateFilter) return false;
      if (peisFilter && String(r.intensity) !== peisFilter) return false;
      return true;
    });
  }, [rows, dateFilter, peisFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 whenever a filter changes the result set.
  useEffect(() => {
    setPage(1);
  }, [dateFilter, peisFilter]);

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center justify-between gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Icon name="list-ordered" size={16} style={{ color: 'var(--brand)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Event log
          </h2>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} event{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by date"
            className="rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          />
          <select
            value={peisFilter}
            onChange={(e) => setPeisFilter(e.target.value)}
            title="Filter by PEIS level"
            className="rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            <option value="">All PEIS</option>
            {PEIS_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>PEIS {lvl}</option>
            ))}
          </select>
          {(dateFilter || peisFilter) && (
            <button
              onClick={() => { setDateFilter(''); setPeisFilter(''); }}
              className="text-[11px] font-semibold px-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
          {!showingAll && (
            <button
              onClick={loadFull}
              disabled={loadingFull}
              title="Scans every event ever recorded on the device — can take a while"
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {loadingFull
                ? <Icon name="loader" size={13} className="animate-spin" />
                : <Icon name="history" size={13} />}
              {loadingFull ? 'Scanning…' : 'Load full history'}
            </button>
          )}
          <button
            onClick={load}
            title="Refresh"
            className="rounded-lg p-1.5 transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <Icon name="refresh-cw" size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!loading && !showingAll && !error && (
        <div
          className="px-4 py-1.5 text-[11px]"
          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}
        >
          Showing recent events only. "Load full history" scans every event ever recorded — can be slow on a unit with a lot of history.
        </div>
      )}

      {fullError && (
        <div
          className="px-4 py-1.5 text-[11px] font-medium"
          style={{ color: 'var(--status-error)', backgroundColor: 'rgba(193,96,92,0.10)' }}
        >
          {fullError}
        </div>
      )}

      <div className="p-2">
        {loading ? (
          <div className="flex items-center gap-2 py-10 justify-center" style={{ color: 'var(--text-muted)' }}>
            <Icon name="loader" size={16} className="animate-spin" /> Loading events…
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
              <Icon name="chevron-left" size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-lg p-1.5 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

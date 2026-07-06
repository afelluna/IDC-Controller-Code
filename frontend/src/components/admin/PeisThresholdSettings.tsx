import { useEffect, useState, type FormEvent } from 'react';
import { Activity, Check, RotateCcw } from 'lucide-react';
import { Card } from '../ui/Card';
import { INTENSITY_SCALE } from '../../constants';
import {
  DEFAULT_PEIS_BOUNDARIES,
  PEIS_BOUNDARY_COUNT,
  loadPeisBoundaries,
  savePeisBoundaries,
  resetPeisBoundaries,
} from '../../constants/peisConfig';

/**
 * PEIS scale calibration — edits the 9 acceleration cutoffs (m/s²) that map
 * peak ground acceleration to a PEIS level (1–10). Persisted to localStorage
 * via peisConfig.ts; the monitor picks up changes on its next reload.
 *
 * Boundary index `n` (0-based) is the floor of level `n + 2`, so each input is
 * labelled with the level it opens and tinted with that level's scale color.
 */

const toStr = (boundaries: number[]): string[] => boundaries.map((b) => String(b));

export function PeisThresholdSettings() {
  const [form, setForm] = useState<string[]>(() => toStr(loadPeisBoundaries()));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Reload from storage on mount in case another tab/session changed it.
  useEffect(() => {
    setForm(toStr(loadPeisBoundaries()));
  }, []);

  const nums = form.map(Number);
  const filled = form.every((v) => v.trim() !== '');
  const allValid = filled && nums.every((n) => Number.isFinite(n) && n > 0);
  // Strictly increasing across the 9 cutoffs.
  const increasing = allValid && nums.every((n, i) => i === 0 || n > nums[i - 1]);
  const canSave = allValid && increasing && !saving;

  const onChange = (idx: number, value: string) => {
    setForm((f) => f.map((v, i) => (i === idx ? value : v)));
    setMessage(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      savePeisBoundaries(nums);
      setMessage({ type: 'ok', text: 'PEIS scale saved. Reload the monitor to apply.' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    resetPeisBoundaries();
    setForm(toStr([...DEFAULT_PEIS_BOUNDARIES]));
    setMessage({ type: 'ok', text: 'Reverted to PHIVOLCS defaults.' });
  };

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Activity size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          PEIS scale calibration
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
        <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          Acceleration cutoff (m/s²) at which the live reading enters each PEIS level.
          Values must increase from level&nbsp;2 up to level&nbsp;10.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: PEIS_BOUNDARY_COUNT }).map((_, idx) => {
            const level = idx + 2; // boundary[0] = floor of level 2
            const scale = INTENSITY_SCALE.find((s) => s.level === level);
            const below = idx > 0 && nums[idx] <= nums[idx - 1];
            return (
              <label key={idx} className="flex flex-col gap-1">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: scale?.color, border: '1px solid var(--border-default)' }}
                  />
                  → Level {level}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={form[idx]}
                  onChange={(e) => onChange(idx, e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${below ? 'var(--status-error)' : 'var(--border-default)'}`,
                  }}
                />
              </label>
            );
          })}
        </div>

        {allValid && !increasing && (
          <p className="text-xs font-medium" style={{ color: 'var(--status-error)' }}>
            Each cutoff must be larger than the one before it.
          </p>
        )}

        {message && (
          <p
            className="text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5"
            style={
              message.type === 'ok'
                ? { backgroundColor: 'rgba(94,140,106,0.12)', color: 'var(--status-live)' }
                : { backgroundColor: 'rgba(193,96,92,0.12)', color: 'var(--status-error)' }
            }
          >
            {message.type === 'ok' && <Check size={13} />}
            {message.text}
          </p>
        )}

        <div className="flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={13} /> Reset to defaults
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)', color: '#ffffff' }}
          >
            Save scale
          </button>
        </div>
      </form>
    </Card>
  );
}

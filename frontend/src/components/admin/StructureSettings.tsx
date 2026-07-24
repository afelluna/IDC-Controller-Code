import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { getStructureInfo, saveStructureInfo, type BuildingType } from '../../lib/structureInfo';

interface FormState {
  structure_name: string;
  building_type: BuildingType;
  location: string;
  latitude: string;
  longitude: string;
}

const EMPTY: FormState = {
  structure_name: '',
  building_type: 'Lowrise Building',
  location: '',
  latitude: '',
  longitude: '',
};

const BUILDING_TYPES: BuildingType[] = ['Lowrise Building', 'Highrise Building', 'Other'];

/**
 * Structure identity — the building/site being monitored (name, type,
 * location, coordinates). This is what report generation reads: an event
 * report is about the structure the event happened to, not the device.
 *
 * Stored in localStorage rather than the backend/DB: same constraint as
 * DeviceSettings — the deployed backend build predates the dedicated route
 * and DB columns. Switch to seismicApi.updateStructureInfo once redeployed.
 */
export function StructureSettings() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const saved = getStructureInfo();
    if (saved) {
      setForm({
        structure_name: saved.structure_name,
        building_type: saved.building_type,
        location: saved.location,
        latitude: String(saved.latitude),
        longitude: String(saved.longitude),
      });
    }
  }, []);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      saveStructureInfo({
        structure_name: form.structure_name,
        building_type: form.building_type,
        location: form.location,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setMessage({ type: 'ok', text: 'Structure info saved on this browser.' });
    } catch {
      setMessage({ type: 'err', text: 'Could not save structure info.' });
    } finally {
      setSaving(false);
    }
  };

  const incomplete = !form.structure_name || !form.location || form.latitude === '' || form.longitude === '';

  return (
    <Card style={{ borderTop: '3px solid var(--brand)' }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Icon name="box" size={16} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Structure
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Name of structure
            </span>
            <input
              type="text"
              required
              value={form.structure_name}
              onChange={(e) => onChange('structure_name', e.target.value)}
              placeholder="e.g. Salamin Building"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Building type
            </span>
            <select
              value={form.building_type}
              onChange={(e) => onChange('building_type', e.target.value)}
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {BUILDING_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Location
            </span>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => onChange('location', e.target.value)}
              placeholder="e.g. Quezon City, Metro Manila"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Latitude
            </span>
            <input
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              required
              value={form.latitude}
              onChange={(e) => onChange('latitude', e.target.value)}
              placeholder="14.676041"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Longitude
            </span>
            <input
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              required
              value={form.longitude}
              onChange={(e) => onChange('longitude', e.target.value)}
              placeholder="121.043700"
              className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </label>
        </div>

        {message && (
          <p
            className="text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5"
            style={
              message.type === 'ok'
                ? { backgroundColor: 'rgba(94,140,106,0.12)', color: 'var(--status-live)' }
                : { backgroundColor: 'rgba(193,96,92,0.12)', color: 'var(--status-error)' }
            }
          >
            {message.type === 'ok' && <Icon name="check" size={13} />}
            {message.text}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || incomplete}
            className="rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--text-on-accent)' }}
          >
            {saving && <Icon name="loader" size={15} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save structure info'}
          </button>
        </div>
      </form>
    </Card>
  );
}

import type { HistoryEventRow, WaveformSegmentResponse } from '../api/types';
import { integrateAxis, sortedContent } from './waveformIntegration';

const CSV_HEADER = [
  'timestamp_ms',
  'timestamp_iso',
  'x_g',
  'y_g',
  'z_g',
  'intensity',
  'velocity_x_ms',
  'velocity_y_ms',
  'velocity_z_ms',
  'displacement_x_m',
  'displacement_y_m',
  'displacement_z_m',
].join(',');

export function buildEventLogCsv(
  row: HistoryEventRow,
  waveform: WaveformSegmentResponse | null,
): string {
  if (!waveform) {
    return [
      'event_unique_id,timestamp_ms,timestamp_iso,intensity,status,path',
      [row.event_unique_id, row.timestamp, new Date(row.timestamp).toISOString(), row.intensity, row.status, row.path].join(','),
      '# Waveform data unavailable for this event — summary only.',
    ].join('\n');
  }

  const content = sortedContent(waveform);
  const timestamps = content.map((r) => r[1]);
  const xs = content.map((r) => r[2]);
  const ys = content.map((r) => r[3]);
  const zs = content.map((r) => r[4]);

  const vx = integrateAxis(timestamps, xs);
  const vy = integrateAxis(timestamps, ys);
  const vz = integrateAxis(timestamps, zs);

  const lines = content.map((tuple, i) => {
    const [, timestamp, x, y, z, intensity] = tuple;
    return [
      timestamp,
      new Date(timestamp).toISOString(),
      x,
      y,
      z,
      intensity,
      vx.velocity[i].toFixed(6),
      vy.velocity[i].toFixed(6),
      vz.velocity[i].toFixed(6),
      vx.displacement[i].toFixed(6),
      vy.displacement[i].toFixed(6),
      vz.displacement[i].toFixed(6),
    ].join(',');
  });

  return [CSV_HEADER, ...lines].join('\n');
}

export function downloadEventLogCsv(row: HistoryEventRow, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usher-event-log-${row.event_unique_id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

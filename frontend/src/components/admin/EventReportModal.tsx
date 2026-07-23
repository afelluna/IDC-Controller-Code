import { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { seismicApi } from '../../api/seismicApi';
import type { HistoryEventRow, SensorConfig, WaveformSegmentResponse } from '../../api/types';
import { INTENSITY_SCALE, getIntensityMessage, lookupPeisFromPga } from '../../constants';
import { getDeviceInfo, type DeviceInfo } from '../../lib/deviceInfo';
import { integrateAxis, sortedContent, peakGroundAcceleration } from '../../lib/waveformIntegration';
import { peakAcceleration } from '../../lib/seismicMetrics';
import { renderWaveformChartPng, AXIS_COLORS } from '../../lib/waveformChartImage';
import { buildEventReportPdf, type EventReportData } from '../../lib/eventReportPdf';
import { buildEventLogCsv, downloadEventLogCsv } from '../../lib/eventReportCsv';

type Status = 'loading' | 'ready-full' | 'ready-degraded' | 'error';

function peak(values: number[]): number {
  let max = 0;
  for (const v of values) if (Math.abs(v) > Math.abs(max)) max = v;
  return max;
}

export function EventReportModal({ row, onClose }: { row: HistoryEventRow; onClose: () => void }) {
  const [status, setStatus] = useState<Status>('loading');
  const [sensorConfig, setSensorConfig] = useState<SensorConfig | null>(null);
  const [waveform, setWaveform] = useState<WaveformSegmentResponse | null>(null);
  const deviceInfo: DeviceInfo | null = getDeviceInfo();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      setWaveform(null);

      // getBefore appends ".log" itself, so pass the path with that suffix
      // stripped — see seismicApi.getWaveformBefore's comment.
      const pathWithoutExt = row.path.replace(/\.log$/i, '');

      const [configRes, waveformRes] = await Promise.all([
        seismicApi.getSensorConfig().catch(() => null),
        seismicApi.getWaveformBefore(row.event_unique_id, pathWithoutExt).catch(() => null),
      ]);
      if (cancelled) return;

      if (!configRes && !waveformRes) {
        setStatus('error');
        return;
      }

      setSensorConfig(configRes?.success && configRes.data ? configRes.data : null);

      if (waveformRes?.success && waveformRes.data) {
        setWaveform(waveformRes.data);
        setStatus('ready-full');
      } else {
        setStatus('ready-degraded');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [row.event_unique_id, row.path]);

  const scale = INTENSITY_SCALE.find((i) => i.level === row.intensity) || INTENSITY_SCALE[0];
  const intensityInfo = getIntensityMessage(row.intensity);

  // The reading that actually triggered the event to start logging: PGA per
  // axis compared against that axis's configured threshold. An axis "breached"
  // if its peak magnitude met or exceeded the threshold.
  const pga = useMemo(
    () => (waveform ? peakGroundAcceleration(waveform) : null),
    [waveform],
  );
  const breach = useMemo(() => {
    if (!pga || !sensorConfig) return null;
    return {
      x: Math.abs(pga.x) >= sensorConfig.xthold,
      y: Math.abs(pga.y) >= sensorConfig.ythold,
      z: Math.abs(pga.z) >= sensorConfig.zthold,
    };
  }, [pga, sensorConfig]);
  const triggerAxes = breach ? (['x', 'y', 'z'] as const).filter((a) => breach[a]) : [];

  // True simultaneous resultant PGA: max over samples of sqrt(x_i^2+y_i^2+z_i^2).
  // NOT sqrt of the three independent per-axis peaks combined — those can occur
  // at different instants and would overestimate the real resultant magnitude
  // (which is what caused an earlier version of this to disagree with the
  // device's own logged PEIS).
  const pgaMagnitude = useMemo(() => {
    if (!waveform) return null;
    const content = sortedContent(waveform);
    const xs = content.map((r) => r[2]);
    const ys = content.map((r) => r[3]);
    const zs = content.map((r) => r[4]);
    return peakAcceleration(xs, ys, zs);
  }, [waveform]);
  const derivedPeis = pgaMagnitude !== null ? lookupPeisFromPga(pgaMagnitude) : null;

  const buildReportData = (): EventReportData => {
    if (!waveform || !pga || pgaMagnitude === null) {
      return { row, sensorConfig, deviceInfo, waveform: null };
    }
    const merged = sortedContent(waveform);
    const timestamps = merged.map((r) => r[1]);
    const xs = merged.map((r) => r[2]);
    const ys = merged.map((r) => r[3]);
    const zs = merged.map((r) => r[4]);

    const ix = integrateAxis(timestamps, xs);
    const iy = integrateAxis(timestamps, ys);
    const iz = integrateAxis(timestamps, zs);

    const tSec = timestamps.map((ms) => (ms - timestamps[0]) / 1000);

    return {
      row,
      sensorConfig,
      deviceInfo,
      waveform: {
        pga,
        pgaMagnitude,
        peakVelocity: { x: peak(ix.velocity), y: peak(iy.velocity), z: peak(iz.velocity) },
        peakDisplacement: { x: peak(ix.displacement), y: peak(iy.displacement), z: peak(iz.displacement) },
        accelChartPng: renderWaveformChartPng(tSec, [
          { label: 'X', color: AXIS_COLORS.x, values: xs },
          { label: 'Y', color: AXIS_COLORS.y, values: ys },
          { label: 'Z', color: AXIS_COLORS.z, values: zs },
        ], { title: 'Acceleration', yUnit: 'g' }),
        velocityChartPng: renderWaveformChartPng(tSec, [
          { label: 'X', color: AXIS_COLORS.x, values: ix.velocity },
          { label: 'Y', color: AXIS_COLORS.y, values: iy.velocity },
          { label: 'Z', color: AXIS_COLORS.z, values: iz.velocity },
        ], { title: 'Velocity', yUnit: 'm/s' }),
        displacementChartPng: renderWaveformChartPng(tSec, [
          { label: 'X', color: AXIS_COLORS.x, values: ix.displacement },
          { label: 'Y', color: AXIS_COLORS.y, values: iy.displacement },
          { label: 'Z', color: AXIS_COLORS.z, values: iz.displacement },
        ], { title: 'Displacement', yUnit: 'm' }),
      },
    };
  };

  const onDownloadPdf = () => {
    const data = buildReportData();
    const doc = buildEventReportPdf(data);
    doc.save(`usher-event-report-${row.event_unique_id}.pdf`);
  };

  const onDownloadCsv = () => {
    const csv = buildEventLogCsv(row, waveform);
    downloadEventLogCsv(row, csv);
  };

  const busy = status === 'loading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        <Card style={{ borderTop: '3px solid var(--brand)' }} className="max-h-[90vh]">
          <div
            className="px-4 py-3 flex items-center justify-between gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: scale.color, color: scale.text }}
              >
                PEIS {row.intensity}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {intensityInfo.title}
                </span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {new Date(row.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 'calc(90vh - 130px)' }}>
            {status === 'loading' && (
              <div className="flex items-center gap-2 py-10 justify-center" style={{ color: 'var(--text-muted)' }}>
                <Icon name="loader" size={16} className="animate-spin" /> Loading event report…
              </div>
            )}

            {status === 'error' && (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Could not reach the device.
              </div>
            )}

            {(status === 'ready-full' || status === 'ready-degraded') && (
              <>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Device identity
                  </h3>
                  {deviceInfo ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div style={{ color: 'var(--text-muted)' }}>Name</div>
                      <div style={{ color: 'var(--text-primary)' }}>{deviceInfo.device_name}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Location</div>
                      <div style={{ color: 'var(--text-primary)' }}>{deviceInfo.location}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Coordinates</div>
                      <div style={{ color: 'var(--text-primary)' }}>{deviceInfo.latitude}, {deviceInfo.longitude}</div>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not configured — set this in /settings.</p>
                  )}
                </section>

                <section className="grid grid-cols-2 gap-2 text-xs">
                  <div style={{ color: 'var(--text-muted)' }}>Event ID</div>
                  <div className="font-mono truncate" style={{ color: 'var(--text-primary)' }} title={row.event_unique_id}>{row.event_unique_id}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Status</div>
                  <div className="capitalize" style={{ color: 'var(--text-primary)' }}>{row.status}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Logged PEIS</div>
                  <div style={{ color: 'var(--text-primary)' }}>{row.intensity} — {intensityInfo.title}</div>
                </section>

                {pga && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      PGA &amp; PEIS determination
                    </h3>
                    {triggerAxes.length > 0 && (
                      <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--status-error)' }}>
                        Event triggered by {triggerAxes.map((a) => a.toUpperCase()).join(', ')}-axis threshold breach
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      {(['x', 'y', 'z'] as const).map((axis) => {
                        const breached = breach?.[axis];
                        const threshold = sensorConfig ? sensorConfig[`${axis}thold` as 'xthold' | 'ythold' | 'zthold'] : null;
                        return (
                          <div
                            key={axis}
                            className="rounded-lg px-2 py-1.5"
                            style={{
                              backgroundColor: breached ? 'rgba(193,96,92,0.12)' : 'var(--bg-elevated)',
                              border: breached ? '1px solid var(--status-error)' : '1px solid transparent',
                            }}
                          >
                            <div>
                              <span style={{ color: AXIS_COLORS[axis] }} className="font-bold uppercase mr-1">{axis}</span>
                              <span style={{ color: 'var(--text-primary)' }}>{pga[axis].toFixed(4)} g</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                              threshold {threshold ?? '—'} g
                              {breached && <span style={{ color: 'var(--status-error)' }}> · breached</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {pgaMagnitude !== null && derivedPeis && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Combined PGA magnitude <span className="font-mono">{pgaMagnitude.toFixed(4)} g</span> → PEIS{' '}
                        <span className="font-bold">{derivedPeis.level}</span> ({getIntensityMessage(derivedPeis.level).title}, range {derivedPeis.range} g)
                        {derivedPeis.level === row.intensity ? ' — matches logged PEIS.' : ' — differs from logged PEIS.'}
                      </p>
                    )}
                  </section>
                )}

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Configuration
                  </h3>
                  {sensorConfig ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div style={{ color: 'var(--text-muted)' }}>Warrant 1</div>
                      <div style={{ color: 'var(--text-primary)' }}>{sensorConfig.warning}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Warrant 2</div>
                      <div style={{ color: 'var(--text-primary)' }}>{sensorConfig.warrant}</div>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Unavailable.</p>
                  )}
                </section>

                {status === 'ready-degraded' && (
                  <div
                    className="text-xs font-medium rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'rgba(193,96,92,0.10)', color: 'var(--status-error)' }}
                  >
                    Disclaimer: waveform data unavailable — this event's log file could not be read from the device. Summary above is still accurate.
                  </div>
                )}
                {pga && (
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Disclaimer: velocity and displacement in the PDF/CSV are derived from raw acceleration via numerical integration and are approximate.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={onDownloadCsv}
              disabled={busy || status === 'error'}
              className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              <Icon name="file-text" size={14} /> Download CSV
            </button>
            <button
              onClick={onDownloadPdf}
              disabled={busy || status === 'error'}
              className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand)', color: 'var(--text-on-accent)' }}
            >
              <Icon name="download" size={14} /> Download PDF
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

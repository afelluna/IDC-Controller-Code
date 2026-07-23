import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { HistoryEventRow, SensorConfig } from '../api/types';
import type { DeviceInfo } from './deviceInfo';
import { getIntensityMessage, lookupPeisFromPga } from '../constants';

export interface EventReportWaveform {
  pga: { x: number; y: number; z: number };
  pgaMagnitude: number;
  peakVelocity: { x: number; y: number; z: number };
  peakDisplacement: { x: number; y: number; z: number };
  accelChartPng: string;
  velocityChartPng: string;
  displacementChartPng: string;
}

export interface EventReportData {
  row: HistoryEventRow;
  sensorConfig: SensorConfig | null;
  deviceInfo: DeviceInfo | null;
  waveform: EventReportWaveform | null;
}

const BRAND = '#4c6e8c';

function exceededLabel(intensity: number, warning: number, warrant: number): string {
  if (intensity >= warrant) return 'Warrant 2 triggered';
  if (intensity >= warning) return 'Warrant 1 triggered';
  return 'Below thresholds';
}

export function buildEventReportPdf(data: EventReportData): jsPDF {
  const { row, sensorConfig, deviceInfo, waveform } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 15;

  doc.setFontSize(16);
  doc.setTextColor(BRAND);
  doc.text('USHER Seismic Event Report', marginX, 18);
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text(`Generated ${new Date().toLocaleString()}`, 195, 18, { align: 'right' });
  doc.setDrawColor(BRAND);
  doc.setLineWidth(0.5);
  doc.line(marginX, 22, 195, 22);

  const intensityInfo = getIntensityMessage(row.intensity);

  // 1. Device identity
  autoTable(doc, {
    startY: 28,
    head: [['Device Identity', '']],
    body: deviceInfo
      ? [
          ['Device name', deviceInfo.device_name],
          ['Location', deviceInfo.location],
          ['Latitude', String(deviceInfo.latitude)],
          ['Longitude', String(deviceInfo.longitude)],
        ]
      : [['Device identity', 'Not configured — set this in /settings']],
    theme: 'grid',
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 9 },
  });
  let cursorY = (doc as any).lastAutoTable.finalY + 8;

  // 2. Event detail
  autoTable(doc, {
    startY: cursorY,
    head: [['Event Detail', '']],
    body: [
      ['Event ID', row.event_unique_id],
      ['Date', new Date(row.timestamp).toLocaleDateString()],
      ['Time', new Date(row.timestamp).toLocaleTimeString()],
      ['Logged PEIS Level', `${row.intensity} — ${intensityInfo.title}`],
      ['Status', row.status],
      ['Source Path', row.path],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 9 },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 8;

  // 3. PGA -> PEIS determination: the reading(s) that crossed a configured
  // threshold and caused the event to be logged, cross-referenced against
  // the PEIS scale's own acceleration ranges.
  if (waveform && sensorConfig) {
    const axisRow = (axis: 'x' | 'y' | 'z', label: string) => {
      const value = waveform.pga[axis];
      const threshold = sensorConfig[`${axis}thold` as 'xthold' | 'ythold' | 'zthold'];
      const breached = Math.abs(value) >= threshold;
      return [label, `${value.toFixed(4)} g`, `${threshold} g`, breached ? 'Breached — triggered event' : ''];
    };
    autoTable(doc, {
      startY: cursorY,
      head: [['PGA & Threshold Breach', 'Peak reading', 'Threshold', 'Breach']],
      body: [axisRow('x', 'X'), axisRow('y', 'Y'), axisRow('z', 'Z')],
      theme: 'grid',
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 3 && hookData.cell.raw) {
          hookData.cell.styles.textColor = '#991b1b';
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;

    const derived = lookupPeisFromPga(waveform.pgaMagnitude);
    const derivedTitle = getIntensityMessage(derived.level).title;
    doc.setFontSize(9);
    doc.setTextColor('#374151');
    const matchNote = derived.level === row.intensity ? 'matches logged PEIS level' : 'differs from logged PEIS level';
    doc.text(
      doc.splitTextToSize(
        `Combined PGA magnitude (peak resultant of X/Y/Z) = ${waveform.pgaMagnitude.toFixed(4)} g corresponds to PEIS ${derived.level} (${derivedTitle}, range ${derived.range} g) - ${matchNote}.`,
        180,
      ),
      marginX,
      cursorY,
    );
    cursorY += 10;
  } else {
    autoTable(doc, {
      startY: cursorY,
      head: [['PGA & Threshold Breach', '']],
      body: [['X / Y / Z peak readings', 'Unavailable — waveform data not retained for this event']],
      theme: 'grid',
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. Configuration
  if (sensorConfig) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Configuration', 'Value', 'Status']],
      body: [
        ['Warrant 1 (PEIS level)', String(sensorConfig.warning), exceededLabel(row.intensity, sensorConfig.warning, sensorConfig.warrant)],
        ['Warrant 2 (PEIS level)', String(sensorConfig.warrant), ''],
        ['X threshold (g)', String(sensorConfig.xthold), ''],
        ['Y threshold (g)', String(sensorConfig.ythold), ''],
        ['Z threshold (g)', String(sensorConfig.zthold), ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9 },
    });
  } else {
    autoTable(doc, {
      startY: cursorY,
      head: [['Configuration', '']],
      body: [['Sensor configuration', 'Unavailable']],
      theme: 'grid',
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9 },
    });
  }

  // 5. Waveforms
  if (waveform) {
    const charts: Array<[string, string, { x: number; y: number; z: number }, string]> = [
      ['Acceleration', waveform.accelChartPng, waveform.pga, 'g'],
      ['Velocity', waveform.velocityChartPng, waveform.peakVelocity, 'm/s'],
      ['Displacement', waveform.displacementChartPng, waveform.peakDisplacement, 'm'],
    ];
    for (const [label, png, peak, unit] of charts) {
      doc.addPage();
      doc.setFontSize(13);
      doc.setTextColor('#1f2937');
      doc.text(`${label} waveform`, marginX, 18);
      doc.addImage(png, 'PNG', marginX, 24, 180, 64.8);
      doc.setFontSize(9);
      doc.setTextColor('#374151');
      doc.text(
        `Peak X: ${peak.x.toFixed(4)} ${unit}   Peak Y: ${peak.y.toFixed(4)} ${unit}   Peak Z: ${peak.z.toFixed(4)} ${unit}`,
        marginX,
        96,
      );
    }
  }

  // 6. Disclaimer (always last)
  doc.addPage();
  doc.setFontSize(13);
  doc.setTextColor('#1f2937');
  doc.text('Disclaimer', marginX, 18);
  doc.setFontSize(9);
  doc.setTextColor('#374151');
  const disclaimerLines: string[] = [];
  if (!waveform) {
    disclaimerLines.push(
      "Waveform data unavailable for this event — the event's log file could not be read from the " +
      'device. Summary, device, and configuration data above are still accurate.',
    );
  }
  disclaimerLines.push(
    'Velocity and displacement values are derived from raw acceleration readings via numerical ' +
    'integration with high-pass drift correction, and are approximate — provided for reference ' +
    'only, not a substitute for calibrated instrumentation.',
  );
  disclaimerLines.push(
    'The PGA-to-PEIS determination above cross-references the peak combined acceleration reading ' +
    "against the PEIS scale's published ranges; it is independent of, and may occasionally differ " +
    'from, the PEIS level the device itself logged for this event.',
  );
  let y = 26;
  for (const line of disclaimerLines) {
    const wrapped = doc.splitTextToSize(line, 180);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 5 + 4;
  }

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor('#9ca3af');
    doc.text(`Page ${i} of ${pageCount} — Generated by USHER IDC Controller`, marginX, 290);
  }

  return doc;
}

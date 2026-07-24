import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { HistoryEventRow, SensorConfig } from '../api/types';
import type { StructureInfo } from './structureInfo';
import { getIntensityMessage, lookupPeisFromPga } from '../constants';
import { USHER_LOGO_PNG_BASE64 } from '../assets/usherLogoBase64';

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
  structureInfo: StructureInfo | null;
  waveform: EventReportWaveform | null;
}

const NAVY = '#13233F';
const GREEN = '#1E7A3D';
const SLATE = '#44546A';
const MUTED = '#6B7280';
const DARK = '#1F2937';
const ROW_FILL = '#F2F5F7';

function exceededLabel(intensity: number, warning: number, warrant: number): string {
  if (intensity >= warrant) return 'Warrant 2 triggered';
  if (intensity >= warning) return 'Warrant 1 triggered';
  return 'Below thresholds';
}

export function buildEventReportPdf(data: EventReportData): jsPDF {
  const { row, sensorConfig, structureInfo, waveform } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 15;
  let section = 0;

  // Numbered section header, USHER-brand style (navy number badge + title).
  const sectionHeader = (y: number, title: string): number => {
    section += 1;
    const num = String(section).padStart(2, '0');
    doc.setFillColor(NAVY);
    doc.rect(marginX, y - 5, 7, 7, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor('#FFFFFF');
    doc.setFont('helvetica', 'bold');
    doc.text(num, marginX + 3.5, y - 0.6, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(NAVY);
    doc.text(title, marginX + 11, y);
    doc.setFont('helvetica', 'normal');
    return y + 6;
  };

  // --- Cover header: logo, brand, structure title, generated timestamp ---
  doc.addImage(USHER_LOGO_PNG_BASE64, 'PNG', marginX, 9, 13, 10);
  doc.setFontSize(13);
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('USHER Technologies Inc.', marginX + 17, 14.5);
  doc.setFontSize(8.5);
  doc.setTextColor(GREEN);
  doc.setFont('helvetica', 'normal');
  doc.text('USHERing a safer world', marginX + 17, 19);

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(`Generated ${new Date().toLocaleString()}`, 195, 14.5, { align: 'right' });

  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.6);
  doc.line(marginX, 24, 195, 24);

  const structureName = structureInfo?.structure_name || 'Unregistered Structure';
  doc.setFontSize(17);
  doc.setTextColor(DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(structureName.toUpperCase(), marginX, 33);
  doc.setFontSize(10);
  doc.setTextColor(SLATE);
  doc.setFont('helvetica', 'normal');
  doc.text('Earthquake Recording Instrument (ERI) Report', marginX, 39);

  const intensityInfo = getIntensityMessage(row.intensity);
  const tableDefaults = {
    theme: 'plain' as const,
    styles: { fontSize: 9, textColor: DARK, cellPadding: 2 },
    alternateRowStyles: { fillColor: ROW_FILL },
    columnStyles: { 0: { fontStyle: 'bold' as const, textColor: SLATE, cellWidth: 55 } },
  };

  // 1. Structure information — the building/site the event happened to.
  let cursorY = sectionHeader(48, 'Structure Information');
  autoTable(doc, {
    startY: cursorY + 2,
    body: structureInfo
      ? [
          ['Name of Structure', structureInfo.structure_name],
          ['Building Type', structureInfo.building_type],
          ['Location', structureInfo.location],
          ['Coordinates', `${structureInfo.latitude}°, ${structureInfo.longitude}°`],
        ]
      : [['Structure identity', 'Not configured — set this in /settings']],
    ...tableDefaults,
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // 2. Event detail
  cursorY = sectionHeader(cursorY, 'Event Detail');
  autoTable(doc, {
    startY: cursorY + 2,
    body: [
      ['Event ID', row.event_unique_id],
      ['Date', new Date(row.timestamp).toLocaleDateString()],
      ['Time', new Date(row.timestamp).toLocaleTimeString()],
      ['Logged PEIS Level', `${row.intensity} — ${intensityInfo.title}`],
      ['Status', row.status],
      ['Source Path', row.path],
    ],
    ...tableDefaults,
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Intensity & structural threshold — the reading(s) that crossed a
  // configured threshold and caused the event to be logged, cross-referenced
  // against the PEIS scale's own acceleration ranges.
  cursorY = sectionHeader(cursorY, 'Intensity & Structural Threshold');
  if (waveform && sensorConfig) {
    const axisRow = (axis: 'x' | 'y' | 'z', label: string) => {
      const value = waveform.pga[axis];
      const threshold = sensorConfig[`${axis}thold` as 'xthold' | 'ythold' | 'zthold'];
      const breached = Math.abs(value) >= threshold;
      return [label, `${value.toFixed(4)} g`, `${threshold} g`, breached ? 'Breached' : 'No breach'];
    };
    autoTable(doc, {
      startY: cursorY + 2,
      head: [['Axis', 'Peak reading', 'Threshold', 'Breach status']],
      body: [axisRow('x', 'X'), axisRow('y', 'Y'), axisRow('z', 'Z')],
      theme: 'grid',
      headStyles: { fillColor: NAVY, fontSize: 8.5 },
      styles: { fontSize: 9, textColor: DARK },
      alternateRowStyles: { fillColor: ROW_FILL },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 3 && hookData.cell.raw === 'Breached') {
          hookData.cell.styles.textColor = '#991b1b';
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;

    const derived = lookupPeisFromPga(waveform.pgaMagnitude);
    const derivedTitle = getIntensityMessage(derived.level).title;
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    const matchNote = derived.level === row.intensity ? 'matches logged PEIS level' : 'differs from logged PEIS level';
    doc.text(
      doc.splitTextToSize(
        `Combined PGA magnitude (peak resultant of X/Y/Z) = ${waveform.pgaMagnitude.toFixed(4)} g corresponds to PEIS ${derived.level} (${derivedTitle}, range ${derived.range} g) — ${matchNote}.`,
        180,
      ),
      marginX,
      cursorY,
    );
    cursorY += 10;
  } else {
    autoTable(doc, {
      startY: cursorY + 2,
      body: [['X / Y / Z peak readings', 'Unavailable — waveform data not retained for this event']],
      ...tableDefaults,
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 4. Configuration & sensor thresholds
  cursorY = sectionHeader(cursorY, 'Configuration & Sensor Thresholds');
  if (sensorConfig) {
    autoTable(doc, {
      startY: cursorY + 2,
      head: [['Configuration', 'Value', 'Status']],
      body: [
        ['Warrant 1 (PEIS level)', String(sensorConfig.warning), exceededLabel(row.intensity, sensorConfig.warning, sensorConfig.warrant)],
        ['Warrant 2 (PEIS level)', String(sensorConfig.warrant), ''],
        ['X threshold (g)', String(sensorConfig.xthold), ''],
        ['Y threshold (g)', String(sensorConfig.ythold), ''],
        ['Z threshold (g)', String(sensorConfig.zthold), ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: NAVY, fontSize: 8.5 },
      styles: { fontSize: 9, textColor: DARK },
      alternateRowStyles: { fillColor: ROW_FILL },
    });
  } else {
    autoTable(doc, {
      startY: cursorY + 2,
      body: [['Sensor configuration', 'Unavailable']],
      ...tableDefaults,
    });
  }

  // 5. Waveform analysis (one page per waveform, all under the same
  // numbered section since they're one continuous set of charts).
  if (waveform) {
    const charts: Array<[string, string, { x: number; y: number; z: number }, string]> = [
      ['Acceleration', waveform.accelChartPng, waveform.pga, 'g'],
      ['Velocity', waveform.velocityChartPng, waveform.peakVelocity, 'm/s'],
      ['Displacement', waveform.displacementChartPng, waveform.peakDisplacement, 'm'],
    ];
    charts.forEach(([label, png, peak, unit], i) => {
      doc.addPage();
      if (i === 0) {
        sectionHeader(18, 'Waveform Analysis');
      } else {
        doc.setFontSize(12);
        doc.setTextColor(NAVY);
        doc.setFont('helvetica', 'bold');
        doc.text('Waveform Analysis', marginX, 18);
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(10.5);
      doc.setTextColor(SLATE);
      doc.text(`${label} waveform`, marginX, 26);
      doc.addImage(png, 'PNG', marginX, 30, 180, 64.8);
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text(
        `Peak X: ${peak.x.toFixed(4)} ${unit}   Peak Y: ${peak.y.toFixed(4)} ${unit}   Peak Z: ${peak.z.toFixed(4)} ${unit}`,
        marginX,
        102,
      );
    });
  }

  // 6. Disclaimer (always last, unnumbered)
  doc.addPage();
  doc.setFontSize(13);
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Disclaimer', marginX, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(DARK);
  const disclaimerLines: string[] = [
    'In no event, unless required by applicable law or agreed to in writing, shall USHER Technologies Inc., ' +
    'or any person be liable for any loss, expense, or damage of any type or nature arising out of the use ' +
    'of, or inability to use, this software or program, including but not limited to claims, suits, or ' +
    'causes of action involving alleged infringement of copyrights, patents, trademarks, trade secrets, or ' +
    'unfair competition.',
  ];
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

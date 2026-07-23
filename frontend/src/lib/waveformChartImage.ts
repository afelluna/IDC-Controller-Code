// Matches Seismogram.tsx's live-chart X/Y/Z colors so the static report
// image is visually consistent with the dashboard.
export const AXIS_COLORS = { x: '#f87171', y: '#38bdf8', z: '#34d399' };

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

interface RenderOptions {
  title: string;
  yUnit: string;
  width?: number;
  height?: number;
}

// Plain Canvas 2D line chart rendered offscreen to a PNG data URL, for
// embedding in the PDF report. Not uPlot: this is a one-shot static image
// export, not an interactive chart, so it draws its own axis labels
// (Seismogram.tsx omits axes entirely because it has a hover tooltip
// instead — a static image has no tooltip, so it must print real numbers).
export function renderWaveformChartPng(
  times: number[],
  series: ChartSeries[],
  opts: RenderOptions,
): string {
  const width = opts.width ?? 1000;
  const height = opts.height ?? 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const margin = { top: 48, right: 24, bottom: 40, left: 64 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(opts.title, margin.left, 26);

  // Legend
  let legendX = margin.left;
  ctx.font = '13px sans-serif';
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(legendX, 32, 12, 12);
    ctx.fillStyle = '#374151';
    ctx.fillText(s.label, legendX + 16, 42);
    legendX += 16 + ctx.measureText(s.label).width + 20;
  }

  if (times.length === 0 || series.every((s) => s.values.length === 0)) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText('No data', margin.left, margin.top + plotH / 2);
    return canvas.toDataURL('image/png');
  }

  let minV = Infinity;
  let maxV = -Infinity;
  for (const s of series) {
    for (const v of s.values) {
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  if (!isFinite(minV) || !isFinite(maxV)) {
    minV = -1;
    maxV = 1;
  }
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const pad = (maxV - minV) * 0.1;
  minV -= pad;
  maxV += pad;

  const tMin = times[0];
  const tMax = times[times.length - 1] || tMin + 1;

  const xPixel = (t: number) => margin.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
  const yPixel = (v: number) => margin.top + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;

  // Gridlines + axis labels
  ctx.strokeStyle = '#e5e7eb';
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px sans-serif';
  ctx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const v = minV + ((maxV - minV) * i) / yTicks;
    const y = yPixel(v);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
    ctx.fillText(`${v.toFixed(3)} ${opts.yUnit}`, 4, y + 4);
  }

  ctx.fillText(`t=${tMin.toFixed(2)}s`, margin.left, height - 10);
  ctx.textAlign = 'right';
  ctx.fillText(`t=${tMax.toFixed(2)}s`, margin.left + plotW, height - 10);
  ctx.textAlign = 'left';

  // Series polylines
  for (const s of series) {
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < s.values.length; i++) {
      const x = xPixel(times[i]);
      const y = yPixel(s.values[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

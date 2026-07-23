import type { WaveformSampleTuple, WaveformSegmentResponse } from '../api/types';

// Per-axis acceleration -> velocity -> displacement over irregularly spaced
// per-sample-log timestamps (unlike seismicMetrics.ts's maxDisplacement,
// which assumes one fixed sample rate for a live-stream buffer). Reuses the
// same high-pass-IIR drift-removal convention as that file, generalized to
// a per-step dt recomputed from each sample's real timestamp delta.
const G_TO_MS2 = 9.80665;
const HIGHPASS_FC_HZ = 0.1;

export interface AxisIntegrationResult {
  velocity: number[];
  displacement: number[];
}

export function integrateAxis(timestampsMs: number[], accelG: number[]): AxisIntegrationResult {
  const n = accelG.length;
  if (n === 0) return { velocity: [], displacement: [] };

  const t = timestampsMs.map((ms) => (ms - timestampsMs[0]) / 1000);
  const accelMs2 = accelG.map((g) => g * G_TO_MS2);

  // High-pass IIR filter (fc ~= 0.1Hz) to strip DC drift, with alpha
  // recomputed per-step from the real dt instead of a single fixed dt.
  const rc = 1 / (2 * Math.PI * HIGHPASS_FC_HZ);
  const filtered = new Array<number>(n);
  filtered[0] = 0;
  let prevRaw = accelMs2[0];
  let prevFiltered = 0;
  for (let i = 1; i < n; i++) {
    const dt = t[i] - t[i - 1];
    if (dt <= 0) {
      filtered[i] = prevFiltered;
      continue;
    }
    const alpha = rc / (rc + dt);
    filtered[i] = alpha * (prevFiltered + accelMs2[i] - prevRaw);
    prevRaw = accelMs2[i];
    prevFiltered = filtered[i];
  }

  const velocity = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dt = t[i] - t[i - 1];
    velocity[i] = velocity[i - 1] + 0.5 * (filtered[i] + filtered[i - 1]) * dt;
  }

  const displacement = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dt = t[i] - t[i - 1];
    displacement[i] = displacement[i - 1] + 0.5 * (velocity[i] + velocity[i - 1]) * dt;
  }

  return { velocity, displacement };
}

export function peakGroundAcceleration(waveform: WaveformSegmentResponse): { x: number; y: number; z: number } {
  return { x: waveform.pgaX, y: waveform.pgaY, z: waveform.pgaZ };
}

// Defensive re-sort by timestamp — the .log file is written as samples
// arrive so it's chronological in practice, but nothing guarantees it.
export function sortedContent(waveform: WaveformSegmentResponse): WaveformSampleTuple[] {
  return [...waveform.content].sort((a, b) => a[1] - b[1]);
}

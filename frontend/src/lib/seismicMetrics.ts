// Pure, side-effect-free metric computations over a rolling X/Y/Z buffer.
// All functions are deterministic and unit-testable in isolation.

/** Median Δt between consecutive timestamps → sample rate in Hz. */
export function estimateSampleRate(times: number[]): number | null {
  if (times.length < 2) return null;
  const deltas: number[] = [];
  for (let i = 1; i < times.length; i++) deltas.push(times[i] - times[i - 1]);
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const medianDt = deltas.length % 2 === 0
    ? (deltas[mid - 1] + deltas[mid]) / 2
    : deltas[mid];
  if (medianDt <= 0) return null;
  return 1 / medianDt;
}

/** Peak √(x²+y²+z²) over the buffer. */
export function peakAcceleration(xs: number[], ys: number[], zs: number[]): number {
  let max = 0;
  for (let i = 0; i < xs.length; i++) {
    const mag = Math.sqrt(xs[i] ** 2 + ys[i] ** 2 + zs[i] ** 2);
    if (mag > max) max = mag;
  }
  return max;
}

// ─── Radix-2 Cooley-Tukey FFT ─────────────────────────────────────────────

function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  // Butterfly passes
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = real[i + j];
        const uIm = imag[i + j];
        const vRe = real[i + j + len / 2] * curRe - imag[i + j + len / 2] * curIm;
        const vIm = real[i + j + len / 2] * curIm + imag[i + j + len / 2] * curRe;
        real[i + j] = uRe + vRe;
        imag[i + j] = uIm + vIm;
        real[i + j + len / 2] = uRe - vRe;
        imag[i + j + len / 2] = uIm - vIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

/**
 * Dominant frequency (Hz) from a magnitude series at a given sample rate.
 * Returns null if the sample rate is unstable or the series is too short.
 * Approximate — labelled "~" in the UI.
 */
export function dominantFrequency(
  magnitudes: number[],
  sampleRate: number | null,
): number | null {
  if (sampleRate === null || sampleRate < 1) return null;
  // Need at least 32 samples; use the largest power-of-2 that fits
  const minSamples = 32;
  if (magnitudes.length < minSamples) return null;

  let n = 1;
  while (n <= magnitudes.length) n <<= 1;
  n >>= 1; // largest power-of-2 ≤ length

  const real = new Float64Array(n);
  const imag = new Float64Array(n);

  // Apply Hann window to reduce spectral leakage
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    real[i] = magnitudes[magnitudes.length - n + i] * w;
  }

  fft(real, imag);

  // Find peak bin (skip DC bin 0)
  let peakBin = 1;
  let peakPower = 0;
  for (let i = 1; i < n / 2; i++) {
    const power = real[i] ** 2 + imag[i] ** 2;
    if (power > peakPower) {
      peakPower = power;
      peakBin = i;
    }
  }

  return (peakBin * sampleRate) / n;
}

// ─── Max Displacement (approximate) ─────────────────────────────────────────

/**
 * Approximate peak displacement (m) via high-pass filtered double-integration.
 * Approximate due to MEMS noise and integration drift — labelled "~" in the UI.
 * Uses a simple 1st-order high-pass IIR to remove DC offset before integrating.
 */
export function maxDisplacement(
  magnitudes: number[],
  sampleRate: number | null,
): number | null {
  if (sampleRate === null || sampleRate < 1 || magnitudes.length < 4) return null;
  const dt = 1 / sampleRate;

  // High-pass IIR filter (fc ≈ 0.1 Hz) to strip DC drift
  const rc = 1 / (2 * Math.PI * 0.1);
  const alpha = rc / (rc + dt);
  const filtered = new Array<number>(magnitudes.length);
  let prevRaw = magnitudes[0];
  let prevFiltered = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    filtered[i] = alpha * (prevFiltered + magnitudes[i] - prevRaw);
    prevRaw = magnitudes[i];
    prevFiltered = filtered[i];
  }

  // First integration: acceleration → velocity
  const velocity = new Array<number>(magnitudes.length).fill(0);
  for (let i = 1; i < filtered.length; i++) {
    velocity[i] = velocity[i - 1] + filtered[i] * dt;
  }

  // Second integration: velocity → displacement
  const displacement = new Array<number>(magnitudes.length).fill(0);
  for (let i = 1; i < velocity.length; i++) {
    displacement[i] = displacement[i - 1] + velocity[i] * dt;
  }

  return Math.max(...displacement.map(Math.abs));
}

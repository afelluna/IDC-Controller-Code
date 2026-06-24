import { describe, it, expect } from 'vitest';
import {
  estimateSampleRate,
  peakAcceleration,
  dominantFrequency,
  maxDisplacement,
} from '../lib/seismicMetrics';

// ─── estimateSampleRate ───────────────────────────────────────────────────────

describe('estimateSampleRate', () => {
  it('returns null for fewer than 2 samples', () => {
    expect(estimateSampleRate([])).toBeNull();
    expect(estimateSampleRate([0])).toBeNull();
  });

  it('computes 10 Hz from uniform 0.1s intervals', () => {
    const times = Array.from({ length: 20 }, (_, i) => i * 0.1);
    const rate = estimateSampleRate(times);
    expect(rate).toBeCloseTo(10, 5);
  });
});

// ─── peakAcceleration ────────────────────────────────────────────────────────

describe('peakAcceleration', () => {
  it('returns 0 for all-zero signal', () => {
    expect(peakAcceleration([0, 0], [0, 0], [0, 0])).toBe(0);
  });

  it('correctly computes √(3²+4²+0²) = 5', () => {
    expect(peakAcceleration([3], [4], [0])).toBeCloseTo(5, 5);
  });

  it('returns the maximum across multiple samples', () => {
    const xs = [1, 0, 3];
    const ys = [0, 1, 4];
    const zs = [0, 0, 0];
    // magnitudes: 1, 1, 5 → peak = 5
    expect(peakAcceleration(xs, ys, zs)).toBeCloseTo(5, 5);
  });
});

// ─── dominantFrequency ───────────────────────────────────────────────────────

describe('dominantFrequency', () => {
  it('returns null for null sample rate', () => {
    const mags = Array(64).fill(1);
    expect(dominantFrequency(mags, null)).toBeNull();
  });

  it('returns null for too few samples', () => {
    const mags = Array(10).fill(1);
    expect(dominantFrequency(mags, 100)).toBeNull();
  });

  it('identifies a 5 Hz tone at 100 Hz sample rate', () => {
    const sampleRate = 100;
    const n = 256;
    const mags = Array.from({ length: n }, (_, i) =>
      Math.sin(2 * Math.PI * 5 * (i / sampleRate))
    );
    const freq = dominantFrequency(mags, sampleRate);
    expect(freq).not.toBeNull();
    // Allow ±1 bin (100/256 ≈ 0.4 Hz resolution)
    expect(Math.abs(freq! - 5)).toBeLessThan(1.5);
  });
});

// ─── maxDisplacement ─────────────────────────────────────────────────────────

describe('maxDisplacement', () => {
  it('returns null for null sample rate', () => {
    expect(maxDisplacement([0, 0, 0, 0], null)).toBeNull();
  });

  it('returns a non-negative value for non-trivial input', () => {
    const sampleRate = 100;
    const mags = Array.from({ length: 200 }, (_, i) =>
      0.01 * Math.sin(2 * Math.PI * 2 * (i / sampleRate))
    );
    const disp = maxDisplacement(mags, sampleRate);
    expect(disp).not.toBeNull();
    expect(disp!).toBeGreaterThanOrEqual(0);
  });

  it('returns ~0 for a constant (DC) signal after high-pass filter', () => {
    const sampleRate = 100;
    const mags = Array(200).fill(0.01);
    const disp = maxDisplacement(mags, sampleRate);
    expect(disp!).toBeLessThan(0.001);
  });
});

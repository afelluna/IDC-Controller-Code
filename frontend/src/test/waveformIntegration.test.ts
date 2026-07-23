import { describe, expect, it } from 'vitest';
import { integrateAxis, sortedContent, peakGroundAcceleration } from '../lib/waveformIntegration';
import type { WaveformSegmentResponse } from '../api/types';

describe('integrateAxis', () => {
  it('returns finite, correctly-shaped output for constant acceleration', () => {
    // A truly constant input is indistinguishable from a MEMS DC offset, so
    // the high-pass filter (by design, same as seismicMetrics.ts's
    // maxDisplacement) drives it to ~0 — this asserts shape/finiteness, not
    // "non-zero", since zero is the physically-correct output here.
    const n = 50;
    const timestamps = Array.from({ length: n }, (_, i) => i * 10); // 10ms spacing
    const accel = Array(n).fill(0.1); // constant 0.1g
    const { velocity, displacement } = integrateAxis(timestamps, accel);

    expect(velocity).toHaveLength(n);
    expect(displacement).toHaveLength(n);
    expect(velocity.every((v) => Number.isFinite(v))).toBe(true);
    expect(displacement.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('produces non-zero motion for a transient pulse', () => {
    const n = 50;
    const timestamps = Array.from({ length: n }, (_, i) => i * 10);
    // A brief pulse in the middle of an otherwise-quiet signal — real
    // motion, not a constant offset, so the high-pass filter should pass it.
    const accel = Array.from({ length: n }, (_, i) => (i >= 20 && i < 25 ? 0.3 : 0));
    const { velocity } = integrateAxis(timestamps, accel);

    expect(Math.max(...velocity.map(Math.abs))).toBeGreaterThan(0);
  });

  it('is sensitive to actual sample spacing, not a fixed assumed rate', () => {
    const n = 50;
    const accel = Array.from({ length: n }, (_, i) => Math.sin(i / 3) * 0.2);

    const uniform = Array.from({ length: n }, (_, i) => i * 10);
    const irregular = Array.from({ length: n }, (_, i) => i * 10 + (i % 2 === 0 ? 0 : 6));

    const a = integrateAxis(uniform, accel);
    const b = integrateAxis(irregular, accel);

    expect(a.velocity).not.toEqual(b.velocity);
  });

  it('returns empty arrays for empty input', () => {
    const { velocity, displacement } = integrateAxis([], []);
    expect(velocity).toEqual([]);
    expect(displacement).toEqual([]);
  });
});

describe('sortedContent', () => {
  it('defensively re-sorts by timestamp', () => {
    const waveform: WaveformSegmentResponse = {
      pgaX: 0, pgaY: 0, pgaZ: 0, intensity: 0,
      content: [
        [1, 300, 0.3, 0.3, 0.3, 1],
        [1, 100, 0.1, 0.1, 0.1, 1],
        [1, 200, 0.2, 0.2, 0.2, 1],
      ],
    };
    expect(sortedContent(waveform).map((r) => r[1])).toEqual([100, 200, 300]);
  });
});

describe('peakGroundAcceleration', () => {
  it('reads pgaX/Y/Z straight off the single-file response', () => {
    const waveform: WaveformSegmentResponse = {
      pgaX: 0.42, pgaY: -0.31, pgaZ: 0.1, intensity: 6,
      content: [],
    };
    expect(peakGroundAcceleration(waveform)).toEqual({ x: 0.42, y: -0.31, z: 0.1 });
  });
});

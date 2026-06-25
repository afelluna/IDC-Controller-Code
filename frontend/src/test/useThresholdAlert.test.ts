import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThresholdAlert } from '../hooks/useThresholdAlert';

// Mirrors the constants inside the hook so the timing assertions stay readable.
const LINGER_MS = 15000;
const COOLDOWN_MS = 8000;
const MIN_VISIBLE_MS = 6000;
const MAX_VISIBLE_MS = 90000;

// warrant=8 (trigger), warning=5 (clear floor) → hysteresis band [5, 8).
const WARRANT = 8;
const WARNING = 5;

describe('useThresholdAlert', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(initial = 1) {
    return renderHook(
      ({ intensity }) => useThresholdAlert(intensity, WARRANT, WARNING),
      { initialProps: { intensity: initial } },
    );
  }

  it('stays hidden below the trigger level', () => {
    const { result } = setup(7); // below warrant=8
    expect(result.current.visible).toBe(false);
  });

  it('pops up on the rising edge and tracks the peak level', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));
    expect(result.current.visible).toBe(true);
    expect(result.current.peakLevel).toBe(8);

    act(() => rerender({ intensity: 9 })); // escalate in place
    expect(result.current.peakLevel).toBe(9);
  });

  it('keeps showing while the level rests in the hysteresis band, then clears below the warning level', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));     // pop up
    expect(result.current.visible).toBe(true);

    // Drops to 6 — below trigger but >= clear (warning=5): still "shaking".
    act(() => rerender({ intensity: 6 }));
    act(() => vi.advanceTimersByTime(LINGER_MS + 100));
    expect(result.current.visible).toBe(true); // linger never started

    // Settles to 4 — below the warning floor: start the linger countdown.
    act(() => rerender({ intensity: 4 }));
    act(() => vi.advanceTimersByTime(LINGER_MS - 100));
    expect(result.current.visible).toBe(true); // still within linger
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.visible).toBe(false); // auto-cleared
  });

  it('does NOT require a return to PEIS 1 — clears once below the warning level (rests at 2–3)', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));
    act(() => rerender({ intensity: 3 })); // noise floor rests at 3, below warning=5
    act(() => vi.advanceTimersByTime(LINGER_MS + 100));
    expect(result.current.visible).toBe(false);
  });

  it('a renewed jolt during linger cancels the countdown and keeps it open', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));
    act(() => rerender({ intensity: 2 }));               // subside → linger starts
    act(() => vi.advanceTimersByTime(LINGER_MS - 1000));
    act(() => rerender({ intensity: 8 }));               // renewed shaking
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.visible).toBe(true);           // countdown was cancelled
  });

  it('ignores manual dismiss before MIN_VISIBLE_MS, honors it after', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));

    act(() => { result.current.dismiss(); });            // too soon
    expect(result.current.visible).toBe(true);

    act(() => vi.advanceTimersByTime(MIN_VISIBLE_MS + 10));
    act(() => { result.current.dismiss(); });            // allowed now
    expect(result.current.visible).toBe(false);
  });

  it('applies a cooldown after hiding so the event tail does not re-pop', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));
    act(() => vi.advanceTimersByTime(MIN_VISIBLE_MS + 10));
    act(() => { result.current.dismiss(); });
    expect(result.current.visible).toBe(false);

    // Immediate re-cross within the cooldown window is ignored.
    act(() => rerender({ intensity: 1 }));
    act(() => rerender({ intensity: 8 }));
    expect(result.current.visible).toBe(false);

    // After the cooldown elapses, a fresh crossing re-triggers.
    act(() => vi.advanceTimersByTime(COOLDOWN_MS + 10));
    act(() => rerender({ intensity: 1 }));
    act(() => rerender({ intensity: 8 }));
    expect(result.current.visible).toBe(true);
  });

  it('force-clears at the absolute max-visible cap even if shaking never subsides', () => {
    const { result, rerender } = setup(1);
    act(() => rerender({ intensity: 8 }));
    // Hold at/above the trigger the whole time.
    act(() => vi.advanceTimersByTime(MAX_VISIBLE_MS + 100));
    expect(result.current.visible).toBe(false);
  });

  it('falls back to the default trigger (PEIS 6) when warrant is unset (<=0)', () => {
    const { result, rerender } = renderHook(
      ({ intensity }) => useThresholdAlert(intensity, 0, 0),
      { initialProps: { intensity: 1 } },
    );
    act(() => rerender({ intensity: 5 }));
    expect(result.current.visible).toBe(false); // below default 6
    act(() => rerender({ intensity: 6 }));
    expect(result.current.visible).toBe(true);  // at default 6
  });
});

/**
 * PEIS scale calibration — the single source of truth for mapping peak ground
 * acceleration (m/s²) to a PEIS intensity level (1–10).
 *
 * The PGA→PEIS *formula* is fixed (standard PHIVOLCS mapping; input is the peak
 * of √(x²+y²+z²) across a batch). Only the 9 boundary cutoffs are configurable,
 * so calibration tweaks can be applied from /admin without a code deploy.
 *
 * Persistence is browser-local (localStorage), matching how the app already
 * persists `usher-theme` / admin auth. On the single-kiosk RPi the monitor and
 * /admin share one browser, so an admin edit is read by the monitor on reload.
 * This module is the ONE place to swap localStorage for a backend source if a
 * device-global, cross-browser store is ever needed.
 */

export const PEIS_BOUNDARIES_KEY = 'usher-peis-boundaries';

/**
 * Default PHIVOLCS cutoffs in m/s². Index `n` (0-based) is the acceleration at
 * which the level becomes `n + 2` — i.e. boundaries[0] = floor of level 2, …,
 * boundaries[8] = floor of level 10. There are 9 boundaries for 10 levels.
 */
export const DEFAULT_PEIS_BOUNDARIES: readonly number[] = [
  0.0017, 0.005, 0.014, 0.039, 0.092, 0.18, 0.34, 0.65, 1.24,
];

export const PEIS_BOUNDARY_COUNT = DEFAULT_PEIS_BOUNDARIES.length; // 9

/**
 * Validate a candidate boundaries array: exactly 9 finite, positive, strictly
 * increasing numbers. Returns the cleaned number[] or null if invalid.
 */
export function validatePeisBoundaries(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== PEIS_BOUNDARY_COUNT) return null;
  const nums = value.map(Number);
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    if (!Number.isFinite(n) || n <= 0) return null;
    if (i > 0 && n <= nums[i - 1]) return null; // must be strictly increasing
  }
  return nums;
}

/**
 * Read the configured boundaries from localStorage, falling back to the
 * PHIVOLCS defaults on anything missing or invalid. Always returns 9 numbers.
 */
export function loadPeisBoundaries(): number[] {
  try {
    const raw = localStorage.getItem(PEIS_BOUNDARIES_KEY);
    if (raw) {
      const parsed = validatePeisBoundaries(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    // corrupt/unavailable storage → fall through to defaults
  }
  return [...DEFAULT_PEIS_BOUNDARIES];
}

/**
 * Persist boundaries to localStorage. Throws if the array is invalid so callers
 * can surface an error instead of writing garbage.
 */
export function savePeisBoundaries(boundaries: number[]): void {
  const valid = validatePeisBoundaries(boundaries);
  if (!valid) {
    throw new Error('PEIS boundaries must be 9 positive, strictly increasing numbers.');
  }
  localStorage.setItem(PEIS_BOUNDARIES_KEY, JSON.stringify(valid));
}

/** Clear any saved override, reverting the monitor to PHIVOLCS defaults on next read. */
export function resetPeisBoundaries(): void {
  localStorage.removeItem(PEIS_BOUNDARIES_KEY);
}

/**
 * Map a peak acceleration magnitude (m/s²) to a PEIS level (1–10) using the
 * given boundaries. This is the single implementation — both the live monitor
 * and any preview should call it so the scale never drifts.
 */
export function peisFromAccel(
  accel: number,
  boundaries: readonly number[] = loadPeisBoundaries(),
): number {
  let level = 1;
  for (let n = 0; n < boundaries.length; n++) {
    if (accel >= boundaries[n]) level = n + 2;
    else break;
  }
  return level;
}

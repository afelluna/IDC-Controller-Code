import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Drives the kiosk earthquake alert popup. Given the live (peak-held) PEIS
 * intensity and the device's configured alert/warning levels, it decides when
 * an actionable-instruction popup should be visible.
 *
 * Single-tier, with hysteresis read from the device's configurable thresholds
 * (MonitorPage already fetches these from /getSensorConfig and passes them in):
 *   - TRIGGER level = `warrant` ("Alert Level" in /admin). Rising edge pops up.
 *   - CLEAR level   = `warning` when it's a valid lower bound (0 < warning <
 *     warrant), else `warrant`. The shaking is treated as subsiding only once the
 *     reading drops below this — the live signal does NOT reliably return to PEIS
 *     1 (ambient/structural noise often rests at 2–3), so "all clear" must come
 *     from config, not a hardcoded baseline.
 *
 * Timers keep the popup readable and self-managing on an unattended kiosk.
 */

const DEFAULT_WARRANT = 6;     // PEIS VI "Very Strong" — used if warrant unset (<=0)
const LINGER_MS       = 15000; // keep showing this long after shaking subsides
const COOLDOWN_MS     = 8000;  // after hiding, ignore re-crossing to avoid flap
const MIN_VISIBLE_MS  = 6000;  // ignore manual dismiss before this (anti-misclick)
const MAX_VISIBLE_MS  = 90000; // absolute cap — never pin open on an unattended kiosk

interface ThresholdAlertState {
  visible: boolean;
  peakLevel: number;
}

export interface UseThresholdAlert extends ThresholdAlertState {
  dismiss: () => void;
}

/**
 * @param intensity     live peak-held PEIS level (1–10)
 * @param warrantLevel  configured alert/trigger level; <=0 falls back to DEFAULT_WARRANT
 * @param warningLevel  configured warning level, used as the clear (hysteresis) floor
 */
export function useThresholdAlert(
  intensity: number,
  warrantLevel: number,
  warningLevel: number,
): UseThresholdAlert {
  const warrant = warrantLevel > 0 ? warrantLevel : DEFAULT_WARRANT;
  const warning = warningLevel;
  const [state, setState] = useState<ThresholdAlertState>({ visible: false, peakLevel: 0 });

  const lingerTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef        = useRef(0);
  const cooldownUntilRef  = useRef(0);
  const visibleRef        = useRef(false); // mirror of state.visible for the effect

  const clearTimers = useCallback(() => {
    if (lingerTimer.current) { clearTimeout(lingerTimer.current); lingerTimer.current = null; }
    if (maxTimer.current)    { clearTimeout(maxTimer.current);    maxTimer.current = null; }
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    visibleRef.current = false;
    cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
    setState({ visible: false, peakLevel: 0 });
  }, [clearTimers]);

  const dismiss = useCallback(() => {
    if (!visibleRef.current) return;
    if (Date.now() - shownAtRef.current < MIN_VISIBLE_MS) return; // too soon
    hide();
  }, [hide]);

  // Clear level: prefer the configured lower bound, else fall back to warrant.
  const clearLevel = warning > 0 && warning < warrant ? warning : warrant;

  useEffect(() => {
    // ── Rising edge / ongoing shaking at or above the trigger ──
    if (intensity >= warrant) {
      if (!visibleRef.current) {
        if (Date.now() < cooldownUntilRef.current) return; // still cooling down
        visibleRef.current = true;
        shownAtRef.current = Date.now();
        clearTimers();
        maxTimer.current = setTimeout(hide, MAX_VISIBLE_MS);
        setState({ visible: true, peakLevel: intensity });
      } else {
        // Already visible — cancel any pending linger and track the peak reached.
        if (lingerTimer.current) { clearTimeout(lingerTimer.current); lingerTimer.current = null; }
        setState((s) => (intensity > s.peakLevel ? { ...s, peakLevel: intensity } : s));
      }
      return;
    }

    // ── Below trigger while visible: still shaking, or subsiding? ──
    if (visibleRef.current) {
      if (intensity >= clearLevel) {
        // Above the clear level → treat as still shaking; hold off the linger.
        if (lingerTimer.current) { clearTimeout(lingerTimer.current); lingerTimer.current = null; }
      } else if (!lingerTimer.current) {
        // Settled below the clear level → start the linger countdown to auto-hide.
        lingerTimer.current = setTimeout(hide, LINGER_MS);
      }
    }
  }, [intensity, warrant, clearLevel, hide, clearTimers]);

  // Tidy up any pending timers on unmount.
  useEffect(() => () => clearTimers(), [clearTimers]);

  return { visible: state.visible, peakLevel: state.peakLevel, dismiss };
}

export default useThresholdAlert;

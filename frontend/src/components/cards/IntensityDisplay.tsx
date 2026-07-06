import { motion } from 'motion/react';
import { Card } from '../ui/Card';
import { INTENSITY_SCALE, getIntensityMessage } from '../../constants';
import usherLogo from '../../assets/usher-no-text.svg';

interface IntensityDisplayProps {
  intensity: number;
  /** PEIS level at which the card begins the "breathing" signal (config warning level). */
  warningLevel?: number;
  /** PEIS level at which the card escalates to the critical pulse+wave (config alert/warrant level). */
  alertLevel?: number;
}

/**
 * Map a PEIS level to a signal tier driving the card's "alarm" animation.
 * Escalation follows the operator-configured thresholds: breathing starts at the
 * warning level, the critical pulse+wave starts at the alert (warrant) level.
 */
type SignalTier = 'calm' | 'elevated' | 'critical';
function signalTier(level: number, warning: number, alert: number): SignalTier {
  if (level >= alert) return 'critical';
  if (level >= warning) return 'elevated';
  return 'calm';
}

export function IntensityDisplay({
  intensity,
  warningLevel = 5,
  alertLevel = 8,
}: IntensityDisplayProps) {
  const currentIntensityData = INTENSITY_SCALE.find(i => i.level === intensity) || INTENSITY_SCALE[0];
  const msg = getIntensityMessage(intensity);
  const tier = signalTier(intensity, warningLevel, alertLevel);

  return (
    <Card
      className="relative flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: currentIntensityData.color, containerType: 'size' }}
    >
      {/* Radial gradient overlay (static base sheen) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.4)_0%,_transparent_70%)] pointer-events-none" />

      {/* Signal glow — breathes (elevated) or pulses (critical); calm = inert */}
      {tier !== 'calm' && <div className={`peis-glow ${tier}`} aria-hidden="true" />}

      {/* Expanding wave rings — critical tier only */}
      {tier === 'critical' && (
        <>
          <div className="peis-wave" aria-hidden="true" />
          <div className="peis-wave delay" aria-hidden="true" />
        </>
      )}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        key={intensity}
        className="relative z-10 flex-1 h-full w-full min-h-0 flex flex-col items-center justify-center gap-3 px-4 py-3"
      >
        {/* Large level number — shield watermark centered exactly on the number
            (the wrapper's only child is the number span, so the shield's
            translate(-50%,-50%) centering point is the number's own center). */}
        <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0">
          <span className="relative flex items-center justify-center">
            <img
              src={usherLogo}
              alt=""
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none object-contain pointer-events-none drop-shadow-md z-0"
              style={{
                width: 'clamp(200px, 78cqh, 460px)',
                height: 'clamp(200px, 78cqh, 460px)',
                opacity: 0.13,
              }}
            />
            <span
              className="relative z-10 font-black leading-none transition-colors duration-500"
              style={{
                color: currentIntensityData.text,
                fontSize: 'clamp(72px, 34cqh, 220px)',
                textShadow: intensity <= 2
                  ? '0 2px 12px rgba(0,0,0,0.10)'
                  : '0 2px 24px rgba(0,0,0,0.22)',
              }}
            >
              {currentIntensityData.label || intensity}
            </span>
          </span>
        </div>

        {/* Message — premium status panel: soft surface, hairline border */}
        <div
          className="w-full max-w-2xl backdrop-blur-md border rounded-2xl px-6 py-4 text-center shadow-2xl transition-all duration-500 flex flex-col gap-1.5"
          style={{
            backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.04)',
            borderColor:     intensity > 2 ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.08)',
            color: currentIntensityData.text,
          }}
        >
          <h2
            className="font-black uppercase tracking-tight leading-tight"
            style={{ fontSize: 'clamp(15px, 2.6cqh, 26px)' }}
          >
            {msg.title}
          </h2>
          <div className="flex items-center justify-center gap-2 opacity-60" aria-hidden="true">
            <span style={{ width: 20, height: 1, backgroundColor: 'currentColor' }} />
            <span
              className="font-semibold uppercase tracking-[0.2em]"
              style={{ fontSize: 'clamp(8px, 1.2cqh, 11px)' }}
            >
              Phil. Earthquake Intensity Scale
            </span>
            <span style={{ width: 20, height: 1, backgroundColor: 'currentColor' }} />
          </div>
        </div>
      </motion.div>
    </Card>
  );
}

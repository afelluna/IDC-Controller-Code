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
      // Background is the PEIS level's own fixed reference color — this is a
      // safety-critical color-coding standard (white -> red by severity) and
      // must track the actual level, not the surrounding dark theme.
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

      <div
        key={intensity}
        className="peis-value-enter relative z-10 flex-1 w-full min-h-0 flex items-center justify-center gap-4 px-2"
      >
        {/* Shield mark + number — logo watermarked directly behind the digit, centered on it */}
        <span
          className="relative flex items-center justify-center shrink-0"
          style={{ width: 'clamp(96px, 84cqh, 236px)', height: 'clamp(96px, 84cqh, 236px)' }}
        >
          <img
            src={usherLogo}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: 0.1, mixBlendMode: 'multiply', transform: 'scale(1.2)' }}
          />

          <span
            className="relative font-bold leading-none transition-colors duration-500"
            style={{
              color: currentIntensityData.text,
              fontSize: 'clamp(60px, 71cqh, 194px)',
              textShadow: intensity <= 2
                ? '0 2px 10px rgba(0,0,0,0.10)'
                : '0 2px 18px rgba(0,0,0,0.28)',
            }}
          >
            {currentIntensityData.label || intensity}
          </span>
        </span>

        {/* Title — beside the number, centered together as one group in the card */}
        <div className="min-w-0 shrink flex flex-col justify-center text-center">
          <h2
            className="font-bold uppercase tracking-tight leading-tight transition-colors duration-500"
            style={{ fontSize: 'clamp(24px, 20cqh, 56px)', color: currentIntensityData.text }}
          >
            {msg.title}
          </h2>
        </div>
      </div>
    </Card>
  );
}

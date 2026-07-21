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
        className="peis-value-enter relative z-10 flex-1 w-full min-h-0 flex items-center gap-3 px-4"
      >
        {/* Shield mark — fixed left */}
        <span
          className="relative flex items-center justify-center shrink-0"
          style={{ width: 'clamp(40px, 62cqh, 100px)', height: 'clamp(40px, 62cqh, 100px)' }}
        >
          <img
            src={usherLogo}
            alt=""
            aria-hidden="true"
            className="relative w-full h-full object-contain drop-shadow-md"
          />
        </span>

        {/* Big level number */}
        <span
          className="relative shrink-0 font-bold leading-none transition-colors duration-500"
          style={{
            color: currentIntensityData.text,
            fontSize: 'clamp(36px, 68cqh, 130px)',
            textShadow: intensity <= 2
              ? '0 2px 10px rgba(0,0,0,0.10)'
              : '0 2px 18px rgba(0,0,0,0.28)',
          }}
        >
          {currentIntensityData.label || intensity}
        </span>

        {/* Title + caption — right of the number, stacked, left-aligned */}
        <div className="min-w-0 flex-1 flex flex-col gap-1 justify-center">
          <h2
            className="font-bold uppercase tracking-tight leading-tight transition-colors duration-500"
            style={{ fontSize: 'clamp(13px, 11cqh, 26px)', color: currentIntensityData.text }}
          >
            {msg.title}
          </h2>
          <div
            className="flex items-center gap-2 opacity-70 transition-colors duration-500"
            style={{ color: currentIntensityData.text }}
            aria-hidden="true"
          >
            <span style={{ width: 16, height: 1, backgroundColor: 'currentColor' }} />
            <span
              className="font-semibold uppercase tracking-[0.18em]"
              style={{ fontSize: 'clamp(7px, 1.6cqh, 10px)' }}
            >
              Phil. Earthquake Intensity Scale
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

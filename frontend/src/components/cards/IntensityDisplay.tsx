import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '../ui/Card';
import { INTENSITY_SCALE, getIntensityMessage } from '../../constants';
import usherLogo from '../../assets/usher-no-text.svg';

interface IntensityDisplayProps {
  intensity: number;
  acceleration?: number;
  rawX?: number;
  rawY?: number;
  rawZ?: number;
  /** PEIS level at which the card begins the "breathing" signal (config warning level). */
  warningLevel?: number;
  /** PEIS level at which the card escalates to the critical pulse+wave (config alert/warrant level). */
  alertLevel?: number;
}

function manilaTime(): string {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function fmtAxis(v: number | undefined): string {
  if (v === undefined) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(5)}`;
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
  acceleration,
  rawX,
  rawY,
  rawZ,
  warningLevel = 5,
  alertLevel = 8,
}: IntensityDisplayProps) {
  const currentIntensityData = INTENSITY_SCALE.find(i => i.level === intensity) || INTENSITY_SCALE[0];
  const msg = getIntensityMessage(intensity);
  const tier = signalTier(intensity, warningLevel, alertLevel);

  const [clock, setClock] = useState(manilaTime());
  useEffect(() => {
    const id = setInterval(() => setClock(manilaTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card
      className="relative flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: currentIntensityData.color }}
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

      {/* Manila timestamp — absolute top-left */}
      <span
        className="absolute top-2.5 left-4 z-20 font-mono text-xs tracking-wider"
        style={{ color: currentIntensityData.text, opacity: 0.7 }}
      >
        <span className="font-sans font-bold uppercase tracking-[0.15em] text-[10px] opacity-90">TIMESTAMP:</span>{' '}
        {clock} PHT
      </span>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        key={intensity}
        className="relative z-10 flex-1 h-full w-full flex flex-col items-center justify-between gap-2 px-4 pt-9 pb-4"
      >
        {/* Subtitle + Large level number */}
        <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0">
          {/* "PEIS Level" label */}
          <span
            className="font-bold uppercase tracking-[0.25em] opacity-80"
            style={{
              color: currentIntensityData.text,
              fontSize: 'clamp(18px, 3vh, 32px)',
            }}
          >
            PEIS Level
          </span>

          {/* Large level number — shield watermark centered behind it */}
          <span className="relative flex items-center justify-center">
            <img
              src={usherLogo}
              alt=""
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none object-contain pointer-events-none drop-shadow-md z-0"
              style={{
                width: 'clamp(220px, 60vh, 560px)',
                height: 'clamp(220px, 60vh, 560px)',
                opacity: 0.13,
              }}
            />
            <span
              className="relative z-10 font-black leading-none transition-colors duration-500"
              style={{
                color: currentIntensityData.text,
                fontSize: 'clamp(90px, 24vh, 240px)',
                textShadow: intensity <= 2
                  ? '0 2px 12px rgba(0,0,0,0.10)'
                  : '0 2px 24px rgba(0,0,0,0.22)',
              }}
            >
              {currentIntensityData.label || intensity}
            </span>
          </span>
        </div>

        {/* Message + acceleration */}
        <div
          className="w-full max-w-2xl backdrop-blur-md border rounded-2xl px-6 py-4 text-center shadow-2xl transition-all duration-500 flex flex-col gap-2"
          style={{
            backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
            borderColor:     intensity > 2 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
            color: currentIntensityData.text,
          }}
        >
          <h2
            className="font-black uppercase tracking-tight leading-tight"
            style={{ fontSize: 'clamp(18px, 2.6vh, 30px)' }}
          >
            {msg.title}
          </h2>
          {acceleration != null && (
            <div className="flex flex-col items-center gap-1">
              <span
                className="font-bold uppercase tracking-[0.18em] opacity-70"
                style={{ fontSize: 'clamp(9px, 1.4vh, 13px)' }}
              >
                Peak Ground Acceleration (PGA)
              </span>
              <span
                className="inline-block self-center px-4 py-1.5 rounded-full font-mono font-semibold tracking-wide"
                style={{
                  backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                  fontSize: 'clamp(15px, 2.2vh, 24px)',
                }}
              >
                {acceleration.toFixed(5)} g
              </span>
            </div>
          )}
        </div>

        {/* X / Y / Z axis values */}
        <div
          className="flex items-center justify-center gap-8"
          style={{ color: currentIntensityData.text }}
        >
          {(
            [
              { axis: 'X', val: rawX, color: '#ef4444' },
              { axis: 'Y', val: rawY, color: '#3b82f6' },
              { axis: 'Z', val: rawZ, color: '#10b981' },
            ] as const
          ).map(({ axis, val, color }) => (
            <div key={axis} className="flex items-center gap-2">
              <span
                className="font-bold uppercase"
                style={{ color, fontSize: 'clamp(13px, 2vh, 20px)' }}
              >
                {axis}
              </span>
              <span
                className="font-mono font-semibold opacity-85"
                style={{ color: currentIntensityData.text, fontSize: 'clamp(13px, 2vh, 20px)' }}
              >
                {fmtAxis(val)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </Card>
  );
}

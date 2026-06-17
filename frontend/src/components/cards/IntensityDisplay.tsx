import { motion } from 'motion/react';
import { Card } from '../ui/Card';
import { INTENSITY_SCALE, getIntensityMessage } from '../../constants';
import usherLogo from '../../assets/usher-no-text.svg';

interface IntensityDisplayProps {
  intensity: number;
  acceleration?: number;
}

export function IntensityDisplay({ intensity, acceleration }: IntensityDisplayProps) {
  const currentIntensityData = INTENSITY_SCALE.find(i => i.level === intensity) || INTENSITY_SCALE[0];
  const msg = getIntensityMessage(intensity);

  return (
    <Card
      className="relative flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: currentIntensityData.color }}
    >
      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.4)_0%,_transparent_70%)] pointer-events-none" />

      {/* USHER watermark — barely visible texture */}
      <img
        src={usherLogo}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none object-contain pointer-events-none drop-shadow-md z-0"
        style={{
          width: 'clamp(160px, 40vh, 480px)',
          height: 'clamp(160px, 40vh, 480px)',
          opacity: 0.08,
        }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        key={intensity}
        className="relative z-10 flex flex-col items-center justify-center gap-2 w-full"
      >
        {/* "PEIS Level" label */}
        <span
          className="relative z-10 text-sm font-semibold uppercase tracking-[0.2em] opacity-70"
          style={{ color: currentIntensityData.text }}
        >
          PEIS Level
        </span>

        {/* Large level number — the primary alert readout */}
        <span
          className="relative font-black leading-none transition-colors duration-500 z-10 -mt-1"
          style={{
            color: currentIntensityData.text,
            fontSize: 'clamp(96px, 22vh, 200px)',
            // Subtle depth shadow — lighter for high-color backgrounds, stronger for low
            textShadow: intensity <= 2
              ? '0 2px 12px rgba(0,0,0,0.10)'
              : '0 2px 24px rgba(0,0,0,0.22)',
          }}
        >
          {currentIntensityData.label || intensity}
        </span>

        {/* Message box — description + acceleration */}
        <div
          className="relative z-10 w-full max-w-lg backdrop-blur-md border rounded-2xl px-6 py-3 text-center shadow-2xl transition-all duration-500 flex flex-col gap-1"
          style={{
            backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
            borderColor:     intensity > 2 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
            color: currentIntensityData.text,
          }}
        >
          <h2 className="text-base font-black uppercase tracking-tight leading-tight">
            {msg.title}
          </h2>
          {acceleration != null && (
            <span
              className="inline-block self-center px-3 py-1 rounded-full font-mono text-xs font-semibold tracking-wide"
              style={{
                backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
              }}
            >
              {acceleration.toFixed(4)} m/s²
            </span>
          )}
        </div>
      </motion.div>
    </Card>
  );
}

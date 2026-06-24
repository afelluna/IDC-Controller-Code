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

export function IntensityDisplay({ intensity, acceleration, rawX, rawY, rawZ }: IntensityDisplayProps) {
  const currentIntensityData = INTENSITY_SCALE.find(i => i.level === intensity) || INTENSITY_SCALE[0];
  const msg = getIntensityMessage(intensity);

  const [clock, setClock] = useState(manilaTime());
  useEffect(() => {
    const id = setInterval(() => setClock(manilaTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card
      className="relative flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: currentIntensityData.color }}
    >
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.4)_0%,_transparent_70%)] pointer-events-none" />

      {/* Manila timestamp — absolute top-left */}
      <span
        className="absolute top-2 left-3 z-20 font-mono text-[10px] tracking-wider"
        style={{ color: currentIntensityData.text, opacity: 0.65 }}
      >
        {clock} PHT
      </span>

      {/* USHER watermark — larger */}
      <img
        src={usherLogo}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none object-contain pointer-events-none drop-shadow-md z-0"
        style={{
          width: 'clamp(140px, 35vh, 340px)',
          height: 'clamp(140px, 35vh, 340px)',
          opacity: 0.10,
        }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        key={intensity}
        className="relative z-10 flex flex-col items-center justify-center gap-1 w-full"
      >
        {/* "PEIS Level" label */}
        <span
          className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70"
          style={{ color: currentIntensityData.text }}
        >
          PEIS Level
        </span>

        {/* Large level number */}
        <span
          className="font-black leading-none transition-colors duration-500 -mt-1"
          style={{
            color: currentIntensityData.text,
            fontSize: 'clamp(52px, 13vh, 130px)',
            textShadow: intensity <= 2
              ? '0 2px 12px rgba(0,0,0,0.10)'
              : '0 2px 24px rgba(0,0,0,0.22)',
          }}
        >
          {currentIntensityData.label || intensity}
        </span>

        {/* Message + acceleration */}
        <div
          className="w-full max-w-lg backdrop-blur-md border rounded-2xl px-3 py-2 text-center shadow-2xl transition-all duration-500 flex flex-col gap-0.5"
          style={{
            backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
            borderColor:     intensity > 2 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
            color: currentIntensityData.text,
          }}
        >
          <h2 className="text-xs font-black uppercase tracking-tight leading-tight">
            {msg.title}
          </h2>
          {acceleration != null && (
            <span
              className="inline-block self-center px-3 py-1 rounded-full font-mono text-xs font-semibold tracking-wide"
              style={{
                backgroundColor: intensity > 2 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
              }}
            >
              {acceleration.toFixed(5)} m/s²
            </span>
          )}
        </div>

        {/* X / Y / Z axis values */}
        <div
          className="mt-0.5 flex items-center gap-4"
          style={{ color: currentIntensityData.text }}
        >
          {(
            [
              { axis: 'X', val: rawX, color: '#ef4444' },
              { axis: 'Y', val: rawY, color: '#3b82f6' },
              { axis: 'Z', val: rawZ, color: '#10b981' },
            ] as const
          ).map(({ axis, val, color }) => (
            <div key={axis} className="flex items-center gap-1">
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color }}
              >
                {axis}
              </span>
              <span
                className="font-mono text-[11px] font-semibold opacity-80"
                style={{ color: currentIntensityData.text }}
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

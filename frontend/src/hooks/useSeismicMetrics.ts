import { useRef, useEffect, useState } from 'react';
import type { SeismicDataResponse } from '../api/types';
import {
  estimateSampleRate,
  peakAcceleration,
  dominantFrequency,
  maxDisplacement,
} from '../lib/seismicMetrics';

const WINDOW_MS = 60_000;  // 60s rolling buffer
const THROTTLE_MS = 500;   // recompute at most every 500ms

interface SeismicMetrics {
  peakAccel: number;        // m/s² — exact
  dominantFreq: number | null;   // Hz — approximate (~)
  maxDisp: number | null;        // m  — approximate (~)
}

export function useSeismicMetrics(currentData: SeismicDataResponse | null): SeismicMetrics {
  // Rolling buffer stored as refs (never cause re-renders on append)
  const timesRef = useRef<number[]>([]);
  const xsRef    = useRef<number[]>([]);
  const ysRef    = useRef<number[]>([]);
  const zsRef    = useRef<number[]>([]);

  const lastComputeRef = useRef<number>(0);

  const [metrics, setMetrics] = useState<SeismicMetrics>({
    peakAccel: 0,
    dominantFreq: null,
    maxDisp: null,
  });

  useEffect(() => {
    if (!currentData?.raw) return;
    const { time, x, y, z } = currentData.raw;

    // Append
    timesRef.current.push(time / 1000); // store as seconds
    xsRef.current.push(x);
    ysRef.current.push(y);
    zsRef.current.push(z);

    // Trim buffer to WINDOW_MS
    const cutoff = (time - WINDOW_MS) / 1000;
    while (timesRef.current.length > 0 && timesRef.current[0] < cutoff) {
      timesRef.current.shift();
      xsRef.current.shift();
      ysRef.current.shift();
      zsRef.current.shift();
    }

    // Throttle recompute
    const now = Date.now();
    if (now - lastComputeRef.current < THROTTLE_MS) return;
    lastComputeRef.current = now;

    const times = timesRef.current;
    const xs    = xsRef.current;
    const ys    = ysRef.current;
    const zs    = zsRef.current;

    const sampleRate = estimateSampleRate(times);
    const magnitudes = xs.map((_, i) =>
      Math.sqrt(xs[i] ** 2 + ys[i] ** 2 + zs[i] ** 2)
    );

    setMetrics({
      peakAccel:     peakAcceleration(xs, ys, zs),
      dominantFreq:  dominantFrequency(magnitudes, sampleRate),
      maxDisp:       maxDisplacement(magnitudes, sampleRate),
    });
  }, [currentData]);

  return metrics;
}

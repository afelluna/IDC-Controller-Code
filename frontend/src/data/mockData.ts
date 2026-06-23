/**
 * TEMPORARY: Mock data for development.
 * This file will be removed once the Laravel API is connected.
 */

import type { SeismicAlert, SeismogramDataPoint } from '../types';

export const MOCK_HISTORY: SeismicAlert[] = [
  { id: '1', date: 'Mar 23, Thu', time: '14:08', intensity: 7, acceleration: '0.25 g', isCritical: true },
  { id: '2', date: 'Mar 18, Thu', time: '19:08', intensity: 6, acceleration: '0.16 g' },
  { id: '3', date: 'Mar 12, Sat', time: '08:45', intensity: 4, acceleration: '0.08 g' },
];

// Generate a wave-like pattern for the seismogram chart
export function generateSeismogramData(): SeismogramDataPoint[] {
  return Array.from({ length: 100 }, (_, i) => {
    const x = (i / 100) * Math.PI * 10;
    const y = Math.sin(x) * Math.exp(-Math.pow((i - 50) / 20, 2));
    return {
      time: i,
      x: y,
      y: y * 0.8,
      z: y * 0.5,
    };
  });
}

export const MOCK_VELOCITY_DATA = generateSeismogramData();

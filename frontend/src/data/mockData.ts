/**
 * TEMPORARY: Mock data for development.
 * This file will be removed once the Laravel API is connected.
 */

import type { SeismicAlert, HistogramDataPoint, VelocityDataPoint, StatusItem } from '../types';

export const MOCK_HISTORY: SeismicAlert[] = [
  { id: '1', date: 'Mar 23, Thu', time: '14:08', intensity: 7, acceleration: '0.25 g', isCritical: true },
  { id: '2', date: 'Mar 18, Thu', time: '19:08', intensity: 6, acceleration: '0.16 g' },
  { id: '3', date: 'Mar 12, Sat', time: '08:45', intensity: 4, acceleration: '0.08 g' },
];

export const MOCK_HISTOGRAM_DATA: HistogramDataPoint[] = [
  { week: 'W1', value: 20, color: '#3b82f6' },
  { week: 'W2', value: 35, color: '#10b981' },
  { week: 'W3', value: 45, color: '#1a1a1a' },
  { week: 'W4', value: 60, color: '#60a5fa' },
  { week: 'W5', value: 55, color: '#34d399' },
  { week: 'W6', value: 75, color: '#1d4ed8' },
  { week: 'W7', value: 85, color: '#047857' },
  { week: 'W8', value: 95, color: '#000000' },
];

// Generate a wave-like pattern for the velocity chart
export function generateVelocityData(): VelocityDataPoint[] {
  return Array.from({ length: 100 }, (_, i) => {
    const x = (i / 100) * Math.PI * 10;
    const y = Math.sin(x) * Math.exp(-Math.pow((i - 50) / 20, 2)) * 8;
    return {
      time: i,
      velocity: y,
      velocityNeg: -y,
    };
  });
}

export const MOCK_VELOCITY_DATA = generateVelocityData();

export const MOCK_STATUS: StatusItem[] = [
  { label: 'Connection Status', value: 'Connected', status: 'connected' },
  { label: 'Device IP', value: '192.168.12.12', status: 'neutral' },
  { label: 'Sensor Name', value: '[node]', status: 'neutral' },
  { label: 'Warning', value: 'PEIS 2', status: 'warning' },
  { label: 'Warrant', value: 'PEIS 4', status: 'error' },
];

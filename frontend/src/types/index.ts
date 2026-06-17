// --- Shared Types ---

export interface SeismicAlert {
  id: string;
  date: string;
  time: string;
  intensity: number;
  acceleration: string;
  isCritical?: boolean;
}

export interface StatusItem {
  label: string;
  value: string;
  status?: 'connected' | 'warning' | 'error' | 'neutral';
}

export interface IntensityScaleItem {
  level: number;
  label: string;
  range: string;
  color: string;
  text: string;
}

export interface HistogramDataPoint {
  week: string;
  value: number;
  color: string;
}

export interface SeismogramDataPoint {
  time: number;
  x: number;
  y: number;
  z: number;
}

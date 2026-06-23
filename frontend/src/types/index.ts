// --- Shared Types ---

export interface SeismicAlert {
  id: string;
  date: string;
  time: string;
  intensity: number;
  acceleration: string;
  isCritical?: boolean;
}

export interface IntensityScaleItem {
  level: number;
  label: string;
  range: string;
  color: string;
  text: string;
}

export interface SeismogramDataPoint {
  time: number;
  x: number;
  y: number;
  z: number;
}

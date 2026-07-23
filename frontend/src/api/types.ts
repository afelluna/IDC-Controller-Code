// API Response Types

export interface BackendResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SensorConfig {
  warning: number;
  warrant: number;
  xthold: number;
  ythold: number;
  zthold: number;
  admin_def_username?: string;
  admin_def_pass?: string;
  device_name?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ApiResponse<T> extends BackendResponse<T> {}

// A row from /getHistory (getSeismicEvents) or /getHistoryMax|/getAllHistoryMax.
// Same row shape from all three, but `path` semantics differ: getHistory's path
// is a per-sample-log directory (usable with getWaveformDuring/After); the
// Max variants' path is a flat summary .log file (NOT usable with those).
export interface HistoryEventRow {
  event_unique_id: string;
  path: string;
  status: string;
  intensity: number;
  timestamp: number;
}

// One decoded per-sample row from /getDuring or /getAfter's `content` array.
export type WaveformSampleTuple = [number, number, number, number, number, number]; // flag,timestamp,x,y,z,intensity

export interface WaveformSegmentResponse {
  pgaX: number;
  pgaY: number;
  pgaZ: number;
  intensity: number;
  content: WaveformSampleTuple[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Seismic Data API
export interface SensorSample {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  intensity: number;
}

export interface SeismicDataResponse {
  intensity: number;
  acceleration: number;
  timestamp: string;
  device_id: string;
  is_live: boolean;
  raw?: {
    x: number;
    y: number;
    z: number;
    time: number;
  };
  rawSamples?: SensorSample[];
}

export interface SeismicHistoryResponse {
  alerts: Array<{
    id: string;
    intensity: number;
    acceleration: number;
    timestamp: string;
    device_id: string;
    created_at: string;
  }>;
}

export interface SeismicStatsResponse {
  total_alerts: number;
  critical_alerts: number;
  last_alert: string | null;
  storage_used: number;
  storage_total: number;
  devices_online: number;
  devices_total: number;
}

export interface HistogramResponse {
  data: Array<{
    week: string;
    count: number;
    intensity_avg: number;
  }>;
}

export interface VelocityResponse {
  data: Array<{
    timestamp: string;
    velocity: number;
    velocity_negative: number;
  }>;
  is_live: boolean;
}

// WebSocket Events
export interface SeismicEvent {
  type: 'seismic.alert' | 'seismic.update' | 'device.status' | 'thresholds.updated';
  data: SeismicDataResponse | SeismicHistoryResponse | any;
  timestamp: string;
}

export interface DeviceStatusEvent {
  device_id: string;
  status: 'online' | 'offline' | 'error';
  last_seen: string;
  battery_level?: number;
}

// Error Types
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

export interface ValidationError extends ApiError {
  errors: Record<string, string[]>;
}

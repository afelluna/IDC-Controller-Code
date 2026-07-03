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
}

export interface ApiResponse<T> extends BackendResponse<T> {}

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
  type: 'seismic.alert' | 'seismic.update' | 'device.status';
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

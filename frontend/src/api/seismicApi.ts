import apiClient from './client';
import type {
  BackendResponse,
  SensorConfig,
  HistoryEventRow,
  WaveformSegmentResponse,
} from './types';

export const seismicApi = {
  // Get sensor configuration (thresholds, etc.)
  getSensorConfig: (): Promise<BackendResponse<SensorConfig>> =>
    apiClient.get('/getSensorConfig'),

  // Get seismic events history. Unlike getHistoryMax/getAllHistoryMax, these
  // rows' `path` points to a per-sample-log directory, so this is the only
  // history endpoint whose rows can feed getWaveformDuring/getWaveformAfter.
  // Capped server-side at the 6 most-recent events, no "load all" variant.
  getSeismicEvents: (): Promise<BackendResponse<{ history: HistoryEventRow[] }>> =>
    apiClient.get('/getHistory'),

  // Get maximum intensity history (paged)
  getHistoryMax: (): Promise<BackendResponse<{ history: HistoryEventRow[] }>> =>
    apiClient.get('/getHistoryMax'),

  // Get all maximum intensity history
  getAllHistoryMax: (): Promise<BackendResponse<{ history: HistoryEventRow[] }>> =>
    apiClient.get('/getAllHistoryMax', undefined, { timeout: 180000 }),

  // Get storage/disk space information
  getStorageInfo: (): Promise<BackendResponse<any>> =>
    apiClient.get('/getDiskSpace'),

  // Update intensity thresholds
  updateThresholds: (payload: {
    warning: number;
    warrant: number;
    xthold: number;
    ythold: number;
    zthold: number;
  }): Promise<BackendResponse<any>> =>
    apiClient.post('/updateIntensity', payload),

  // Update device/hardware identity (friendly label for the monitoring unit).
  updateDeviceInfo: (payload: {
    device_name: string;
  }): Promise<BackendResponse<any>> =>
    apiClient.post('/updateDeviceInfo', payload),

  // Update structure identity/location (name, building type, location, lat/
  // long) — the building this device monitors. Used for report generation
  // (event reports carry where and what the event happened to).
  updateStructureInfo: (payload: {
    structure_name: string;
    building_type: string;
    location: string;
    latitude: number;
    longitude: number;
  }): Promise<BackendResponse<any>> =>
    apiClient.post('/updateStructureInfo', payload),

  // Calibrate the sensor
  calibrate: (): Promise<BackendResponse<any>> =>
    apiClient.post('/calibrate'),

  // Tech-support admin login. Backend plaintext-compares against
  // config_tbl.admin_def_username / admin_def_pass. After the client.ts
  // interceptor normalizes the response, a valid login is `success === true`.
  loginUser: (username: string, password: string): Promise<BackendResponse<any>> =>
    apiClient.post('/loginUser', { username, password }),

  // Change the device admin password (config_tbl.admin_def_pass).
  changePassword: (newpassword: string): Promise<BackendResponse<any>> =>
    apiClient.post('/changePass', { newpassword }),

  // Reads the full raw per-sample content of a single event's .log file.
  // Despite the endpoint name (intended for a per-sample-directory "before"
  // segment), the backend's getBefore appends ".log" to `path` and reads it
  // as one flat file — which is exactly the max-event summary file EventList
  // already points at via `path`. Pass path WITHOUT the ".log" suffix (the
  // backend adds it) to read that event's complete waveform in one call, no
  // directory scan and no separate /getHistory cross-reference needed.
  getWaveformBefore: (eventId: string, path: string): Promise<BackendResponse<WaveformSegmentResponse>> =>
    apiClient.post('/getBefore', { eventId, path }),

  // Get waveform data during an event. Targets LOGS_EVENT_DIR/LOGS_UPLOADED_EVENT_DIR
  // (a per-event directory of per-sample files) — a different, and on some
  // deployments missing, directory pair than the one the event log itself
  // reads from. Prefer getWaveformBefore for report generation.
  getWaveformDuring: (eventId: string, path: string): Promise<BackendResponse<WaveformSegmentResponse>> =>
    apiClient.post('/getDuring', { eventId, path }),

  // Get waveform data after an event. See getWaveformDuring's note.
  getWaveformAfter: (eventId: string, path: string): Promise<BackendResponse<WaveformSegmentResponse>> =>
    apiClient.post('/getAfter', { eventId, path }),

  // Download a backup zip/log for a specific date and hour
  getBackup: (startDate: string, hour: string): Promise<BackendResponse<any>> =>
    apiClient.get(`/backUp/${startDate}/${hour}`),

  // Get available hours for backup on a specific date
  getAvailableHours: (startDate: string): Promise<BackendResponse<string[]>> =>
    apiClient.get(`/availableHour/${startDate}`),
};

export default seismicApi;

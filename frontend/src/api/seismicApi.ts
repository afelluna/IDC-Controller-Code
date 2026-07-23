import apiClient from './client';
import type {
  BackendResponse,
  SensorConfig,
} from './types';

export const seismicApi = {
  // Get sensor configuration (thresholds, etc.)
  getSensorConfig: (): Promise<BackendResponse<SensorConfig>> =>
    apiClient.get('/getSensorConfig'),

  // Get seismic events history
  getSeismicEvents: (): Promise<BackendResponse<any>> =>
    apiClient.get('/getHistory'),

  // Get maximum intensity history (paged)
  getHistoryMax: (): Promise<BackendResponse<any>> =>
    apiClient.get('/getHistoryMax'),

  // Get all maximum intensity history
  getAllHistoryMax: (): Promise<BackendResponse<any>> =>
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

  // Update device identity/location (name, location label, lat/long) — used
  // for report generation (event log entries carry where the device sits).
  updateDeviceInfo: (payload: {
    device_name: string;
    location: string;
    latitude: number;
    longitude: number;
  }): Promise<BackendResponse<any>> =>
    apiClient.post('/updateDeviceInfo', payload),

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

  // Get waveform data before an event
  getWaveformBefore: (eventId: string, path: string): Promise<BackendResponse<any>> =>
    apiClient.post('/getBefore', { eventId, path }),

  // Get waveform data during an event
  getWaveformDuring: (eventId: string, path: string): Promise<BackendResponse<any>> =>
    apiClient.post('/getDuring', { eventId, path }),

  // Get waveform data after an event
  getWaveformAfter: (eventId: string, path: string): Promise<BackendResponse<any>> =>
    apiClient.post('/getAfter', { eventId, path }),

  // Download a backup zip/log for a specific date and hour
  getBackup: (startDate: string, hour: string): Promise<BackendResponse<any>> =>
    apiClient.get(`/backUp/${startDate}/${hour}`),

  // Get available hours for backup on a specific date
  getAvailableHours: (startDate: string): Promise<BackendResponse<string[]>> =>
    apiClient.get(`/availableHour/${startDate}`),
};

export default seismicApi;

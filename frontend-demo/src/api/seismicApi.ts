import type {
  BackendResponse,
  SensorConfig,
} from './types';
import { MOCK_HISTORY } from '../data/mockData';

/**
 * Mock implementation of the Seismic API for Standalone Demo Mode.
 * This version returns static data and resolved promises, removing the need for a real backend.
 */
export const seismicApi = {
  // Get sensor configuration (thresholds, etc.)
  getSensorConfig: (): Promise<BackendResponse<SensorConfig>> =>
    Promise.resolve({
      success: true,
      data: {
        nodename: 'demo-sensor-v1',
        warning: 4.5,
        warrant: 6.0,
        xthold: 1.0,
        ythold: 1.0,
        zthold: 1.0,
      }
    } as any),

  // Get seismic events history
  getSeismicEvents: (): Promise<BackendResponse<any>> =>
    Promise.resolve({
      success: true,
      data: {
        history: MOCK_HISTORY.map(h => ({
          ...h,
          timestamp: new Date(Date.now() - Math.random() * 10000000).toISOString()
        })),
        unuploadedCount: 0,
        uploadedCount: MOCK_HISTORY.length,
        perminFileCount: 42,
      }
    }),

  // Get maximum intensity history (paged)
  getHistoryMax: (): Promise<BackendResponse<any>> =>
    Promise.resolve({ success: true, data: [] }),

  // Get all maximum intensity history
  getAllHistoryMax: (): Promise<BackendResponse<any>> =>
    Promise.resolve({ success: true, data: [] }),

  // Get storage/disk space information
  getStorageInfo: (): Promise<BackendResponse<any>> =>
    Promise.resolve({
      success: true,
      data: {
        sizeByte: 32 * 1024 * 1024 * 1024,
        freeByte: 18 * 1024 * 1024 * 1024,
      }
    }),

  // Update intensity thresholds
  updateThresholds: (payload: any): Promise<BackendResponse<any>> => {
    console.log('[Demo] Mock updateThresholds:', payload);
    return Promise.resolve({ success: true, data: payload });
  },

  // Calibrate the sensor
  calibrate: (): Promise<BackendResponse<any>> => {
    console.log('[Demo] Mock calibrate trigger');
    return Promise.resolve({ success: true, data: 'Calibration started' });
  },

  // Get waveform data
  getWaveformBefore: (eventId: string, path: string): Promise<BackendResponse<any>> =>
    Promise.resolve({ success: true, data: [] }),

  getWaveformDuring: (eventId: string, path: string): Promise<BackendResponse<any>> =>
    Promise.resolve({ success: true, data: [] }),

  getWaveformAfter: (eventId: string, path: string): Promise<BackendResponse<any>> =>
    Promise.resolve({ success: true, data: [] }),

  // Backup methods
  getBackup: (startDate: string, hour: string): Promise<BackendResponse<any>> =>
    Promise.resolve({ success: true, data: 'Mock backup link' }),

  getAvailableHours: (startDate: string): Promise<BackendResponse<string[]>> =>
    Promise.resolve({ success: true, data: ['01', '02', '03'] }),
};

export default seismicApi;

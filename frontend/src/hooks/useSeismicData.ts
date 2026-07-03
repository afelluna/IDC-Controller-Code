import { useState, useEffect, useCallback } from 'react';
import seismicApi from '../api/seismicApi';
import type {
  SeismicDataResponse,
  SeismicHistoryResponse,
  SeismicStatsResponse,
  ApiError,
} from '../api/types';

// Import mock data for fallback
import {
  MOCK_HISTORY,
} from '../data/mockData';

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

interface UseSeismicDataState {
  currentData: SeismicDataResponse | null;
  history: SeismicHistoryResponse['alerts'];
  // True total number of events on the device (uploaded + unuploaded).
  // `history` is capped at the backend page size (fileCount), so its length
  // is NOT a reliable event count — use this for "No. of Events".
  totalEvents: number;
  stats: SeismicStatsResponse | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseSeismicDataActions {
  setCurrentData: (data: any) => void;
  refreshHistory: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useSeismicData = (): UseSeismicDataState & UseSeismicDataActions => {
  const [state, setState] = useState<UseSeismicDataState>({
    currentData: null,
    history: [],
    totalEvents: 0,
    stats: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: ApiError | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  };

  const setCurrentData = useCallback((data: any) => {
    const x = data.x || 0;
    const y = data.y || 0;
    const z = data.z || 0;
    const normalizedData: SeismicDataResponse = {
      intensity: data.intensity || 0,
      // Use peak acceleration from the batch when available so the value shown
      // in IntensityDisplay matches the PEIS threshold that triggered the level.
      acceleration: data.peakAccel ?? Math.sqrt(x * x + y * y + z * z),
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
      device_id: data.nodename || 'sensor',
      is_live: true,
      raw: {
        x,
        y,
        z,
        time: data.timestamp || Date.now(),
      },
      rawSamples: data.samples || undefined,
    };

    setState(prev => ({
      ...prev,
      currentData: normalizedData,
    }));
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setLoading(true);
      // Use /getAllHistoryMax (eventMax/uploadedeventMax FILES) — the same
      // endpoint the admin EventList reads. /getHistory scans eventMax as
      // per-event DIRECTORIES (legacy layout) and returns nothing on the RPi.
      const response = await seismicApi.getAllHistoryMax();
      const d = response.data as any;
      const history = d?.history || [];
      // Prefer the backend's true total; fall back to the (capped) page length
      // for older backends that don't send totalEvents.
      const totalEvents = typeof d?.totalEvents === 'number'
        ? d.totalEvents
        : (typeof d?.uploadedCount === 'number' && typeof d?.unuploadedCount === 'number'
            ? d.uploadedCount + d.unuploadedCount
            : history.length);
      setState(prev => ({ ...prev, history, totalEvents, error: null }));
    } catch (error) {
      if (useMocks) {
        setState(prev => ({ 
          ...prev, 
          history: MOCK_HISTORY.map(alert => ({
            id: alert.id,
            intensity: alert.intensity,
            acceleration: parseFloat(alert.acceleration.replace(' m/s²', '')),
            timestamp: new Date().toISOString(),
            device_id: 'device-001',
            created_at: new Date().toISOString(),
          })),
          totalEvents: MOCK_HISTORY.length,
          error: null
        }));
      } else {
        setError(error as ApiError);
      }
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await seismicApi.getStorageInfo();
      const storageData = response.data as any;
      
      const GB = 1024 * 1024 * 1024;
      
      setState(prev => ({ 
        ...prev, 
        stats: {
          total_alerts: prev.totalEvents,
          critical_alerts: prev.history.filter((a: any) => a.intensity >= 7).length,
          last_alert: prev.history[0]?.timestamp || null,
          storage_used: (storageData.sizeByte - storageData.freeByte) / GB,
          storage_total: storageData.sizeByte / GB,
          devices_online: 1,
          devices_total: 1
        }, 
        error: null, 
      }));
    } catch (error) {
      if (useMocks) {
        setState(prev => ({
          ...prev,
          stats: {
            total_alerts: 156,
            critical_alerts: 12,
            last_alert: new Date().toISOString(),
            storage_used: 1.2,
            storage_total: 2.0,
            devices_online: 1,
            devices_total: 1,
          },
          error: null
        }));
      } else {
        setError(error as ApiError);
      }
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        refreshHistory(),
        refreshStats(),
      ]);
    } catch (error) {
      setError(error as ApiError);
    } finally {
      setLoading(false);
    }
  }, [refreshHistory, refreshStats]);

  // Load initial data, then keep refreshing history and stats every 30s
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000);

    // Simulation for demo mode
    let simInterval;
    if (useMocks) {
      let tick = 0;
      simInterval = setInterval(() => {
        tick++;
        // Base noise (PEIS 1, <0.0017)
        // Add a bit more "jaggedness" with a secondary high-frequency noise component
        const baseNoise = Math.random() * 0.0008;
        const jitter = (Math.random() - 0.5) * 0.0004;
        let accelTarget = baseNoise + jitter;
        let intensity = 1;

        // Create occasional spikes every 10 seconds (at 100ms intervals, this is every 100 ticks)
        if (tick % 100 === 0) {
          // Randomly choose an intensity level from 2 to 7
          intensity = Math.floor(Math.random() * 6) + 2; 
          
          if (intensity === 2) accelTarget = 0.0017 + Math.random() * (0.005 - 0.0017);
          else if (intensity === 3) accelTarget = 0.005 + Math.random() * (0.014 - 0.005);
          else if (intensity === 4) accelTarget = 0.014 + Math.random() * (0.039 - 0.014);
          else if (intensity === 5) accelTarget = 0.039 + Math.random() * (0.092 - 0.039);
          else if (intensity === 6) accelTarget = 0.092 + Math.random() * (0.18 - 0.092);
          else if (intensity === 7) accelTarget = 0.18 + Math.random() * (0.34 - 0.18);
        }

        // Randomly distribute acceleration magnitude across x, y, z axes with higher variance
        const rx = (Math.random() - 0.5) * 2;
        const ry = (Math.random() - 0.5) * 2;
        const rz = (Math.random() - 0.5) * 2;
        const mag = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
        
        const x = (rx / mag) * accelTarget;
        const y = (ry / mag) * accelTarget;
        const z = (rz / mag) * accelTarget;

        setCurrentData({
          intensity,
          x,
          y,
          z,
          nodename: 'Demo-Node-01'
        });
      }, 100); // 100ms updates (10Hz) for jagged look
    }

    return () => {
      clearInterval(interval);
      if (simInterval) clearInterval(simInterval);
    };
  }, [refreshAll, setCurrentData]);

  return {
    ...state,
    setCurrentData,
    refreshHistory,
    refreshStats,
    refreshAll,
  };
};

export default useSeismicData;

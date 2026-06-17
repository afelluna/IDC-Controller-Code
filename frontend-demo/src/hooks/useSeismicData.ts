import { useState, useEffect, useCallback } from 'react';
import seismicApi from '../api/seismicApi';
import type {
  SeismicDataResponse,
  SeismicHistoryResponse,
  SeismicStatsResponse,
  ApiError,
} from '../api/types';

interface UseSeismicDataState {
  currentData: SeismicDataResponse | null;
  history: SeismicHistoryResponse['alerts'];
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
    // Normalize data for currentData state
    const normalizedData: SeismicDataResponse = {
      intensity: data.intensity || 0,
      velocity: Math.max(Math.abs(data.x || 0), Math.abs(data.y || 0), Math.abs(data.z || 0)),
      acceleration: Math.sqrt(Math.pow(data.x || 0, 2) + Math.pow(data.y || 0, 2) + Math.pow(data.z || 0, 2)),
      timestamp: new Date().toISOString(),
      device_id: data.nodename || 'unknown',
      is_live: true,
      // Pass raw components for charting
      raw: {
        x: data.x || 0,
        y: data.y || 0,
        z: data.z || 0,
        time: Date.now()
      }
    };

    setState(prev => ({
      ...prev,
      currentData: normalizedData,
    }));
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await seismicApi.getSeismicEvents();
      const history = (response.data as any)?.history || [];
      setState(prev => ({ ...prev, history, error: null }));
    } catch (error) {
      setError(error as ApiError);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await seismicApi.getStorageInfo();
      const storageData = response.data as any;
      
      // Convert bytes to GB
      const GB = 1024 * 1024 * 1024;
      
      setState(prev => ({ 
        ...prev, 
        stats: {
          total_alerts: prev.history.length,
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
      setError(error as ApiError);
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
    return () => clearInterval(interval);
  }, [refreshAll]);

  return {
    ...state,
    setCurrentData,
    refreshHistory,
    refreshStats,
    refreshAll,
  };
};

export default useSeismicData;

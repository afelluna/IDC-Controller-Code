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
      // Use /getHistoryMax (capped to fileCount on the backend) for the 30s
      // dashboard poll — NOT /getAllHistoryMax, which reads every file in the
      // eventMax/uploadedEventMax dirs synchronously and unbounded. Those dirs
      // are never pruned by ClearHistory, so as they grow over weeks each poll
      // gets slower until it locks up the whole backend event loop.
      // /getAllHistoryMax is still fine for EventList.tsx's on-demand admin load.
      // /getHistory (non-Max) scans eventMax as per-event DIRECTORIES (legacy
      // layout) and returns nothing on the RPi — don't use that one either.
      const response = await seismicApi.getHistoryMax();
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

    // Simulation for demo mode — mirrors the real sensor's actual batching
    // (~125 samples per ~250ms, see docs/data-flow-specification.md) instead
    // of a single point per tick, so the accelerograph chart's decimation
    // and rolling window get exercised the same way they will with a real
    // device, and the demo waveform reads as an oscillation instead of
    // scattered noise.
    let simInterval;
    if (useMocks) {
      let tick = 0;
      let phase = 0;
      let spikeCount = 0;
      const SAMPLES_PER_BATCH = 125;
      const SAMPLE_SPACING_MS = 2; // 125 * 2ms = 250ms/batch

      simInterval = setInterval(() => {
        tick++;
        // Base noise (PEIS 1, <0.0017)
        let accelTarget = 0.0008;
        let intensity = 1;

        // Occasional spikes every ~10s (40 ticks * 250ms). Demo mode
        // deliberately alternates between breaching Warrant 1 (elevated —
        // the IntensityDisplay "breathing" glow) and Warrant 2 (critical —
        // the pulse + expanding wave rings), instead of picking a fully
        // random 2-7 level, so both signal animations are reliably visible
        // without waiting on luck.
        if (tick % 40 === 0) {
          spikeCount++;
          intensity = spikeCount % 2 === 1 ? 6 : 9; // 6 = elevated (Warrant 1), 9 = critical (Warrant 2)
          if (intensity === 6) accelTarget = 0.092 + Math.random() * (0.18 - 0.092);
          else if (intensity === 9) accelTarget = 0.65 + Math.random() * (1.24 - 0.65);
        }

        // Synthesize a batch of oscillating samples (per-axis sine + light
        // noise) rather than pure random noise, so the waveform reads as
        // motion instead of static. Track the peak sample for the
        // IntensityDisplay X/Y/Z readout, matching how the real firmware
        // reports the batch's peak values.
        const freqHz = 2 + Math.random() * 4; // 2-6Hz dominant, plausible structural response
        const now = Date.now();
        const samples: Array<{ timestamp: number; x: number; y: number; z: number; intensity: number }> = [];
        let peak = { x: 0, y: 0, z: 0, mag: 0 };

        for (let i = 0; i < SAMPLES_PER_BATCH; i++) {
          const t = (i * SAMPLE_SPACING_MS) / 1000;
          const theta = phase + t * freqHz * 2 * Math.PI;
          const noise = () => (Math.random() - 0.5) * accelTarget * 0.15;
          const sx = accelTarget * Math.sin(theta) * 0.6 + noise();
          const sy = accelTarget * Math.sin(theta + Math.PI / 3) * 0.6 + noise();
          const sz = accelTarget * Math.sin(theta + Math.PI / 1.7) * 0.4 + noise();
          const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);
          if (mag > peak.mag) peak = { x: sx, y: sy, z: sz, mag };
          samples.push({ timestamp: now + i * SAMPLE_SPACING_MS, x: sx, y: sy, z: sz, intensity });
        }
        phase += SAMPLES_PER_BATCH * (SAMPLE_SPACING_MS / 1000) * freqHz * 2 * Math.PI;

        setCurrentData({
          intensity,
          x: peak.x,
          y: peak.y,
          z: peak.z,
          nodename: 'Demo-Node-01',
          samples,
        });
      }, 250); // 250ms/batch — matches the real ~125-sample sensor batch cadence
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

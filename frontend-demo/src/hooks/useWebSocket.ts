import { useState, useEffect, useRef } from 'react';
import seismicApi from '../api/seismicApi';
import type { SeismicEvent } from '../api/types';

interface UseWebSocketState {
  connected: boolean;
  error: string | null;
  lastEvent: SeismicEvent | null;
  nodeName: string | null;
}

/**
 * Mock implementation of the WebSocket hook for Standalone Demo Mode.
 * It simulates a real-time data stream using a setInterval loop.
 */
export const useWebSocket = (
  onSeismicEvent?: (event: SeismicEvent) => void
): UseWebSocketState => {
  const [state, setState] = useState<UseWebSocketState>({
    connected: false,
    error: null,
    lastEvent: null,
    nodeName: 'demo-sensor-v1',
  });

  const onEventRef = useRef(onSeismicEvent);

  useEffect(() => {
    onEventRef.current = onSeismicEvent;
  }, [onSeismicEvent]);

  useEffect(() => {
    let isMounted = true;
    let angle = 0;

    const startSimulation = async () => {
      // Fetch mock config to get the name
      const response = await seismicApi.getSensorConfig();
      const nodename = (response.data as any).nodename;

      if (!isMounted) return;
      setState(prev => ({ ...prev, connected: true, nodeName: nodename }));

      console.log('[Demo] Starting real-time seismic simulation...');

      const interval = setInterval(() => {
        if (!isMounted) return;

        angle += 0.2;
        
        // 1. Determine target intensity (1-7, mostly 1-3)
        const isSpike = Math.random() > 0.95; // 5% chance of a spike
        let intensity = 1;
        if (isSpike) {
          intensity = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, 7
        } else {
          intensity = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
        }

        // 2. Generate simulated seismic noise scaled to the chosen intensity
        const baseScale = intensity < 4 ? 0.0001 * intensity : 0.005 * (intensity - 2); 
        const baseNoise = () => (Math.random() - 0.5) * baseScale;
        
        const x = Math.sin(angle) * baseScale + baseNoise();
        const y = Math.cos(angle * 0.8) * baseScale + baseNoise();
        const z = Math.sin(angle * 1.5) * baseScale * 0.5 + baseNoise();

        const peak = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));

        const seismicEvent: SeismicEvent = {
          type: intensity >= 5 ? 'seismic.alert' : 'seismic.update',
          data: {
            nodename,
            intensity,
            x,
            y,
            z,
            acceleration: peak / 9.8, // Fake Gs
          },
          timestamp: new Date().toISOString(),
        };

        setState(prev => ({ ...prev, lastEvent: seismicEvent }));
        if (onEventRef.current) onEventRef.current(seismicEvent);
      }, 50); // 20Hz updates for smoothness

      return interval;
    };

    const simulationPromise = startSimulation();

    return () => {
      isMounted = false;
      simulationPromise.then(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  return state;
};

export default useWebSocket;

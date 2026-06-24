import { useState, useEffect, useRef } from 'react';
// socket.io-client v2.x (matches the server's socket.io@^2.3.0 / EIO=3)
import io from 'socket.io-client';
import seismicApi from '../api/seismicApi';
import { getApiBase } from '../api/runtimeConfig';

// Extract just the hostname/IP from a URL string (e.g. "http://192.168.10.12:3000" → "192.168.10.12")
function extractHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

// Sensor always hardcodes intensity field as 2. Compute PEIS level from peak
// acceleration magnitude (m/s²) matching the original RPi frontend's thresholds.
function peisFromAccel(accel: number): number {
  if (accel < 0.0017) return 1;
  if (accel < 0.005)  return 2;
  if (accel < 0.014)  return 3;
  if (accel < 0.039)  return 4;
  if (accel < 0.092)  return 5;
  if (accel < 0.18)   return 6;
  if (accel < 0.34)   return 7;
  if (accel < 0.65)   return 8;
  if (accel < 1.2)    return 9;
  return 10;
}
import type { SeismicEvent } from '../api/types';

interface UseWebSocketState {
  connected: boolean;
  error: string | null;
  lastEvent: SeismicEvent | null;
  nodeName: string | null;
  serverIp: string | null;
}

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

export const useWebSocket = (
  onSeismicEvent?: (event: SeismicEvent) => void
): UseWebSocketState => {
  const [state, setState] = useState<UseWebSocketState>({
    connected: false,
    error: null,
    lastEvent: null,
    nodeName: null,
    serverIp: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);
  const onEventRef = useRef(onSeismicEvent);

  // Keep ref updated to avoid stale closures in listeners
  useEffect(() => {
    onEventRef.current = onSeismicEvent;
  }, [onSeismicEvent]);

  useEffect(() => {
    let isMounted = true;

    if (useMocks) {
      setState({
        connected: true,
        error: null,
        lastEvent: null,
        nodeName: 'Demo-Node-01',
        serverIp: '192.168.10.12',
      });
      return;
    }

    const initSocket = async () => {
      try {
        // 1. GET /getSensorConfig → get nodeName + actual device IP
        const response = await seismicApi.getSensorConfig();
        const nodename = (response.data as any).nodename;
        const server_ip = (response.data as any).server_ip || null;

        if (!isMounted) return;

        // server_ip comes from os.networkInterfaces() on the RPi; fall back to
        // the IP already in config.json if the backend doesn't return it yet.
        const resolvedIp = server_ip || extractHost(getApiBase());
        setState(prev => ({
          ...prev,
          nodeName: nodename || prev.nodeName,
          serverIp: resolvedIp || prev.serverIp,
        }));

        // 2. Connect Socket.IO to the same backend host:port resolved from
        //    the runtime config (config.json), as the old Angular app did.
        const wsUrl = getApiBase();
        const socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
        }) as any;

        socketRef.current = socket;

        socket.on('connect', () => {
          if (isMounted) setState(prev => ({ ...prev, connected: true, error: null }));
          console.log('Socket.IO connected to:', wsUrl);
        });

        socket.on('disconnect', () => {
          if (isMounted) setState(prev => ({ ...prev, connected: false }));
          console.log('Socket.IO disconnected');
        });

        socket.on('connect_error', (err) => {
          if (isMounted) setState(prev => ({ ...prev, error: err.message, connected: false }));
          console.error('Socket.IO connection error:', err);
        });

        // 3. The server re-broadcasts sensor data as io.emit("node", data) to all
        //    browser clients. Data is a JSON-stringified array of samples:
        //    [[index, timestamp_ms, x, y, z, intensity], ...]
        socket.on("node", (data: any) => {
          try {
            const raw = typeof data === 'string' ? JSON.parse(data) : data;
            if (!Array.isArray(raw) || raw.length === 0) return;

            const samples = raw.map((s: any[]) => ({
              timestamp: s[1],
              x: s[2],
              y: s[3],
              z: s[4],
              intensity: s[5],
            }));

            // Sensor always hardcodes intensity=2. Calculate PEIS from peak
            // acceleration magnitude across all 125 samples in the batch.
            const peakAccel = Math.max(...samples.map(s =>
              Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z)
            ));
            const intensity = peisFromAccel(peakAccel);

            const latest = samples[samples.length - 1];
            const seismicEvent: SeismicEvent = {
              type: 'seismic.update',
              data: { ...latest, intensity, peakAccel, samples },
              timestamp: new Date().toISOString(),
            };
            if (isMounted) setState(prev => ({ ...prev, lastEvent: seismicEvent }));
            if (onEventRef.current) onEventRef.current(seismicEvent);
          } catch {
            // ignore malformed packets
          }
        });

        // 4. socket.on('newfirstalarm', (nodeName) => ...)
        socket.on('newfirstalarm', (incomingNodeName: string) => {
          console.log('[Socket.IO] New first alarm for:', incomingNodeName);
          if (incomingNodeName === nodename) {
            const seismicEvent: SeismicEvent = {
              type: 'seismic.alert',
              data: { nodename: incomingNodeName },
              timestamp: new Date().toISOString(),
            };
            if (isMounted) setState(prev => ({ ...prev, lastEvent: seismicEvent }));
            if (onEventRef.current) onEventRef.current(seismicEvent);
          }
        });

      } catch (err: any) {
        console.error('Failed to initialize WebSocket:', err);
        if (isMounted) {
          setState(prev => ({ ...prev, error: err.message || 'Failed to initialize socket' }));
        }
      }
    };

    initSocket();

    // 6. socket.disconnect() on unmount
    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 5. Expose: { connected, nodeName, lastEvent, error }
  return state;
};

export default useWebSocket;

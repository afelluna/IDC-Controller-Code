import { useState, useEffect, useRef } from 'react';
// socket.io-client v2.x (matches the server's socket.io@^2.3.0 / EIO=3)
import io from 'socket.io-client';
import seismicApi from '../api/seismicApi';
import { getApiBase } from '../api/runtimeConfig';

// Extract just the hostname/IP from a URL string (e.g. "http://192.168.10.12:3000" → "192.168.10.12")
function extractHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

import type { SeismicEvent } from '../api/types';

// Sensor batches ~125 samples per ~250ms (~500 samples/sec native). Scanning
// every raw sample for the batch peak (below) and forwarding all of them to
// the chart is more CPU than the RPi4 kiosk needs — decimate once, here,
// before either consumer sees the batch. Batches still arrive every ~250ms
// so the graph and intensity display stay live; each update just carries
// fewer points. Drop to 4 (125 sps) instead of 2 if 250 is still too heavy.
const NATIVE_SPS = 500;
const TARGET_SPS = 250;
const DECIMATION = Math.max(1, Math.round(NATIVE_SPS / TARGET_SPS));

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
        const nodename = (response.data as any).node_name;
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

        // 3. The server re-broadcasts as io.emit(nodeName, data) — the event name IS
        //    the node name (e.g. "usher02"). Data is a JSON-stringified array of samples:
        //    [[index, timestamp_ms, x, y, z, intensity], ...]
        socket.on(nodename, (data: any) => {
          try {
            const raw = typeof data === 'string' ? JSON.parse(data) : data;
            if (!Array.isArray(raw) || raw.length === 0) return;

            // Decimate before mapping so neither the peak scan nor the chart
            // ever touches the full native-rate array — see DECIMATION above.
            const decimatedRaw = raw.length > DECIMATION
              ? raw.filter((_: any, i: number) => i % DECIMATION === 0)
              : raw;

            const samples = decimatedRaw.map((s: any[]) => ({
              timestamp: s[1],
              x: s[2],
              y: s[3],
              z: s[4],
              intensity: s[5],
            }));

            // Sensor firmware is the single source of truth for PEIS — index 5
            // of each sample is its computed intensity. No client-side
            // recalculation from x/y/z thresholds — but a batch spans ~125
            // samples (~250ms), so a transient spike can land mid-batch and
            // decay back down by the last sample. Taking only the last
            // sample's intensity/x/y/z silently drops that spike — the
            // display never shows or holds the peak that actually crossed a
            // warrant threshold. Scan the whole batch for its peak sample
            // (by acceleration magnitude, matching how intensity escalates)
            // and report that one sample's x/y/z, intensity, and peakAccel
            // together — every displayed readout (X/Y/Z, GND, PEIS) must come
            // from the exact same sample, never mixed across two samples.
            let peak = samples[samples.length - 1];
            let peakAccel = Math.sqrt(peak.x ** 2 + peak.y ** 2 + peak.z ** 2);
            for (const s of samples) {
              const mag = Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2);
              if (mag > peakAccel) {
                peakAccel = mag;
                peak = s;
              }
            }

            const seismicEvent: SeismicEvent = {
              type: 'seismic.update',
              data: { ...peak, peakAccel, samples },
              timestamp: new Date().toISOString(),
            };
            if (isMounted) setState(prev => ({ ...prev, lastEvent: seismicEvent }));
            if (onEventRef.current) onEventRef.current(seismicEvent);
          } catch {
            // ignore malformed packets
          }
        });

        // Admin's threshold save (ConfigController.updateIntensity) broadcasts
        // this so an already-open dashboard updates its warrant tiers right
        // away instead of waiting for the next reload.
        socket.on('thresholds_updated', (payload: any) => {
          const seismicEvent: SeismicEvent = {
            type: 'thresholds.updated',
            data: payload,
            timestamp: new Date().toISOString(),
          };
          if (isMounted) setState(prev => ({ ...prev, lastEvent: seismicEvent }));
          if (onEventRef.current) onEventRef.current(seismicEvent);
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

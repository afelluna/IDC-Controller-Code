import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import seismicApi from '../api/seismicApi';
import type { SeismicEvent } from '../api/types';

interface UseWebSocketState {
  connected: boolean;
  error: string | null;
  lastEvent: SeismicEvent | null;
  nodeName: string | null;
}

export const useWebSocket = (
  onSeismicEvent?: (event: SeismicEvent) => void
): UseWebSocketState => {
  const [state, setState] = useState<UseWebSocketState>({
    connected: false,
    error: null,
    lastEvent: null,
    nodeName: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onSeismicEvent);

  // Keep ref updated to avoid stale closures in listeners
  useEffect(() => {
    onEventRef.current = onSeismicEvent;
  }, [onSeismicEvent]);

  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      try {
        // 1. GET /getSensorConfig → get nodeName
        const response = await seismicApi.getSensorConfig();
        const nodename = (response.data as any).nodename;

        if (!isMounted) return;

        if (!nodename) {
          setState(prev => ({ ...prev, error: 'Node name not found in config' }));
          return;
        }

        setState(prev => ({ ...prev, nodeName: nodename }));

        // 2. const socket = io(VITE_WS_URL)
        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
        const socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
        });

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

        // 3. socket.on(nodeName, (data) => ...)
        socket.on(nodename, (data: any) => {
          console.log(`[Socket.IO] Received data for node ${nodename}:`, data);
          const seismicEvent: SeismicEvent = {
            type: 'seismic.update',
            data: data,
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

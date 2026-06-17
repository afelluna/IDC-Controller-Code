import { useRef, useCallback } from 'react';
import type { SeismogramDataPoint } from '../types';

/**
 * Custom hook to manage a high-performance sliding window buffer for seismogram data.
 */
export const useSeismogramBuffer = (windowSizeMs: number = 60000) => {
  // uPlot expects data as [x-array, y1-array, y2-array, y3-array]
  const bufferRef = useRef<[number[], (number|null)[], (number|null)[], (number|null)[]]>([[], [], [], []]);
  
  const addToBuffer = useCallback((point: SeismogramDataPoint) => {
    const [times, xs, ys, zs] = bufferRef.current;
    
    // Add new data
    times.push(point.time / 1000); 
    xs.push(point.x);
    ys.push(point.y);
    zs.push(point.z);
    
    // Remove old data outside the window
    const cutoff = (point.time - windowSizeMs) / 1000;
    while (times.length > 0 && times[0] < cutoff) {
      times.shift();
      xs.shift();
      ys.shift();
      zs.shift();
    }
  }, [windowSizeMs]);

  const clearBuffer = useCallback(() => {
    bufferRef.current = [[], [], [], []];
  }, []);

  return {
    bufferRef,
    addToBuffer,
    clearBuffer
  };
};

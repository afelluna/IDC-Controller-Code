import { useRef, useCallback, useEffect } from 'react';
import type { VelocityDataPoint } from '../types';

/**
 * Custom hook to manage a high-performance sliding window buffer for seismogram data.
 * It mutates underlying arrays directly to avoid React state overhead for high-frequency updates.
 */
export const useSeismogramBuffer = (windowSizeMs: number = 60000) => {
  // Use refs for the raw data to avoid triggering re-renders on every data point
  // uPlot expects data as [x-array, y1-array, y2-array, ...]
  const bufferRef = useRef<[number[], number[], number[]]>([[], [], []]);
  
  const addToBuffer = useCallback((point: VelocityDataPoint) => {
    const [times, vels, velsNeg] = bufferRef.current;
    
    // Add new data
    times.push(point.time / 1000); // uPlot expects seconds by default or raw numbers
    vels.push(point.velocity);
    velsNeg.push(point.velocityNeg);
    
    // Remove old data outside the window
    const cutoff = (point.time - windowSizeMs) / 1000;
    while (times.length > 0 && times[0] < cutoff) {
      times.shift();
      vels.shift();
      velsNeg.shift();
    }
  }, [windowSizeMs]);

  const clearBuffer = useCallback(() => {
    bufferRef.current = [[], [], []];
  }, []);

  return {
    bufferRef,
    addToBuffer,
    clearBuffer
  };
};

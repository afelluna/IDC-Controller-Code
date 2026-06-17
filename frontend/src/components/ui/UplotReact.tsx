import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface UplotReactProps {
  options: uPlot.Options;
  data: uPlot.AlignedData;
  className?: string;
}

export interface UplotReactHandle {
  instance: uPlot | null;
}

/**
 * A lightweight React wrapper for uPlot.
 * Managed manually to avoid unnecessary React reconciliation on high-frequency data updates.
 */
export const UplotReact = forwardRef<UplotReactHandle, UplotReactProps>(
  ({ options, data, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);

    // Expose the uPlot instance to the parent
    useImperativeHandle(ref, () => ({
      get instance() {
        return chartRef.current;
      },
    }));

    // Initialize chart
    useEffect(() => {
      if (!containerRef.current) return;

      const chart = new uPlot(options, data, containerRef.current);
      chartRef.current = chart;

      return () => {
        chart.destroy();
        chartRef.current = null;
      };
    }, [options]); // Re-create only if options change

    // Data updates are handled imperatively for performance, 
    // but we support declarative data updates for initial/static states.
    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.setData(data);
      }
    }, [data]);

    return <div ref={containerRef} className={className} />;
  }
);

UplotReact.displayName = 'UplotReact';

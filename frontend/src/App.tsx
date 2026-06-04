import { useState, useEffect } from 'react';

// Components
import { LogoCard } from './components/cards/LogoCard';
import { HistoryCard } from './components/cards/HistoryCard';
import { HistogramCard } from './components/cards/HistogramCard';
import { IntensityDisplay } from './components/cards/IntensityDisplay';
import { IntensityLegend } from './components/cards/IntensityLegend';
import { VelocityChart } from './components/cards/VelocityChart';
import { StatusCard } from './components/cards/StatusCard';
import { StorageCard } from './components/cards/StorageCard';

// Hooks
import { useSeismicData } from './hooks/useSeismicData';
import { useWebSocket } from './hooks/useWebSocket';

// Transform API data to component format
const transformHistoryData = (alerts: any[]) => {
  return alerts.slice(0, 10).map(alert => ({
    id: alert.event_unique_id || alert.id,
    date: new Date(alert.timestamp).toLocaleDateString(),
    time: new Date(alert.timestamp).toLocaleTimeString(),
    intensity: alert.intensity,
    acceleration: alert.acceleration ? `${alert.acceleration.toFixed(2)} m/s²` : 'N/A',
    isCritical: alert.intensity >= 7,
  }));
};

const transformHistogramData = (history: any[]) => {
  // Group history by PEIS intensity level (1-10)
  const counts = Array(11).fill(0);
  history.forEach(event => {
    const level = Math.min(Math.floor(event.intensity || 0), 10);
    counts[level]++;
  });

  return counts.slice(1).map((count, i) => {
    const intensity = i + 1;
    return {
      week: `PEIS ${intensity}`,
      value: count,
      color: intensity >= 7 ? '#ef4444' : intensity >= 5 ? '#f59e0b' : '#10b981',
    };
  });
};

export default function App() {
  // Get seismic data and actions from hook
  const {
    currentData,
    history,
    stats,
    velocityBuffer,
    loading,
    error,
    refreshAll,
    setCurrentData,
  } = useSeismicData();
  
  // WebSocket for real-time updates
  const { connected, nodeName, error: wsError } = useWebSocket(
    // Handle seismic events
    (event) => {
      console.log('Received WebSocket event:', event.type, event.data);
      
      if (event.type === 'seismic.update') {
        setCurrentData(event.data);
      }
      
      // Refresh history when an alarm occurs
      if (event.type === 'seismic.alert') {
        console.log('Refreshing history due to alarm');
        refreshAll();
      }
    }
  );

  // Transform data for components
  const transformedHistory = transformHistoryData(history);
  const transformedHistogram = transformHistogramData(history);

  // Extract values from current data
  const intensity = currentData?.intensity || 0;
  const storageUsed = stats?.storage_used || 0;
  const storageTotal = stats?.storage_total || 0;

  // Status data
  const statusData: Array<{
    label: string;
    value: string;
    status: 'connected' | 'warning' | 'error' | 'neutral';
  }> = [
    {
      label: 'System Status',
      value: loading ? 'Loading...' : (error || wsError) ? 'Error' : 'Operational',
      status: (error || wsError) ? 'error' : loading ? 'warning' : 'connected',
    },
    {
      label: 'Node',
      value: nodeName || 'Scanning...',
      status: nodeName ? 'connected' : 'warning',
    },
    {
      label: 'Data Stream',
      value: connected ? 'Live' : 'Disconnected',
      status: connected ? 'connected' : 'error',
    },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#dde1e7] p-2 font-sans text-slate-800 flex flex-col">
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 w-full">

        {/* Left Column */}
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          <LogoCard />
          <HistoryCard alerts={transformedHistory} />
          <HistogramCard data={transformedHistogram} />
        </div>

        {/* Center Column */}
        <div className="col-span-6 flex flex-col gap-2 min-h-0">
          <IntensityDisplay intensity={intensity} acceleration={currentData?.acceleration} />
          <IntensityLegend />
        </div>

        {/* Right Column */}
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          <VelocityChart data={velocityBuffer} isLive={connected} />
          <StatusCard status={statusData} isLive={connected} />
          <StorageCard usedGb={storageUsed} totalGb={storageTotal} />
        </div>

      </div>
    </div>
  );
}

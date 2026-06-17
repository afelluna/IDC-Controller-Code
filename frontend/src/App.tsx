import { useState, useEffect, useCallback } from 'react';

// Components
import { LogoCard } from './components/cards/LogoCard';
import { HistoryCard } from './components/cards/HistoryCard';
import { HistogramCard } from './components/cards/HistogramCard';
import { IntensityDisplay } from './components/cards/IntensityDisplay';
import { IntensityLegend } from './components/cards/IntensityLegend';
import { Seismogram } from './components/cards/Seismogram';
import { StatusCard } from './components/cards/StatusCard';
import { StorageCard } from './components/cards/StorageCard';

// Hooks
import { useSeismicData } from './hooks/useSeismicData';
import { useWebSocket } from './hooks/useWebSocket';

// Transform API data to component format
const transformHistoryData = (alerts: any[]) => {
  return (alerts || []).slice(0, 10).map(alert => {
    // Handle acceleration which can be a number, string ("0.25 g"), or missing
    let accelValue = 'N/A';
    if (alert.acceleration !== undefined && alert.acceleration !== null) {
      const num = parseFloat(String(alert.acceleration));
      if (!isNaN(num)) {
        accelValue = `${num.toFixed(2)} m/s²`;
      } else {
        accelValue = String(alert.acceleration); // Keep as is if it's already a formatted string
      }
    }

    return {
      id: alert.event_unique_id || alert.id,
      date: alert.timestamp ? new Date(alert.timestamp).toLocaleDateString() : 'N/A',
      time: alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A',
      intensity: alert.intensity || 0,
      acceleration: accelValue,
      isCritical: (alert.intensity || 0) >= 7,
    };
  });
};

const transformHistogramData = (history: any[]) => {
  // Group history by PEIS intensity level (1-10)
  const counts = Array(11).fill(0);
  (history || []).forEach(event => {
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
  // ─── Theme State ──────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('usher-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('usher-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  // ─── Seismic Data ─────────────────────────────────────────────────────────
  const {
    currentData,
    history,
    stats,
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

  // ─── Status Data (calm three-state palette) ───────────────────────────────
  const statusData: Array<{
    label: string;
    value: string;
    status: 'connected' | 'warning' | 'error' | 'neutral';
  }> = [
    {
      label: 'System',
      // loading → indigo "Scanning", error → red "Error", ok → green
      value: loading ? 'Loading...' : (error || wsError) ? 'Error' : 'Operational',
      status: (error || wsError) ? 'error' : loading ? 'warning' : 'connected',
    },
    {
      label: 'Node',
      // No node yet → indigo "Scanning" (not orange or red)
      value: nodeName || 'Scanning...',
      status: nodeName ? 'connected' : 'warning',
    },
    {
      label: 'Data Stream',
      // Disconnected → amber "Offline" (not red)
      value: connected ? 'Live' : 'Offline',
      status: connected ? 'connected' : 'error',
    },
  ];

  return (
    <div
      className="h-screen overflow-hidden p-2 font-sans flex flex-col"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 w-full">

        {/* Left Column — secondary / historical data (col-span-2, narrowed to give seismogram more room) */}
        <div className="col-span-2 flex flex-col gap-2 min-h-0">
          <LogoCard
            isLive={connected}
            isDark={theme === 'dark'}
            onThemeToggle={toggleTheme}
          />
          <HistoryCard alerts={transformedHistory} />
          <HistogramCard data={transformedHistogram} />
        </div>

        {/* Center Column — PEIS level display (col-span-6, unchanged) */}
        <div className="col-span-6 flex flex-col gap-2 min-h-0">
          <IntensityDisplay intensity={intensity} acceleration={currentData?.acceleration} />
          <IntensityLegend currentLevel={intensity} />
        </div>

        {/* Right Column — live signal, expanded (col-span-4, was col-span-3) */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          <Seismogram livePoint={currentData} isLive={connected} />
          <StatusCard status={statusData} isLive={connected} />
          <StorageCard usedGb={storageUsed} totalGb={storageTotal} />
        </div>

      </div>
    </div>
  );
}

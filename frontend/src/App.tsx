import { useState, useEffect } from 'react';

// Components
import { LogoCard } from './components/cards/LogoCard';
import { SummaryCard } from './components/cards/SummaryCard';
import { IntensityDisplay } from './components/cards/IntensityDisplay';
import { IntensityLegend } from './components/cards/IntensityLegend';
import { Seismogram } from './components/cards/Seismogram';
import { StatusCard } from './components/cards/StatusCard';
import { StorageCard } from './components/cards/StorageCard';

// Hooks
import { useSeismicData } from './hooks/useSeismicData';
import { useWebSocket } from './hooks/useWebSocket';
import { useSeismicMetrics } from './hooks/useSeismicMetrics';

export default function App() {
  // ─── Theme State ──────────────────────────────────────────────────────────
  const [theme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('usher-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
    (event) => {
      if (event.type === 'seismic.update') {
        setCurrentData(event.data);
      }
      if (event.type === 'seismic.alert') {
        refreshAll();
      }
    }
  );

  // Live derived metrics from rolling 60s buffer
  const { peakAccel, dominantFreq, maxDisp } = useSeismicMetrics(currentData);

  // ─── Derived values ───────────────────────────────────────────────────────
  const intensity     = currentData?.intensity || 0;
  const storageUsed   = stats?.storage_used || 0;
  const storageTotal  = stats?.storage_total || 0;
  const noOfEvents    = history.length;

  // ─── Last-packet freshness tracking ──────────────────────────────────────
  const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (currentData) setLastPacketTime(Date.now());
  }, [currentData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastPacketTime !== null) {
        setSecondsAgo(Math.floor((Date.now() - lastPacketTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastPacketTime]);

  const freshnessLabel = secondsAgo === null
    ? '—'
    : secondsAgo < 2
      ? 'just now'
      : `${secondsAgo}s ago`;

  // ─── Server IP from env ───────────────────────────────────────────────────
  const serverIp = (() => {
    try {
      const url = new URL(import.meta.env.VITE_WS_URL || '');
      return url.hostname;
    } catch {
      return '—';
    }
  })();

  // ─── Status rows ──────────────────────────────────────────────────────────
  const statusData: Array<{
    label: string;
    value: string;
    dot: 'live' | 'scanning' | 'idle' | 'error';
  }> = [
    {
      label: 'Connection',
      value: connected ? 'Live' : 'Offline',
      dot: connected ? 'live' : 'idle',
    },
    {
      label: 'Node',
      value: nodeName || 'Scanning...',
      dot: nodeName ? 'live' : 'scanning',
    },
    {
      label: 'Server',
      value: serverIp,
      dot: (error || wsError) ? 'error' : 'live',
    },
    {
      label: 'Last update',
      value: loading ? 'Loading...' : freshnessLabel,
      dot: secondsAgo !== null && secondsAgo > 10 ? 'idle' : connected ? 'live' : 'idle',
    },
  ];

  return (
    <div
      className="h-screen overflow-hidden p-1.5 flex flex-col"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="flex-1 grid grid-cols-12 gap-1.5 min-h-0 w-full">

        {/* Left Column */}
        <div className="col-span-2 flex flex-col gap-1.5 min-h-0">
          <LogoCard />
          <SummaryCard
            peakAccel={peakAccel}
            noOfEvents={noOfEvents}
            dominantFreq={dominantFreq}
            maxDisp={maxDisp}
          />
        </div>

        {/* Center Column */}
        <div className="col-span-6 flex flex-col gap-1.5 min-h-0">
          <IntensityDisplay
            intensity={intensity}
            acceleration={currentData?.acceleration}
            rawX={currentData?.raw?.x}
            rawY={currentData?.raw?.y}
            rawZ={currentData?.raw?.z}
          />
          <IntensityLegend currentLevel={intensity} />
        </div>

        {/* Right Column */}
        <div className="col-span-4 flex flex-col gap-1.5 min-h-0">
          <Seismogram livePoint={currentData} isLive={connected} />
          <StatusCard status={statusData} isLive={connected} />
          <StorageCard usedGb={storageUsed} totalGb={storageTotal} />
        </div>

      </div>
    </div>
  );
}

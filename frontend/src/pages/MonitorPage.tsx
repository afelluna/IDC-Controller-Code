import { useState, useEffect, useRef } from 'react';

// Components
import { LogoCard } from '../components/cards/LogoCard';
import { SummaryCard } from '../components/cards/SummaryCard';
import { ThresholdCard } from '../components/cards/ThresholdCard';
import { IntensityDisplay } from '../components/cards/IntensityDisplay';
import { IntensityLegend } from '../components/cards/IntensityLegend';
import { Seismogram, type SeismogramHandle } from '../components/cards/Seismogram';
import { StatusCard } from '../components/cards/StatusCard';
import { StorageCard } from '../components/cards/StorageCard';

// Hooks
import { useSeismicData } from '../hooks/useSeismicData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSeismicMetrics } from '../hooks/useSeismicMetrics';

export default function MonitorPage() {
  // ─── Theme State ──────────────────────────────────────────────────────────
  const [theme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('usher-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // ─── Accelerograph ref for direct-push (bypasses React render cycle) ────
  const accelRef = useRef<SeismogramHandle>(null);

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
  const { connected, nodeName, serverIp, error: wsError } = useWebSocket(
    (event) => {
      if (event.type === 'seismic.update') {
        // Push raw samples directly to chart — no React render overhead
        if (event.data.samples) {
          accelRef.current?.pushBatch(event.data.samples);
        }
        // Update intensity/acceleration display via state
        setCurrentData(event.data);
      }
      if (event.type === 'seismic.alert') {
        refreshAll();
      }
    }
  );

  // Live derived metrics from rolling 60s buffer
  const { peakAccel, dominantFreq, maxDisp } = useSeismicMetrics(currentData);

  // ─── Peak-hold display intensity ─────────────────────────────────────────
  // Mirrors the original RPi frontend: when PEIS rises, hold the peak level
  // for HOLD_MS before decaying to the current live level. Without this a
  // 1-2 batch tap (~1s) flashes and disappears before the user can read it.
  const HOLD_MS = 3500;
  const [displayIntensity, setDisplayIntensity] = useState(0);
  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peakHeldRef   = useRef(0);
  const liveIntRef    = useRef(0);  // always current, safe to read inside timeout

  useEffect(() => {
    const raw = currentData?.intensity || 0;
    liveIntRef.current = raw;

    if (raw >= peakHeldRef.current) {
      // New peak — update display immediately and restart hold timer
      peakHeldRef.current = raw;
      setDisplayIntensity(raw);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        peakHeldRef.current = 0;
        setDisplayIntensity(liveIntRef.current);
      }, HOLD_MS);
    }
  }, [currentData?.intensity]);

  // ─── Derived values ───────────────────────────────────────────────────────
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

  // serverIp comes from the backend's os.networkInterfaces() — always the actual LAN IP

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
      value: serverIp || 'Connecting...',
      dot: (error || wsError) ? 'error' : serverIp ? 'live' : 'scanning',
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
        <div className="col-span-2 flex flex-col gap-1.5 min-h-0 overflow-hidden">
          <LogoCard />
          <ThresholdCard />
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
            intensity={displayIntensity}
            acceleration={currentData?.acceleration}
            rawX={currentData?.raw?.x}
            rawY={currentData?.raw?.y}
            rawZ={currentData?.raw?.z}
          />
          <IntensityLegend currentLevel={displayIntensity} />
        </div>

        {/* Right Column */}
        <div className="col-span-4 flex flex-col gap-1.5 min-h-0">
          <Seismogram ref={accelRef} livePoint={currentData} isLive={connected} />
          <StatusCard status={statusData} isLive={connected} />
          <StorageCard usedGb={storageUsed} totalGb={storageTotal} />
        </div>

      </div>
    </div>
  );
}

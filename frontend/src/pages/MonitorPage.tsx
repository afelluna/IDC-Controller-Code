import { useState, useEffect, useRef } from 'react';

// Components
import { SummaryCard } from '../components/cards/SummaryCard';
import { ThresholdCard } from '../components/cards/ThresholdCard';
import { IntensityDisplay } from '../components/cards/IntensityDisplay';
import { Seismogram, type SeismogramHandle } from '../components/cards/Seismogram';
import { StatusCard } from '../components/cards/StatusCard';
import { StorageCard } from '../components/cards/StorageCard';

// Hooks
import { useSeismicData } from '../hooks/useSeismicData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSeismicMetrics } from '../hooks/useSeismicMetrics';
import { seismicApi } from '../api/seismicApi';

function manilaTime(): string {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

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

  // ─── Manila clock — rendered above IntensityDisplay, outside the card ───
  const [clock, setClock] = useState(manilaTime());
  useEffect(() => {
    const id = setInterval(() => setClock(manilaTime()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Seismic Data ─────────────────────────────────────────────────────────
  const {
    currentData,
    totalEvents,
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

  // Mock mode has no websocket event stream (the block above never fires), so
  // its batches arrive via currentData.rawSamples instead — push those to the
  // chart the same way the real event handler does. Guarded so this is a
  // no-op in production (the real path above already pushes samples directly
  // and doesn't rely on this effect).
  useEffect(() => {
    if (import.meta.env.VITE_USE_MOCKS === 'true' && currentData?.rawSamples?.length) {
      accelRef.current?.pushBatch(currentData.rawSamples);
    }
  }, [currentData]);

  // Live derived metrics from rolling 60s buffer
  const { peakAccel, dominantFreq, maxDisp } = useSeismicMetrics(currentData);

  // ─── Signal-animation thresholds (from configured warning/alert levels) ───
  // The intensity card's escalation follows the operator-set thresholds:
  // breathing at the warning level, critical pulse+wave at the alert (warrant)
  // level. Read once from /getSensorConfig (a plain GET — no backend change);
  // fall back to the legacy 5/8 feel if the device is unreachable.
  const [warningLevel, setWarningLevel] = useState(5);
  const [alertLevel, setAlertLevel] = useState(8);

  useEffect(() => {
    seismicApi.getSensorConfig()
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as any;
          const warn = Number(d.warning);
          const alert = Number(d.warrant);
          if (Number.isFinite(warn) && warn > 0) setWarningLevel(warn);
          // Keep alert at or above warning so tiers stay ordered.
          if (Number.isFinite(alert) && alert > 0) setAlertLevel(Math.max(alert, warn || alert));
        }
      })
      .catch(() => {/* keep the 5/8 fallback */});
  }, []);

  // ─── Peak-hold display intensity ─────────────────────────────────────────
  // Mirrors the original RPi frontend: when PEIS rises, hold the peak level
  // for HOLD_MS before decaying to the current live level. Without this a
  // 1-2 batch tap (~1s) flashes and disappears before the user can read it.
  // 7s coordinates the on-screen hold with the backend buzzer/relay window
  // (RpiModule.startRelaiInterval runs ~7s; the buzzer turns on at the same time).
  const HOLD_MS = 7000;
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
  const noOfEvents    = totalEvents;

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
      className="h-screen overflow-hidden p-2 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Slim page header — clock left, version right. Gives the kiosk a top
          border margin instead of content running edge-to-edge. */}
      <div className="shrink-0 flex justify-between items-center px-1">
        <span
          className="font-mono text-xs tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {clock} PHT
        </span>
        <span
          className="font-semibold text-xs tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          USHER ERI ver. 2026.07.01
        </span>
      </div>

      {/* Two independent columns sharing only the outer top/bottom bounds —
          neither column's internal splits are tied to the other's row heights. */}
      <div className="flex-1 flex flex-row gap-2 min-h-0 w-full">

        {/* Left column: IntensityDisplay + Seismogram split the full height
            50/50, independent of whatever the right column is doing. */}
        <div className="flex-[7] flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
            <IntensityDisplay
              intensity={displayIntensity}
              warningLevel={warningLevel}
              alertLevel={alertLevel}
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <Seismogram ref={accelRef} livePoint={currentData} isLive={connected} />
          </div>
        </div>

        {/* Right column: Threshold+Summary get 3/5 of the height, Status+Storage
            get 2/5 — explicit ratio rather than natural/remainder sizing. */}
        <div className="flex-[5] flex flex-col gap-2 min-h-0">
          <div className="flex-[3] flex flex-col gap-2 min-h-0">
            <div className="flex-[1] min-h-0">
              <ThresholdCard />
            </div>
            <div className="flex-[2] min-h-0">
              <SummaryCard
                peakAccel={peakAccel}
                noOfEvents={noOfEvents}
                dominantFreq={dominantFreq}
                maxDisp={maxDisp}
              />
            </div>
          </div>

          <div className="flex-[2] flex flex-col gap-2 min-h-0">
            <div className="flex-1 min-h-0">
              <StatusCard status={statusData} isLive={connected} />
            </div>
            <div className="shrink-0">
              <StorageCard usedGb={storageUsed} totalGb={storageTotal} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

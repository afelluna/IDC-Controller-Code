import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

// Components
import { SummaryCard } from '../components/cards/SummaryCard';
import { ThresholdCard } from '../components/cards/ThresholdCard';
import { IntensityDisplay } from '../components/cards/IntensityDisplay';
import { Seismogram, type SeismogramHandle } from '../components/cards/Seismogram';
import { IntensityLegend } from '../components/cards/IntensityLegend';
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
  // The hold matches the backend buzzer/relay alarm window exactly:
  // RpiModule.startRelaiInterval ticks every 1000ms starting at counter=1 and
  // shuts the relay off on the tick where counter > 7 — i.e. the 8th tick,
  // ~8s after trigger. Keep HOLD_MS in sync with that logic if it changes.
  const HOLD_MS = 8000;
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

  // Seed the freshness clock when the socket comes up, so "connected but not
  // one packet ever arrived" (wrong node name, sensor never started) still
  // trips the stale-data fault instead of sitting at '—' forever.
  useEffect(() => {
    if (connected) {
      setLastPacketTime((prev) => prev ?? Date.now());
    }
  }, [connected]);

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

  // ─── Fault detection ──────────────────────────────────────────────────────
  // Turns the raw signals (socket state, REST errors, packet freshness) into
  // named faults so real failures are called out instead of quietly showing
  // a grey dot. `everConnected` gates the gateway-down fault so the normal
  // connecting phase on page load doesn't flash a false alarm.
  const [everConnected, setEverConnected] = useState(false);
  useEffect(() => {
    if (connected) setEverConnected(true);
  }, [connected]);

  // Sensor batches arrive ~every 250ms; >15s of silence while the socket is
  // up means the sensor node itself stopped sending (the classic silent
  // failure — gateway fine, sensor RPi down). >60s escalates to critical.
  const STALE_WARN_SECS = 15;
  const STALE_CRIT_SECS = 60;
  const dataStale = connected && secondsAgo !== null && secondsAgo > STALE_WARN_SECS;

  const faults: Array<{ severity: 'critical' | 'warning'; message: string }> = [];
  if (!connected && wsError) {
    faults.push({ severity: 'critical', message: `Gateway unreachable — ${wsError}` });
  } else if (!connected && everConnected) {
    faults.push({ severity: 'critical', message: 'Gateway connection lost — reconnecting' });
  }
  if (dataStale) {
    faults.push({
      severity: secondsAgo! > STALE_CRIT_SECS ? 'critical' : 'warning',
      message: `No sensor data for ${secondsAgo}s — check sensor node`,
    });
  }
  if (error) {
    faults.push({ severity: 'warning', message: `API error: ${error.message || 'request failed'}` });
  }

  const hasCritical = faults.some((f) => f.severity === 'critical');

  // ─── Status rows ──────────────────────────────────────────────────────────
  const statusData: Array<{
    label: string;
    value: string;
    dot: 'live' | 'scanning' | 'idle' | 'error';
  }> = [
    {
      label: 'Connection',
      // Offline before ever connecting is normal startup ('idle'); dropping
      // after being live is a fault ('error').
      value: connected ? 'Live' : everConnected || wsError ? 'Fault' : 'Offline',
      dot: connected ? 'live' : everConnected || wsError ? 'error' : 'idle',
    },
    {
      label: 'Node',
      value: nodeName || 'Scanning…',
      dot: nodeName ? 'live' : 'scanning',
    },
    {
      label: 'Server',
      value: serverIp || 'Connecting…',
      dot: (error || wsError) ? 'error' : serverIp ? 'live' : 'scanning',
    },
    {
      label: 'Last update',
      value: loading ? 'Loading…' : freshnessLabel,
      // Stale data while connected is a sensor fault, not just "idle".
      dot: dataStale ? 'error' : connected ? 'live' : 'idle',
    },
  ];

  return (
    <div
      className="relative h-screen overflow-hidden p-2 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Slim page header — clock left, version right. Gives the kiosk a top
          border margin instead of content running edge-to-edge. */}
      <div className="shrink-0 flex justify-between items-center px-1">
        <span
          className="font-mono text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {clock} PHT
        </span>
        <span
          className="font-semibold text-xs uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          USHER ERI VER. 2026.07.01
        </span>
      </div>

      {/* Fault banner — floats over the dashboard (absolute, below the header)
          so appearing/disappearing never reflows the cards underneath. Only
          rendered while faults are active, so the kiosk stays clean in normal
          operation but failures are unmissable. */}
      {faults.length > 0 && (
        <div
          className="absolute top-9 left-1/2 -translate-x-1/2 z-50 max-w-[92%] flex items-center gap-2 px-4 py-2 rounded-lg shadow-xl"
          style={{
            backgroundColor: hasCritical ? 'var(--status-error)' : 'var(--status-warn)',
            color: '#ffffff',
          }}
        >
          <AlertTriangle size={14} strokeWidth={2.5} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {faults.map((f) => f.message).join('  ·  ')}
          </span>
        </div>
      )}

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

        {/* Right side keeps its 5/12 share, but a slim vertical PEIS legend
            pole is carved out of it — sitting between the two columns without
            taking any width from the left column. It spans the full content
            height (top of the columns to the bottom, below the page header). */}
        <div className="flex-[5] flex flex-row gap-2 min-h-0">

          <div className="w-11 shrink-0 min-h-0">
            <IntensityLegend currentLevel={displayIntensity} />
          </div>

          {/* Right column: Threshold+Summary get 3/5 of the height, Status+Storage
              get 2/5 — explicit ratio rather than natural/remainder sizing. */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
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
              <StatusCard status={statusData} />
            </div>
            <div className="shrink-0">
              <StorageCard usedGb={storageUsed} totalGb={storageTotal} />
            </div>
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}

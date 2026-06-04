---
Angular → React Migration Plan

Context

The backend has no auth — dashboard loads unconditionally. Socket events use the node name as the event name (e.g. socket.on("NODE1", data => ...)), not socket.on('node', ...).

---
Phase 1 — Dependencies & Environment

Files: package.json, .env

1. Remove ws, pusher-js, laravel-echo, express, @google/genai
2. Add "socket.io-client": "^4.x"
3. Fix .env:
VITE_API_URL=http://192.168.10.12:3000
VITE_WS_URL=http://192.168.10.12:3000
VITE_USE_MOCKS=false
4. Run npm install

---
Phase 2 — API Layer Fixes

Files: client.ts, seismicApi.ts, types.ts

2a. Add response interceptor in client.ts — normalize { error, message, data } → { success, message, data }. Remove /api from base URL.

2b. Rewrite seismicApi.ts to 12 real routes only:

┌──────────────────────────────────┬───────────────────────────────┐
│              Method              │           Endpoint            │
├──────────────────────────────────┼───────────────────────────────┤
│ getSensorConfig()                │ GET /getSensorConfig          │
├──────────────────────────────────┼───────────────────────────────┤
│ getSeismicEvents()               │ GET /getHistory               │
├──────────────────────────────────┼───────────────────────────────┤
│ getHistoryMax()                  │ GET /getHistoryMax            │
├──────────────────────────────────┼───────────────────────────────┤
│ getAllHistoryMax()               │ GET /getAllHistoryMax         │
├──────────────────────────────────┼───────────────────────────────┤
│ getStorageInfo()                 │ GET /getDiskSpace             │
├──────────────────────────────────┼───────────────────────────────┤
│ updateThresholds(payload)        │ POST /updateIntensity         │
├──────────────────────────────────┼───────────────────────────────┤
│ calibrate()                      │ POST /calibrate               │
├──────────────────────────────────┼───────────────────────────────┤
│ getWaveformBefore(eventId, path) │ POST /getBefore               │
├──────────────────────────────────┼───────────────────────────────┤
│ getWaveformAfter(eventId, path)  │ POST /getAfter                │
├──────────────────────────────────┼───────────────────────────────┤
│ getWaveformDuring(eventId, path) │ POST /getDuring               │
├──────────────────────────────────┼───────────────────────────────┤
│ getBackup(startDate, hour)       │ GET /backUp/:startDate/:hour  │
├──────────────────────────────────┼───────────────────────────────┤
│ getAvailableHours(startDate)     │ GET /availableHour/:startDate │
└──────────────────────────────────┴───────────────────────────────┘

Remove all /alerts/*, /devices/*, /auth/*, /system/*, /export/*, /loginUser, /changePass.

2c. Add BackendResponse<T> and SensorConfig types to types.ts.

---
Phase 3 — Remove Auth Entirely

Delete:
- frontend/src/hooks/useAuth.ts
- frontend/src/context/AuthContext.tsx
- frontend/src/components/auth/LoginPage.tsx

Update:
- main.tsx — remove <AuthProvider> wrapper
- App.tsx — remove any isAuthenticated guards
- types.ts — delete LoginRequest, LoginResponse, User, RefreshTokenResponse

---
Phase 4 — Real-Time WebSocket

File: useWebSocket.ts — full rewrite

// 1. GET /getSensorConfig → get nodeName
// 2. const socket = io(VITE_WS_URL)
// 3. socket.on(nodeName, (data) => ...)   // event name = nodeName, NOT 'node'
// 4. socket.on('newfirstalarm', (nodeName) => ...)
// 5. Expose: { connected, nodeName, lastEvent, error }
// 6. socket.disconnect() on unmount

---
Phase 5 — Data Hook Integration

File: useSeismicData.ts

- Swap all API calls to Phase 2b methods
- Push incoming socket events directly into currentData state (no REST poll wait)
- Remove getDashboardStats, getFrequencyAnalysis, getLiveVelocityStream calls — stub with null/[]
- Keep 30s interval for getHistory + getDiskSpac
- Drop mock-data fallback logic

---
Phase 6 — Component Audit

Files: App.tsx + card components

- App.tsx — statusData driven by socket connected state
- VelocityChart.tsx — appends socket events to a rolling 60s buffer (replaces missing REST endpoint)
- HistogramCard.tsx — groups getHistory results by PEIS intensity level (replaces missing frequency-analysis endpoint)
- StatusCard.tsx — no changes needed
- StorageCard.tsx — verify field names from getDiskSpace response match props

---
Phase 7 — Build & Deploy

cd frontend
npm install
npm run build
# Copy dist/ → /monitor/

Verify vite.config.ts has correct build.outDir.

---
Verification Checklist

1. Dashboard loads immediately at http://192.168.10.12:3000 — no login screen
2. Zero 404 errors in browser console
3. StatusCard shows green "Connected"
4. IntensityDisplay updates in real time from socket events
5. VelocityChart seismogram animates live
6. HistoryCard rows populate from GET /getHistory
7. StorageCard shows correct GB from GET /getDiskSpace
8. Socket reconnects after network drop

---
Critical Files Summary

┌─────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
│                      File                       │                       Action                        │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/package.json                           │ Remove bad deps, add socket.io-client               │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/.env                                   │ Fix URLs, disable mocks                             │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/api/client.ts                      │ Interceptor + base URL fix                          │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/api/seismicApi.ts                  │ Full rewrite — 12 real routes                       │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/api/types.ts                       │ Add BackendResponse/SensorConfig, remove auth types │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/hooks/useAuth.ts                   │ Delete                                              │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/context/AuthContext.tsx            │ Delete                                              │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/components/auth/LoginPage.tsx      │ Delete                                              │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/main.tsx                           │ Remove AuthProvider                                 │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/hooks/useWebSocket.ts              │ Full rewrite — socket.io-client                     │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/hooks/useSeismicData.ts            │ Rewire to real API + socket                         │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/App.tsx                            │ Status wiring, remove auth guards                   │
├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ frontend/src/components/cards/HistogramCard.tsx │ Feed from getHistory                                │
└─────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
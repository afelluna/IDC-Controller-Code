# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Repository Overview

This is the **USHER Lowrise** seismic monitoring system. It runs on a Raspberry Pi gateway device and consists of two separate projects:

| Directory | Purpose |
|---|---|
| `lowrise_server_receiver/` | Node.js/Express/Socket.IO backend — data ingestion from sensors, REST API, GPIO control |
| `frontend/` | React 19 + Vite dashboard (in-progress migration from legacy Angular in `/monitor/`) |
| `monitor/` | Compiled frontend served by Apache on port 80 — this is the deployment target |
| `docs/` | Architecture docs — read these for context before touching unfamiliar subsystems |

---

## Commands

### Frontend (`frontend/`)
```bash
npm run dev       # Dev server at http://0.0.0.0:3000 with HMR
npm run build     # Compile to dist/ — copy output to /monitor/ to deploy
npm run lint      # TypeScript type-check only (tsc --noEmit), no ESLint
npm run clean     # rm -rf dist
```

### Backend (`lowrise_server_receiver/`)
```bash
npm run dev       # nodemon with ts-node — hot reload during development
npm run build     # tsc -p . → outputs to dist/
npm start         # node dist/server.js — runs compiled output
```
The backend is managed by **PM2** on the RPi in production.

---

## Architecture

### Data Flow

```
Sensor RPi ──(Ethernet)──► Gateway RPi (lowrise_server_receiver :3000)
                               │
                    ┌──────────┴──────────┐
                    │                     │
               HTTP POST             Socket.IO
             (file uploads)      "node" → relay
                    │                     │
              Local filesystem      io.emit(nodeName, data)
              (.log files)               │
                                    Browser Dashboard
                                    (frontend / monitor)
```

### Backend (`lowrise_server_receiver/`)

- **Entry**: `src/server.ts` — starts Express HTTP server, attaches Socket.IO, starts `WatchFileDir` and `ClearHistory`
- **App setup**: `src/app.ts` — Express middleware, CORS, body-parser, routes, stores `socketio` and `server` on `app` via `app.set()`
- **Routes**: `src/routes/api.ts` — all REST routes mounted at root (no `/api` prefix)
- **Controllers**: `ConfigController.ts` (config/system endpoints), `UploadController.ts` (data ingestion from sensor), `SocketEventController.ts` (Socket.IO message handlers)
- **Database**: MySQL via `src/database/mysqldatabase.ts` — single `config_tbl` table holds sensor config and admin credentials
- **Config**: `src/config/config.ts` — all values from `.env` via `process.env`; uses `machineIdSync()` on startup

**All REST responses use this shape** (from `ResponseHandler.sendResponse`):
```ts
{ message: string, error: boolean, data: any }
```
`error: false` means success. There is **no JWT/session auth** — all routes are unprotected.

#### Socket.IO Event Model (critical)
The sensor emits `socket.emit("node", [nodeName, data])` to the server. The server's `@OnMessage("node")` handler **re-broadcasts** as `io.emit(nodeName, data)` — the **event name becomes the node name** (e.g. `"usher02"`). The browser must:
1. Call `GET /getSensorConfig` to retrieve `node_name`
2. Listen with `socket.on(nodeName, (data) => ...)`

Other browser-facing events: `newfirstalarm` (string: nodeName), `calibratesensor` (string), `dir_modified`.

**Socket.IO version mismatch**: The server runs `socket.io@^2.3.0`. Use `socket.io-client@2.x` for compatibility, or ensure the installed client version negotiates correctly with v2 server.

### Frontend (`frontend/`)

- **Entry**: `src/main.tsx` → `<App />`
- **Layout**: `src/App.tsx` — fixed full-screen 12-column grid; left col (LogoCard, HistoryCard, HistogramCard), center (IntensityDisplay, IntensityLegend), right (VelocityChart, StatusCard, StorageCard)
- **API client**: `src/api/client.ts` — Axios singleton; base URL from `VITE_API_URL`
- **API methods**: `src/api/seismicApi.ts` — maps to real backend routes only
- **Real-time**: `src/hooks/useWebSocket.ts` — Socket.IO connection; fetches `node_name` from `/getSensorConfig` on mount, then subscribes to `socket.on(nodeName, ...)`
- **Data aggregation**: `src/hooks/useSeismicData.ts` — combines REST polling + socket events into unified component state
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed); `src/index.css` is the entry
- **Alias**: `@` resolves to `frontend/` root

#### Environment variables (`frontend/.env`)
```
VITE_API_URL=http://192.168.10.12:3000   # No /api prefix
VITE_WS_URL=http://192.168.10.12:3000
VITE_USE_MOCKS=false
```

#### Backend response normalization
The API interceptor in `client.ts` must transform the backend's `{ error, message, data }` shape before components see it:
```ts
response.data.success = !response.data.error;
```

### Deployment
1. `cd frontend && npm run build`
2. Copy contents of `frontend/dist/` into `monitor/`
3. Apache on the RPi serves `monitor/` on port 80; configure it for SPA routing (redirect non-file requests to `index.html`)
4. Timestamps throughout the system use `Asia/Manila` timezone (via `moment-timezone` on the backend)

---

## Key Docs

- `docs/system-architecture.md` — component overview and resilience model
- `docs/data-ingestion.md` — full sensor → gateway → browser data flow with implementation notes
- `docs/react-migration-prep.md` — migration checklist and backend compatibility notes
- `docs/gpio-configuration.md` — GPIO pin mappings for LEDs, buzzer, relays

# Permin, EventMax, FirstAlarm — Original Data Flow Verification

> Verified against `lowrise_server_uploader/`, `lowrise_server_receiver/`, and field docs.
> Conversation log preserved in full — no shortening.

---

## Q1: What path did permin, eventmax, firstalarm files originally move from (creation to transport) in the original system before we made changes to architecture? What do they contain in actuality, how was it collated? Verify against original IDC code and against sensor code.

---

## Architecture Context

There are **two separate Node.js processes**, one per RPi:

| Code | Runs on | Role |
|---|---|---|
| `lowrise_server_uploader/` | **Sensor RPi** | Reads local files, pushes to portal |
| `lowrise_server_receiver/` | **Gateway RPi** | Receives uploads from sensor, serves browser |

The uploader's `.env.example` sets `UPLOAD_STORAGE_DIR=../` — meaning all file directories are **siblings of the uploader folder** on the sensor RPi, written there by the Python acquisition script (`start_usher.py` / `fileuploaderv4brdg.transfer`).

---

## Permin

### Creation (Sensor RPi)
Python writes files into `../permin/` (relative to `lowrise_server_uploader/`). These are the raw ~125-sample relay log segments (~250ms each), ~226 per minute. CSV format:

```
col0, timestamp, x, y, z, intensity, ...
```

### Transport (`PerminUpload.ts`)
- Polls on `PERMIN` second interval (default 5s from `.env`)
- Reads `../permin/`, sorts files (oldest first), takes `files[0]`
- POSTs as `multipart/form-data` with `node_token + file` to `URL_PERMIN` → originally `https://portal.usher.ph:3001/high/uploadPermin`

### At Gateway (`uploadPermin` in `UploadController.ts`)
- Saves file as-is to `UPLOAD_STORAGE_DIR+LOGS_PER_MIN_DIR/` with original filename
- If directory exceeds 20 files, deletes the oldest 10 (trim logic at `UploadController.ts` lines 234–246)
- `WatchFileDir` watches this dir and emits `socket.io("dir_modified_permin", "yes")` on add/unlink; browser uses this to know new permin data landed

### After Success on Sensor
File is **deleted** (`fs.unlink`) — not moved, gone.

### Final Fate
Gateway keeps at most ~20 files, continuously overwritten. **Not persisted long-term. Effectively ephemeral.**

---

## FirstAlarm

### Creation (Sensor RPi)
Python **creates a directory** named after the `eventId` inside `../firstalarm/`. There is no file content — the directory name IS the alarm signal. `eventId` is a 13-digit millisecond timestamp.

### Transport (`FirstAlarmUpload.ts`)
- Polls every 5 seconds
- Reads `../firstalarm/`, sorts, takes `files[0]`
- POSTs `node_token + eventId` (just the directory name as form field — **no file attached**) to `URL_FIRSTALARM` → originally `https://portal.usher.ph:3001/high/firstAlarm`

### At Gateway (`firstAlarm` in `UploadController.ts`)
- Creates `UPLOAD_STORAGE_DIR/firstalarm/{eventId}/` directory (just a marker, nothing inside)
- Immediately emits `socket.io("newfirstalarm", eventId)` to browser — this is the "event detected" signal the dashboard listens to

### After Success on Sensor
`fsExtra.remove(filePath)` deletes the directory marker.

### Key Point
No data content ever moves for firstalarm. It is purely a signal — the eventId string. An empty directory stays on the gateway disk indefinitely.

---

## EventMax

### Creation (Sensor RPi)
Python writes a `.log` file named `{eventId}.log` into `../eventMax/`. Same CSV format as permin rows. This captures the full event at full resolution — one file per triggered seismic event.

### Transport (`EventMaxUpload.ts`)
- Polls every 50 seconds
- Reads `../eventMax/`, sorts, takes `files[0]`
- POSTs `node_token + eventId (filename minus .log) + file` as multipart to `URL_EVENT_MAX` → originally `https://portal.usher.ph:3001/uploadEventMax` (note: no `/high/` prefix unlike permin and firstalarm)

### At Gateway (`uploadEventMax` in `UploadController.ts`)
1. Reads the file in memory, calls `getAbsValues()` — scans all CSV rows and extracts `[maxIntensity, maxAbsX, maxAbsY, maxAbsZ]`
2. Saves the file to `UPLOAD_STORAGE_DIR+LOGS_EVENT_MAX_DIR/`
3. Emits `socket.io("event_max-{eventId}", [intentVal, xVal, yVal, zVal])` to browser

### After Success on Sensor
File is **moved** to `../uploadedeventMax/{eventId}.log` — it is preserved locally on the sensor RPi.

### Final Fate
**Saved on both sensor RPi** (in `uploadedeventMax/`) **and gateway RPi** (in `eventMax/`). This is the only file type that is durably stored on both ends. Browser receives the 4-value summary array via socket. Full file readable via history API (`GET /getHistoryMax`, `GET /getAllHistoryMax`).

---

## Events (Raw Event Logs — Disabled)

`EventUpload.ts` exists but was **commented out** in `server.ts` line 16: `//new EventUpload(config.TOKEN)`. Would have uploaded from `../events/{eventId}/` (subdirectory per event, multiple `.log` files each), posting each log file individually to `/uploadEvents`. After success, files moved to `../uploadedEvents/{eventId}/`. `URL_EVENT` was blank in the original `.env`. This entire channel was disabled and the gateway's `/uploadEvents` route never receives data in the original system.

---

## How Data Was Collated on the Sensor

The Python acquisition script writes the same raw accelerometer stream to its logsdir (`fileuploaderv4brdg.transfer`). From that same source it produces:

- **Permin files** — rolling chunks of that stream (~250ms each), written into `../permin/` continuously
- **EventMax files** — when a seismic trigger fires, it writes the full event capture to `../eventMax/{eventId}.log`
- **FirstAlarm directory** — simultaneously creates `../firstalarm/{eventId}/` as the immediate alert marker

The collation sequence: **single sensor stream → segmented into permin chunks + event-triggered snapshots → uploader drains each directory to the destination in oldest-first order.**

The gateway never pulls. It only receives pushes.

---

## Summary in One Line Each

- **Permin** → uploaded to portal/gateway, displayed as a count only at gateway, dropped after ~20 files there. Never shown as waveform data to browser.
- **FirstAlarm** → signal only (no content), triggers a socket event to browser, empty directory left on gateway.
- **EventMax** → saved on both RPis permanently, 4-value summary pushed to browser via socket, full file readable via history API.

---

---

## Q2: So where does the live waveform data actually come from then in the original frontend? Where does the event being received by the original portal come from?

---

## 1. Live Waveform — Where It Comes From

**`start_usher.py` on the sensor RPi is both the ADXL355 sampler AND the live Socket.IO emitter.**

```
start_usher.py line ~272:
  sio.emit("node", [config["node_name"], json_data])
        ↓
gateway SocketEventController @OnMessage("node"):
  io.emit(nodename, data)     ← event name becomes the node name, e.g. "node" or "usher02"
        ↓
browser socket.on(listen_node, …)   ← listen_node from config.json must match
```

**Permin files have nothing to do with the live display.** `/uploadPermin` saves a file and returns — no socket emit. `/watchPerminDir` returns only a count. The waveform is purely the continuous Socket.IO stream from `start_usher.py` — if that process dies, the dashboard goes blank even while permin files keep uploading from a backlog.

### config.json (original Angular frontend)

```json
{
  "ip": "192.168.10.12",
  "port": 3000,
  "listen_node": "node"
}
```

`listen_node` must equal the sensor's `node_name` value exactly for the browser to receive any data.

---

## 2. What the Original Portal (`portal.usher.ph:3001`) Actually Received

The `lowrise_server_uploader` on the sensor RPi was originally pointed directly at an external cloud portal — not at the gateway. This was confirmed by the actual `.env` values:

```
URL_FIRSTALARM=https://portal.usher.ph:3001/high/firstAlarm
URL_PERMIN=https://portal.usher.ph:3001/high/uploadPermin
URL_EVENT=
URL_EVENT_MAX=https://portal.usher.ph:3001/uploadEventMax
```

### `POST /high/uploadPermin`
**Sent by:** `PerminUpload.ts`
- `node_token` — sensor's identity token
- `file` — the raw `.log` file from `../permin/` as multipart stream
- **Content:** CSV rows of accelerometer data, ~125 samples per file, ~250ms of data per file, ~226 files per minute
- **After success:** file deleted on sensor

### `POST /high/firstAlarm`
**Sent by:** `FirstAlarmUpload.ts`
- `node_token`
- `eventId` — the 13-digit ms timestamp directory name from `../firstalarm/`
- **No file attached** — just those two fields
- **Content:** purely a signal — "event detected at timestamp X from node Y"
- **After success:** directory marker deleted on sensor

### `POST /uploadEventMax` (note: no `/high/` prefix)
**Sent by:** `EventMaxUpload.ts`
- `node_token`
- `eventId` — filename without `.log`
- `file` — the `.log` file from `../eventMax/` as multipart stream
- **Content:** same CSV format as permin, but this is the full captured event (peak seismic event data), one file per triggered event
- **After success:** file **moved** to `../uploadedeventMax/` on sensor (kept locally)

### `URL_EVENT` — empty, never used
`EventUpload.ts` was commented out in `server.ts`. Event-by-event log uploads were disabled entirely.

---

## Original Architecture (Two Independent Paths)

```
Sensor RPi
  start_usher.py  ──(Socket.IO "node")──►  Gateway RPi (lowrise_server_receiver :3000)
                                                 ↓ SocketEventController @OnMessage("node")
                                                 ↓ io.emit(nodename, data)
                                                 ↓
                                            Browser: socket.on(listen_node) → live waveform

  lowrise_server_uploader ──(HTTPS POST)──►  portal.usher.ph:3001
                                                 /high/uploadPermin   ← permin files
                                                 /high/firstAlarm     ← event signal
                                                 /uploadEventMax      ← event peak files
```

The two paths are **completely independent**:

- **Live waveform path:** Socket.IO only. `start_usher.py` → gateway relay → browser. No files involved.
- **Data upload path:** HTTP POST only. `lowrise_server_uploader` reads local files written by the Python sensor, POSTs them directly to the cloud portal. The gateway receiver has matching route names (`/uploadPermin`, `/upload`, `/uploadEventMax`) making it usable as a **local mirror of the portal API** — so the sensor can point at the gateway instead of the cloud by changing the `.env` URLs.

### Critical Facts

- **The live dashboard depends ONLY on the Socket.IO stream.** If `start_usher.py` dies, you get "No data to display" even while permin files keep uploading perfectly.
- **`GET /watchPerminDir` returns only a file count**, not waveform data. The frontend calls it on each `dir_modified_permin` watcher event, but it cannot populate the live chart.
- Permin files with old timestamps still uploading usually means the sampler is dead and `uploaderFinal` is just draining a **backlog** — not real-time data.
- `URL_EVENT` was blank — raw per-event log uploads to the portal never happened in any known deployment.

---

## Three-Tier Model (When Gateway Acts as Middle Tier)

When the sensor uploader's URLs point at the gateway instead of `portal.usher.ph`, and the gateway also runs `lowrise_server_uploader` pointed at the platform, the chain becomes:

```
Sensor RPi                    Gateway RPi                         Platform
──────────────────────        ──────────────────────────────      ───────────────────
start_usher.py
  uploaderFinal (PM2)
    POST /uploadPermin   →    receiver saves → /var/www/html/permin/
    POST /uploadEventMax →    receiver saves → /var/www/html/eventMax/
    POST /upload         →    receiver creates firstalarm/{eventId}/ dir
                                          ↓
                              lowrise_server_uploader (PM2 "uploader")
                              reads those same local dirs (UPLOAD_STORAGE_DIR=../)
                                POST URL_PERMIN      →   portal.usher.ph:3001
                                POST URL_EVENT_MAX   →   portal.usher.ph:3001
                                POST URL_FIRSTALARM  →   portal.usher.ph:3001
```

Whether the sensor points directly at the cloud portal or at the gateway as a relay is controlled entirely by the `URL_*` values in the uploader's `.env` file.

---

## Key File and Path Reference (Sensor RPi)

| What | Path |
|---|---|
| Sensor sampler + live Socket.IO emitter | `~/Workspace/USHERv4.0/src/start_usher.py` (line ~272: `sio.emit("node", …)`) |
| Sensor ADXL355 driver | `~/Workspace/USHERv4.0/src/adxl355.py` |
| Sensor HTTP uploader | `~/Workspace/uploaderFinal/` (PM2 app `uploader`) or `lowrise_server_uploader/` |
| Sensor config | `~/Workspace/config` (`socketserver`, `node_name`, `monitor`) |
| Permin source dir | `../permin/` relative to uploader |
| FirstAlarm source dir | `../firstalarm/` relative to uploader |
| EventMax source dir | `../eventMax/` relative to uploader |
| EventMax after upload | `../uploadedeventMax/` (kept on sensor) |

## Key File and Path Reference (Gateway RPi)

| What | Path |
|---|---|
| Gateway receiver (repo) | `lowrise_server_receiver/` |
| Gateway receiver (deployed, misspelled) | `/var/www/html/lowrise_server_reciever/` |
| Gateway socket relay | `src/controllers/SocketEventController.ts` (`@OnMessage("node")`) |
| Gateway permin upload handler (no socket emit) | `src/controllers/UploadController.ts` → `uploadPermin` |
| Gateway permin count endpoint | `UploadController.ts` → `watchPerminDir` (count only) |
| Saved permin files | `/var/www/html/permin/` (capped ~20 files) |
| Saved eventMax files | `/var/www/html/eventMax/` |
| FirstAlarm marker dirs | `/var/www/html/firstalarm/{eventId}/` |
| Deployed old frontend | `/var/www/html/monitor/` |
| Frontend live-event config | `/var/www/html/monitor/assets/config.json` (`listen_node`) |

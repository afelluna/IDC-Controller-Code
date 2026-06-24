# USHER Lowrise Seismic Monitoring System: End-to-End Data Flow Specification

This document provides a comprehensive, technical blueprint of the complete data flow within the USHER Lowrise Seismic Monitoring System. It traces the journey of high-frequency seismic measurements starting from physical acceleration sensors, moving through the Intermediate Data Center (IDC) gateway, uploading to the cloud platform, and ending with real-time visualization on client dashboards.

> **Accuracy note (verified against source 2026-06-22).** This spec was reconciled against the live code in three repos: the sensor (`Sensor Code/USHERv4.0` + `uploaderFinal`), this IDC gateway repo (`lowrise_server_receiver` + `lowrise_server_uploader`), and the platform (`C:\luna_IT\usher-wehlo-platform/backend`). Two prior assumptions were **wrong** and are corrected throughout:
> 1. **`permin` files are NOT 1-minute / ~18,000-sample batches.** Each `.log` file is exactly **125 samples (~250 ms of motion)**, named `<epochMs>_<xMax>_<yMax>_<zMax>_<peisMax>.log`, so the sensor produces *hundreds* of files per minute.
> 2. **The platform has NO `ProcessPerminFile` job, no 1 Hz bucket aggregation, and no `readings`/Reverb broadcast on the permin path.** `HighController::uploadPermin` parses the peak X/Y/Z **from the filename**, computes PGA/PEIS server-side, and caches a single "latest reading" per device. The `readings` table + `ReadingBatchIngested` + Reverb belong to a *separate generic ingest path*, and the working **event seismogram** substrate is **eventMax**, not permin.

---

## 1. High-Level Architectural Mental Model

The system decouples continuous data logging and history compilation from real-time monitoring. This is achieved by running two parallel, independent data channels from the sensor to the local IDC gateway:

```
                                    +-----------------------------------+
                                    |       SENSOR (192.168.10.11)      |
                                    |  (start_usher.py - ADXL355)       |
                                    +-----------------+-----------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
        +---------------------------------+                       +---------------------------------+
        |   CHANNEL A: HISTORY (HTTP)     |                       |    CHANNEL B: REAL-TIME (WS)    |
        | ~125-sample (~250ms) .log files |                       |  High-frequency Socket.IO stream|
        +----------------+----------------+                       +----------------+----------------+
                         |                                                         |
                         v                                                         v
        +---------------------------------+                       +---------------------------------+
        |    IDC RECEIVER (192.168.10.12) |                       |   IDC RECEIVER (192.168.10.12)  |
        |    UploadController.ts (3000)   |                       |   SocketEventController.ts (3000)|
        +----------------+----------------+                       +----------------+----------------+
                         | (Saves raw .log to disk)                                | (Immediately relays)
                         v                                                         v
        +---------------------------------+                       +---------------------------------+
        |   LOCAL DISK (/permin, /eventMax)|                       |        LOCAL CLIENT KIOSK       |
        +----------------+----------------+                       |      (monitor dashboard on :80) |
                         |                                        +---------------------------------+
                         v
        +---------------------------------+
        |   IDC UPLOADER (192.168.10.12)  |
        |   PerminUpload.ts (PM2 service) |
        +----------------+----------------+
                         | (HTTP POST /high/uploadPermin, node_token)
                         v
        +---------------------------------+
        |   PLATFORM WEB (192.168.10.13)  |
        |  Laravel Octane + FrankenPHP    |
        |  :8000 (web) / :8080 (Reverb)   |
        +----------------+----------------+
                         | HighController::uploadPermin (SYNCHRONOUS — no job):
                         |  - parse peak X/Y/Z from FILENAME (fallback: abs-max of contents)
                         |  - compute PGA + PEIS (server-side, Peis helper)
                         |  - cache device:{id}:latest_reading (15 min) + last_seen_at
                         v
        +---------------------------------+
        |   CACHE: latest_reading         |   (permin does NOT write the readings
        |   (PGA / PEIS per device)       |    table and does NOT broadcast)
        +----------------+----------------+
                         v
        +---------------------------------+
        |      BROWSER CLIENT PORTAL      |
        |  Badges from latest reading;    |
        |  seismogram from eventMax / API |
        +---------------------------------+

  NOTE: ReadingBatchIngested -> Laravel Reverb -> "devices.{uuid}" broadcasting is a
  SEPARATE generic ingest path (ReadingIngestService), not fed by permin uploads.
  Event waveforms come from the eventMax path (POST /uploadEventMax -> ProcessEventMaxFile).
```

### Channel A: History (Continuous File Ingestion)
- **Purpose:** Durable persistence of high-fidelity seismic data, long-term trend analysis, and event analysis.
- **Mechanism:** The sensor batches **exactly 125 samples (~250 ms)** into one un-headered `.log` file, writes it to its local `logsdir`, and the sensor's separate `uploaderFinal` PM2 app uploads the oldest file to the local IDC gateway via `POST /uploadPermin`. (The same 125-sample batch is *also* emitted live as Channel B — see below.)
- **Sync:** The IDC gateway buffers these files in its local `permin/` directory and employs a background uploader service (`lowrise_server_uploader`, port 3001) that polls every `PERMIN` seconds (default 5 s) and pushes the **oldest file, one at a time** to the Cloud Platform via `POST /high/uploadPermin`. The gateway keeps only a tiny rolling window of permin files (>20 → delete oldest 10), so this tier is an ephemeral relay buffer, not long-term storage.

### Channel B: Live Waveform (Real-Time Streaming)
- **Purpose:** Immediate, sub-second visualization of active motion on the local kiosk monitor.
- **Mechanism:** The sensor's main Python script maintains a persistent Socket.IO connection directly to the IDC gateway on port 3000, streaming raw coordinates continuously.
- **Sync:** The IDC gateway acts as a high-frequency message broker, immediately re-emitting the incoming data packet under a device-specific channel identifier to any listening local browsers.

---

## 2. Physical & Network Topology

The edge deployment consists of three devices operating within a dedicated localized subnet over a physical Ethernet switch. Because Channel A file transfers are highly resilient to intermittent disruptions, any downtime in Channel B stream delivery is isolated and does not compromise the security of stored event files.

| Host Name | Default IP Address | Role & Responsibility | Key Ports & Services |
|---|---|---|---|
| **Sensor Node** | `192.168.10.11` | Reads high-precision acceleration data from the physical ADXL355 accelerometer. Emits real-time streams and uploads files to the Gateway. | - PM2 services<br>- Python client |
| **IDC Gateway** | `192.168.10.12` | Handles local buffering, edge data logging, GPIO hardware triggering (LED, buzzer, relay), local kiosk rendering, and platform-bound uploading. | - `3000`: `lowrise_server_receiver`<br>- `80`: Apache kiosk web application (`monitor`) |
| **Cloud Platform** | `192.168.10.13` | Coordinates central data recording, downsampling, API delivery, user management, and remote notification broadcasts. | - `8000`: Laravel Web App (Octane)<br>- `8080`: Laravel Reverb (WS) |

---

## 3. End-to-End Data Pass Trace

The lifecycle of a single seismic reading from the physical hardware up to the cloud-connected dashboard pixels unfolds through four sequential phases:

### Phase 1: Sensor Data Ingestion & Buffering (Sensor RPi to IDC Gateway)

1. **Physical Measurement:** The ADXL355 sensor detects acceleration changes on three axes (X, Y, Z).
2. **Sampling Loop (`start_usher.py`):**
   - The Python script reads the ADXL355 (`±2g` range, 500 Hz low-pass) and timestamps each sample (`int(round(time.time()*1000))`), with `time.sleep(.001)` per sample.
   - **Linear Conversion:** Raw counts are scaled (`* 0.0000039`) and per-axis offsets removed; the Z-axis subtracts `1` to remove the 1g gravity vector. Units are g-force ($g$).
   - **Per-sample PEIS:** `intensity.calcPEIS(max(reading))` is computed live for every sample, and the running per-batch max of X/Y/Z/intensity is tracked.
   - **Batch accumulation:** Samples accumulate into an in-memory list until it holds **125 rows**.
3. **Dual fan-out (per 125-sample batch):** When the batch reaches 125 rows the script does BOTH:
   - **Channel B (live):** serialize and emit over Socket.IO —
     ```python
     sio.emit("node", [config["node_name"], json_mylist])
     ```
   - **Channel A (history):** write the batch to `logsdir` as `<firstSampleEpochMs>_<xMax>_<yMax>_<zMax>_<peisMax>.log` (peaks embedded in the filename), then reset the batch. Each file therefore spans ~250 ms, **not** 1 minute.
4. **Upload to gateway:** The sensor's separate `uploaderFinal` PM2 app (not `start_usher.py`) scans `logsdir` and POSTs the **oldest** file to the IDC gateway:
   ```http
   POST http://192.168.10.12:3000/uploadPermin
   Content-Type: multipart/form-data
   Body:
     node_name: "node"            # config['node_name']; "usher02" etc. is the deployed value
     file: [125-sample (~250ms) raw .log binary]
   ```

---

### Phase 2: IDC Message Brokerage & Edge Sync (IDC Gateway to Platform)

1. **Stream Brokerage (`SocketEventController.ts`):**
   - The IDC Gateway's `receiver` daemon catches the `node` message on port 3000.
   - It extracts the `nodename` (e.g., `usher02`) and re-broadcasts the payload to local frontend clients:
     ```typescript
     let nodename = message[0];
     let data = message[1];
     io.emit(nodename, data); // Local kiosk reads this event directly
     ```
2. **Local Buffer Storage (`UploadController.uploadPermin`):**
   - The `receiver`'s Express router intercepting `POST /uploadPermin` `mv`s the file into its `permin/` directory (path is relative: `UPLOAD_STORAGE_DIR` (`../`) + `LOGS_PER_MIN_DIR` (`permin`); not an absolute `/var/www/html/permin`).
   - **Inline trim (same handler):** after each save it `readdir`s the folder and, if the count exceeds **20**, deletes the **oldest 10** files (`fs.unlink`). This ~3–5 second rolling window is what keeps the SD card from filling. (Note: this trim lives *inside* `uploadPermin`; the separate `ClearHistory.ts` class is unrelated — it does monthly/yearly cleanup of the firstalarm `logs` directory, not the permin buffer.)
3. **Cloud Synchronization (`lowrise_server_uploader` → `PerminUpload.ts`):**
   - The background PM2 daemon `lowrise_server_uploader` (port 3001, a *separate* project from the receiver) polls its `permin/` directory every `PERMIN` seconds (`config.PERMIN`, default **5 s**).
   - Each tick it sorts the directory and uploads the **single oldest file** via `request-promise` `multipart/form-data` POST to the platform:
     ```http
     POST {URL_PERMIN}/high/uploadPermin     # deployed env value; committed default points at the legacy portal.usher.ph:3001
     Content-Type: multipart/form-data
     Body:
       node_token: "<device ingest token>"
       file: [125-sample (~250ms) raw .log binary]
     ```
   - On HTTP `200` it `unlink`s the file, then re-arms the timer to send the next-oldest. On any error/non-200 it retains the file and re-arms (effective retry).

---

### Phase 3: Platform Permin Ingestion (Platform — synchronous, cache-backed)

> **This phase was rewritten to match the real `HighController::uploadPermin`.** There is **no** `ProcessPerminFile` job, **no** queue dispatch, **no** raw-file storage, **no** `permin_logs` row, and **no** 1 Hz aggregation into the `readings` table on the permin path. (`grep` confirms `ProcessPerminFile` and `PerminLog::create` do not exist anywhere in the platform.) Permin ingestion is a lightweight, synchronous "latest value" cache update.

1. **Platform Ingress (`HighController::uploadPermin`):**
   - The Laravel web app receives the file through the bare path `POST /high/uploadPermin`, declared in `routes/rpi.php` under the `node_token_auth` (`NodeTokenAuth`) + `throttle:ingest` middleware group. `NodeTokenAuth` validates the `node_token` body field and binds the `Device` onto the request.
2. **Peak Extraction (no parsing job):**
   - **Primary path — from the filename:** `parsePeaksFromFilename()` splits `<epochMs>_<x>_<y>_<z>_<peis>.log` into exactly 5 numeric parts and takes X/Y/Z plus `recorded_at = epochMs`. These are the per-batch peaks the *sensor* already embedded in the filename — the platform does not re-scan samples in the common case.
   - **Fallback — from contents:** only if the filename does not match, `parsePeaksFromContents()` reads the 6-column CSV and computes the absolute max per axis, using the first row's epoch as `recorded_at`.
3. **Server-side PGA/PEIS + cache:**
   - It computes PGA and PEIS **on the server** via the `Peis` helper (`Peis::pga(...)`, `Peis::peisFromMaxComponent(Peis::maxComponent(...))`).
   - It writes a single rolling value to the cache (15-minute TTL) — there is no per-sample history kept from permin:
     ```php
     Cache::put("device:{$device->id}:latest_reading",
         ['x'=>$x,'y'=>$y,'z'=>$z,'pga'=>$pga,'peis'=>$peis,'recorded_at'=>$recordedAt],
         now()->addMinutes(15));
     ```
   - It updates `device.last_seen_at` and returns `{"message":"ok","error":false,"data":null}` immediately.
4. **What the permin path does NOT do (called out to avoid the old mental model):** it does not persist the `.log`, does not insert into `readings`/`permin_logs`, and does not dispatch `ReadingBatchIngested`. The `readings` table + `ReadingBatchIngested` → Reverb broadcast pipeline is a **separate generic ingest path** (`ReadingIngestService`, used by `IngestController`), not driven by permin. The durable **event** waveform substrate is **eventMax** (`POST /uploadEventMax` → store file + `EventMaxLog` row + `ProcessEventMaxFile` job + `EventMaxLogReceived` broadcast).

---

### Phase 4: Dynamic Waveform Generation & Client Visualization (DB to Browser Pixels)

1. **Dashboard Badges & Cards:**
   - PGA and PEIS are computed **server-side** during permin ingest (the `Peis` helper) and held in the `device:{id}:latest_reading` cache. The intensity scale used is **PEIS** (the PHIVOLCS Earthquake Intensity Scale), already attached to each value.
   - The portal surfaces the latest value/badges from that cache and from the REST `readings`/`latest_readings` endpoints; the generic Reverb channel `devices.{uuid}` (`ReadingBatchIngested`) is wired but, as noted in Phase 3, is **not** fed by permin uploads, so live permin-driven badges currently update on the cache/poll path rather than via a permin broadcast.
   - **UI Rendering:** the dashboard renders numeric intensity badges, labels, and color states from these values.
2. **Seismogram Line Graph (Dynamic Waveform API):**
   - The frontend requests data for the chart's window from the platform. Two modes exist (`HighController::waveform`):
     ```http
     GET /api/devices/{uuid}/waveform?event_id=<eventId>           # event mode — reads the eventMax file
     GET /api/devices/{uuid}/waveform?start=...&end=...            # time-range mode — reads permin_logs
     ```
   - **Event mode (`event_id`)** is the working seismogram path: it loads the stored **eventMax** `.log` for that event and returns raw `{x,y,z}` arrays.
   - **Time-range mode (`start`/`end`)** queries the `permin_logs` table for files covering the window, then reads each file from storage. **Caveat:** in the current code permin uploads never create `permin_logs` rows (see Phase 3), so this mode returns empty until/unless a permin-persistence path is added. It also enforces a **1-hour** max window.
   - **Server-Side Downsampling (time-range mode):**
     - **Range < 1 minute:** return the full raw samples directly (sorted by timestamp).
     - **Range >= 1 minute:** pass samples through a server-side **LTTB (Largest-Triangle-Three-Buckets)** downsampler with a target of **2,000 points** per axis (`$this->lttb($xRaw, 2000)`).
     - **Caveat (col-6 filter):** both waveform modes currently keep only rows where the 6th CSV field equals `1` (`(int)$flag !== 1` → skip). Per §4 the 6th field is **PEIS intensity, not a 1/0 validity flag** (firmware emits `2` at rest), so this filter drops all at-rest and most strong-motion samples — a known mismatch to reconcile.
     - **Response Composition:**
       ```json
       {
         "x": [[1782122402000, -0.000056], [1782122402004, 0.00012], ...],
         "y": [[1782122402000, 0.001187], [1782122402004, -0.00083], ...],
         "z": [[1782122402000, 0.000123], [1782122402004, 0.000045], ...]
       }
       ```
   - **Canvas Rendering:**
     - The ECharts React component receives the coordinate arrays.
     - High-performance settings are applied to ensure 60 FPS scrolling:
       - `animation: false` (turns off standard transition computations).
       - `showSymbol: false` (hides per-sample data points/bullets).
       - `sampling: 'lttb'` (enables secondary client-side downsampling for zoom/pan interactions).
     - The canvas line chart re-renders immediately.

---

## 4. Comprehensive CSV File Structure Decoded

Continuous logging files (`permin` and `eventMax`) employ a simple, comma-separated format without headers to minimize storage foot-print and transmission overhead.

### Data Line Schema

```
Sample Index, Timestamp Milliseconds, X Acceleration, Y Acceleration, Z Acceleration, PEIS Level
```

### Column Reference & Data Types

| Field Index | Name | Data Type | Units | Description & Edge Constraints |
|---|---|---|---|---|
| **0** | `index` | Integer | None | Incremental index tracking the sample order within the individual file. Restarts at `0` for each new file. |
| **1** | `timestamp` | BigInt | Milliseconds | Unix Epoch representation (e.g., `1679951183498`). Crucial for calculating axis time steps and windowing. |
| **2** | `accel_x` | Float | $g$ | Peak-ground linear acceleration along the X-axis. Stationary state readings fluctuate around $\pm0.0003g$ (sensor noise). |
| **3** | `accel_y` | Float | $g$ | Peak-ground linear acceleration along the Y-axis. |
| **4** | `accel_z` | Float | $g$ | Peak-ground linear acceleration along the Z-axis (normalized to exclude gravity). |
| **5** | `peis` | Integer | 1–10 Scale | **PEIS intensity derived by the sensor firmware** (`intensity.calcPEIS(max(reading))` per sample; the file's max is also embedded in the filename). This is NOT a validity flag. *Caution:* Running firmware emits `2` at rest, and higher values during movement. **Do NOT filter rows on this field,** as doing so will drop critical strong-motion data. ⚠️ The platform's `HighController::waveform` currently *does* filter to `col6 == 1`, which conflicts with this and is flagged for correction (see §3 Phase 4). |

### Sample Data Payload

```csv
0,1782122402000,-5.6451199e-05,0.001187783,0.000123583,2
1,1782122402004,-5.4321200e-05,0.001124500,0.000142100,2
2,1782122402008,-5.2210000e-05,0.001198421,0.000119310,2
```

---

## 5. API Endpoint Specifications

### A. IDC Gateway Receivers (`lowrise_server_receiver`)

#### 1. Upload Per-Minute Log
- **Endpoint:** `POST /uploadPermin`
- **Request Headers:** `'Content-Type': 'multipart/form-data'`
- **Form Body:**
  - `node_name` (String, required)
  - `file` (File Binary, required)
- **Response Shape:**
  ```json
  {
    "message": "File permin upload success",
    "error": false
  }
  ```

#### 2. Upload Event Max Log
- **Endpoint:** `POST /uploadEventMax`
- **Request Headers:** `'Content-Type': 'multipart/form-data'`
- **Form Body:**
  - `node_name` (String, required)
  - `eventId` (String, required)
  - `file` (File Binary, required)
- **Response Shape:**
  ```json
  {
    "message": "File event max upload success",
    "error": false
  }
  ```

---

### B. Cloud Platform Ingress Routes (`routes/rpi.php`)

These routes utilize bare paths to conform with edge firmware requirements and are routed outside standard `/api/` prefix structures.

#### 1. Continuous Permin Ingest
- **Endpoint:** `POST /high/uploadPermin`
- **Authentication:** Evaluated via body parameter `node_token` through the `NodeTokenAuth` middleware.
- **Form Body:**
  - `node_token` (String, required)
  - `file` (File Binary, required)
- **Response Shape:**
  ```json
  {
    "message": "ok",
    "error": false,
    "data": null
  }
  ```

#### 2. First Alarm Ingest
- **Endpoint:** `POST /high/firstAlarm`
- **Form Body:**
  - `node_token` (String, required)
  - `eventId` (String, required)
- **Response Shape:**
  ```json
  {
    "message": "ok",
    "error": false,
    "data": null
  }
  ```

#### 3. Event Peak Ingest
- **Endpoint:** `POST /uploadEventMax`
- **Request Options:** Client enforces a strict **10,000 ms timeout**.
- **Form Body:**
  - `node_token` (String, required)
  - `eventId` (String, required)
  - `file` (File Binary, required)
- **Response Shape:**
  ```json
  {
    "message": "ok",
    "error": false,
    "data": null
  }
  ```

---

### C. Cloud Platform REST API Read Routes (`routes/api.php`)

#### 1. Fetch Aggregated Readings
- **Endpoint:** `GET /api/devices/{uuid}/readings?window=1h`
- **Query Parameters:**
  - `window` (String, **required**: `1h`, `6h`, `24h`)
  - `sensor_key` (String, optional — filters to one sensor `key`)
- **Limitation:** A `ROW_NUMBER() OVER (PARTITION BY sensor_id ...)` window function caps results at **500 rows per sensor** at the DB level. Used for intensity badges and short-trend line widgets. (Note: this `readings` table is fed by the generic ingest path, not by permin uploads.)
- **Response Shape:** an object **grouped by sensor `key`** (not a flat array):
  ```json
  {
    "accel_x": [
      { "id": 1, "device_id": 9, "sensor_id": 3, "value": 0.0076, "recorded_at": "2026-06-22T10:00:01.000000Z" },
      ...
    ],
    "accel_y": [ ... ]
  }
  ```

#### 2. Fetch Downsampled Seismogram Waveform
- **Endpoint:** `GET /api/devices/{uuid}/waveform`
- **Query Parameters (two mutually exclusive modes):**
  - `event_id` (String) — **event mode**: returns the raw `{x,y,z}` from the stored **eventMax** file for that event. This is the working seismogram path.
  - `start` + `end` (ISO8601, both required when `event_id` is absent; `end` must be after `start`) — **time-range mode**: reads `permin_logs`-referenced files. Currently returns empty because permin uploads do not create `permin_logs` rows (see Phase 3).
- **Rule Engine (time-range mode):** windows ≥ 1 minute run server-side LTTB (target 2,000 pts/axis); windows < 1 minute return raw. Hard **1-hour** max window. Both modes currently filter rows to col-6 `== 1` (see §4 caveat).
- **Response Shape:**
  ```json
  {
    "x": [[1782122402000, -0.000056], ...],
    "y": [[1782122402000, 0.001187], ...],
    "z": [[1782122402000, 0.000123], ...]
  }
  ```

---

## 6. Detailed Processing & Aggregation Logic

### Pipeline A: Per-File Peak Extraction (permin → cached latest reading)

> **Corrected:** the platform does **not** run a `ProcessPerminFile` job, does not bucket into 1-second windows, and does not write the `readings` table from permin. Because each permin file is only **125 samples (~250 ms)** — *less than one second* — the "60 one-second buckets per 1-minute file" model never applied. The real work is a single per-file peak extraction done synchronously in `HighController::uploadPermin`.

```
        +-------------------------------------------+
        | One permin file: <ts>_<xMax>_<yMax>_      |
        | <zMax>_<peisMax>.log  (125 samples ~250ms)|
        +---------------------+---------------------+
                              |
                              v
        +-------------------------------------------+
        | Take per-file peaks from the FILENAME     |
        | (fallback: abs-max over the 6-col rows)   |
        +---------------------+---------------------+
                              |
                              v
        +-------------------------------------------+
        | Server-side PGA + PEIS (Peis helper)      |
        +---------------------+---------------------+
                              |
                              v
        +-------------------------------------------+
        | Cache::put device:{id}:latest_reading     |
        | (15 min TTL) + device.last_seen_at        |
        +-------------------------------------------+
```

1. **Peak source:** the sensor already embedded `xMax/yMax/zMax/peisMax` in the filename when it wrote the 125-sample batch; the platform parses those (fallback: absolute-max over the CSV rows).
2. **Absolute-max semantics:** the per-axis peak is the extreme amplitude over the batch — `max(|accel_x_i|)` etc. — so strong-motion peaks are never dampened.
3. **Output:** a single cached "latest reading" per device (not a time series). Continuous historical waveform from permin would require an added persistence path; today's durable waveform substrate is **eventMax**.

---

### Pipeline B: Dynamic Waveform API Downsampling (LTTB Algorithm)

For the long-window seismogram line graphs, the API compresses points on-the-fly using the **Largest-Triangle-Three-Buckets (LTTB)** downsampling algorithm to reduce visual clutter and transfer payload sizes.

```
       [Raw Waveform Series: N Points] ---> [LTTB Downsampler] ---> [Optimized Series: ~2,000 Points]
```

#### Step-by-Step LTTB Execution:
1. **Split Series:** Divides the raw timeline arrays into $M$ equal-sized buckets ($M = 2000$ target output points). The first and last points are always pinned as the boundaries.
2. **First Bucket Boundary:** The first bucket contains only the first point (initial anchor $A$).
3. **Averaging Next Bucket:** For each bucket $B_i$, calculate the average point (centroid $C$) of all coordinates in the subsequent bucket $B_{i+1}$. This centroid acts as a temporary look-ahead point:
   $$C_x = \frac{1}{|B_{i+1}|} \sum_{p \in B_{i+1}} p_x, \quad C_y = \frac{1}{|B_{i+1}|} \sum_{p \in B_{i+1}} p_y$$
4. **Triangle Area Maximization:** Inside the current bucket $B_i$, locate the specific coordinate point $P$ that maximizes the surface area of the triangle formed with anchor $A$ and centroid $C$.
   $$\text{Area} = \frac{1}{2} | A_x(P_y - C_y) + P_x(C_y - A_y) + C_x(A_y - P_y) |$$
5. **Anchor Rotation:** Save point $P$ as the downsampled representation for bucket $B_i$. Rotate the anchor, assigning $A = P$ for the next iteration.
6. **Delivery:** The resulting downsampled set preserves all physical visual peaks, valleys, and waveform trends without distorting signal frequency patterns.

---

## 7. Edge & Server-Side Resilience Strategies

The USHER Lowrise architecture implements several design strategies to guarantee zero-loss operation and system stability:

### 1. File-System Buffering (Edge Resilience)
If internet or backhaul network connectivity to the cloud platform fails:
- The `lowrise_server_receiver` continues to accept and write permin (125-sample/~250 ms) and event logs locally.
- The `lowrise_server_uploader` re-arms its upload timer on the `PERMIN` interval (default 5 s), effectively retrying failed uploads of the oldest file.
- Because successful uploads require an explicit HTTP `200` response to trigger file deletion, data remains safely stored on the edge SD card until the connection is restored, preventing any data loss.

### 2. Multi-Worker Concurrency Handling (Laravel Octane + FrankenPHP on Windows)
The RPi uploader shoots simultaneous, concurrent streams of files (`permin`, `eventMax`) and signals (`firstAlarm`).
- **The Bottleneck:** Under standard single-threaded servers (`php artisan serve`), incoming requests block, causing `eventMax` uploads (which enforce a strict 10s client timeout) to fail with `ETIMEDOUT`.
- **The Solution:** The platform uses a multi-worker server model running Laravel Octane backed by FrankenPHP.
- **PM2 Orchestration:** To ensure terminal-free survival across system reboots, the server web, Reverb socket daemon, and background queue workers are running as isolated PM2 processes:
  ```bash
  pm2 start "php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=4" --name platform-web
  pm2 start "php artisan reverb:start --host=0.0.0.0 --port=8080" --name platform-reverb
  pm2 start "php artisan queue:work" --name platform-queue
  pm2 save
  ```

### 3. Edge Storage Safeguards (Auto-Cleanup)
To prevent the edge Raspberry Pi's SD card from running out of space under continuous logging:
- The gateway's `UploadController.ts` triggers directory scans upon every new file arrival.
- If the directory file count exceeds 20 files, older files are automatically purged (`fs.unlink`), capping local storage usage and protecting the operating system from sudden disk-space exhaustion.

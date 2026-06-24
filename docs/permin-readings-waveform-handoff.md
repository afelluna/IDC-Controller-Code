# Handoff: Turn `permin` Waveform Files into Readings + a Waveform API

> **Context for the reader:** The RPi `lowrise_server_uploader` uploads `permin` files to
> `usher-wehlo-platform` via `POST /high/uploadPermin`. The current `HighController::uploadPermin`
> stores each file as an opaque blob (`permin_logs.file_path`) and never parses it. As a result the
> client app's charts/badges are empty — nothing reaches the `readings` table. This handoff defines
> two processing pipelines off the same `permin` files so the client app gets both numeric intensity
> badges and seismogram line graphs.
>
> **HARD CONSTRAINT — no RPi code changes.** The only permitted RPi-side change is `.env`/config
> (already done). Everything in this handoff is implemented **entirely in the platform**. The RPi keeps
> shipping `permin` files to `/high/uploadPermin` unchanged; the platform does all parsing,
> aggregation, and the internal ingest write. The RPi never calls `/api/ingest` itself.

---

## The `permin` file format (decoded)

Each `permin` file is CSV, one sample per line, **no header**:

```
0,1679951183498,-5.6451199e-05,0.001187783,0.000123583,1
│ │             │              │           │           │
│ │             │              │           │           └─ PEIS intensity (firmware-derived int, ~1–10) — NOT a validity flag
│ │             │              │           └─ Z axis acceleration (g)
│ │             │              └─ Y axis acceleration (g)
│ │             └─ X axis acceleration (g)
│ └─ timestamp: Unix epoch in MILLISECONDS  (1679951183498 = 2023-03-27)
└─ sample index within the file (0,1,2,3…)
```

**Units:** X/Y/Z are in **g-force (g)**, with the 1g gravity vector already removed (linear
acceleration). Stationary readings hover around `±0.0003 g` (sensor noise).

> ⚠️ **The 6th column is the firmware's PEIS intensity level (a derived integer, ~1–10) — it is
> NOT a validity flag.** An earlier version of this doc claimed it was "always 1 = valid"; that was
> wrong and caused a real bug (verified 2026-06-18 against live device `7c4f9457…`). The running
> firmware emits `2` at rest and higher values during stronger motion. **Do NOT filter samples on
> this column** — doing so discards data by *intensity*: it nulls the whole pipeline at rest and
> drops exactly the strong-motion samples you need during a real event. Treat **every** row as a
> valid acceleration sample. Validate on **structure only** (correct field count, numeric X/Y/Z,
> skip blank/malformed trailing lines). PEIS is recomputed on the frontend from `accel_x/y/z`
> (see Pipeline A), so the per-sample col-6 value is redundant and is intentionally ignored.

**Sample rate:** timestamps are ~2–4 ms apart → **~250–300 Hz raw waveform**. A one-minute file is
roughly **~18,000 samples × 3 axes**. This volume is why raw samples must **not** be dumped directly
into the ingest table — they're aggregated to 1 Hz first (Pipeline A).

---

## Architecture: two pipelines off one source

```
[~300Hz raw permin file] ──► [stored on disk: permin/{uuid}/...]
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                      │
   Pipeline A: 1Hz Aggregator                     Pipeline B: Dynamic Waveform API
        │                                                      │
   POST /api/ingest                               GET /devices/{uuid}/waveform (LTTB)
   accel_x, accel_y, accel_z (g)                              │
        │                                                      │
   PGA + PEIS computed on FRONTEND                ECharts seismogram line graph
        │
   UI text badges + intensity
```

> **Confirmed against the platform** (`config/device_types.php`, `IngestController`, ingest tests):
> `usher` devices register exactly three sensor keys — **`accel_x`, `accel_y`, `accel_z`** (unit `g`).
> There are **no** `pga`/`peis` keys; ingest rejects unknown keys with `400 Invalid sensor key`.
> The config comment states magnitudes are *"computed on frontend"* — so **PGA/PEIS are frontend-
> derived, Option B**. This is now decided, not open.

---

## Pipeline A — Aggregate `permin` → `POST /api/ingest` (1 Hz)

**The aggregated data goes through the EXISTING `/api/ingest` endpoint, as `accel_x/accel_y/accel_z`
readings only. Do NOT add `pga`/`peis` keys — ingest validates sensor keys per-device and rejects
unknowns with `400`.** PGA and PEIS are computed on the frontend (see below).

**Do NOT insert raw 300 Hz samples.** Aggregate into 1-second buckets at ingest time (inside or
triggered by `HighController::uploadPermin`, after the file is stored).

**Steps:**

1. **Window:** slice the file's samples into 1-second buckets by their epoch-ms timestamp (~300
   samples/bucket).
2. **Per-axis peak (absolute max) per bucket** → the value sent for each axis:
   - `accel_x = max(|x₁|, |x₂|, … |xₙ|)`
   - `accel_y = max(|y₁|, |y₂|, … |yₙ|)`
   - `accel_z = max(|z₁|, |z₂|, … |zₙ|)`
3. **Feed the existing ingest pipeline**, one record per second. Reuse `IngestController`'s
   write/broadcast logic **in-process** (extract it to a shared service if needed) rather than an HTTP
   self-call. The ingest contract (confirmed) is:
   ```
   POST /api/ingest
   Header: X-Device-Token: <raw device token>
   Body:   {
             "device_uuid": "<uuid>",
             "readings": [
               { "sensor_key": "accel_x", "value": <peak>, "recorded_at": "<ISO8601>" },
               { "sensor_key": "accel_y", "value": <peak>, "recorded_at": "<ISO8601>" },
               { "sensor_key": "accel_z", "value": <peak>, "recorded_at": "<ISO8601>" }
             ]
           }
   ```
   `recorded_at` is derived from the bucket's epoch-ms timestamp (historical, from the file — **not**
   `now()`). The existing pipeline validates keys, bulk-inserts, updates `last_seen_at`, and dispatches
   `ReadingBatchIngested` → Reverb.
4. **Broadcast** is handled by the existing ingest pipeline — don't add a second one. Uploads are
   batched, so a single file emits a burst of ~60 seconds of records (3 readings/sec).

### PGA + PEIS are computed on the FRONTEND (decided)

Per `config/device_types.php` ("magnitudes computed on frontend"), the client derives both from the
stored `accel_x/y/z` — neither is stored:

- `PGA = sqrt(accel_x² + accel_y² + accel_z²)` (in g)
- `PEIS` = `PGA` → PEIS classification → integer **1–10**.

Keep the **PEIS threshold table in exactly one place** on the client (the `PEISScaleCard` likely
already holds it). **Also fix the dead reference:** `FRONTEND_V1_HANDOFF.md:349` reads a non-existent
`accel_raw` key — replace it with the computed PGA from `accel_x/y/z`.

### Idempotency
- Re-uploads must not double-insert seconds (the RPi retries). The confirmed ingest path bulk-inserts;
  verify it dedupes on `device_id + sensor_id + recorded_at` (unique key / upsert). If it does **not**,
  that's a required fix — flag it.

---

## Pipeline B — Dynamic Waveform API (for the seismogram line graph)

Keep `permin` files intact on disk/object storage for raw retrieval. Add a read endpoint that serves
**tiered-downsampled** waveform data so the browser never receives more than it can render.

**`GET /devices/{uuid}/waveform?start=…&end=…`** (auth: `auth:sanctum` + same site scoping as other
device reads)

1. **Resolve** which `permin` file(s) cover the requested `[start, end]` window.
2. **Conditional downsampling:**
   - **Window < 1 minute:** stream the **full raw** samples (~18,000 points) — the browser handles a
     single raw chunk fine.
   - **Window ≥ 1 minute:** run a server-side **LTTB** (or Min-Max) filter over the raw samples,
     compressing to a target of **~2,000 points total** before sending.
3. **Response shape:** per-axis arrays of `[timestamp_ms, value]` pairs:
   ```json
   { "x": [[t,v],…], "y": [[t,v],…], "z": [[t,v],…] }
   ```
4. **Guardrails (required):** enforce a **max window duration** (e.g. 1 hour) and/or pagination so a
   huge range can't load thousands of files and crash the server.

### Frontend (client app) — ECharts seismogram
Add a seismogram component that calls `/waveform` on zoom/pan and renders with native canvas
optimizations:
```js
const chartOptions = {
  animation: false,            // perf: no animations
  xAxis: { type: 'time' },
  yAxis: { type: 'value' },    // g-force
  series: ['x','y','z'].map(axis => ({
    name: `${axis.toUpperCase()}-axis`,
    type: 'line',
    showSymbol: false,         // never render dots for high-freq data
    sampling: 'lttb',          // double-optimize on the client
    data: dataByAxis[axis]     // [[timestamp_ms, value], …]
  }))
};
```
Bind ECharts data refresh to the backend time filter so zoom/pan re-queries `/waveform` for the new
range (server returns raw <1min, LTTB ≥1min).

---

## ⚠️ Required platform fix — the 500-row timeseries cap

`DeviceController.php:362` caps the readings timeseries at **500 rows per sensor**
(`->where('row_num', '<=', 500)`). At Pipeline A's 1 Hz cadence that's only **~8.3 minutes of data
per sensor at *every* window** (1h / 6h / 24h all truncate to 500 rows). The window query is correct;
the cap makes it useless for per-second seismic data.

| Window | Expected rows @1 Hz | Returned (500 cap) |
|---|---|---|
| 1h | 3,600 | 500 (~8 min) |
| 6h | 21,600 | 500 (~8 min) |
| 24h | 86,400 | 500 (~8 min) |

This is independent of the PGA/PEIS decision and **must be resolved**.

**DECIDED — the split approach:**

- Keep the readings / `/api/ingest` timeseries for the **badges + recent short trend only**. The
  500-row cap is fine here — the badge needs the latest 1 Hz values, not 24h of history. **Leave the
  cap as-is.**
- Serve **all long-window accel visualization from Pipeline B `/waveform`** (LTTB-downsampled from the
  raw `permin` files). This never ships 86k rows and reuses the downsampling already being built.
- Net effect: the client's seismogram/line-graph reads `/waveform`; the numeric intensity badges read
  the `/readings` timeseries. They are separate data sources by design.

(The rejected alternative was "raise the cap + add downsampling to the readings endpoint" — not chosen,
to avoid duplicating LTTB logic in two places.)

Note `FRONTEND_V1_HANDOFF.md:603` assumes a **10-second** cadence ("24h = 8,640 points"); at 1 Hz that
sizing is off by 10×. Since long-window data now comes from `/waveform`, that doc's timeseries sizing
is moot for accel — but reconcile/annotate it so it isn't mistaken for the readings-table plan.

---

## Log File Processing & Job Architecture

### Log types and how each is processed

| Type | File? | Processing | Job |
|---|---|---|---|
| `firstAlarm` | No (just `eventId`) | Insert `seismic_alarms` row inline (fast, no file) | none |
| `permin` | Yes (.log CSV) | Parse → 1 Hz aggregate → ingest `accel_x/y/z`; file retained for `/waveform` | `ProcessPerminFile` |
| `eventMax` | Yes (.log CSV, **same format**) | Parse → store/index event waveform keyed by `eventId` for display | `ProcessEventMaxFile` |
| `uploadedEvent` / `uploadedeventMax` | — | **RPi-local archive only** — the uploader *moves* files here after a successful upload. The platform never receives these. **Do not build anything for them.** | none |

### Design principles

1. **One job per uploaded file** — never per-reading or per-second. permin is ~1 file/min/device →
   ~1 job/min/device. This granularity is what keeps the queue cheap; do not fan out into thousands of
   micro-jobs.
2. **Upload handler returns immediately:** store file → `dispatch(job)` → `200`. All parsing happens
   async on the queue worker, off the request thread. This is what keeps upload responses in
   milliseconds and avoids the RPi's upload timeouts.
3. **Idempotent:** jobs are keyed by file; reprocessing the same file upserts rather than duplicating
   (readings dedupe on `device + sensor + second`; eventMax keyed by `eventId`). Safe against RPi
   re-uploads and job retries.

### Jobs

- **`ProcessPerminFile(deviceUuid, filePath)`** — parse CSV → keep **every** structurally-valid row
  (do NOT filter on col 6 / PEIS) → 1-second buckets → abs-max per axis → feed the existing ingest
  pipeline (`accel_x/y/z`). Leave the raw file on disk (Pipeline B `/waveform` reads it).
- **`ProcessEventMaxFile(deviceUuid, eventId, filePath)`** — parse the same CSV format → store/index as
  an **event waveform** keyed by `eventId`, served through the waveform endpoint (by event). This is
  the event-capture seismogram shown for an alarm.

### Queue & workers

- Run `php artisan queue:work` — this is the **`platform-queue`** PM2 process from
  `platform-concurrency-server-handoff.md`. (`ReadingBatchIngested` is already queued, so a worker is
  required regardless.)
- **1–2 workers is ample** for this volume. If backlog ever appears (many devices), scale workers —
  not job granularity.

### Failure handling & file lifecycle

- Jobs use Laravel retries (`tries=3` + backoff); permanent failures land in `failed_jobs` (dead-letter)
  and are logged. A bad/corrupt file is logged and marked failed — it must **not** block the queue.
- Track processing state on the `permin_logs` / `event_max_logs` row: a `status`
  (`pending|processed|failed`) + `processed_at`, so files aren't silently reprocessed and you can audit
  what's been handled.

### Performance note (jobs do NOT slow the backend)

Async jobs make the **request path faster**: the heavy parse is moved off the HTTP response onto a
background worker, so uploads return in milliseconds. Cost is bounded — one job per file (~1/min/device),
workers run in a separate process and never block web requests, and growth is handled by adding workers.
The slow path is the opposite — parsing **synchronously inside the request** (blocks the response, risks
timeouts). Jobs exist precisely to avoid that.

### Waveform display model — frontend UX decision

Uploads are **batched per-minute**, so true continuous real-time scrolling is **not** available from
this path (that needs the high-frequency Socket.IO path the original USHER system uses — out of scope
here). Viable models:

- **Per-minute static graph (recommended — matches the reference portal):** each new `permin` file is
  one minute of waveform; the graph refreshes per minute as files land. Aligns with the per-minute data
  cadence.
- **Pseudo-live:** client polls `/waveform` on a short interval and appends the newest minute
  (stepwise updates each minute, not smooth scrolling).

Confirm which the client should implement; both are served by the same `/waveform` endpoint.

---

## Where this plugs into existing code

- **`HighController::uploadPermin`** — after storing the file: `dispatch(new ProcessPerminFile(...))`
  and return `200` immediately. The job runs Pipeline A (parse → 1s aggregate → feed ingest). Keep the
  raw file on disk (Pipeline B needs it).
- **`HighController::uploadEventMax`** — after storing the file: `dispatch(new ProcessEventMaxFile(...))`
  and return `200`. The job parses the same CSV format and indexes the event waveform by `eventId`.
- **Reuse `IngestController`'s ingest logic** — extract its write/broadcast into a shared service if
  it isn't one already, so `ProcessPerminFile` can feed it in-process without an HTTP self-call.
- **New** `HighController::waveform` (or a dedicated controller) + route for Pipeline B — serving both
  continuous permin windows and per-event eventMax captures (by `eventId`).
- **`routes/api.php`** — register the `/devices/{uuid}/waveform` read route alongside the existing
  `/alarms` and `/event-max-logs` reads.
- **PGA/PEIS** — computed on the **client** from `accel_x/y/z`; not stored. Fix the `accel_raw` dead
  reference in `FRONTEND_V1_HANDOFF.md:349`.
- **`DeviceController.php:362`** — leave the 500-row cap as-is (split approach); long-window viz comes
  from `/waveform`.
- **Client app** — new seismogram component bound to `/waveform`; the existing badges/intensity light
  up automatically once `ProcessPerminFile` feeds `accel_x/y/z` through ingest.

---

## Handoff checklist

- [ ] `uploadPermin` / `uploadEventMax` dispatch a job and return `200` immediately (parse is async).
- [ ] **One job per file** (`ProcessPerminFile`, `ProcessEventMaxFile`) — no per-reading micro-jobs.
- [ ] `ProcessPerminFile` posts to `/api/ingest` as `accel_x/accel_y/accel_z` only — no `pga`/`peis`.
- [ ] `ProcessEventMaxFile` parses the same CSV and indexes the event waveform by `eventId`.
- [ ] PGA/PEIS computed on the **client** from `accel_x/y/z`; PEIS thresholds in one place;
      `accel_raw` dead reference fixed.
- [ ] Parser handles epoch-ms timestamps, tolerates blank/malformed trailing lines, and keeps **every**
      structurally-valid row — it does **NOT** filter on col 6 (that column is PEIS intensity, not a
      validity flag; filtering on it nulls the pipeline at rest and drops strong-motion samples).
- [ ] Pipeline A produces exactly 1 bucket/sec (3 readings/sec) with historical `recorded_at`.
- [ ] Jobs are idempotent on re-upload/retry (readings dedupe on device + sensor + second; eventMax by
      `eventId`).
- [ ] Job failure handling: `tries`/backoff, `failed_jobs` dead-letter, corrupt file logged + marked
      failed (never blocks the queue).
- [ ] File lifecycle tracked: `status` (pending|processed|failed) + `processed_at` on the log rows.
- [ ] `queue:work` running as the `platform-queue` PM2 process (1–2 workers).
- [ ] Existing `ReadingBatchIngested` (from the ingest pipeline) fires; client badges update live.
- [ ] **500-row cap left as-is** (split approach) — long-window viz served by `/waveform`.
- [ ] `/waveform` enforces a max window duration + streams raw <1min, LTTB ~2000 pts ≥1min; serves both
      permin windows and per-event eventMax captures.
- [ ] ECharts component: `animation:false`, `showSymbol:false`, `sampling:'lttb'`, time axis,
      re-queries on zoom/pan.
- [ ] Waveform display model confirmed (per-minute static vs pseudo-live poll).
- [ ] Raw `permin` + `eventMax` files retained on disk (Pipeline B depends on them) — retention policy.

---

## Out of scope

- **No RPi uploader code changes** — config/`.env` only (already done). The RPi keeps shipping
  `permin` files unchanged; all logic lives in the platform.
- No change to the `firstAlarm` path (already working) — it's a signal, not a file.
- `eventMax` upload/storage already works; this handoff **adds** parsing of its `.log` into an event
  waveform (it was previously stored as an unparsed blob).
- No raising the readings 500-row cap (split approach: long-window data comes from `/waveform`).
- Long-term raw-file retention/archival policy is a separate decision (flag if disk fills).

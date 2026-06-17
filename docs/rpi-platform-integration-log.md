# RPi → `usher-wehlo-platform` Integration — Master Log

> Consolidated record of the work to connect the Raspberry Pi seismic uploader to the new
> `usher-wehlo-platform` (Laravel) backend + its two React frontends. Captures the goal, what was
> built and verified, the debugging journey, the data-flow design, and everything still pending.
>
> **Companion handoffs (implementation detail lives there):**
> - `docs/platform-concurrency-server-handoff.md` — move platform off `php artisan serve` to a
>   multi-worker server (Octane/FrankenPHP).
> - `docs/permin-readings-waveform-handoff.md` — turn `permin`/`eventMax` log files into readings +
>   a waveform API, with the full job architecture.

---

## 1. Goal

Redirect the RPi `lowrise_server_uploader` from the old portal (`https://portal.usher.ph:3001`) to a
locally-hosted `usher-wehlo-platform` so that platform's backend + two frontends receive the device's
seismic data. **Hard constraint: the only permitted RPi-side change is `.env`/config — all other work
is done in the platform.**

---

## 2. The RPi uploader — how it works (confirmed from source)

`lowrise_server_uploader` (Node/TS, runs under PM2 on the RPi at
`/var/www/html/lowrise_server_uploader`, also seen at `pi@raspberrypi`) ships files to the platform.

| Uploader class | Endpoint env var | Sends | Active? |
|---|---|---|---|
| `PerminUpload` | `URL_PERMIN` | `node_token` + `file` (per-minute `.log`) | ✅ |
| `FirstAlarmUpload` | `URL_FIRSTALARM` | `node_token` + `eventId` (no file) | ✅ |
| `EventMaxUpload` | `URL_EVENT_MAX` | `node_token` + `eventId` + `file` (`.log`) | ✅ |
| `EventUpload` | `URL_EVENT` | (would send file) | ❌ **commented out in `server.ts:16`** — dead |

**Key behaviors confirmed in code:**
- Auth is `node_token` as a **multipart form field**, NOT an `Authorization` header.
- Success = `res.statusCode == 200` **only**. On any non-200 the RPi keeps the file and retries on a
  timer (permin 5s, firstAlarm 5s, eventMax 50s). On 200 it deletes (permin) or moves (firstAlarm,
  eventMax) the local file.
- `EventMaxUpload` has a **hard 10s `timeout`** in its request options; the others have none.
- `EventMaxUpload`/`EventUpload` move uploaded files into RPi-local `uploadedeventMax`/`uploadedEvents`
  dirs — these are **RPi-local archives**; the platform never receives them.
- Config is read from `.env` via `dotenv` **at process startup** → `.env` edits require a restart.
- `URL_EVENT` empty is harmless (the class never instantiates).

### Permin / eventMax `.log` file format (same for both)

CSV, one sample per line, no header:
```
0,1679951183498,-5.6451199e-05,0.001187783,0.000123583,1
│ │             │              │           │           └─ flag/status (1 = valid)
│ │             │              │           └─ Z accel (g)
│ │             │              └─ Y accel (g)
│ │             └─ X accel (g)
│ └─ epoch MILLISECONDS
└─ sample index
```
- **Units: g-force**, gravity vector already removed (values hover ±0.0003 g at rest).
- **Sample rate ~250–300 Hz** → a 1-minute file ≈ ~18,000 samples × 3 axes.

---

## 3. Platform endpoints — built & verified ✅

New net-new work added to `usher-wehlo-platform` (Laravel) to receive the three active uploads:

- 3 migrations + models: `seismic_alarms`, `permin_logs`, `event_max_logs`.
- `Device::verifyToken()` + `Device::findByToken()` extracted from `IngestController`.
- `NodeTokenAuth` middleware — reads `node_token` from POST body, resolves device, sets
  `request.attributes.device`.
- 3 broadcast events: `SeismicAlarmTriggered`, `PerminLogReceived`, `EventMaxLogReceived`.
- `HighController` — 3 ingest actions (each updates `last_seen_at`) + 2 read actions.
- Routes in `routes/rpi.php` (registered via `bootstrap/app.php`) as **bare paths, no `/api` prefix**:
  `/high/firstAlarm`, `/high/uploadPermin`, `/uploadEventMax`.
- `phpunit.xml` — added `APP_KEY` so the suite runs.

**Frontend (client app):** `SeismicAlarm` + `EventMaxLog` types, `getDeviceAlarms` in `api.ts`,
`useDeviceAlarms` hook (SWR + Echo listener for `SeismicAlarmTriggered`), `AlarmsPanel` in
`UsherSeismicView`. **Admin app:** no alarm UI (it only manages users/sites/devices).

**Audit + curl tests: clean.** Verified from the RPi against `192.168.10.13:8000`:
```
POST /high/firstAlarm  (node_token + eventId)            → 200 {"message":"ok","error":false,"data":null}
POST /uploadEventMax   (node_token + eventId + file)     → 200, 0.339s
bad token                                                → 401
```
DB rows landed; `last_seen_at` updated.

---

## 4. RPi `.env` — the only RPi change

Five variables (values from the verified curl):
```env
TOKEN=214BRnS6EofvA8SgPkRnkXubdCREyW6y

URL_FIRSTALARM=http://192.168.10.13:8000/high/firstAlarm
URL_PERMIN=http://192.168.10.13:8000/high/uploadPermin
URL_EVENT=
URL_EVENT_MAX=http://192.168.10.13:8000/uploadEventMax
```
- `192.168.10.13:8000` = the platform machine's **Ethernet** LAN IP + port. `TOKEN` = the device's
  ingest token (from the admin app's reveal-token action). `URL_EVENT` intentionally blank (dead path).
- After editing, the uploader must be **restarted** (`pm2 restart uploader`) — config loads at startup.

---

## 5. Network bring-up — debugging journey & resolutions

| Symptom | Cause | Resolution |
|---|---|---|
| curl worked only from the platform machine (localhost) | `php artisan serve` binds `127.0.0.1` | Start with `--host=0.0.0.0 --port=8000` |
| Machine→RPi ping OK, RPi→machine ping failed | Windows Firewall blocks unsolicited inbound ICMP (separate from TCP) | Don't rely on ping; opened inbound TCP 8000 |
| RPi couldn't reach platform | Firewall + binding | `netsh advfirewall firewall add rule … localport=8000`; bind `0.0.0.0` |
| Uploader logged TLS errors after `.env` edit | PM2 process still running old `https://` config | `pm2 restart` so it reloads `.env` |
| `npm run dev` → `EADDRINUSE :3001` | PM2 uploader already holds the uploader's own port 3001 | Run **one** instance (PM2), not `npm run dev` too |
| `ETIMEDOUT` on eventMax only, while permin/firstAlarm got `ok` | See §6 | See §6 |

**Final reachability proof (from the RPi):** `POST /high/firstAlarm` with the real token →
`HTTP/1.1 200 OK`, `{"message":"ok","error":false,"data":null}`. Full chain works:
reachability → binding → firewall → `node_token` auth → DB write → response.

---

## 6. Concurrency issue — `php artisan serve` is single-threaded

**Symptom:** permin + firstAlarm returned `ok`, but `eventMax` intermittently hit `ETIMEDOUT`.

**Diagnosis:** the eventMax endpoint is healthy in isolation (564 KiB file → **0.339s, 200**). File size
(564 KiB) and broadcasting (Reverb confirmed running) are ruled out. The cause is **`php artisan serve`
handling one request at a time** (each boots the framework ~190ms). Under the uploader's concurrent
streams, requests queue; eventMax — the only uploader with a **strict 10s timeout** — is the one that
gives up. The others have no timeout so they just wait and eventually succeed.

**Fix (see `platform-concurrency-server-handoff.md`):** move to a multi-worker server.
**Decision: Laravel Octane + FrankenPHP** (Windows host — php-fpm is unavailable). Run Octane, Reverb,
and the queue worker as **three separate PM2 processes** (`platform-web`, `platform-reverb`,
`platform-queue`) so they survive terminal close / reboot.

---

## 7. The data-flow gap — alarms displayed, but no readings

**Problem:** alarms parse & display, but the client charts/badges are empty.

**Root cause:** the client charts read the **`readings`** table via `GET /api/devices/{uuid}/readings`,
which is populated **only** by `POST /api/ingest`. The new `uploadPermin` endpoint just stored the
`permin` file as an **opaque blob** and never parsed it — so the seismic time-series (which physically
arrives *inside* the permin `.log` files) never became `readings`.

### Ingest endpoint — confirmed contract & sensor model

```
POST /api/ingest
  Header: X-Device-Token: <raw token>
  Body:   { device_uuid, readings: [{ sensor_key, value, recorded_at }] }
→ validates token → looks up device → validates each sensor_key against the device's registered
  sensors → bulk-insert readings → update last_seen_at → dispatch ReadingBatchIngested → Reverb
```
- `usher` devices register exactly **`accel_x`, `accel_y`, `accel_z`** (unit `g`) — from
  `config/device_types.php`. **No `pga`/`peis` keys exist**; unknown keys → `400 Invalid sensor key`.
- The RPi demo device is `usher` type, UUID `7c4f9457…`.
- Config comment states magnitudes are *"computed on frontend"* → **PGA/PEIS are frontend-derived.**

---

## 8. The plan — two pipelines off the permin/eventMax files

Full spec in `permin-readings-waveform-handoff.md`. Summary:

### Pipeline A — `permin` → `/api/ingest` (1 Hz, for badges/intensity)
- In a **queued job** (`ProcessPerminFile`): parse CSV → 1-second buckets → **abs-max per axis** →
  feed the existing ingest pipeline as `accel_x/accel_y/accel_z` only, with historical `recorded_at`.
- **Do not** insert raw 300 Hz; **do not** add `pga`/`peis` keys.
- **PGA/PEIS computed on the client:** `PGA = sqrt(accel_x² + accel_y² + accel_z²)`, then PEIS 1–10.
  Fix the dead `accel_raw` reference (`FRONTEND_V1_HANDOFF.md:349`) to compute from `accel_x/y/z`.

### Pipeline B — Dynamic Waveform API (for the seismogram graph)
- Keep raw `permin`/`eventMax` files on disk. New `GET /devices/{uuid}/waveform?start&end`:
  - window < 1 min → stream raw (~18k pts); window ≥ 1 min → **LTTB** down to ~2,000 pts.
  - **max window guardrail** (e.g. 1h) to prevent overload.
- Client ECharts seismogram: `animation:false`, `showSymbol:false`, `sampling:'lttb'`, time axis,
  re-query on zoom/pan. Serves both continuous permin windows and per-event eventMax captures.

### The 500-row cap — DECIDED: split approach
- `DeviceController.php:362` caps the readings timeseries at 500 rows/sensor → at 1 Hz that's only
  ~8 min at every window. **Decision: leave the cap as-is** — the `/readings` timeseries serves only
  badges + recent short trend; **all long-window visualization comes from `/waveform`.** (Rejected the
  alternative of raising the cap + duplicating downsampling.)
- Note: `FRONTEND_V1_HANDOFF.md:603` assumes 10 s cadence — moot for accel under the split, but annotate.

### Log File Processing & Job Architecture
- **One job per uploaded file** (`ProcessPerminFile`, `ProcessEventMaxFile`) — never per-reading.
  ~1 permin/min/device → ~1 job/min/device.
- Upload handlers **dispatch + return 200 immediately**; parsing is async on `queue:work`.
- **eventMax** (same CSV format) gets its own job → indexed event waveform by `eventId` (previously an
  unparsed blob).
- **`firstAlarm`** stays inline (signal, no file). **`uploadedEvent`/`uploadedeventMax`** are RPi-local
  archives — platform builds nothing for them.
- Idempotent (readings dedupe on `device + sensor + second`; eventMax by `eventId`), retries +
  `failed_jobs` dead-letter, `status`/`processed_at` lifecycle tracking, corrupt file never blocks queue.

### Performance note (the "won't jobs slow it down?" question)
No — async jobs make the **request path faster** (heavy parse moved off the HTTP response). Cost is
bounded: one job per file (~1/min/device), workers in a separate process, scale by adding workers. The
slow path is the opposite — synchronous parsing inside the request (blocks response, causes timeouts).

---

## 9. Current status

| Item | Status |
|---|---|
| RPi `.env` redirected to platform | ✅ done, restarted |
| Reachability RPi → platform (network/firewall/binding) | ✅ proven |
| `node_token` auth + 3 ingest endpoints | ✅ built, audited, curl-verified |
| Alarms end-to-end (DB + `AlarmsPanel`) | ✅ working |
| permin → readings (charts/badges) | ⛔ not built (Pipeline A) |
| Waveform API + seismogram | ⛔ not built (Pipeline B) |
| eventMax `.log` parsing | ⛔ not built (stored as blob) |
| Job architecture / queue processing | ⛔ not built |
| Multi-worker server (Octane) | ⛔ not built (still `php artisan serve`) |

---

## 10. Pending decisions & open checks

**Decisions still owned by the user:**
1. **Waveform display model** — per-minute static refresh (recommended, matches the reference portal)
   vs pseudo-live polling. Both served by the same `/waveform` endpoint.

**Checks to confirm during implementation:**
2. **`/api/ingest` idempotency** — does it upsert/dedupe on `device + sensor + second`? If not, that's
   a required fix so reprocessed/retried permin files don't double-insert.
3. **PEIS thresholds** — keep in exactly one place on the client (likely already in `PEISScaleCard`).
4. **Octane state safety** — verify `HighController`, `NodeTokenAuth`, `IngestController` hold no
   per-request static state before running under Octane's in-memory model.

**Known deferred / out of scope:**
- True continuous real-time scrolling waveform (would need the original USHER Socket.IO high-freq path).
- Long-term raw-file retention/archival policy (flag if disk fills).
- Moving the platform off Windows / production web server hardening beyond Octane.
- `php artisan serve` is dev-grade; production needs the Octane (or nginx) setup persisted under PM2.

---

## 11. Quick operational reference

```bash
# Platform machine (Windows) — keep all three alive under PM2:
pm2 start "php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=4" --name platform-web
pm2 start "php artisan reverb:start --host=0.0.0.0 --port=8080" --name platform-reverb
pm2 start "php artisan queue:work" --name platform-queue
pm2 save

# RPi — after any .env change:
pm2 restart uploader
pm2 logs uploader        # expect {message:'ok', error:false} ; no TLS/ETIMEDOUT

# Reachability test from the RPi (401 = reached the app; good):
curl -i -X POST http://192.168.10.13:8000/high/firstAlarm -F "node_token=wrong" -F "eventId=test"
```

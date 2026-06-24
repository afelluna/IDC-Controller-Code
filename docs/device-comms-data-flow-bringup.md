# Bring-Up Journey: Making the Device Communicate & Fixing the Data Flow

> **What this is:** the narrative record of the 2026-06-17 → 06-19 effort to get the Raspberry Pi
> seismic device actually talking to the `usher-wehlo-platform` and feeding live data to its
> frontends. The platform endpoints had already been *built* (see
> `docs/rpi-platform-integration-log.md`); this is the story of getting real data to flow through them
> and rendering — i.e. the debugging, not the construction.
>
> **Scope note:** this documents *how we made it work*. Architecture/resilience/ops problems noticed
> along the way are deliberately **not** here — they go in a separate problems doc the user is writing.

---

## Goal

Connect the RPi `lowrise_server_uploader` to the locally-hosted `usher-wehlo-platform` so the platform's
backend + React frontends receive live seismic data. Hard constraint throughout: **the only permitted
RPi-side change is `.env`/config** — everything else is platform-side.

Starting point: endpoints built and curl-verified, alarms working — but the frontend charts/badges were
empty. The data physically *arrives* inside the per-minute `permin` `.log` files; the job was to prove
(and fix) the path from those files all the way to pixels.

---

## Method: walk the data path, one checkpoint at a time

Rather than guess, we verified the pipeline in order so the first failing checkpoint localized the
broken layer:

```
RPi uploads (1) → platform records (2) → queue job processes (3) → readings written (4)
   → /readings API (5) → Reverb live push (6) → /waveform (7) → browser renders (8)
```

Each checkpoint had an explicit pass criterion and a "what failure means" branch. This structure is
what turned three tangled symptoms into three cleanly-isolated root causes.

---

## Blocker 1 — Network: the device couldn't reach the platform

**Symptom:** uploader logs full of `EHOSTUNREACH 192.168.10.13:8000`, later `ETIMEDOUT`.

This was actually a stack of three issues uncovered in sequence:

| Symptom | Root cause | Fix |
|---|---|---|
| `EHOSTUNREACH` to `.13` | Platform's Ethernet IP had drifted to `.99` via DHCP; nobody answered for `.13` | Set the Windows Ethernet adapter to **static `192.168.10.13`** (`netsh … set address static`), no gateway (Wi-Fi keeps internet) |
| curl worked only on the platform box; RPi got nothing | Server listening on **`127.0.0.1:8000`** (localhost-bound) | Restart bound to **`0.0.0.0:8000`** — confirmed via `netstat` showing `0.0.0.0:8000 LISTENING` |
| `ping` to platform failed even when reachable | Windows Firewall drops inbound ICMP (separate from TCP) | Ignore ping; test with **curl/TCP**. A `401` from `/high/firstAlarm` = reached the app = success |

**Proof it cleared:** real-token `POST /high/firstAlarm` → `HTTP 200 {"message":"ok","error":false}`,
and `netstat` showed the RPi (`192.168.10.12`) connecting in. Checkpoint 1 passed. *(A red herring along
the way: old `06-17`-stamped log lines looked like "stale buffered logs" — they were actually the first
hint of Blocker 3, the wrong clock.)*

---

## Blocker 2 — The PEIS-flag filter rejected 100% of real data

**Symptom:** `permin_logs` rows all marked `processed`, but **zero `readings`** written for the live
device — the classic "processed but empty."

**Root cause:** the parser kept only CSV rows where the 6th column == 1
(`if flag != 1: skip`), per a handoff-doc assumption that the column was a validity flag "always 1 =
valid." The running firmware emits **`2` on every sample** → every row skipped → no readings.

**The real insight:** column 6 is **not a validity flag at all — it's the firmware's per-sample PEIS
intensity** (a derived integer, ~1–10). Confirmed two ways:
- Domain knowledge (the firmware computes PEIS per sample), and
- The math: the file's accel values give `PGA = √(x²+y²+z²) ≈ 0.0076 g` → intensity ~II → column value
  `2`. They matched.

So filtering on it wasn't "dropping invalid rows" — it was **filtering by earthquake intensity**, which
nulls the pipeline at rest *and would drop exactly the strong-motion samples you most need during a real
event.* A genuine correctness landmine.

**Fix:** stop filtering on column 6 entirely; keep every **structurally-valid** row (correct field
count, numeric X/Y/Z). PEIS stays computed on the frontend from `accel_x/y/z`; the per-sample col-6
value is redundant and ignored. The handoff docs + tests were corrected so the bug can't be
re-introduced (see the warning box in `docs/permin-readings-waveform-handoff.md`).

---

## Blocker 3 — The RPi clock was frozen ~2 days in the past

**Symptom:** after the parser fix, `readings` finally landed — but `recorded_at` was stuck at
`2026-06-17` while `created_at` (platform receipt) was current. The frontend windows its queries on
`recorded_at`, so live data would still render as **empty/stale**.

**Root cause:** the RPi is offline (no internet → no NTP), so its system clock drifted/froze. Worse,
the device *has* a DS3231 RTC (`i2cdetect` showed it at `0x68` with its EEPROM at `0x57`) but the RTC
was **never enabled in software** — no device-tree overlay, so no `/dev/rtc0`, so nothing persisted
time across reboots. This was a recurring risk already flagged in `docs/backlog.md`.

Because the sample epochs are stamped from the RPi's system clock and stored as the historical
`recorded_at` (by design, so the waveform x-axis is accurate), a wrong clock silently breaks the
dashboard even with a perfectly healthy pipeline.

**Fix:**
1. **Immediate:** correct the system clock (`timedatectl set-time`).
2. **Durable:** enable the DS3231 (`dtoverlay=i2c-rtc,ds3231` in `/boot/config.txt`), disable
   `fake-hwclock`, `hwclock -w` to seed it, set timezone to `Asia/Manila`. Full runbook:
   `docs/rpi-clock-rtc-fix.md`.

Key principle we held to: **fix the clock, not the ingest.** Switching `recorded_at` to `now()` would
have hidden the bug and distorted the seismogram.

---

## Final verified state (2026-06-19)

Device `7c4f9457…` / `device_id=9`, live:

- **Checkpoint 4** — `accel_x/y/z` landing every upload, `recorded_at` current (`02:24:02Z`, ~2 min
  before query), tight `created_at` gap → clock genuinely synced.
- **Checkpoint 5** — `GET /api/devices/{uuid}/readings?window=1h` → `200`, 13 rows/axis, latest value
  current.
- **Checkpoint 6** — Reverb up on `:8080`; `ReadingBatchIngested` broadcasts on
  `PrivateChannel("devices.{uuid}")` with `{ readings, received_at }`, matching the client's
  `useRealtimeDeviceUpdate` listener and sanctum channel auth. Wiring green; live WS frame = the one
  remaining in-browser confirm.
- **Checkpoint 8** — every UI data source returns live: PEIS card (`latest_readings`), seismogram
  (`/waveform`, 623 pts/axis/1h, read from raw `.log` on disk), `AlarmsPanel` (`/alarms`, 50 rows).

**Net:** the full path is green end-to-end with live, current-timestamped data. The platform's
frontends are receiving the device's seismic data — goal achieved at every layer verifiable without a
browser. The last 1% is a visual confirm of the actual render.

---

## Known-deferred (not blockers)

- **eventMax `ETIMEDOUT`** — single-threaded `php artisan serve` queues concurrent uploads; eventMax
  (strict 10s client timeout) gives up. Fix is the multi-worker move to Octane/FrankenPHP
  (`docs/platform-concurrency-server-handoff.md`). Affects only per-event captures, not the core
  readings path.
- **Cadence** — data advances per upload (~5-min batches, ~1 reading/sec in bursts); the dashboard
  steps forward per upload rather than scrolling smoothly. Expected for this batched path.
- **Architecture / resilience / ops problems** — being compiled separately by the user; a dedicated
  doc will follow. Not in scope here.

---

## Lessons that generalize

- **Walk the path in order.** Three overlapping symptoms ("frontend empty") had three unrelated causes
  at three different layers. Checkpoint-by-checkpoint isolation found each cleanly.
- **`created_at` vs `recorded_at` is the tell.** Receipt-time green + embedded-time stale = a device
  clock problem, not a pipeline problem.
- **Don't trust a doc's "always X" claim about firmware** — verify against live data. The col-6 "always
  1" assumption was the whole Blocker 2.
- **Fix the source, not the symptom.** Wrong clock → fix the clock (and the RTC), not the ingest
  timestamp.
- **On Windows: ping lies, `netstat`/curl tell the truth** for reachability and bind-address checks.

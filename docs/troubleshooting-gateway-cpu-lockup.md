# Troubleshooting: Dashboard Offline / Gateway CPU Lockup

A field runbook for diagnosing why the dashboard stops connecting or graphing, when the cause is
the **gateway locking up** (high CPU, unresponsive HTTP/Socket.IO) rather than the sensor being
dead. For "sensor stopped sending data entirely" (Channel B dead, gateway itself healthy), see
`docs/troubleshooting-sensor-data-flow.md` instead — that's a different failure mode with its own
decision tree. This doc documents the incident that first surfaced these failure modes:
`docs/incident-2026-07-07-gateway-cpu-lockup.md`.

> This guide was written from a real debugging session (2026-07-07). Every command below was
> actually run. Copy-paste as-is, adjust IPs/paths if your deployment differs.

---

## 1. When to use this

Reach for this runbook when:

- The dashboard shows **`Status: Offline` / `Connection: Offline`** persistently, or flaps between
  `Live` and `Offline` every ~30-60 seconds.
- A plain `curl http://192.168.10.12:3000/getSensorConfig` **hangs or times out** — even this
  trivial DB-backed endpoint gets no response.
- `pm2 status` on the gateway shows the `receiver` process CPU pegged at ~90-100%+ for extended
  periods.
- The dashboard connects (`Status: Live`) but **`Node` stays on `Scanning...` forever** and the
  waveform shows "No Signal" — this is a *different* root cause (see §5, the DB schema check),
  not a CPU lockup, but it's easy to confuse with one since both present as "not graphing."

## 2. Network / device map

| Device | IP | Role | Key ports |
|---|---|---|---|
| Sensor | `192.168.10.11` | ADXL355 sampler; runs `start_usher.py`, `clearloclog.py`, `led.py`, `listencali.py` (all launched by Node-RED, PID chain under a `node-red` parent — **not** PM2) | — |
| **IDC gateway** | `192.168.10.12` | `lowrise_server_receiver` (PM2 `receiver` + `uploader`), MySQL `config_db` (dev on **3308**, prod on **3306** — check `NODE_ENV` in `.env`), Apache kiosk | `3000` (receiver), `80` (Apache), `3308`/`3306` (MySQL) |
| Dev machine | `192.168.10.13` (varies) | Runs the Vite dev frontend directly against the gateway | `3000` (Vite, separate from the gateway's own `3000`) |

---

## 3. First triage — is the gateway actually hung?

```bash
# From any machine on the LAN:
curl -m 8 -w "\nHTTP:%{http_code} time:%{time_total}\n" http://192.168.10.12:3000/getSensorConfig
```
- **Fast 200** → gateway is healthy right now; the problem is elsewhere (sensor dead, DB schema,
  frontend config — see §5 or the sensor-data-flow doc).
- **Times out / connection resets** → gateway is locked up. Continue below.

On the gateway itself:
```bash
pm2 status                 # is `receiver` at high CPU%?
top -bn1 | head -8         # confirm which PID, how much accumulated CPU time (TIME+ column)
```
If `receiver`'s CPU is pegged (often 88-106%, single core saturated), go to §4.

## 4. Diagnose *why* the gateway is pegged

The event loop being blocked has one dominant historical cause: **`/getAllHistoryMax` being
polled repeatedly.** This endpoint synchronously reads every file in `eventMax`/
`uploadedEventMax` (no pagination), so as those directories grow, each call takes longer — and
while it runs, the whole Node process can't do anything else (no HTTP responses, no Socket.IO
ping/pong → client disconnects).

**Confirm it live:**
```bash
pm2 logs receiver --lines 0
```
Let it stream ~10-15s. If you see a rapid-fire list of **bare file paths** (e.g.
`../eventMax/1782288399553_....log`, no other text, dozens per second) — that's
`UploadController.ts`'s `readDataLogMax()` grinding through the whole directory. This confirms the
lockup cause; now find **who** is calling it.

**Rule out the usual suspects, in this order:**

1. **A leftover browser tab on the admin EventList page** (`/new-monitor/admin` or similar) is the
   most common cause — `EventList.tsx` calls `/getAllHistoryMax` on mount, and a tab left open
   from earlier testing (especially if it auto-reloads or you manually refresh it) will keep
   hitting it. **Close every extra browser tab/window pointed at the dashboard** and recheck.
2. **The gateway's own kiosk chromium**, if it's running an old/undeployed frontend build that
   still polls the unbounded endpoint:
   ```bash
   ps aux | grep -i chromium | grep -v grep
   ```
   If present and you suspect it, `pkill -f chromium` and recheck (it may auto-respawn depending
   on the kiosk's autostart setup — if so, you'll need to redeploy the fixed frontend build, not
   just kill the process).
3. **Confirm which client, by IP**, if still unsure:
   ```bash
   sudo ss -tnp | grep :3000
   ```
   A large, growing pile of **`CLOSE-WAIT`** entries (not `ESTAB`) from a specific IP is the
   signature of "that client keeps timing out against a blocked event loop." Cross-reference the
   IP against the device map in §2.
4. **Check the frontend source itself** hasn't regressed — the 30-second dashboard poll
   (`useSeismicData.ts`'s `refreshHistory`) must call `/getHistoryMax` (capped), **not**
   `/getAllHistoryMax` (unbounded):
   ```bash
   grep -n "getHistoryMax\|getAllHistoryMax" frontend/src/hooks/useSeismicData.ts
   ```
   Only `EventList.tsx` (a one-time, on-demand admin load) should call `getAllHistoryMax`.

**Once the offending client stops polling**, CPU should drop to ~0% within ~10 seconds and the
`CLOSE-WAIT` pile should clear. Verify:
```bash
pm2 status                                            # receiver CPU back to 0%
sudo ss -tn | grep :3000 | awk '{print $1}' | sort | uniq -c   # only ESTAB / occasional FIN-WAIT-2
```

## 5. Dashboard connects but shows "Scanning..." / "No Signal" forever

This is a **separate** root cause from the CPU lockup above — the Socket.IO transport is fine
(`Connection: Live`), but the browser doesn't know which event channel to subscribe to.

```bash
curl http://192.168.10.12:3000/getSensorConfig
```
Check the JSON response includes a `"node_name"` field. If it's **missing entirely**, the
`config_tbl` schema on the live database is out of date:
```bash
# find which port is actually in use — check NODE_ENV in .env, then DEV_DB_PORT / PROD_DB_PORT
cat /var/www/html/lowrise_server_reciever/.env | grep -E "NODE_ENV|_DB_PORT|_DB_DATABASE"

mysql -h localhost -P <port-from-above> -u root -p<password> config_db -e "DESCRIBE config_tbl;"
```
If `node_name` isn't in the column list, find the sensor's actual configured name and add it:
```bash
# on the SENSOR rpi:
cat /home/pi/Workspace/config | grep node_name        # e.g. node_name=node

# on the GATEWAY rpi:
mysql -h localhost -P <port> -u root -p<password> config_db \
  -e "ALTER TABLE config_tbl ADD COLUMN node_name VARCHAR(50) NOT NULL DEFAULT '<value-from-sensor-config>';"
```
Reload the dashboard afterward — no backend restart needed, it's read fresh on each
`/getSensorConfig` call.

If `node_name` **is** present but doesn't match what the sensor emits, that's the scenario covered
in `docs/troubleshooting-sensor-data-flow.md` §5.3 instead (frontend/deployed-config mismatch,
not a missing DB column).

## 6. Sensor-RPi CPU pegged (separate machine, separate bug class)

Not the same failure as the gateway lockup above, but easy to spot with the same tools and worth
checking opportunistically whenever you're SSH'd into the sensor RPi:
```bash
top -bn1 | head -10
```
`clearloclog.py` pegged at ~90-100% CPU with accumulated `TIME+` roughly equal to process uptime
= the busy-loop bug fixed 2026-07-07 (a `while True` with no `sleep`). If you see this on a device
that hasn't received that fix yet:
```bash
sudo nano ~/Workspace/USHERv4.0/src/clearloclog.py
# add `time.sleep(5)` as the LAST statement inside the `while True:` loop body,
# indented to match `try:`/`except:` (NOT dedented to `while`'s level — that would
# put it outside the loop and it would never execute)
sudo reboot   # these scripts run under Node-RED (PPID chain, not PM2) — reboot is
              # the reliable way to relaunch them cleanly
```
This process doesn't cause the *gateway's* lockup by itself (it just wastes CPU on the sensor
RPi), but if you're chasing erratic sensor behavior (retries, disconnects) it's worth ruling out
alongside the gateway-side checks above.

---

## 7. Quick-reference cheat-sheet

| Symptom | Root cause | Confirm with |
|---|---|---|
| `curl .../getSensorConfig` hangs/times out | Gateway event loop blocked | `pm2 status` → `receiver` CPU pegged |
| `receiver` CPU pegged, `pm2 logs receiver` spams bare file paths | Something polling unbounded `/getAllHistoryMax` | `sudo ss -tnp \| grep :3000` → which IP has many `CLOSE-WAIT` |
| Dashboard flaps `Live`/`Offline` every ~30-60s | Same as above — periodic lockups timing out the socket heartbeat | Same as above |
| `Connection: Live`, `Node: Scanning...` forever, "No Signal" | `config_tbl` missing/wrong `node_name` | `curl .../getSensorConfig` → is `node_name` present and correct? |
| Sensor RPi generally sluggish, one python process near 100% CPU nonstop | `clearloclog.py` busy loop (pre-fix) | sensor `top -bn1`, check for missing `time.sleep()` in the loop |
| Dashboard graphs fine on dev machine but not on the kiosk screen | Kiosk still serving an old/undeployed frontend build | Redeploy `frontend/` build (`npm run build` → copy `monitor/` to the RPi's `new-monitor/`) and reload the kiosk |

---

## 8. Key file & path reference

| What | Where |
|---|---|
| Unbounded history endpoint (admin-only use) | `lowrise_server_receiver/src/controllers/UploadController.ts` → `getAllHistoryMax()` |
| Capped history endpoint (safe for periodic polling) | same file → `getHistoryMax()` |
| Per-file blocking read + noisy log | same file → `readDataLogMax()` |
| Dashboard's 30s poll (must call the capped endpoint) | `frontend/src/hooks/useSeismicData.ts` → `refreshHistory()` |
| Admin event list (allowed to call the unbounded endpoint, once) | `frontend/src/components/admin/EventList.tsx` |
| Directory pruning (currently doesn't cover eventMax dirs) | `lowrise_server_receiver/src/classes/ClearHistory.ts` |
| Sensor config (`node_name`, `socketserver`) | `~/Workspace/config` on the sensor RPi |
| Gateway DB config (which MySQL port is live) | `lowrise_server_receiver/.env` → `NODE_ENV`, `DEV_DB_PORT` / `PROD_DB_PORT` |
| Gateway config schema reference | `lowrise_server_receiver/config_db.sql` |
| Sensor busy-loop bug (fixed 2026-07-07) | `USHERv4.0/src/clearloclog.py` (separate `ushersens` repo) |

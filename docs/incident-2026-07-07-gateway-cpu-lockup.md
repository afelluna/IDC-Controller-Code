# Incident 2026-07-07 — Gateway CPU Lockup, Dashboard Offline, No Live Data

> **When to use this:** read this if you're trying to understand *why* the dashboard broke on
> 2026-07-07 and what was changed to fix it. For the step-by-step diagnostic runbook to use **next
> time** something in this family breaks, see
> `docs/troubleshooting-gateway-cpu-lockup.md`.

---

## Symptom reported

"Frontend isn't connecting to the RPi backend anymore — it used to graph live sensor data, now
`npm run dev` shows nothing." Dev machine was on the same Ethernet segment as the gateway
(`192.168.10.12`), directly connected.

## What was actually wrong

Four **independent** bugs compounded into one confusing symptom. None of them were in the
frontend's WebSocket/API-client wiring itself — that code was already correct.

| # | Bug | Where | Effect |
|---|---|---|---|
| 1 | Dashboard polled an **unbounded** history endpoint every 30s | `frontend/src/hooks/useSeismicData.ts` | Blocked the gateway's Node event loop for longer and longer as the log directory grew |
| 2 | A leftover **admin EventList browser tab** kept calling that same unbounded endpoint | Browser, not code | Repeated ~60s CPU lockups on the gateway even after fix #1 |
| 3 | `clearloclog.py` busy-loop with **no `sleep`** | Sensor RPi (`192.168.10.11`), `USHERv4.0/src/clearloclog.py` | Pegged a sensor-RPi CPU core at ~94-100% nonstop since boot |
| 4 | `config_tbl` on the gateway's MySQL was missing the **`node_name`** column | Gateway RPi (`192.168.10.12`), MySQL `config_db` on port 3308 | `/getSensorConfig` never told the frontend which Socket.IO channel to listen on — dashboard connected but showed "Scanning..." forever, no waveform |

---

## Bug #1 — Unbounded `/getAllHistoryMax` polled every 30 seconds

`UploadController.ts`'s `getAllHistoryMax()` (line ~956) synchronously reads and line-parses
**every file** in `eventMax`/`uploadedEventMax` via `readDataLogMax()` — no `.slice()` cap, unlike
its sibling `getHistoryMax()` which caps at `this.fileCount` (6). `readDataLogMax()` also does a
bare `console.log(path)` per file — that's the source of the plain file-path spam you see in
`pm2 logs receiver` during a lockup.

`useSeismicData.ts` was calling `getAllHistoryMax()` on a 30-second `setInterval` (`refreshAll`,
line ~178) — intended for the *admin EventList* page (which genuinely needs the full list for
client-side search/pagination), not the live dashboard's periodic poll. As the un-pruned
`eventMax` directory grew (nothing ever calls `ClearHistory` on it — see "Known follow-ups"
below), each poll took longer, until it started taking **~60 seconds**, long enough to fully
starve the Node event loop each time it ran.

**Fix (already applied, frontend-only):**
```ts
// frontend/src/hooks/useSeismicData.ts — refreshHistory()
// before: const response = await seismicApi.getAllHistoryMax();
const response = await seismicApi.getHistoryMax();
```
`getHistoryMax` returns the identical response shape (`history`, `uploadedCount`,
`unuploadedCount`, `perminFileCount`) but capped, so the poll stays fast regardless of how big the
log directories get. `getAllHistoryMax` is left in place for `EventList.tsx`'s one-time,
on-demand admin load.

## Bug #2 — A leftover open browser tab kept the lockup going

Even after fix #1 was applied to the *dev* frontend, the gateway kept locking up on a ~60-second
cycle. `sudo ss -tnp | grep :3000` showed a large, growing pile of `CLOSE-WAIT` sockets from both
the sensor (`.11`) and the dev machine (`.13`) — a signature of "the event loop is blocked so long
that clients time out and give up, but the server never gets a chance to clean up its side of the
socket."

`pm2 logs receiver --lines 0` during the lockup showed the exact same file-path spam as bug #1
(`readDataLogMax` running across the whole `eventMax` directory), confirming `/getAllHistoryMax`
was still being hit repeatedly. The gateway's own kiosk chromium was confirmed **not** running
(`ps aux | grep chromium` empty), and the fixed dev frontend was confirmed **not** calling it
(checked via `read_network_requests` in a live browser session). The remaining explanation — and
the one that turned out to be correct — was a separate browser window on the dev machine still
open on the admin **EventList** page (`/new-monitor/admin`), left over from earlier testing.

**Fix:** closed the tab. CPU dropped to 0% within ~10 seconds and the `CLOSE-WAIT` pile
disappeared.

> **Lesson:** `EventList.tsx` calling `/getAllHistoryMax` once on mount is fine by design — the
> danger is a tab sitting open indefinitely (e.g. a browser left running, or a second monitor)
> that nobody remembers is calling it repeatedly on manual refreshes.

## Bug #3 — `clearloclog.py` busy loop on the sensor RPi

`USHERv4.0/src/clearloclog.py` (sensor RPi, `192.168.10.11`) had:
```python
while True:
    try:
        ...
    except Exception as e:
        print(e)
# no sleep — loops as fast as the CPU allows, forever
```
`ps`/`top` showed this process (launched by Node-RED, PID chain under PPID 291, **not** managed by
PM2) pegged at ~94-100% CPU continuously, with the accumulated CPU time roughly equal to the
process uptime. This didn't directly cause the gateway's lockup (that was bugs #1/#2), but it's a
real, independent defect that wastes a full CPU core on the sensor RPi nonstop, and was fixed in
the same session since it was found while investigating.

**Fix (already applied):**
```python
        except Exception as e:
            print(e)
        time.sleep(5)   # added — only clears logs older than 100s, 5s cadence is plenty
```
Deployed by editing the file directly on the sensor RPi via `sudo nano
~/Workspace/USHERv4.0/src/clearloclog.py`, then `sudo reboot` so Node-RED relaunched it fresh
(these scripts aren't under PM2, so there's no `pm2 restart` for them — see
`docs/troubleshooting-gateway-cpu-lockup.md` for how they're supervised). Confirmed fixed:
CPU dropped from ~94% to ~0% for this process after reboot.

## Bug #4 — `config_tbl` missing the `node_name` column

Even after bugs #1-#3 were fixed and the Socket.IO connection became stable ("Live" status), the
dashboard's **"Node"** status stayed on `"Scanning..."` forever and the waveform showed "No
Signal" — despite the sensor actively streaming ~8 batches/sec.

`config_db.sql` (the repo's schema reference) defines `node_name varchar(50) NOT NULL` on
`config_tbl`, but the **live** database on the gateway (`config_db`, MySQL port **3308** — the
`DEV_DB_*` instance, since `.env` has `NODE_ENV=development`) was running an older schema **without
that column at all**:
```
mysql> SELECT node_name FROM config_tbl;
ERROR 1054 (42S22): Unknown column 'node_name' in 'field list'
```
(Port 3306 — the `PROD_DB_*` instance — has the same problem; it's not what's actually in use
here since `NODE_ENV=development`.)

`frontend/src/hooks/useWebSocket.ts` calls `GET /getSensorConfig` to learn `node_name`, then does
`socket.on(nodeName, ...)`. With the column missing, `node_name` was `undefined`, so the browser
was listening on the wrong (effectively no) channel — even though the gateway was correctly
re-broadcasting the sensor's data as `io.emit("node", data)` the whole time.

The sensor's actual configured name (`~/Workspace/config` on the sensor RPi, `node_name=node`) is
literally the string `"node"`.

**Fix (already applied, live DB only — not yet reflected in `config_db.sql`, see follow-ups):**
```sql
ALTER TABLE config_tbl ADD COLUMN node_name VARCHAR(50) NOT NULL DEFAULT 'node';
```
Run against `mysql -h localhost -P 3308 -u root -p<password> config_db` on the gateway RPi (see
`.env` for the actual `DEV_DB_PASSWORD`). Verified
`/getSensorConfig` now returns `"node_name":"node"`, and the dashboard immediately began showing
live waveform data, `Node: node`, and populated Peak Acceleration / Dominant Frequency / Max
Displacement.

---

## Verification performed

- `curl http://192.168.10.12:3000/getSensorConfig` → fast (`~30ms`) response, includes
  `node_name`.
- Dashboard (`http://localhost:3000/new-monitor/` on the dev frontend) showed `Status: Live`,
  `Connection: Live`, `Node: node`, a live-updating X/Y/Z seismogram, and non-placeholder Peak
  Acceleration / Dominant Frequency / Max Displacement values.
- Gateway `pm2 status` / `top` showed `receiver` at steady **0% CPU** with no `CLOSE-WAIT`
  buildup (`sudo ss -tn | grep :3000` → only clean `ESTAB`/`FIN-WAIT-2` entries).
- Sensor RPi `top` showed `clearloclog.py` at ~0% CPU (down from ~94-100%) after the reboot.

---

## Known follow-ups (not yet done)

1. **Deploy the frontend fix to the RPi's own served copy.** Everything above was verified
   against the *Windows dev machine's* Vite dev server (`localhost:3000/new-monitor/`). The
   gateway's Apache-served kiosk copy at `/var/www/html/new-monitor/` (or wherever the deployed
   `monitor/` build lives — see `docs/troubleshooting-sensor-data-flow.md` §9 for the deployed
   path convention) **still has the old, unfixed build** that polls `/getAllHistoryMax` every 30s.
   Until this is redeployed, the kiosk can re-trigger bugs #1/#2 on its own. Deploy via: `cd
   frontend && npm run build` (writes to `../monitor/`), then copy `monitor/`'s contents to the
   RPi's `new-monitor/` via WinSCP, then reload/restart the kiosk chromium.
2. **`ClearHistory` never prunes `eventMax`/`uploadedEventMax`/`firstalarm`.** It only targets
   `config.LOGS_DIR` (a different directory), and is gated behind `config.STORAGE` (`false` in
   this deployment, so it doesn't even run). The directories `getAllHistoryMax`/`EventList` read
   from will keep growing forever. Not urgent today (only ~299 files), but worth deciding on a
   retention policy before it becomes bug #1 again for the *admin* page.
3. **`config_db.sql` doesn't match the live DB schema.** The fix above was applied directly via
   `ALTER TABLE` on the live gateway database, not by editing/re-running `config_db.sql`. If this
   Pi's SD card is ever re-imaged from that `.sql` file, the same `node_name`-missing bug will
   reappear (the file *does* already define the column correctly, so a **fresh** re-image is
   actually fine — the gap is that the currently-running DB was created before that column was
   added to the reference schema, and no migration ever ran against it). Consider adding a small
   migration script/checklist so this drift can't silently reoccur on other devices.
4. **Leftover temporary debug logging.** Per `docs/troubleshooting-sensor-data-flow.md` §5.1, a
   previous debugging session recommends temporarily adding `console.log("NODE EVENT name =",
   nodename)` to `SocketEventController.ts`'s `node()` handler on the gateway, then removing it
   afterward. That line is still present in the gateway's deployed `dist/` (confirmed via
   `pm2 logs receiver` during this incident) but is **not** in this repo's `src/` — meaning it was
   added directly on the device and the "Cleanup" step from that runbook was never completed.
   Harmless, but worth cleaning up (edit `SocketEventController.ts` on the gateway, remove the
   line, `npm run build && pm2 restart receiver`) so the deployed code stops drifting from source
   control.
5. **`ushersens` (sensor code) repo** — the `clearloclog.py` fix (bug #3) was applied both in the
   local working copy (`Sensor Code/USHERv4.0`, a separate git repo pointing at
   `bitbucket.org/usher2019/ushersens.git`) and live on the sensor RPi via `nano`. Not pushed to
   Bitbucket as part of this session — do that separately if/when convenient.

---

## Files changed in this repo

- `frontend/src/hooks/useSeismicData.ts` — `getAllHistoryMax()` → `getHistoryMax()` for the 30s
  dashboard poll.

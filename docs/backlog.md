# Backlog / Pending Items

Running list of open items from the sensor/gateway debugging work. Newest context at top of
each entry. Update **Status** as things move. See related runbooks:
[`troubleshooting-sensor-data-flow.md`](./troubleshooting-sensor-data-flow.md),
[`sensor-autostart-systemd-fix.md`](./sensor-autostart-systemd-fix.md).

Status legend: 🔴 not started · 🟡 in progress / needs verification · 🟢 done (kept for record)

---

## 1. Confirm `usher.service` survives a clean reboot 🟡
**Tier:** sensor (`192.168.10.11`)
**Context:** `usher.service` (systemd) is enabled + active and running `start_usher.py`. The final
reboot test was deferred.
**Next action:**
```bash
sudo reboot
# after it returns:
systemctl status usher.service     # expect active (running), no manual action
journalctl -u usher.service -n 20 --no-pager   # expect "Successfuly Connected to server"
```
**Done when:** service comes up on its own after reboot and the gateway logs `NODE EVENT name = node`.

---

## 2. Remove temporary debug log on the gateway 🔴
**Tier:** IDC gateway (`192.168.10.12`)
**Context:** During debugging we added `console.log("NODE EVENT name =", nodename)` to
`lowrise_server_reciever/src/controllers/SocketEventController.ts` (the `node()` handler) to capture
the live event name. It's harmless but should be removed.
**Next action:** delete that line, then:
```bash
cd /var/www/html/lowrise_server_reciever
npm run build && pm2 restart receiver
```
**Done when:** the line is gone, receiver rebuilt and restarted, logs no longer print `NODE EVENT name`.

---

## 3. Connect/disconnect loop + `INTENSITY 2` flood (watch) 🟡
**Tier:** sensor
**Context:** After enabling systemd, the gateway briefly showed the sensor connecting/disconnecting
repeatedly, with `Event occured!!! INTENSITY 2` flooding the journal many times/sec. It **settled on
its own** and live data flows. Likely a tight loop starving the python-socketio heartbeat, and/or a
genuinely over-threshold / miscalibrated reading (`xthold/ythold/zthold=0.2` + configured offsets
keeping it in permanent "event" mode).
**Next action (only if it recurs):**
- Confirm it's the sensor: close kiosk (`pkill -f chromium`), watch `pm2 logs receiver --lines 0`
  for cycling `client connected/disconnected`.
- Durable fix lives in `start_usher.py`'s main loop (ensure it yields / `time.sleep`s so the socket
  heartbeat runs) and/or re-calibrating sensor offsets/thresholds. **Not** a systemd change.
**Done when:** sensor holds a stable socket connection and `node` events stream steadily.

---

## 4. RPi clock has no reliable time source 🔴
**Tier:** IDC gateway (and sensor)
**Context:** A wrong system clock was the prerequisite bug (broke time-based history/logging). It was
corrected manually, but the RPi has **no internet** (`getaddrinfo EAI_AGAIN registry.npmjs.org`) so
NTP can't sync, and `fake-hwclock.service` showed up **masked** during `systemd-analyze verify`.
Risk: the clock drifts / resets again on power loss, re-triggering "No data to display".
**Next action (investigate):**
- Check whether there's a hardware RTC module; if so, ensure it's read at boot.
- If no RTC and no internet: at minimum re-enable `fake-hwclock` (saves last-known time across
  reboots) — `sudo systemctl unmask fake-hwclock && sudo systemctl enable --now fake-hwclock`.
- Or point NTP at a reachable LAN time source if one exists.
**Done when:** the RPi keeps correct (or close-enough, monotonic) time across reboots without manual
`date` setting.

---

## 5. Platform upload unreachable (`192.168.10.13`) 🔴
**Tier:** platform
**Context:** The gateway's `uploader` PM2 app logs repeated
`ERROR UPLOADING PERMIN ... EHOSTUNREACH 192.168.10.13:8000` and
`ERROR UPLOADING EVENT MAX ... EHOSTUNREACH 192.168.10.13:80`. This is the upstream platform the
gateway forwards to. **Does NOT affect the local dashboard** (Channels A & B are gateway-local), but
upstream aggregation is broken.
**Next action:** `ping 192.168.10.13`; verify the platform host is up and listening on 80/8000;
reconcile with the platform-side ingestion changes (see item 6).
**Done when:** uploader stops logging EHOSTUNREACH and the platform receives data.

---

## 6. Platform-side ingestion changes — review/integrate 🔴
**Tier:** platform
**Context:** User mentioned having already made changes in the **platform** code for ingestion (the
service at `192.168.10.13`), to be discussed separately. Not yet reviewed here. Likely related to
item 5 (whether the gateway's upload format/endpoint still matches the platform).
**Next action:** walk through the platform ingestion changes; confirm the gateway `uploader`'s
endpoints/payloads still match what the platform expects.
**Done when:** platform ingestion verified end-to-end against the gateway uploader.

---

## 7. React frontend migration not deployed 🔴
**Tier:** IDC gateway (frontend)
**Context:** The kiosk currently serves the **old Angular** app (`/var/www/html/monitor/`,
`http://localhost/monitor/#/home`). The new React build was uploaded to a separate folder
(`new-monitor` / `frontend-demo`) but is not the live target. Deployment + Apache SPA routing still
pending (see `CLAUDE.md` Deployment section).
**Next action:** when ready, build React (`frontend/`), copy `dist/` into the deploy target, point
the kiosk at it, confirm it uses the same `config.json` `listen_node` / live-data path.
**Done when:** kiosk serves the React dashboard with working live data and history.

---

_Last updated: 2026-06-18._

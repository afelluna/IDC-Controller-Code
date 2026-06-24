# Sensor Fix: Make `start_usher.py` Start on Boot (systemd)

How we made the sensor's sampler/live-emitter survive reboots, and the pitfalls we hit doing it.

> Companion to [`troubleshooting-sensor-data-flow.md`](./troubleshooting-sensor-data-flow.md).
> Read that first for the full data-flow model. This doc is just the **permanent fix** applied on
> the sensor (`192.168.10.11`).

---

## Problem

`start_usher.py` (the ADXL355 sampler **and** the live Socket.IO `"node"` emitter — Channel B) was
being started **manually**. There was no autostart:

```bash
crontab -l            # empty (comments only)
cat /etc/rc.local     # does nothing
grep -rsni "start_usher" /etc /home/pi/.config /home/pi/.bashrc   # no matches
```

So every reboot left it dead → the dashboard showed **"No data to display"** until someone ran it
by hand. A `nohup` run fixes it until the next logout/reboot; we needed it to start on boot and
restart on crash.

---

## Fix: a systemd service

### 1. Confirm interpreter + script path
```bash
which python                                   # this stack is Python 2 → /usr/bin/python
ls ~/Workspace/USHERv4.0/src/start_usher.py
```
Use whatever `which python` returns in `ExecStart` (it must be the python where `socketio` /
`engineio` are installed — the same one that runs the script successfully by hand).

### 2. Write the unit file — use a heredoc, NOT a hand-paste into nano

> ⚠️ **This is where we lost time.** Pasting the unit into `nano` pulled in an explanatory line
> (`(If which python shows ...)`) as line 15. systemd then failed with:
> ```
> [/etc/systemd/system/usher.service:15] Missing '='.
> Failed to enable unit: File usher.service: Invalid argument
> ```
> A second `nano` edit re-broke it the same way. The reliable fix is to write the file **verbatim**
> with a quoted heredoc so nothing gets reformatted, and then **do not reopen it in an editor.**

```bash
sudo tee /etc/systemd/system/usher.service > /dev/null <<'EOF'
[Unit]
Description=USHER sensor sampler and live socket emitter
After=network-online.target
Wants=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/Workspace/USHERv4.0/src
ExecStart=/usr/bin/python -u /home/pi/Workspace/USHERv4.0/src/start_usher.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 3. Validate BEFORE enabling
```bash
systemd-analyze verify /etc/systemd/system/usher.service
```
- A clean result mentions **only** `fake-hwclock.service: Cannot add dependency job ...` — that is
  **unrelated noise, ignore it**.
- If you see any line with **`usher.service`** or **`Missing '='`**, the file is still malformed —
  re-run the heredoc in step 2 and do not touch it with an editor.

### 4. Clear leftovers, enable, start
```bash
pkill -f start_usher.py; pkill -f clearloclog.py; pkill -f led.py   # kill manual/orphaned copies
sudo systemctl daemon-reload
sudo systemctl enable --now usher.service
systemctl status usher.service                                       # expect: enabled, active (running)
```

### 5. Verify the live stream
```bash
journalctl -u usher.service -n 20 --no-pager        # expect: Successfuly Connected to server
```
On the **gateway** (`192.168.10.12`):
```bash
pm2 logs receiver --lines 0                          # expect: client connected → NODE EVENT name = node
```
Then confirm the kiosk dashboard shows live intensity/waveform.

### 6. Prove it survives reboot
```bash
sudo reboot
# after it returns:
systemctl status usher.service                       # active (running) with no manual action
```

---

## Pitfalls / gotchas encountered

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to enable unit: ... Invalid argument` | A non–`key=value` line ended up in the unit file (pasted comment) | Rewrite via `tee` heredoc; `systemd-analyze verify` before enabling |
| Re-broke after fixing | Reopening the file in `nano` re-introduced the stray line | Don't edit by hand; rewrite with the heredoc |
| `fake-hwclock ... Cannot add dependency job` warning | Unrelated masked service | Ignore — not about `usher.service` |
| Wrong interpreter in `ExecStart` | Python 2 vs 3; `socketio` only installed under one | Use the path from `which python` that runs the script by hand |

### Observed: connect → disconnect loop with `Event occured!!! INTENSITY 2` flooding
After enabling, the gateway briefly showed the sensor **connecting and disconnecting repeatedly**,
alongside a flood of `Event occured!!! INTENSITY 2` (many times per second) in the sensor journal.

- **Likely cause:** a tight loop with no yield starves python-socketio's heartbeat/ping thread, so
  the `socket.io@2` server times out the client and drops it → the client auto-reconnects → loop.
  (A genuinely over-threshold / miscalibrated reading — `xthold/ythold/zthold=0.2` with the
  configured offsets — can put it permanently in "event" mode and produce the same flood.)
- **How to confirm:** close the kiosk (`pkill -f chromium`) so the sensor is the only socket
  client, then watch `pm2 logs receiver --lines 0`; cycling `client connected/disconnected` with
  the kiosk closed = the sensor reconnect loop.
- **Resolution:** it settled and live data is flowing. If it recurs, the durable fix lives in
  `start_usher.py`'s main loop (ensure it yields/`time.sleep`s so the socket heartbeat runs) and/or
  re-calibrating the sensor offsets/thresholds — **not** in the systemd unit.

---

## Result

- `start_usher.py` runs under **systemd** (`usher.service`): starts on boot, restarts on crash.
- No more manual `nohup`; the dashboard's live channel (Channel B) comes up automatically.
- Final confirmation pending a clean reboot test (step 6).

## Follow-up still open
- **Gateway cleanup:** remove the temporary `console.log("NODE EVENT name =", nodename)` from
  `lowrise_server_reciever/src/controllers/SocketEventController.ts`, then
  `npm run build && pm2 restart receiver`.
- If the connect/disconnect loop returns, address the `start_usher.py` loop/calibration as noted
  above.
```

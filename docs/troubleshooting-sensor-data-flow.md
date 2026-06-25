# Troubleshooting: "No Data Displayed" / Sensor Data Flow

A field runbook for diagnosing why the USHER Lowrise dashboard shows **no live data**, and
localizing the fault to one of three tiers: the **sensor**, the **IDC gateway**, or the
**platform** it uploads to.

> This guide was written from a real debugging session. Every command below was actually run.
> Copy-paste them as-is (adjust IPs/paths if your deployment differs).

---

## 1. When to use this

Reach for this runbook when any of these are true:

- Dashboard center panel shows **"No data to display"** (intensity), or the waveform is flat.
- **Seismic activity history** shows old/stale dates (e.g. data from a previous SD-card clone).
- You're not even sure **whether the RPi is receiving anything** from the sensor.
- The header shows `server: connected [rpi.id]` but nothing else updates.

The single most important idea is in the next section: **there are two completely separate data
channels, and the live dashboard depends on only one of them.** Most confusion comes from
assuming "files are arriving, so the dashboard should work" — it won't, because files are the
*other* channel.

---

## 2. The two independent data channels (mental model)

```
                          SENSOR  (192.168.10.11)
                     start_usher.py  (Python, reads ADXL355)
                                 │
            ┌────────────────────┴───────────────────────┐
            │                                             │
   Channel A: HISTORY (HTTP)                  Channel B: LIVE WAVEFORM (Socket.IO)
   writes local .log files                    sio.emit("node", [node_name, data])
            │                                             │
   uploaderFinal (PM2 "uploader")                         │  (same process, socket client)
   POST /uploadPermin ──────────►  IDC GATEWAY (192.168.10.12:3000)  ◄─── socket "node"
            │                          │                        │
   writes /var/www/html/permin/        │            SocketEventController @OnMessage("node")
   (uploadPermin does NOT emit         │            re-emits  io.emit(nodename, data)
    anything over Socket.IO)           │                        │
                                       ▼                        ▼
                            REST history endpoints      Browser  socket.on(listen_node)
                            (getHistory / getHistoryMax)        → live intensity + waveform
```

**Channel A — History (HTTP file upload)**
- The sensor writes `.log` files locally; `uploaderFinal` (PM2 app `uploader`) POSTs them to the
  gateway at `POST /uploadPermin`.
- The gateway saves them under `/var/www/html/permin/`.
- **`uploadPermin` does NOT emit over Socket.IO.** It only writes the file.
- This channel feeds **history**, not the live display.

**Channel B — Live waveform (Socket.IO)**
- `start_usher.py` opens a Socket.IO client to `config['socketserver']` and calls
  `sio.emit("node", [node_name, json_data])` continuously.
- Gateway `SocketEventController.node()` (`@OnMessage("node")`) re-broadcasts it as
  `io.emit(nodename, data)` — **the event name becomes the node name**, not the literal `"node"`.
- The browser subscribes with `socket.on(listen_node)` where `listen_node` comes from
  `/var/www/html/monitor/assets/config.json`.

> ### Critical facts that cause wrong conclusions
> - **The live dashboard depends ONLY on Channel B.** If the sensor's Socket.IO stream is down,
>   you get "No data to display" *even while permin files keep uploading perfectly.*
> - **`GET /watchPerminDir` returns only a file COUNT**, not waveform data. The frontend calls it
>   on each `dir_modified_permin` watcher event, but it cannot populate the live chart.
> - Permin files with **old timestamps still uploading** usually means the sampler is dead and
>   `uploaderFinal` is just draining a **backlog** — not real-time data.

---

## 3. Network / device map

| Device | IP | Role | Key ports |
|---|---|---|---|
| Sensor | `192.168.10.11` | ADXL355 sampler; runs `start_usher.py` + `uploaderFinal` | — |
| **IDC gateway** | `192.168.10.12` | `lowrise_server_receiver` (PM2 `receiver`), Apache kiosk | `3000` (receiver), `80` (Apache) |
| Platform | `192.168.10.13` | Upstream cloud/aggregator the gateway re-uploads to | `80`, `8000` |

All three sit on **one Ethernet switch**. Because HTTP uploads succeed, the switch/cabling is
proven good — a dead live channel is almost never a physical-network problem.

---

## 4. Decision tree — which tier is broken?

Start at the gateway; it's the fastest place to see the whole picture.

```
Are permin files being written on the gateway?  (ls -la /var/www/html/permin/, fresh timestamps?)
│
├─ NO  → Sensor is not uploading at all. Go to §5.2 (sensor).
│        (Also check the clock — see §6 — wrong time breaks time-based logging.)
│
└─ YES → The RPi IS receiving data (Channel A works).
         │
         Now: does the gateway see the LIVE socket stream?
         (add the NODE EVENT log in §5.1, close the kiosk, watch pm2 logs receiver)
         │
         ├─ You see "NODE EVENT name = …" → Channel B works.
         │   → Problem is the FRONTEND config: listen_node must equal that name. Go to §5.3.
         │
         └─ You see only "File … added", never a NODE EVENT / "client connected" →
             Sensor is NOT streaming over Socket.IO. Go to §5.2 (sensor).

Separately: "ERROR UPLOADING … EHOSTUNREACH 192.168.10.13" in the gateway's "uploader" logs
            → Platform is unreachable. Go to §5.4. Does NOT affect the local dashboard.
```

---

## 5. Diagnostic procedure (the exact steps)

### 5.1 Gateway / IDC checks (`192.168.10.12`)

```bash
# Processes — both receiver and uploader should be "online"
pm2 list

# Live logs. "File ../permin/...log has been added" = Channel A working.
pm2 logs receiver --lines 0          # --lines 0 = only show new lines

# Are files actually landing, with CURRENT timestamps?
ls -la /var/www/html/permin/

# Is the receiver actually listening?
netstat -tuln | grep 3000            # expect ::3000 LISTEN

# Does the REST API respond? (proves the server is up, not that data flows)
curl -X GET http://localhost:3000/getSensorConfig

# What live event name the browser must subscribe to (the DEPLOYED config, not the repo copy):
cat /var/www/html/monitor/assets/config.json     # check ip / port / listen_node
```

**Capture the live event name** (decisive for Channel B). Temporarily edit the receiver source —
`lowrise_server_reciever/src/controllers/SocketEventController.ts`, in the `node()` handler:

```ts
let nodename = message[0];
let data = message[1];
console.log("NODE EVENT name =", nodename);   // <-- TEMPORARY
let io = app.get('socketio');
io.emit(nodename, data);
```

```bash
cd /var/www/html/lowrise_server_reciever        # NOTE: deployed dir is misspelled "reciever"
grep -r "NODE EVENT name" dist/                  # confirm the build picked up the edit
npm run build && pm2 restart receiver
pm2 logs receiver --lines 0
```

How to read it:
- `client connected` appears when **any** Socket.IO client (browser **or** sensor) connects.
- `Sensor is requesting for settings` → the **sensor's** socket client connected (it emits
  `request_settings` on connect).
- `NODE EVENT name = <x>` → live data is flowing; `<x>` is the value `listen_node` must match.
- **Only `File … added` and nothing else (with the kiosk closed)** → the sensor is not opening a
  socket at all → it's a sensor problem (§5.2).

> Remember to **remove the temporary `console.log`** afterwards and rebuild (see §7 Cleanup).

### 5.2 Sensor checks (`192.168.10.11`)

```bash
ssh pi@192.168.10.11
cd ~/Workspace

# Sensor config — the source of truth for where it sends data and its identity
cat config
#   socketserver=http://192.168.10.12:3000   ← must point at the gateway
#   node_name=node                           ← THIS is the live event name (see §5.3)
#   monitor=192.168.10.12

# What PM2 runs here. Typically only "uploader" = uploaderFinal = HTTP-only.
pm2 list

# Is the MAIN sampler/emitter actually running?  Look for start_usher.py.
ps aux | grep -i python | grep -v grep
#   If you see led.py / clearloclog.py but NOT start_usher.py → the sampler is DEAD,
#   and those are orphaned children (clearloclog.py may peg ~100% CPU).

# Confirm start_usher.py is the live emitter
grep -niE "socket|emit|connect|socketserver|node_name" ~/Workspace/USHERv4.0/src/start_usher.py
#   line ~272:  sio.emit("node", [config["node_name"], json_mylist])

# Socket.IO client version vs the v2 server — MUST be compatible
python -c "import socketio, engineio; print(socketio.__version__, engineio.__version__)"
#   4.x / 3.x  → CORRECT pairing for socket.io@2.3 server
#   5.x        → uses EIO4, will silently fail against the v2 server
```

**The decisive test — run the sampler in the foreground and watch it:**

```bash
# Kill orphaned/runaway children first (use the PIDs from the ps output above)
pkill -f clearloclog.py; pkill -f led.py

cd ~/Workspace/USHERv4.0/src
python -u start_usher.py
```

Expected healthy output:
```
Connecting to server...
Successfuly Connected to server
Initializing settings
... ('2026-..T..Z', '0.2', '0.2', ...) ...
Initializing USHER system...
```
At the same moment, the gateway's `pm2 logs receiver` should show `client connected` →
`Sensor is requesting for settings` → `NODE EVENT name = node`, and the kiosk dashboard should
come alive.

If instead you get a **Python traceback**, that's the real crash cause — read it:
- ADXL355 / SPI errors → sensor hardware/wiring or the accelerometer driver.
- File/path or config errors → run it from `~/Workspace/USHERv4.0/src`; check `~/Workspace/config`.
- Socket connect errors → check `socketserver` IP and the socketio version note above.

> A bare `KeyboardInterrupt` traceback only means **you** pressed Ctrl+C — that's not a crash.

### 5.3 Frontend config check (gateway, `/var/www/html/monitor`)

Only relevant once Channel B is confirmed flowing (§5.1 shows a `NODE EVENT name`).

```bash
cat /var/www/html/monitor/assets/config.json
```
`listen_node` **must equal** the sensor's `node_name`. In this deployment both are `node`, so the
default is correct. **But an SD-card clone may ship a stale `listen_node`** — if §5.1 prints
`NODE EVENT name = usher02` while the config says `"node"`, the live display will stay blank until
you set `listen_node` to match, then reload the kiosk.

### 5.4 Platform checks (`192.168.10.13`) — separate concern

The gateway's **`uploader`** app forwards data upstream to the platform. If you see:
```
ERROR UPLOADING PERMIN ... EHOSTUNREACH 192.168.10.13:8000
ERROR UPLOADING EVENT MAX ... EHOSTUNREACH 192.168.10.13:80
```
the platform is unreachable. **This does NOT affect the local dashboard** (Channels A & B are
gateway-local). Fix it only if upstream aggregation matters:
```bash
ping 192.168.10.13
# verify the platform host is up and listening on 80 / 8000
```

---

## 6. Prerequisite gotcha: the system clock

A **wrong RPi system clock** breaks the system in subtle ways and should be checked first:

```bash
date          # must show the correct local time (Asia/Manila)
```
Why it matters:
- Permin/history files are named and bucketed by timestamp (`year/month/day/hour`). The frontend
  requests "today's" data; if the clock is wrong, it asks for a date with no files → blank.
- It can also cause the sampler to misbehave at boot.

In this session, the clock was wrong and fixing it was a prerequisite before anything else made
sense.

---

## 7. Root cause found in this session + fixes

**Root cause:** the sensor's `start_usher.py` (ADXL355 sampler **and** live Socket.IO emitter) had
died. Only its orphaned children survived (`led.py`, plus `clearloclog.py` stuck at ~99.7% CPU).
With the sampler dead there was no Channel B stream — so the dashboard showed "No data to
display" while `uploaderFinal` kept draining a backlog of old permin files (Channel A). Running
`start_usher.py` immediately produced `Successfuly Connected to server` and
`NODE EVENT name = node`, and the live dashboard recovered.

### Stopgap (currently active)
```bash
cd ~/Workspace/USHERv4.0/src
nohup python -u start_usher.py > ~/Workspace/usher.log 2>&1 &
```
This dies on logout/reboot — make it permanent below.

### Permanent fix (NOT yet done) — autostart with auto-restart

First find any existing autostart so you don't create a duplicate:
```bash
crontab -l 2>/dev/null; sudo crontab -l 2>/dev/null
cat /etc/rc.local 2>/dev/null
grep -rsni "start_usher" /etc /home/pi/.config /home/pi/.bashrc 2>/dev/null | grep -vi Binary
```

Recommended: a **systemd service** (survives reboot, restarts on crash). Template:
```ini
# /etc/systemd/system/usher.service
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
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now usher.service
systemctl status usher.service
```
> If an old cron/rc.local entry already starts it, either remove that (to avoid double-launch) or
> skip systemd and rely on the existing mechanism — just don't run two copies.

### Cleanup — remove the temporary debug log
On the gateway, delete the `console.log("NODE EVENT name =", nodename)` line from
`lowrise_server_reciever/src/controllers/SocketEventController.ts`, then:
```bash
cd /var/www/html/lowrise_server_reciever
npm run build && pm2 restart receiver
```

---

## 8. Quick-reference cheat-sheet

| Symptom | Most likely tier | Confirm with |
|---|---|---|
| "No data to display", but permin files keep arriving | **Sensor** (Channel B dead) | `ps aux \| grep python` → is `start_usher.py` running? |
| No permin files arriving at all | **Sensor** (Channel A dead) or **clock** | gateway `ls -la /var/www/html/permin/`; sensor `pm2 list`; `date` |
| Live blank, gateway shows `NODE EVENT name = X`, config says other | **Frontend config** | `cat /var/www/html/monitor/assets/config.json` → `listen_node` must equal `X` |
| Header `server: connected`, still nothing | **Sensor** (socket not emitting) | close kiosk, watch gateway `pm2 logs receiver` for `NODE EVENT` |
| History shows old (e.g. 2023) dates | **Stale clone data** (+ check clock) | `date`; inspect file timestamps |
| `EHOSTUNREACH 192.168.10.13` in `uploader` logs | **Platform** (not the dashboard) | `ping 192.168.10.13` |
| `start_usher.py` connects but crashes with traceback | **Sensor** (hardware/driver/config) | run `python -u start_usher.py` foreground, read the traceback |

---

## 9. Key file & path reference

| What | Where |
|---|---|
| Sensor sampler + live emitter | `~/Workspace/USHERv4.0/src/start_usher.py` (line ~272 `sio.emit("node", …)`) |
| Sensor ADXL355 driver | `~/Workspace/USHERv4.0/src/adxl355.py` |
| Sensor HTTP uploader | `~/Workspace/uploaderFinal/` (PM2 app `uploader`, `dist/server.js`) |
| Sensor config | `~/Workspace/config` (`socketserver`, `node_name`, `monitor`) |
| Gateway receiver (repo) | `lowrise_server_receiver/` |
| Gateway receiver (deployed, **misspelled**) | `/var/www/html/lowrise_server_reciever/` |
| Gateway socket relay | `src/controllers/SocketEventController.ts` (`@OnMessage("node")`) |
| Gateway permin upload (no emit) | `src/controllers/UploadController.ts` → `uploadPermin` |
| Gateway permin count endpoint | `UploadController.ts` → `watchPerminDir` (returns count only) |
| Saved permin files | `/var/www/html/permin/` |
| Deployed old frontend | `/var/www/html/monitor/` (kiosk: `http://localhost/monitor/#/home`) |
| Frontend live-event config | `/var/www/html/monitor/assets/config.json` (`listen_node`) |
| Kiosk launcher | `/home/pi/kiosk.sh` |
```

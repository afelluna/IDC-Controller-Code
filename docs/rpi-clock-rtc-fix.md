# RPi Clock / RTC Drift — Diagnosis & Fix Runbook

> **When to use this:** the platform is receiving uploads fine (rows land in `permin_logs`,
> `created_at` is current) **but** seismic readings render as empty/stale in the frontend, or
> `recorded_at` on the `readings` table is frozen days in the past. This is almost always the RPi
> **system clock being wrong** because the device is offline (no NTP) and its RTC isn't persisting
> time across reboots. First confirmed & fixed **2026-06-19** on the gateway Pi (`raspberrypi`,
> `192.168.10.12`), live device `7c4f9457…` / `device_id=9`.

---

## Why this breaks the dashboard (even though ingest is healthy)

The permin `.log` samples carry an **embedded epoch** stamped from the RPi's **system clock**. The
platform stores that as `readings.recorded_at` (historical, by design — *not* server-receipt time, so
the waveform x-axis stays accurate). The frontend's charts/badges query a **time window on
`recorded_at`** (`recorded_at > NOW() - INTERVAL …`). So:

- If the RPi clock is **behind**, every reading is timestamped in the past →
  the windowed query returns nothing → **"No data to display"** despite a perfectly healthy pipeline.
- `created_at` (platform receipt) looks live and green; only `recorded_at` is wrong. **Always check
  both** — a gap between them is the tell.

> ⚠️ Do **not** "fix" this by switching ingest to `now()`. That hides the clock bug and distorts the
> seismogram. The bug is the clock; fix it on the RPi.

---

## Symptoms / fingerprint

- `readings.recorded_at` maxes out at a fixed past date and isn't advancing; `created_at` is current.
- Uploader (`pm2 logs uploader`) lines are timestamped days behind real time (looks like "stale logs"
  but is actually the live clock being wrong).
- `timedatectl` → `System clock synchronized: no`, `NTP service: inactive`, `RTC time: n/a`.
- Gap **widens** over time (clock stuck while real time advances) — classic offline-Pi drift, also
  noted as a recurring risk in `docs/backlog.md`.

---

## Diagnose (on the RPi that runs `start_usher.py` — the one stamping the epochs)

```bash
date                          # is the wall clock actually wrong?
timedatectl                   # NTP active? clock synchronized? RTC time present?
systemctl status usher.service# confirm THIS box is the sample-generating Pi (it stamps recorded_at)
ls -l /dev/rtc*               # RTC device node present?
sudo hwclock -r               # can the OS read a hardware RTC?
sudo i2cdetect -y 1           # is an RTC chip physically on the I2C bus?
```

**Reading `i2cdetect`:** a DS3231 RTC module shows **`0x68`** (the RTC) and usually **`0x57`** (its
AT24C32 EEPROM). If `0x68` is present but `/dev/rtc0` is missing and `hwclock` says *"Cannot access
the Hardware Clock"*, the **hardware is there but the device-tree overlay was never enabled** — that's
the common case, and the durable fix below applies.

---

## Immediate fix (gets data flowing now; lost on next reboot until the durable fix)

```bash
sudo timedatectl set-time "YYYY-MM-DD HH:MM:SS"   # Asia/Manila wall-clock time
# (or: sudo date -s "YYYY-MM-DD HH:MM:SS")
```

This alone does **not** survive a reboot if there's no working RTC/NTP. Do the durable fix.

---

## Durable fix — enable the DS3231 RTC

> Path note: **pre-Bookworm** Raspberry Pi OS uses `/boot/config.txt`; **Bookworm+** uses
> `/boot/firmware/config.txt`. If `/boot/firmware` doesn't exist, you're on the former.

**1. Enable the overlay** (I²C must be on — it is if `i2cdetect` worked):
```bash
grep -q 'i2c-rtc' /boot/config.txt || echo 'dtoverlay=i2c-rtc,ds3231' | sudo tee -a /boot/config.txt
```

**2. Disable `fake-hwclock`** so it can't mask/override the real RTC at boot:
```bash
sudo apt-get -y remove fake-hwclock
sudo update-rc.d -f fake-hwclock remove 2>/dev/null
sudo systemctl disable fake-hwclock 2>/dev/null
```

**3. Reboot** (ensure system time is correct first; it'll be briefly wrong after reboot until step 4,
since there's no NTP):
```bash
sudo reboot
```

**4. Seed & verify the RTC after reboot:**
```bash
ls -l /dev/rtc*                                   # /dev/rtc0 should now exist
sudo hwclock -r                                   # reads the chip (may be stale the first time)
sudo timedatectl set-time "YYYY-MM-DD HH:MM:SS"   # only if `date` is off after reboot
sudo hwclock -w                                   # WRITE correct system time INTO the DS3231
sudo hwclock -r                                   # confirm it now reads correct
sudo timedatectl set-timezone Asia/Manila         # match the system spec
```

**5. Prove it survives power loss (the real battery test):**
```bash
sudo reboot
date && sudo hwclock -r        # both correct after reboot = battery good, fix is durable
```
If time is wrong after this reboot, the module's **CR2032 coin cell is flat** — replace it and redo
step 4.

---

## Confirm the pipeline recovered

After the clock is correct, re-run **Checkpoint 4** against the platform DB and confirm
`MAX(recorded_at)` is now **current** (not the frozen date):

```sql
SELECT s.sensor_key, COUNT(*), MAX(r.recorded_at)
FROM readings r JOIN sensors s ON r.sensor_id = s.id
WHERE s.device_id = <id> AND r.recorded_at > NOW() - INTERVAL 15 MINUTE
GROUP BY s.sensor_key;
```
Non-zero rows on the **`recorded_at`** window (not just `created_at`) = the frontend's time-windowed
queries will now render. See `docs/permin-readings-waveform-handoff.md` for the rest of the data path.

---

## Prevention

- The DS3231 is accurate and battery-backed, so once enabled it holds time **offline indefinitely** —
  preferred over NTP for this no-internet deployment.
- If a box genuinely has no RTC, point `systemd-timesyncd` at a **LAN** time source (e.g. the platform
  Windows host at `192.168.10.13`) instead of relying on internet NTP.
- Keep a spare CR2032 on hand; a dead cell silently reintroduces this exact failure on the next
  power cut.

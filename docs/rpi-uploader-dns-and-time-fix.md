# RPi Uploader DNS / Time Sync Fix

## Purpose

Document the fix for Raspberry Pi gateway failures when `lowrise_server_uploader` cannot reach `portal.usher.ph` due to local DNS/routing issues or wrong system time.

This issue shows up as uploader errors like:

- `RequestError: Error: getaddrinfo EAI_AGAIN portal.usher.ph portal.usher.ph:3001`
- `SSL certificate problem: certificate is not yet valid`

## Root causes

1. The Pi has multiple active network interfaces (`eth0` and `wlan0`) and the wrong default route is chosen.
2. DNS lookup succeeds only if traffic uses the interface that has internet access.
3. HTTPS certificate validation fails when the Pi clock is wrong.

## Symptoms

- `ping portal.usher.ph` fails with `Temporary failure in name resolution`
- `curl -v https://portal.usher.ph` fails on hostname resolution
- `ping -c 3 8.8.8.8` fails with `Destination Net Unreachable`
- `curl` connects but reports `SSL certificate problem: certificate is not yet valid`

## Fix summary

### 1. Confirm DNS and internet routing

```bash
sudo cat /etc/resolv.conf
ping -c 3 8.8.8.8
curl -v https://portal.usher.ph:3001/high/uploadPermin
```

### 2. Prefer the working interface for internet traffic

If the Pi is using `eth0` as the default route but only `wlan0` has internet connectivity, add interface metrics in `/etc/dhcpcd.conf`.

#### Edit `/etc/dhcpcd.conf`

```conf
interface eth0
static ip_address=192.168.10.12/24
static ip6_address=fd51:42f8:caae:d92e::ff/64
static routers=192.168.10.1
static domain_name_servers=192.168.10.1 8.8.8.8 fd51:42f8:caae:d92e::1
metric 300

interface wlan0
metric 200
```

- `metric 200` gives `wlan0` higher priority for the default route than `eth0`.
- `metric 300` lowers the priority of `eth0`.

### 3. Restart DHCP client

```bash
sudo systemctl restart dhcpcd
```

### 4. Verify the route selection

```bash
ip route get 8.8.8.8
```

The route should now use `wlan0`.

### 5. Sync system time if HTTPS fails

If certificate validation still fails, sync the clock.

```bash
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd
sudo timedatectl status
```

If `systemd-timesyncd` is unavailable or not enough:

```bash
sudo apt update
sudo apt install -y ntpdate
sudo ntpdate pool.ntp.org
```

### 6. Re-test the portal endpoint with a POST request

Use the exact upload endpoint, not `GET`.

```bash
curl -v -X POST \
  -F "node_token=<TOKEN>" \
  -F "file=@/path/to/sample.log" \
  https://portal.usher.ph:3001/high/uploadPermin
```

## Notes

- `GET /high/uploadPermin` will return `404 Not Found` because the endpoint is designed for `POST` uploads.
- The uploader requires the real `node_token` and a multipart form upload.
- This document covers the gateway-side problem, not the portal-side app logic.

## Reference

- `lowrise_server_uploader/.env`
- `lowrise_server_uploader/src/classes/PerminUpload.ts`
- `lowrise_server_uploader/src/classes/FirstAlarmUpload.ts`
- `lowrise_server_uploader/src/classes/EventMaxUpload.ts`

## Recovery

If the change causes network issues, restore the backup:

```bash
sudo cp /etc/dhcpcd.conf.bak /etc/dhcpcd.conf
sudo systemctl restart dhcpcd
```

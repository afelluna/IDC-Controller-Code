# Handoff: Make `usher-wehlo-platform` Handle Concurrent RPi Uploads (Windows)

> **Context for the reader:** The RPi `lowrise_server_uploader` now POSTs seismic data
> to the `usher-wehlo-platform` Laravel backend. The endpoints work, but the backend is
> running under `php artisan serve` (single-threaded) and intermittently times out the
> RPi's `eventMax` uploads under concurrent load. This handoff fixes that by moving to a
> multi-worker server.

---

## Problem

The Laravel backend currently runs via `php artisan serve`, which is **single-threaded** —
it processes one request at a time and boots the framework per request (~190ms, visible in
the `Server-Timing: app_boot` header). The RPi uploader sends concurrent streams:

- `permin` every 5s
- `firstAlarm` every 5s
- `eventMax` with a **strict 10s client-side timeout** (hardcoded in the uploader)

Under this concurrent load, requests queue on the single thread and `eventMax` intermittently
hits `ETIMEDOUT`. The endpoints themselves are healthy — verified: an isolated `eventMax`
upload returns **0.339s, HTTP 200**. The fix is a **multi-worker server**, not a code change.

---

## Constraints

- Host OS: **Windows** (PHP 8.4.16). **php-fpm is not available on Windows — do not use it.**
- Server must bind `0.0.0.0:8000` (reachable from the RPi at `192.168.10.13:8000`).
- The three RPi ingest routes are **bare paths** — must keep resolving exactly as-is, no `/api` prefix:
  - `POST /high/firstAlarm`
  - `POST /high/uploadPermin`
  - `POST /uploadEventMax`
- Must keep `Asia/Manila` timezone behavior and existing Reverb broadcasting intact.

---

## Approach decision

| Option | Summary | When to pick |
|---|---|---|
| **A — Laravel Octane + FrankenPHP** (recommended) | One Composer package, multi-worker, keeps the app booted in memory (kills the per-request boot), cross-platform single binary. Purpose-built for concurrent requests on a single command. | Default choice — fastest path to a working multi-worker server. |
| **B — Laragon (nginx + PHP-CGI pool)** | Windows dev stack with a GUI bundling nginx + PHP, running multiple PHP-CGI workers. | If you already use Laragon/XAMPP or prefer the traditional web-server + document-root model. |

---

## Primary task — Laravel Octane + FrankenPHP

1. Install:
   ```bash
   composer require laravel/octane
   php artisan octane:install
   ```
   When prompted for a server, choose **FrankenPHP** (it auto-downloads the binary).

2. Start it bound to all interfaces, with multiple workers:
   ```bash
   php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=4
   ```
   Stop using `php artisan serve` entirely — pick one server on port 8000.

3. **Verify the concurrency caveat:** Octane keeps the app in memory across requests, so any
   accidental shared/static state leaks between requests. The ingest controllers are stateless
   (Eloquent writes + event dispatch), so this should be safe — but explicitly check
   `HighController`, `NodeTokenAuth`, and `IngestController` for static properties or container
   singletons holding per-request state. Report anything suspect rather than assuming.

---

## Verification (run, don't assume)

- [ ] `php artisan route:list` still shows the 3 ingest routes + 2 read routes at the exact paths.
- [ ] From the RPi, hammer `eventMax` repeatedly while `permin`/`firstAlarm` are also flowing —
      confirm **no more `ETIMEDOUT`** in `pm2 logs uploader`, only `{ message: 'ok', ... }`.
- [ ] Existing `POST /api/ingest` still returns 200 (Octane didn't break the header-auth path).
- [ ] Reverb still receives broadcasts (client `AlarmsPanel` updates live). Octane and
      `php artisan reverb:start` run as **separate processes**; both must be up.
- [ ] A timed `eventMax` curl stays well under the uploader's 10s limit even under concurrent load:
      ```bash
      curl -i -X POST http://192.168.10.13:8000/uploadEventMax \
        -F "node_token=<token>" -F "eventId=loadtest" \
        -F "file=@../eventMax/<file>.log" \
        --max-time 30 -w "\n>>> total time: %{time_total}s\n"
      ```

---

## Persistence (survive reboots / closed terminals)

Both `php artisan serve` and `reverb:start` die when their terminal closes. PM2 (already used on
the RPi) also runs on Windows (`npm i -g pm2`). Wrap both platform processes:

```bash
pm2 start "php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000 --workers=4" --name platform-web
pm2 start "php artisan reverb:start --host=0.0.0.0 --port=8080" --name platform-reverb
pm2 start "php artisan queue:work" --name platform-queue   # only if/when broadcasts are queued
pm2 save
```

Alternatively use `nssm` to run them as Windows services. PM2 is simpler since it's already in use.

> **Note:** The queue worker is **optional**. Broadcasting was verified non-blocking (0.3s responses),
> so add `queue:work` only if you later want broadcasts fully decoupled. It is not required for this fix.

---

## Fallback task — if Octane causes problems (Option B)

If Octane's in-memory model surfaces state bugs or FrankenPHP misbehaves on Windows:

1. Install **Laragon**.
2. Point its nginx document root at `C:\luna_IT\usher-wehlo-platform\backend\public`.
3. Configure the PHP-CGI worker pool (default runs several).
4. Bind nginx to `0.0.0.0:8000`.
5. Confirm the same verification checklist above.

This gives multi-worker concurrency via the traditional web-server route without php-fpm.

---

## Out of scope

- **No RPi uploader changes** — its 10s `eventMax` timeout stays; the server just needs to respond
  well within it under load.
- **No route or auth changes.**
- **No moving the platform off Windows** (separate future decision if you deploy to a Linux server).

---

## Two operator notes (solo deployment)

- **Run Octane and Reverb as two separate PM2 processes** — they're independent. A common
  "it stopped working" moment is closing the terminal that held Reverb; PM2 + `pm2 save` prevents that.
- **You don't strictly need the queue worker** for this to work. Don't let it block you now.

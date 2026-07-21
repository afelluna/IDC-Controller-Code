# RpiModule Audio Alarm Debounce Change

## File Changed

- `lowrise_server_receiver/src/classes/RpiModule.ts`

## Purpose

Fix rapid audio alarm switching where `yellowred` can be triggered close to `yellow`, causing yellow and red alarm audio to overlap or restart repeatedly.

## Behavior Change

- `runPA()` no longer transitions audio immediately.
- Incoming audio statuses are collected for a 150ms debounce window.
- The highest priority status inside that window wins:
  - `yellowred`: priority 3
  - `yellow`: priority 2
  - `green`: priority 1
- If the winning status is already active, audio is not restarted.
- When the winning status changes, the code stops existing `mpg123` playback and starts the selected MP3:
  - `green` -> `assets/pa-green.mp3`
  - `yellow` -> `assets/pa-yellow.mp3 --loop -1`
  - `yellowred` -> `assets/pa-red.mp3 --loop -1`

## Scope

This change is limited to audio alarm transition logic in `RpiModule.ts`.

The existing GPIO, buzzer, relay, and sensor threshold behavior were not redesigned.

## Risks To Verify

- `setGpioLedVal()` now calls `runPA(gpio)`. If the client also emits the `"announcement"` socket event for the same alarm status, `runPA()` may be called twice. The debounce/state guard should reduce duplicate audio restarts, but this should still be checked on the Raspberry Pi.
- `pkill mpg123` is process-wide. It will stop all `mpg123` processes on the device, not only audio started by this backend.
- The command starts `mpg123` through shell background execution. If `pkill` does not exit quickly enough on the Pi, a very short overlap may still be possible during a fast transition.
- `mpg123` must be installed and available in the runtime PATH used by PM2.

## Pi Test Cases

- Trigger `yellow`, then trigger `yellowred` within 150ms. Expected: only red audio should settle and loop.
- Trigger repeated `yellowred` events. Expected: red audio should continue without restarting.
- Trigger `yellowred`, then `yellow` within 150ms. Expected: red audio should win.
- Trigger `yellow`, wait more than 150ms, then trigger `yellowred`. Expected: yellow should stop and red should start.

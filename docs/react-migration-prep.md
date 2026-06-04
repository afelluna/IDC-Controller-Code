# Preparation for React Frontend Migration

This document outlines the steps and considerations for replacing the legacy Angular dashboard with a new React-based frontend.

## 1. Backend API Compatibility
The `lowrise_server_receiver` provides all necessary endpoints. Your React app should interact with the following:

- **Auth**: `POST /loginUser` and `POST /changePass`.
- **Config**: `GET /getSensorConfig` (to get `node_name` and thresholds) and `POST /updateIntensity`.
- **System**: `GET /getDiskSpace` and `POST /calibrate`.
- **Data**: `GET /getHistory` and `GET /getHistoryMax` for the event tables.
- **Charts**: `POST /getBefore`, `POST /getDuring`, and `POST /getAfter` for loading historical event waveforms.

## 2. Real-time Integration (Socket.IO)
- **Library**: Use `socket.io-client` version matching the server (server uses `^2.3.0`, so use a compatible v2.x client).
- **Events to Listen for**:
    - `[node_name]`: Real-time X,Y,Z data for the live chart.
    - `newfirstalarm`: Triggers a visual/audible alert in the UI when an event starts.
    - `calibratesensor`: Shows a "Calibrating..." overlay.
    - `dir_modified`: Indicates new files are available (useful for refreshing history tables).

## 3. Environment Config
- The GUI expects to find the Gateway IP in a `config.json` file if it's served statically, or you can hardcode it to `window.location.hostname` since they usually reside on the same device.

## 4. Deployment Strategy
1. **Build**: Run `npm run build` on your React project.
2. **Replace**: Remove the contents of the `/monitor` folder in this repo and replace them with your React `dist/` or `build/` folder.
3. **Web Server**: Ensure the Apache configuration (on the RPi) points to the `/monitor` directory and handles "Single Page Application" (SPA) routing (redirecting all non-file requests to `index.html`).

## 5. Critical Checkpoints
- **Moment Timezone**: Ensure your React app uses `moment-timezone` or `luxon` set to `Asia/Manila` to match the backend's logging timestamps.
- **Base Href**: If your React app is served from a subfolder (e.g., `/monitor/`), set the `<base href="/monitor/">` in your `index.html`.

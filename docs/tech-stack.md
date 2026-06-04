# Tech Stack

This project is a distributed system designed for edge computing on Raspberry Pi devices, focused on seismic monitoring and alerting.

## 1. Frontend (Local Dashboard)
- **Framework**: Angular (Compiled version located in `/monitor`).
- **Web Server**: Apache2 (Served as a static site).
- **Real-time Updates**: Socket.IO-client (Communicates with the local Node.js backend).
- **Styling**: Likely PrimeNG or a similar UI library (judging by the file names like `primeicons`).

## 2. Backend (Edge Services)
- **Runtime**: Node.js.
- **Framework**: Express.js.
- **Language**: TypeScript (Transpiled to JavaScript in `/dist`).
- **Real-time Communication**: Socket.IO (Server-side).
- **Process Management**: PM2 (Uses `ecosystem.config.js` to manage `receiver` and `uploader` services).

## 3. Database
- **Engine**: MySQL / MariaDB.
- **Role**: Stores sensor configurations, alert thresholds, and system settings.
- **Schema**: Defined in `lowrise_server_receiver/config_db.sql`.

## 4. Hardware Interaction (Raspberry Pi Specific)
- **GPIO Management**: `onoff` (Node.js library for high-performance GPIO).
- **Audio Output**: `node-omxplayer` (Wrapper for OMXPlayer to play `.mp3` alerts).
- **Button Handling**: `rpi-gpio-buttons` or custom logic using `onoff`.
- **System Commands**: Node.js `child_process` (For `reboot` and `shutdown` commands).

## 5. Data Flow & Utilities
- **File Watching**: `chokidar` (To detect new logs and trigger uploads).
- **HTTP Requests**: `request-promise` / `request` (For uploading data to the central USHER portal).
- **Date/Time**: `moment-timezone` (Crucial for timestamping seismic events accurately).
- **Disk Management**: `check-disk-space` (Used by `ClearHistory.ts` to prevent SD card overflow).

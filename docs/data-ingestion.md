# Data Ingestion & Communication Flow

This document explains how seismic data from a remote sensor (another Raspberry Pi) reaches the local USHER system and is displayed on the frontend dashboard.

## 1. Physical Connection
The sensor RPi is connected to the central RPi (this device) via a direct **Ethernet cable**. 
- Both devices must be on the same subnet (e.g., `192.168.10.x`).
- The sensor RPi acts as the **Client**, and this RPi acts as the **Server/Gateway**.

## 2. Data Transmission (Sensor to Gateway)
The remote sensor sends data to the `lowrise_server_receiver` using two primary methods:

### A. HTTP POST (File Uploads)
For larger batches of data (like per-minute logs or event peaks), the sensor sends multipart form-data to these endpoints in `UploadController.ts`:
- `/uploadPermin`: For continuous 1-minute data logs.
- `/uploadEventMax`: For peak acceleration data during a seismic event.
- `/upload`: For "First Alarm" signals when shaking is first detected.

### B. Socket.IO (Real-time Streaming)
For live waveform display, the sensor RPi connects as a Socket.IO client to this RPi (typically on port 3000).
- **The "node" event**: The sensor emits a `node` message containing raw X, Y, Z axis data.
- **The "request_settings" event**: When the sensor starts up, it requests its operational thresholds from the gateway.

## 3. The "Relay" Mechanism (Gateway to Frontend)
The Gateway (this RPi) acts as a **message broker** between the sensor and the browser dashboard.

1. **Reception**: In `SocketEventController.ts`, the `@OnMessage("node")` listener catches the data from the remote sensor.
2. **Identification**: The message includes a `nodename` (e.g., `usher02`).
3. **Broadcasting**: The Gateway immediately re-emits this data to all connected browsers using `io.emit(nodename, data)`.

## 4. Frontend Reception (React/Angular)
The frontend dashboard (the GUI) connects to the Gateway's Socket.IO server.
- It listens for events matching the `node_name` defined in the configuration (e.g., `usher02`).
- When a `node` event is received, the frontend pushes the data into a chart buffer (like Chart.js or D3.js) to render the moving waveform.

## 5. Summary Diagram
`Sensor RPi` --(Ethernet: Socket.IO "node")--> `Gateway RPi (Receiver)` --(Broadcast: Socket.IO "usher02")--> `Browser GUI`

---

### Implementation Note for React Migration:
When building your React frontend, ensure you:
1. Initialize a Socket.IO client connection to `http://<GATEWAY_IP>:3000`.
2. Fetch the `node_name` from the API (`/getSensorConfig`).
3. Create a listener for that specific `node_name` to receive the real-time X, Y, Z coordinates.

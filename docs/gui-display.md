# GUI Display

The system provides a local web-based interface for monitoring and configuration.

## 1. Serving the GUI
- The GUI is a pre-compiled **Angular** application located in the `/monitor` directory.
- It is served by **Apache2** or **Nginx**.
- Default URL on the local network: `http://<RPI_IP>/monitor/`.

## 2. Key Features
- **Real-time Waveform**: Displays X, Y, and Z axis data as it arrives.
- **Intensity Meter**: Shows the current seismic intensity based on PGA values.
- **Event History**: Allows users to browse and download past earthquake logs.
- **Configuration Panel**: 
    - Threshold settings (`xthold`, `ythold`, `zthold`).
    - Alert levels (`warning`, `warrant`).
    - Login/Password management.

## 3. Communication
- The GUI acts as a client to the `lowrise_server_receiver` backend.
- It uses **Socket.IO** (usually on port 3000) for high-speed data streaming.
- It uses **REST API** calls for stateful changes (e.g., updating thresholds in the database).

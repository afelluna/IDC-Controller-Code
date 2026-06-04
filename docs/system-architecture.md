# System Architecture

The USHER Lowrise system follows a decoupled, event-driven architecture designed for high availability at the edge.

## 1. Component Overview

### A. The Receiver Node (`lowrise_server_receiver`)
- **Role**: Data Ingestion and Local Alerting.
- **Input**: Receives seismic data packets from sensors via HTTP POST or Sockets.
- **Logic**: 
    - Compares received PGA (Peak Ground Acceleration) values against thresholds in the MySQL DB.
    - Triggers physical alerts (LEDs, Buzzer, Relays) via GPIO.
    - Plays audio announcements.
- **Output**: Writes raw data and event logs to the local file system (`/permin`, `/eventMax`).

### B. The Uploader Node (`lowrise_server_uploader`)
- **Role**: Cloud Synchronization.
- **Logic**: 
    - Constantly polls or watches specific directories for new `.log` files.
    - Batches data and sends it to the central USHER Portal via REST API.
- **Output**: Deletes or moves successfully uploaded files to an "uploaded" folder.

### C. The Local Dashboard (`monitor`)
- **Role**: Human-Machine Interface (HMI).
- **Logic**: 
    - Served by Apache on port 80.
    - Connects to the Receiver's Socket.IO server for real-time waveform display.
    - Provides a GUI for system configuration (thresholds, network settings).

## 2. Data Flow Path
1. **Seismic Event** -> 2. **Sensor** -> 3. **Receiver (Node.js)** -> 4. **Local Disk (.log)** -> 5. **Uploader (Node.js)** -> 6. **Cloud Portal**.

## 3. Resilience Features
- **File System Buffering**: If internet connectivity is lost, the Uploader waits, but the Receiver continues to log data locally.
- **Auto-Cleanup**: The `ClearHistory` class ensures the system doesn't crash due to a full SD card by deleting the oldest logs first.
- **Process Recovery**: PM2 automatically restarts services if they crash.

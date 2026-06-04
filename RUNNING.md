# IDC Code - Migrated React System Instructions

The Angular frontend has been successfully migrated to **React 19 + Vite**. The system is now configured to interface directly with the Node.js backend (`lowrise_server_receiver`) via REST and Socket.IO.

## Prerequisites
- Node.js installed on the IDC Controller (RPi).
- MySQL database running with the `config_db.sql` schema.

## Installation

### 1. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd lowrise_server_receiver
npm install
```
Configure your `.env` file (ensure `APP_PORT=3000`).

### 2. Frontend Setup
The frontend is already built and deployed to the `/monitor/` directory. If you need to make changes:
```bash
cd frontend
npm install
npm run build
```
This will automatically update the files in `/monitor/`.

## Running the System

### Standard Mode (Recommended)
The backend is configured to serve the static frontend files from the `/monitor/` directory.
1. Start the backend:
   ```bash
   cd lowrise_server_receiver
   npm start
   ```
2. Open your browser to: `http://localhost:3000` (or the RPi's LAN IP).

### Development Mode (Frontend only)
If you want to run the React dev server with Hot Module Replacement:
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` (Port is set to 3000 to match backend socket expectations).

## Verification Checklist
- [x] **Dashboard Access**: Accessing `http://<IP>:3000` loads the dashboard immediately without a login screen.
- [x] **Live Data**: The "Data Stream" status turns green and "Live" when the backend is running.
- [x] **Real-time Seismogram**: The VelocityChart animates live as data arrives via Socket.IO.
- [x] **History**: Recent seismic events appear in the HistoryCard (fetched from `/getHistory`).
- [x] **Storage**: The StorageCard shows disk usage in GB (fetched from `/getDiskSpace`).
- [x] **Auto-Reconnect**: If the backend restarts, the frontend will automatically reconnect to the socket.

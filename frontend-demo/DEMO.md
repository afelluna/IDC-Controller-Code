# IDC GUI - Standalone Demo Mode

This project is a standalone, self-contained version of the USHER IDC Monitoring Dashboard. It has been configured to run entirely in the browser without requiring a backend server, database, or Raspberry Pi.

## How it Works
1.  **Mock API:** The `src/api/seismicApi.ts` has been replaced with mock functions that return static data (historical alerts, storage info, configuration).
2.  **Simulated Real-time Data:** The `src/hooks/useWebSocket.ts` uses an internal timer to generate oscillating seismic waveforms (using `Math.sin`), simulating a live high-frequency data stream at 20Hz.
3.  **High-Performance Charting:** It utilizes the same `uPlot` engine as the production app, proving that the frontend can handle intense data streams smoothly even in a demo environment.

## Running the Demo
1.  Navigate to the `frontend-demo` directory:
    ```bash
    cd frontend-demo
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser to `http://localhost:3000`.

## Key Features to Observe
*   **Live Seismogram:** Watch the uPlot chart render the simulated wave in real-time.
*   **Intensity Display:** The center display will react to simulated "spikes" in the waveform.
*   **Historical Data:** The history and histogram cards are populated with mock data from `src/data/mockData.ts`.

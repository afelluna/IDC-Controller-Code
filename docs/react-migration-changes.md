# Legacy to React Migration Documentation

This document outlines the architectural, structural, and technical changes implemented during the migration of the USHER monitoring dashboard from legacy Angular to modern React.

## 1. Technology Stack Overhaul
*   **Legacy:** Angular (compiled with Webpack, es5/es2015 polyfills), RxJS, Highcharts.
*   **Modern:** React 19, Vite, Tailwind CSS v4, Recharts (to be partially migrated to uPlot for high-performance needs), and modern functional components with hooks.

## 2. Core Architecture Changes
*   **Routing & Serving:** The backend (`lowrise_server_receiver`) still serves the frontend from the `monitor/` directory. However, the React app now uses Vite for development and builds, removing the complex Webpack configuration.
*   **Styling:** Shifted from vanilla CSS and PrimeNG-like component styles to a utility-first approach with Tailwind CSS v4. This eliminates the need for separate `.css` files per component and centralizes design tokens.
*   **Component Structure:** The UI has been broken down into a modular grid layout:
    *   `App.tsx` serves as the main orchestrator.
    *   Left column: `LogoCard`, `HistoryCard`, `HistogramCard`.
    *   Center column: `IntensityDisplay`, `IntensityLegend`.
    *   Right column: `VelocityChart`, `StatusCard`, `StorageCard`.

## 3. Real-Time Data Flow
*   **WebSocket Integration:** The legacy system relied heavily on global Socket.io listeners. The React application encapsulates this logic within a custom hook (`useWebSocket.ts`).
    *   **Workflow:** On mount, `useWebSocket` fetches the sensor's `node_name` via the `GET /getSensorConfig` API. It then subscribes to the Socket.io channel matching that specific `node_name` to receive live seismic data.
    *   **First Alarm:** Listens for the `newfirstalarm` event and triggers a history refresh.
*   **Data Management:** The `useSeismicData.ts` hook acts as the central state manager, formatting raw API responses into structures digestible by the UI components (e.g., transforming history arrays into categorized histogram counts).

## 4. Visualization Strategy
*   **Legacy:** Used **Highcharts** with a manual `addPoint(x, redraw: false)` sliding-window technique. Incoming data was batched and drawn efficiently to maintain 60fps during live seismic events.
*   **Current React Status:** Uses **Recharts** (SVG-based). While excellent for static data like histograms, it creates severe DOM bottlenecks for high-frequency (50Hz) streaming data.
*   **Planned Improvement:** A targeted migration of the `VelocityChart` from Recharts to **uPlot** (a high-performance, Canvas-based library) is planned to restore and exceed the legacy system's rendering performance.

## 5. Identified Gaps (Pending Implementation)
During the analysis, certain management and administrative features present in the backend were found to be missing from the new React UI:
*   **Configuration UI:** The API (`POST /updateIntensity`) exists to update thresholds (warning, warrant, x/y/z bounds), but there is no settings modal or panel to invoke it.
*   **Calibration:** The `POST /calibrate` endpoint exists, but the "Calibrating..." UI overlay and trigger button are missing.
*   **File Sync Notification:** The frontend does not currently listen to the `dir_modified` or `dir_modified_permin` Socket.io events, which the backend uses to signal that new historical data logs have been written to disk.

## Conclusion
The React migration has successfully modernized the core monitoring interface, providing a more maintainable and developer-friendly codebase. Future efforts should focus on replacing the real-time charting engine with uPlot and building out the missing administrative interfaces to achieve full feature parity with the legacy system.
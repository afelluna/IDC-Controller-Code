# Design System Documentation

This document outlines the visual language, components, and design tokens used in the IDC Seismic Dashboard.

## Design Philosophy
The dashboard is designed for high-performance, real-time data visualization on kiosk-style hardware. The UI emphasizes clarity, data density, and professional aesthetics using a clean, "Soft UI" (Neumorphic-influenced) style.

---

## Design Tokens

Design tokens are defined in `frontend/src/index.css` as CSS variables. The system supports both Light (default) and Dark modes.

### Colors

#### Base Surfaces
| Token | Light Mode | Dark Mode | Description |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#f4f6f9` | `#0f1117` | Main application background. |
| `--bg-surface` | `#ffffff` | `#161b27` | Card and component surfaces. |
| `--bg-elevated` | `#f1f4f8` | `#1e2538` | Hover states or secondary surfaces. |

#### Text
| Token | Light Mode | Dark Mode | Description |
| :--- | :--- | :--- | :--- |
| `--text-primary` | `#1e293b` | `#e2e8f0` | Body text and headers. |
| `--text-secondary`| `#64748b` | `#64748b` | Sub-headers and secondary info. |
| `--text-muted` | `#94a3b8` | `#374151` | Disabled states and placeholder text. |

#### Brand & Semantic
| Token | Light Mode | Dark Mode | Description |
| :--- | :--- | :--- | :--- |
| `--brand` | `#0869d9` | `#3b82f6` | Primary action color. |
| `--status-live` | `#16a34a` | - | Operational/Live status. |
| `--status-warn` | `#d97706` | - | Offline/Warning status. |
| `--status-error` | `#dc2626` | - | Critical error state. |

---

## Typography

- **Primary Font:** `Inter` (Sans-serif) - Used for all UI labels and body text.
- **Monospace Font:** `JetBrains Mono` / `Courier New` - Used for raw data values and timestamps where alignment is critical.

---

## PEIS Intensity Scale

The dashboard strictly adheres to the **Phivolcs Earthquake Intensity Scale (PEIS)**. Colors and messages are managed in `frontend/src/constants/index.ts`.

| Level | Color | Range (m/s²) | Description |
| :---: | :--- | :--- | :--- |
| 1 | `#ffffff` | `<0.0017` | Scarcely Perceptible |
| 2 | `#bfccff` | `0.0017 - 0.005` | Slightly Felt |
| 3 | `#a0e6ff` | `0.005 - 0.014` | Weak |
| 4 | `#80ffff` | `0.014 - 0.039` | Moderately Strong |
| 5 | `#7aff93` | `0.039 - 0.092` | Strong |
| 6 | `#ffff00` | `0.092 - 0.18` | Very Strong |
| 7 | `#ffc800` | `0.18 - 0.34` | Destructive |
| 8 | `#ff9100` | `0.34 - 0.65` | Very Destructive |
| 9 | `#ff0000` | `0.65 - 1.24` | Devastating |
| 10 | `#c80000` | `>1.24` | Completely Devastating |

---

## Components

### Card (`components/ui/Card.tsx`)
The foundational container. Features:
- Rounded corners (`2xl` / `1rem`).
- Elevation via `--shadow-card`.
- Automatic surface color mapping using CSS variables.

### Seismogram (`components/cards/Seismogram.tsx`)
A high-performance real-time chart powered by `uPlot`.
- **Sliding Window:** Displays the last 60 seconds of data.
- **Responsive:** Uses `ResizeObserver` to fit the exact kiosk dimensions (800x440 target).
- **FIFO Buffer:** Uses a high-performance ref-based buffer for zero-latency updates.

### Status Badges
Used within `StatusCard` and header components to show connectivity.
- **Connected/Live:** Green pulse indicator (`animate-pulse`).
- **Offline/Scanning:** Indigo or Amber indicator depending on context.

---

## Layout Constraints (Kiosk Mode)
The application is locked to a strict **800x440** resolution to support target hardware.
- `overflow: hidden` on `html, body, #root` to prevent all scrollbars.
- Flexbox `flex-col` layout to distribute space vertically.
- `min-h-0` on flex children (specifically the seismogram card) to ensure the `uPlot` canvas respects container boundaries and never forces an overflow.
- **Scaling:** Padding and font sizes are tuned to ensure 100% visibility of the time axis labels and status information without clipping.

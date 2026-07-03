# Layout E — Stacked Pair (Equal Hero Column)

- **Branch:** `feat/layout-e`
- **Worktree:** `../IDC-layout-worktrees/layout-e`
- **Dev port:** 3003
- **Wireframe:** [wireframes/layout-E.png](wireframes/layout-E.png)

> Read [README.md](README.md), [component-catalog.md](component-catalog.md), and
> [conventions.md](conventions.md) first. You change **only** the JSX grid in
> `frontend/src/pages/MonitorPage.tsx`.

---

## Concept

The two heroes are **stacked vertically in one left column** — IntensityDisplay on top,
Seismogram directly below, both the same size (an "equal hero column"). The **right column** is
a simple even stack of the four secondary cards. Calm, orderly, very readable — the eye goes
top-left (Intensity) → down (Seismogram), then scans the right rail.

## Box → component mapping (from the wireframe numbers)

| Box | Component | Region |
|-----|-----------|--------|
| 1 | **IntensityDisplay** (hero) | left column, top |
| 2 | **Seismogram** (hero) | left column, bottom (equal size to box 1) |
| 3 | **ThresholdCard** | right column, row 1 |
| 4 | **IntensityLegend** | right column, row 2 |
| 5 | **SummaryCard** | right column, row 3 |
| 6 | **StatusCard + StorageCard** | right column, row 4 (both in one cell) |

LogoCard: tuck the USHER mark subtly (see catalog) — no full slot.

## Structure guidance

```
┌────────────────────┬───────────────┐
│  1 IntensityDisplay│  3 Threshold  │
│      (hero)        ├───────────────┤
│                    │  4 Legend     │
├────────────────────┼───────────────┤
│  2 Seismogram      │  5 Summary    │
│      (hero)        ├───────────────┤
│                    │ 6 Status+Store│
└────────────────────┴───────────────┘
```

- Left column: wide (e.g. `col-span-7` or `col-span-8`), a `flex flex-col gap-1.5` split
  **50/50** between IntensityDisplay and Seismogram — they must be visibly **equal height**.
  Give each `flex-1 min-h-0`.
- Right column: (e.g. `col-span-5` / `col-span-4`) a `flex flex-col gap-1.5` with four regions:
  ThresholdCard, IntensityLegend, SummaryCard, then a nested StatusCard+StorageCard stack.
- Distribute right-column heights so all four regions fit; SummaryCard may want slightly more
  room (4 tiles). StatusCard+StorageCard share the last region (nested `flex flex-col`).
- The equal-height left stack is the defining feature — protect it when tuning.

## Acceptance
- Left column shows IntensityDisplay stacked over Seismogram at **equal height**; Intensity
  reads first.
- Right rail: Threshold, Legend, Summary, Status+Storage all visible, none clipped.
- Fits 800×480 and desktop, no scroll. `npm run lint` clean. Props unchanged. `accelRef` intact.

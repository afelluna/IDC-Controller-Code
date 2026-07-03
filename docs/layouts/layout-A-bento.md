# Layout A — Bento Grid

- **Branch:** `feat/layout-a`
- **Worktree:** `../IDC-layout-worktrees/layout-a`
- **Dev port:** 3002
- **Wireframe:** [wireframes/layout-A.png](wireframes/layout-A.png)

> Read [README.md](README.md), [component-catalog.md](component-catalog.md), and
> [conventions.md](conventions.md) first. You change **only** the JSX grid in
> `frontend/src/pages/MonitorPage.tsx`.

---

## Concept

A **bento box**: cells of varied sizes packed into a tight grid. One large hero cell
(IntensityDisplay) anchors the top-left and spans tall; small cells cluster to its right; the
second hero (Seismogram) sits along the bottom row. Playful but balanced — the two heroes still
dominate, secondary cards fill the interstitial cells.

## Box → component mapping (from the wireframe numbers)

| Box | Component | Region |
|-----|-----------|--------|
| 1 | **IntensityDisplay** (hero) | top-left, large, spans the upper two rows |
| 2 | **IntensityLegend** | top-middle, small |
| 3 | **ThresholdCard** | top-right, small |
| 4 | **SummaryCard** | middle-right, wide (row 2) |
| 5 | **Seismogram** (hero) | bottom-left |
| 6 | **StatusCard + StorageCard** | bottom-right (the two stacked/side-by-side in one cell) |

LogoCard: fold the USHER mark into a corner (see catalog) — no full slot.

## Structure guidance

```
┌───────────────┬───────┬───────┐
│               │ 2 Leg │ 3 Thr │
│ 1 Intensity   ├───────┴───────┤
│    Display    │  4 Summary    │
│    (hero)     │   (wide)      │
├───────────────┼───────────────┤
│ 5 Seismogram  │ 6 Status +    │
│    (hero)     │    Storage    │
└───────────────┴───────────────┘
```

- Use an explicit grid: e.g. `grid grid-cols-12 grid-rows-3` on the inner wrapper (or nested
  grids). IntensityDisplay: `col-span-6 row-span-2`. Legend + Threshold: two small `col-span-3`
  cells in the top-right. SummaryCard: `col-span-6` wide on row 2. Bottom row: Seismogram
  `col-span-6` and a `col-span-6` cell holding StatusCard + StorageCard (nested flex).
- Keep IntensityDisplay and Seismogram visually the **two biggest** cells — equal weight, with
  IntensityDisplay reading first (top-left).
- The "6" cell holds **both** StatusCard and StorageCard — stack them vertically (or
  side-by-side if width allows) inside one grid cell via a nested `flex`.
- Tune spans/row heights so the whole bento fits 800×480 without overflow.

## Acceptance
- Recognizable bento: varied cell sizes, IntensityDisplay large top-left & first, Seismogram
  co-equal hero bottom-left.
- Both StatusCard and StorageCard present in the bottom-right cell.
- Fits 800×480 and desktop, no scroll. `npm run lint` clean. Props unchanged. `accelRef` intact.

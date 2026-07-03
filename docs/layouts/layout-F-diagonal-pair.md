# Layout F — Diagonal Pair

- **Branch:** `feat/layout-f`
- **Worktree:** `../IDC-layout-worktrees/layout-f`
- **Dev port:** 3004
- **Wireframe:** [wireframes/layout-F.png](wireframes/layout-F.png)

> Read [README.md](README.md), [component-catalog.md](component-catalog.md), and
> [conventions.md](conventions.md) first. You change **only** the JSX grid in
> `frontend/src/pages/MonitorPage.tsx`.

---

## Concept

The two heroes sit on a **diagonal**: IntensityDisplay anchors the **top-left**, Seismogram
anchors the **bottom-right**, both large and co-equal. The secondary cards fill the
**off-diagonal** cells (top-right and bottom-left), creating a dynamic, balanced composition
where the eye travels diagonally from Intensity down to the waveform.

## Box → component mapping (from the wireframe numbers)

| Box | Component | Region |
|-----|-----------|--------|
| 1 | **IntensityDisplay** (hero) | top-left, large |
| 2 | **Seismogram** (hero) | bottom-right, large (diagonally opposite box 1) |
| 3 | **ThresholdCard** | top-right, row 1 |
| 4 | **IntensityLegend** | top-right, row 2 (under Threshold) |
| 5 | **SummaryCard** | bottom-left, upper |
| 6 | **StatusCard + StorageCard** | bottom-left, lower (both in one cell) |

LogoCard: tuck the USHER mark subtly (see catalog) — no full slot.

## Structure guidance

```
┌───────────────────┬───────────────────┐
│                   │   3 Threshold     │
│ 1 IntensityDisplay├───────────────────┤
│     (hero)        │   4 Legend        │
├───────────────────┼───────────────────┤
│  5 Summary        │                   │
├───────────────────┤ 2 Seismogram      │
│ 6 Status+Storage  │     (hero)        │
└───────────────────┴───────────────────┘
```

- Think **2×2 macro-grid** where the two heroes take the top-left and bottom-right quadrants,
  and the other two quadrants are subdivided:
  - **Top-left:** IntensityDisplay (hero, reads first).
  - **Top-right:** a `flex flex-col` of ThresholdCard (top) + IntensityLegend (bottom).
  - **Bottom-left:** a `flex flex-col` of SummaryCard (top) + StatusCard+StorageCard (bottom).
  - **Bottom-right:** Seismogram (hero).
- Implement with `grid grid-cols-2 grid-rows-2` (or 12-col spans that emulate it). Keep the two
  heroes the **two largest** cells and clearly co-equal.
- Watch the bottom-left quadrant — it holds three cards (Summary, Status, Storage). Give
  Summary a bit more height; nest Status+Storage in a `flex flex-col` in the lower part.

## Acceptance
- Diagonal composition: IntensityDisplay top-left (first), Seismogram bottom-right, co-equal.
- Off-diagonal quadrants hold Threshold+Legend (top-right) and Summary+Status+Storage
  (bottom-left), none clipped.
- Fits 800×480 and desktop, no scroll. `npm run lint` clean. Props unchanged. `accelRef` intact.

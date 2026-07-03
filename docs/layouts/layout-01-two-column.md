# Layout 1 — Two-Column (Unequal Length)

- **Branch:** `feat/layout-1`
- **Worktree:** `../IDC-layout-worktrees/layout-1`
- **Dev port:** 3001
- **Wireframe:** [wireframes/layout-01.png](wireframes/layout-01.png)

> Read [README.md](README.md), [component-catalog.md](component-catalog.md), and
> [conventions.md](conventions.md) first. You change **only** the JSX grid in
> `frontend/src/pages/MonitorPage.tsx`.

---

## Concept

A wide **left column** carrying the two heroes stacked (IntensityDisplay on top, Seismogram
below), a **narrow middle strip** for the vertical intensity legend, and a **right column** of
stacked secondary cards. Columns are of unequal width — left is dominant.

The design brief calls this a "10×8 grid" feel — a fine-grained grid where the two heroes
own the left mass and everything else is compact on the right.

## Box → component mapping (from the wireframe numbers)

The wireframe boxes are numbered in reading order:

| Box | Component | Region |
|-----|-----------|--------|
| 1 | **IntensityDisplay** | left column, top (large) |
| 2 | **ThresholdCard** | right column, top |
| 3 | **IntensityLegend** | narrow middle strip (top half) |
| 4 | **SummaryCard** | right column, under ThresholdCard |
| 5 | **Seismogram** | left column, bottom (large) |
| 6 | **StatusCard** | right column, lower |
| 7 | *(gap)* | — |
| 8 | **StorageCard** | right column, bottom (small) |

LogoCard: tuck the USHER mark subtly (see catalog) — no full slot.

## Structure guidance

```
┌───────────────────────────┬──┬──────────────┐
│                           │  │  2 Threshold │
│      1 IntensityDisplay   │3 │──────────────│
│         (hero)            │Leg│  4 Summary   │
│                           │end│              │
├───────────────────────────┤  ├──────────────┤
│                           │  │  6 Status    │
│      5 Seismogram         │  │──────────────│
│         (hero)            │  │  8 Storage   │
└───────────────────────────┴──┴──────────────┘
```

- Left column: widest (e.g. `col-span-7`), a `flex flex-col` split ~50/50 between
  IntensityDisplay (top) and Seismogram (bottom) — the two heroes, equal weight.
- Middle strip: narrow (e.g. `col-span-1`) holding IntensityLegend rotated/stacked to fill the
  vertical space in the top half. If a vertical legend is awkward, it's acceptable to place the
  legend horizontally under IntensityDisplay instead — note the deviation.
- Right column: (e.g. `col-span-4`) a `flex flex-col gap-1.5` stack: ThresholdCard, SummaryCard,
  StatusCard, StorageCard. StorageCard smallest at the bottom.
- Tune the exact spans so nothing overflows at 800×480. The two left-column heroes should look
  clearly co-equal and dominant.

## Acceptance
- IntensityDisplay top-left and reads first; Seismogram directly below at equal size.
- Right column secondary cards all visible, none clipped.
- Fits 800×480 and desktop, no scroll. `npm run lint` clean. Props unchanged. `accelRef` intact.

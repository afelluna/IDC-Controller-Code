# Shared Conventions & Constraints

Rules every layout agent obeys. These exist so four parallel prototypes stay comparable and
mergeable, and so nobody breaks the live data pipeline while moving boxes around.

---

## Hard constraints (do not violate)

1. **One file.** Edit only `frontend/src/pages/MonitorPage.tsx` (the JSX grid). If you touch
   anything else, stop and reconsider — it almost certainly belongs in the grid wrapper instead.
2. **No behavior changes.** Hooks, effects, refs, derived values, and every card's props stay
   exactly as they are. You move components; you don't rewire them.
3. **No backend.** `lowrise_server_receiver/` is off-limits.
4. **Keep the ref.** `<Seismogram ref={accelRef} …>` must keep its ref, or the live chart dies.
5. **Fixed viewport, no scroll.** The dashboard is a kiosk. The root stays a full-screen,
   non-scrolling grid. Content fits; it never scrolls or clips.

---

## The layout container (baseline you're modifying)

The current root is:
```tsx
<div className="h-screen overflow-hidden p-1.5 flex flex-col"
     style={{ backgroundColor: 'var(--bg-base)' }}>
  <div className="flex-1 grid grid-cols-12 gap-1.5 min-h-0 w-full">
    {/* three columns: col-span-2 / col-span-6 / col-span-4 */}
  </div>
</div>
```
You keep the outer `h-screen overflow-hidden … flex flex-col` shell and the inner
`flex-1 … min-h-0 w-full` grid wrapper. **What you redesign is the column/row structure and
which cards go where** inside that grid.

### Grid tips
- It's a **12-column** Tailwind grid. Use `col-span-*` for widths and `grid-rows-*` +
  `row-span-*` (or nested flex columns) for heights.
- `min-h-0` on flex/grid children is essential — without it, tall cards refuse to shrink and
  cause overflow. Keep it on every column/row wrapper.
- For a card that must fill its cell, give it `h-full` / `flex-1` and let the card's own
  `overflow-hidden` clip internally.
- Gaps: keep `gap-1.5` (6px) for consistency with the current tight kiosk spacing.
- Nested structure is fine and encouraged: a grid cell can hold a `flex flex-col gap-1.5`
  stack of cards (that's how "StatusCard + StorageCard" pairs render).

---

## Sizing intent per card (recap)

| Card | Wants | Notes |
|------|-------|-------|
| IntensityDisplay | large, square-ish, **first** | hero #1 |
| Seismogram | large, **wide** | hero #2, co-equal weight |
| IntensityLegend | wide, short | the 1–10 colour bar |
| SummaryCard | tall column or 2×2 | 4 stat tiles |
| ThresholdCard | small/compact | 2 rows |
| StatusCard | small/medium | 4 rows |
| StorageCard | small | usually paired w/ StatusCard |
| LogoCard | minimal / tucked away | see catalog note |

---

## Styling system

- **Tailwind v4** (via `@tailwindcss/vite`, no config file). Use utility classes.
- **Colours come from CSS variables** defined in `frontend/src/index.css`
  (`--bg-base`, `--surface-card`, `--text-primary`, `--status-warn`, etc.). Reuse them via
  `style={{ … 'var(--…)' }}` — don't hardcode hex in the layout.
- Cards already carry their own surface/border/shadow. Don't re-wrap them in extra bordered
  boxes; just place them in grid cells.

---

## Verify & preview

- Dev server: `npm run dev -- --port <your port>` from `frontend/`, open
  `http://localhost:<port>/new-monitor/` (note the `/new-monitor/` base path).
- **Expected noise:** `Failed to initialize WebSocket` in the console is normal with no local
  backend. It is not a layout bug and not something to fix.
- Type-check: `npm run lint` (alias for `tsc --noEmit`) must pass.
- **Target resolutions to check:** the deploy target is a **7" RPi touchscreen at 800×480**.
  Verify your layout there (nothing clipped, all cards legible) and also at a normal desktop
  width. Use the preview tool's resize if available.

---

## Handoff checklist (paste into your final report)

- [ ] Branch: `feat/layout-<x>`
- [ ] Only `MonitorPage.tsx` changed (+ optional docs)
- [ ] `npm run lint` clean
- [ ] No card props changed; `accelRef` still attached
- [ ] Fits 800×480 with no scroll; fits desktop too
- [ ] Screenshot attached
- [ ] Deviations from wireframe (if any) + reasoning

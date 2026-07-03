# MonitorPage Layout Redesign — Agent Workspace

This folder is the **single source of truth** for the parallel layout-redesign effort.
Four alternative dashboard layouts are being prototyped **in parallel**, each in its own
git worktree, each driven by its own agent. Every agent reads this folder before touching code.

> **Goal of the redesign (from the design brief):**
> `IntensityDisplay` and `Seismogram` get **equal visual weight**. `IntensityDisplay` stays
> **first in reading order** (it is faster to interpret). Everything else recedes as clearly
> secondary. The screen must stay glanceable from across a room on the kiosk.

---

## The four layouts (the shortlist)

| Layout | Name | Spec file | Branch | Worktree | Dev port |
|--------|------|-----------|--------|----------|----------|
| **1** | Two-Column (unequal) | [layout-01-two-column.md](layout-01-two-column.md) | `feat/layout-1` | `../IDC-layout-worktrees/layout-1` | 3001 |
| **A** | Bento Grid | [layout-A-bento.md](layout-A-bento.md) | `feat/layout-a` | `../IDC-layout-worktrees/layout-a` | 3002 |
| **E** | Stacked Pair | [layout-E-stacked-pair.md](layout-E-stacked-pair.md) | `feat/layout-e` | `../IDC-layout-worktrees/layout-e` | 3003 |
| **F** | Diagonal Pair | [layout-F-diagonal-pair.md](layout-F-diagonal-pair.md) | `feat/layout-f` | `../IDC-layout-worktrees/layout-f` | 3004 |

Wireframes live in [`wireframes/`](wireframes/). The current production layout is
[`wireframes/current-design.png`](wireframes/current-design.png) — study it first so you know
the baseline you are replacing.

Supporting docs:
- **[component-catalog.md](component-catalog.md)** — every card, its props, its data source. **Read this.**
- **[conventions.md](conventions.md)** — the rules every layout must obey (what you may and may not change).

---

## The golden rule

**You are only changing _arrangement_, not _behavior_.**

All layouts are almost entirely edits to a single file:
`frontend/src/pages/MonitorPage.tsx` — specifically the JSX **inside the returned
`<div>` grid** (the `grid grid-cols-12 …` block).

You **must not** change:
- Any hook (`useSeismicData`, `useWebSocket`, `useSeismicMetrics`).
- Any data wiring — the props passed to each card must stay identical.
- Any backend file (`lowrise_server_receiver/`).
- Any card's internal implementation — unless the layout spec explicitly calls for a
  small presentational tweak, and even then keep it minimal and note it in your PR.

If a card needs a genuinely different internal size/shape to fit a layout, prefer solving it
with the **wrapper grid/flex classes in MonitorPage**, not by editing the card. If you truly
must edit a card, copy it or guard the change so the other three layouts are unaffected — but
default to _not_ doing this.

---

## Worktree workflow (per agent)

Each agent works in an **isolated git worktree** on its **own branch**, all branched from `dev`.
Worktrees share the same `.git` but have independent working files, so four agents can edit
`MonitorPage.tsx` simultaneously with zero conflicts until merge time.

### One-time setup (already done by the coordinator — see the plan at the bottom)
```bash
# from the main repo: C:\luna_IT\Development\USHER\IDC Controller Code
git worktree add ../IDC-layout-worktrees/layout-1 -b feat/layout-1 dev
git worktree add ../IDC-layout-worktrees/layout-a -b feat/layout-a dev
git worktree add ../IDC-layout-worktrees/layout-e -b feat/layout-e dev
git worktree add ../IDC-layout-worktrees/layout-f -b feat/layout-f dev
```

### Per-agent bootstrap (run once inside your worktree)
`node_modules/` is **not** shared across worktrees (it's gitignored), so install deps once:
```bash
cd ../IDC-layout-worktrees/layout-1   # your worktree
cd frontend && npm install
```
`.env` **is** tracked, so it travels with the worktree — no config needed.

### Run your preview on your assigned port
```bash
cd frontend
npm run dev -- --port 3001            # use YOUR port from the table above
# open http://localhost:3001/new-monitor/
```
Distinct ports mean all four previews can run at once for side-by-side comparison.

---

## What "done" looks like (Definition of Done)

1. `MonitorPage.tsx` renders your assigned layout, matching the wireframe's **arrangement and
   relative sizing** (not pixel-perfect — faithful proportions).
2. Every card still receives its correct live props (see [component-catalog.md](component-catalog.md)).
3. `npm run lint` (which is `tsc --noEmit`) passes clean.
4. The layout **fits the kiosk viewport with no scrolling** — the dashboard is a fixed,
   full-screen `h-screen` grid. Nothing clips or overflows. Verify at the deploy target
   **800×480** _and_ at a typical desktop size.
5. No backend, hook, or data-wiring changes (per the golden rule).
6. Commit on your branch with a clear message; do **not** merge to `dev` yourself — the
   coordinator reviews all four side-by-side and decides.

### Verify before you call it done
Use the preview tooling (or the browser) to confirm:
- No console errors beyond the expected `Failed to initialize WebSocket` (that just means no
  backend is running locally — it is **not** your bug).
- All cards visible, none clipped, IntensityDisplay reads first, Seismogram is co-equal hero.
- Take a screenshot and include it in your handoff.

---

## Commit / branch conventions

- Stay on your branch (`feat/layout-<x>`). Never commit to `dev` or `main`.
- Commit message style: `feat(layout-<x>): <what changed>`.
- Keep the diff scoped to `MonitorPage.tsx` (+ this docs folder if you improve a spec).
- When finished, report: branch name, a screenshot, and any deviations from the wireframe
  with your reasoning.

---

## Coordinator's worktree plan (reference)

The parallel run is structured as:

1. **Baseline commit** — this docs folder + the four spec files are committed to `dev` and
   pushed to both remotes (`origin`, `idc`) so every worktree branches from a `dev` that
   already contains the docs.
2. **Create 4 worktrees** off `dev`, one per layout (commands above).
3. **Launch 4 agents in parallel**, one per worktree, each given: its spec file, this README,
   and the component catalog. Each agent owns exactly one layout.
4. **Review** — all four previews run simultaneously (ports 3001–3004) for side-by-side
   comparison. The coordinator (you, the human) picks the winner(s) to merge into `dev`.
5. **Cleanup** — `git worktree remove ../IDC-layout-worktrees/layout-<x>` for the ones not kept.

Nothing merges to `dev` automatically; the whole point is to compare finished prototypes.

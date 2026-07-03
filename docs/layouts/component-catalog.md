# Component Catalog — MonitorPage building blocks

Every card the layouts arrange, with its import path, props, and **the exact live values it
must receive**. When you rearrange the grid, keep these props wired identically. Copy the
prop expressions verbatim from the current `MonitorPage.tsx` — do not re-derive them.

All components live under `frontend/src/components/`. Source of truth for wiring is the
current `frontend/src/pages/MonitorPage.tsx`.

---

## The cards

### `IntensityDisplay` — **HERO #1** (reads first)
- Import: `../components/cards/IntensityDisplay`
- Props:
  ```tsx
  <IntensityDisplay
    intensity={displayIntensity}
    acceleration={currentData?.acceleration}
    rawX={currentData?.raw?.x}
    rawY={currentData?.raw?.y}
    rawZ={currentData?.raw?.z}
    warningLevel={warningLevel}
    alertLevel={alertLevel}
  />
  ```
- The big PEIS shield + level number + "SCARCELY PERCEPTIBLE" band. Needs the **most**
  space and must be the first thing the eye lands on. Roughly square-to-tall works best.

### `Seismogram` — **HERO #2** (co-equal weight)
- Import: `../components/cards/Seismogram` (also exports `type SeismogramHandle`)
- Uses a **ref** for direct canvas push — the ref must stay wired:
  ```tsx
  const accelRef = useRef<SeismogramHandle>(null);
  ...
  <Seismogram ref={accelRef} livePoint={currentData} isLive={connected} />
  ```
- The live accelerograph (X/Y/Z traces). Benefits from **width** (it's a time-series).
  Give it comparable visual weight to IntensityDisplay.

### `IntensityLegend`
- Import: `../components/cards/IntensityLegend`
- Props: `<IntensityLegend currentLevel={displayIntensity} />`
- The horizontal 1–10 PEIS colour scale. Naturally **wide and short**. Often pairs directly
  under or beside IntensityDisplay.

### `ThresholdCard` ("Alert Thresholds")
- Import: `../components/cards/ThresholdCard`
- Props: **none** — self-fetches config. `<ThresholdCard />`
- Compact. Shows Warrant 1 / Warrant 2 PEIS levels. (The old Threshold-g row and the alert
  popup were removed — do not reintroduce them.)

### `SummaryCard`
- Import: `../components/cards/SummaryCard`
- Props:
  ```tsx
  <SummaryCard
    peakAccel={peakAccel}
    noOfEvents={noOfEvents}
    dominantFreq={dominantFreq}
    maxDisp={maxDisp}
  />
  ```
- Four stat tiles (Peak Accel, No. of Events, Dominant Freq, Max Displacement). Stacks
  vertically by default; can be a compact column or a 2×2 depending on layout.

### `StatusCard`
- Import: `../components/cards/StatusCard`
- Props: `<StatusCard status={statusData} isLive={connected} />`
- `statusData` is the array already built in MonitorPage (Connection / Node / Server /
  Last update rows). Keep it as-is.

### `StorageCard`
- Import: `../components/cards/StorageCard`
- Props: `<StorageCard usedGb={storageUsed} totalGb={storageTotal} />`
- Disk usage bar. Small. Frequently paired with StatusCard ("StatusCard + StorageCard" in
  the wireframes means: put these two together in one region, stacked).

### `LogoCard` — branding (NOTE)
- Import: `../components/cards/LogoCard`
- Props: none.
- **The four new wireframes do not show a dedicated LogoCard box.** In the current design it
  occupies a full slot in the left column. For the redesigns, do **not** give branding a full
  hero-sized slot. Options, in order of preference:
  1. Tuck it into a small corner / header strip of your layout, **or**
  2. Fold the USHER mark into the top of an existing card region, **or**
  3. Keep a small LogoCard only if your grid has a genuinely spare small cell.

  The USHER branding must remain **visible somewhere**, just not dominant. Pick the option
  that best fits your wireframe and note your choice in your handoff.

---

## Values available in MonitorPage (already computed — just reference them)

These are all already defined in the current `MonitorPage.tsx`. You do not create or change
them; you only pass them to cards as you rearrange:

| Value | What it is |
|-------|-----------|
| `displayIntensity` | peak-held PEIS level (number) for IntensityDisplay & IntensityLegend |
| `currentData` | latest seismic packet (`SeismicDataResponse \| null`) |
| `peakAccel`, `dominantFreq`, `maxDisp` | derived metrics from `useSeismicMetrics` |
| `noOfEvents` | `totalEvents` from `useSeismicData` |
| `warningLevel`, `alertLevel` | config thresholds for IntensityDisplay escalation |
| `connected` | websocket live flag (boolean) |
| `statusData` | the pre-built status-row array for StatusCard |
| `storageUsed`, `storageTotal` | GB numbers for StorageCard |
| `accelRef` | the `SeismogramHandle` ref — **must** stay attached to `<Seismogram>` |

**Do not remove or rename any of these.** The block above the `return (` in MonitorPage —
hooks, effects, refs, derived values — stays untouched. You edit only the JSX layout.

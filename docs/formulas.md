# USHER Frontend — Formulas & PEIS Lookup Reference

---

## 1. PEIS Level from Peak Acceleration

**Source:** `frontend/src/hooks/useWebSocket.ts` → `peisFromAccel()`

Computed once per incoming socket batch (125 samples). The sensor hardcodes `intensity = 2` in every packet, so PEIS is always re-derived client-side from the raw accelerometer data.

```
peakAccel = max( √(x² + y² + z²) ) over all samples in the batch

PEIS = f(peakAccel)   [see lookup table below]
```

---

## 2. PEIS Lookup Table

**Source:** `frontend/src/constants/index.ts` → `INTENSITY_SCALE`

| PEIS Level | Peak Acceleration (m/s²) | Label | Color |
|:---:|---|---|---|
| 1 | < 0.0017 | Scarcely Perceptible | `#ffffff` |
| 2 | 0.0017 – 0.005 | Slightly Felt | `#bfccff` |
| 3 | 0.005 – 0.014 | Weak | `#a0e6ff` |
| 4 | 0.014 – 0.039 | Moderately Strong | `#80ffff` |
| 5 | 0.039 – 0.092 | Strong | `#7aff93` |
| 6 | 0.092 – 0.18 | Very Strong | `#ffff00` |
| 7 | 0.18 – 0.34 | Destructive | `#ffc800` |
| 8 | 0.34 – 0.65 | Very Destructive | `#ff9100` |
| 9 | 0.65 – 1.24 | Devastating | `#ff0000` |
| 10 | ≥ 1.24 | Completely Devastating | `#c80000` |

Thresholds are **lower-inclusive** (e.g. 0.0017 → PEIS 2, not PEIS 1).

---

## 3. Acceleration Magnitude (per sample)

**Source:** `frontend/src/lib/seismicMetrics.ts` → `peakAcceleration()`

```
|a| = √(x² + y² + z²)   [m/s²]
```

Used in both the per-batch PEIS computation (`useWebSocket`) and the rolling 60-second peak buffer (`useSeismicMetrics`).

---

## 4. Peak Ground Acceleration (PGA) — Rolling 60-second Buffer

**Source:** `frontend/src/hooks/useSeismicMetrics.ts`

```
PGA = max( |a|ᵢ )   for all samples in the last 60 seconds
```

Buffer is trimmed on every new sample. Recomputed at most every **500 ms** (throttled). Displayed in `IntensityDisplay` labelled **"Peak Ground Acceleration (PGA)"** in units of **g** (displayed value = m/s², labelled as g — raw sensor output).

---

## 5. Sample Rate Estimation

**Source:** `frontend/src/lib/seismicMetrics.ts` → `estimateSampleRate()`

```
Δtᵢ = tᵢ - tᵢ₋₁   for i = 1 … N-1

medianΔt = median( Δt₁ … Δt_{N-1} )

sampleRate = 1 / medianΔt   [Hz]
```

Uses **median** (not mean) to be robust against dropped packets or irregular bursts. Returns `null` if fewer than 2 samples or `medianΔt ≤ 0`.

---

## 6. Dominant Frequency (FFT)

**Source:** `frontend/src/lib/seismicMetrics.ts` → `dominantFrequency()`

Approximate — displayed with `~` prefix in the UI.

```
Input:  magnitudes[] = |aᵢ| for the rolling buffer
        n = largest power-of-2 ≤ buffer length  (minimum 32)

1. Apply Hann window:
   w[i] = 0.5 × (1 − cos(2π·i / (n−1)))
   x[i] = magnitudes[end−n+i] × w[i]

2. Radix-2 Cooley-Tukey FFT (in-place):
   twiddle angle per stage: ω = −2π / len
   W = cos(ω) + j·sin(ω)

3. Power spectrum (skip DC bin 0):
   P[k] = Re[k]² + Im[k]²   for k = 1 … n/2−1

4. Peak bin:
   k_peak = argmax( P[k] )

5. Frequency:
   f_dominant = k_peak × sampleRate / n   [Hz]
```

Returns `null` if `sampleRate < 1 Hz` or buffer has fewer than 32 samples.

---

## 7. Max Displacement (Double Integration)

**Source:** `frontend/src/lib/seismicMetrics.ts` → `maxDisplacement()`

Approximate — displayed with `~` prefix in the UI. Subject to MEMS sensor noise and integration drift.

```
dt = 1 / sampleRate

── High-pass IIR (fc ≈ 0.1 Hz, removes DC drift) ──────────────
rc    = 1 / (2π × 0.1)
α     = rc / (rc + dt)
y[i]  = α × (y[i−1] + x[i] − x[i−1])     (x = raw magnitude)

── 1st integration: acceleration → velocity ────────────────────
v[i] = v[i−1] + y[i] × dt

── 2nd integration: velocity → displacement ────────────────────
d[i] = d[i−1] + v[i] × dt

── Result ──────────────────────────────────────────────────────
maxDisplacement = max( |d[i]| )   [m]
```

---

## 8. Alert Popup Hysteresis (Threshold Alert)

**Source:** `frontend/src/hooks/useThresholdAlert.ts`

Controls when the kiosk earthquake popup appears and clears. Levels are read from `/getSensorConfig` (`warrant` = Alert Level, `warning` = Warning Level in `/admin`).

```
warrant     = configured alert level  (default: 6 if unset)
warning     = configured warning level
clearLevel  = warning  if  0 < warning < warrant
            = warrant  otherwise

SHOW popup  when  intensity ≥ warrant  (rising edge, outside cooldown)
HOLD popup  while intensity ≥ clearLevel
START linger timer (15 s) when intensity < clearLevel
HIDE popup  after linger timer expires
            OR after max visible time (90 s)
            OR on manual dismiss (only after 6 s minimum visible)

Cooldown after hide: 8 s  (prevents flapping)
```

---

## 9. Display Formatting

**Source:** `frontend/src/components/cards/IntensityDisplay.tsx`

| Field | Formula |
|---|---|
| PGA display | `acceleration.toFixed(5) g` |
| Axis values | `±x.toFixed(5)` (sign always shown) |
| Timestamp | `Asia/Manila` timezone, `DD MMM YYYY HH:mm:ss PHT` |

# LInOG explainer — scene guide (contract for act authors)

A 60.0 s, 1920×1080, 60 fps motion explainer for **Project LInOG** (Leveraging InSAR for Observation
and Modeling of Earthquake Generators), UP Diliman NIGS — Earthquake Geodesy and Geology (EGG) Laboratory.
120 BPM: 1 beat = 0.5 s, 1 bar = 2.0 s, 30 bars. Everything is drawn on one `<canvas>` by
`window.seek(t)`; the result must be a pure function of `t`.

```
explainer/
  index.dev.html        dev page (loads src/ files; served over http by tools/snap.js)
  build.js              → dist/linog_explainer.html (single standalone file, fonts embedded)
  render.js             Playwright + FFmpeg renderer (self-test, WAV, MP4)
  tools/snap.js         render chosen times to PNG + contact sheet + QA   ← use this to self-test
  src/core.js           math, springs, beat grid, palette/colormaps, text + reveals, cards, camera, TL, HUD
  src/geo.js            Natural Earth coastlines, map views, globe, places, fault trace, ALOS footprints, DEM
  src/assets.js         ALOS-1 vector, radar beam, SAR speckle textures, raster painting, 3D persp, EGG emblem
  src/audio.js          soundtrack (do not edit)
  src/main.js           runtime: seek(), handoffs, HUD, preview player (do not edit)
  src/scenes/actN.js    ← one file per act. Act authors edit ONLY their own file.
```

## 1. Scene contract

```js
(function () {
  'use strict';
  const L = window.LINOG, C = L.C;
  L.scene({
    id: 'act3', t0: 18, t1: 30,          // fixed — see the timeline
    focus: [960, 540],                   // optional camera push focus (constant per act)
    init() {},                           // optional: warm pure caches (called once after fonts load)
    tl(env) { return {/* TL state, SCREEN space */}; },   // pure; also called by the runtime at lt = dur to measure the hand-off
    draw(ctx, env) {/* world layer; ctx already has the camera transform applied */},
    overlay(ctx, env) {},                // optional: screen-space layer drawn after the TL (no camera)
  });
})();
```

`env`: `t` (global s), `lt` (local s from t0), `dur`, `t0`, `t1`, `cam` (`z`, `toScreen(x,y)`, `toWorld(x,y)`),
`handoff` (TL state measured from the previous act's `tl()` at its end — `null` for act 1), `beat` (`{i, f, bar, inBar, barF}`),
`pulse` (1 on each quarter note, decaying), `tl` (this frame's TL state), `drawTL()` (draw the TL now, for z-order;
otherwise the runtime draws it after `draw`).

**Camera**: applied automatically. Within an act the zoom is continuous and pushes ×1.04 across every
storyboard section (1.00 → 1.04 → 1.0816 …); it re-enters at 1.00 at each act boundary (the match cut).
Never fight it with your own global zoom jumps. In-scene world moves (map zooms, pans) are fine — drive them with springs.
`draw()` coordinates are world coordinates; to place the TL on something you drew, convert with `env.cam.toScreen(x, y)`
and multiply sizes by `env.cam.z`.

## 2. Helpers (all on `LINOG`, abbreviated `L`)

| helper | use |
|---|---|
| `L.sp(lt, at, dur)` | spring 0→1 starting at `at`, settling in `dur` (ζ = 0.82, ~1 % overshoot). **Default easing for everything.** |
| `L.inout(lt, a, b, inDur, outDur)` | 0..1 envelope that springs in at `a` and springs out ending exactly at `b`; 0 outside. |
| `L.steps(lt, step=0.5, dur=0.3)` | staircase that advances one integer per beat with a spring — beat-locked micro motion. |
| `L.pulse(t)` / `env.pulse` | quarter-note pulse (1 on the beat → decays). Use for glows, ticks, blinks. |
| `L.clamp, lerp, invLerp, remap, smooth, ease.*` | math. Prefer springs; `ease.inOutSine` is fine for continuous drifts. |
| `L.rng(seed)`, `L.hash2(i,j,seed)`, `L.hash1(i,seed)`, `L.noise2`, `L.fbm` | deterministic randomness. **Never `Math.random`, `Date`, `performance.now`.** |
| `L.text(ctx, str, x, y, o)` | all text. `o`: `kind` ('display' Space Grotesk / 'sans' Inter / 'mono' JetBrains Mono), `size`, `weight` (400/500/600/700), `color`, `align`, `baseline` ('alphabetic'/'top'/'middle'), `tracking` (em), `p` (reveal 0..1; reverse it to exit), `mode` ('scan' interlaced scanlines [default] / 'wipe' / 'type' / 'fade'), `alpha`, `bg` (colour behind the text, for the contrast check), `role` ('deco' = exempt from QA), `id`. `str` may be segments `[{s, color, weight}]`. Returns the local bbox. |
| `L.textLines(ctx, lines, x, y, o)` | multi-line with staggered reveal; `o.lh` line height. |
| `L.measure(ctx, str, o)` | width/ascent without drawing. |
| `L.card(ctx, x, y, w, h, o)` | UI surface `#161F30` + cyan hairline, constructs top→bottom along scanlines. `o.p`, `o.accent`. Text on a card: pass `bg: C.card`. |
| `L.ink(color, bg)` | lightens an accent until it passes 4.6:1 contrast — use for small accent-coloured text (purple and blue fail at small sizes). |
| `L.glow(ctx, x, y, r, color, a)` | additive radial glow (cheap; no shadowBlur). |
| `L.poly(ctx, pts, close)`, `L.polyPartial(ctx, pts, p)` | polylines; partial = draw-on along length. |
| `L.fringeRGB(phase)`, `L.velRGB(v, vmax)`, `L.cohRGB(c)`, `L.demRGB(h)`, `L.LUT.{fringe,vel,coh,dem}` | colormaps (RGB arrays / 256×3 LUTs). Fringe is the brand cycle cyan → gold → magenta → cyan per 2π. Velocity: negative (away from satellite / subsidence) = crimson, 0 = slate, positive = blue → cyan. |
| `L.rasterCanvas(key, w, h)`, `L.paintField(key, w, h, field, lut, map, alpha)` | per-frame raster painting into pooled canvases. |
| `L.sarImage(w, h, {seed, scale, looks, water})` | cached speckled SAR amplitude image (looks > 1 = multilooked, less speckle). |
| `L.persp({yaw, pitch, dist, f, cx, cy})` | returns `project(x, y, z) → [sx, sy, depth, scale]` for 3D meshes (z up). |
| `L.drawALOS(ctx, {x, y, s, rot, p, t})`, `L.ALOS_ANTENNA`, `L.drawBeam(ctx, x0, y0, x1, y1, hw, {p, t})` | ALOS-1 vector (s = 1 ≈ 360 px wide; `p` builds it part by part) and a radar beam with beat-locked wavefronts. |
| `L.drawEGG(ctx, {x, y, r, p, t, ringsOnly})` | **placeholder** EGG Lab emblem (egg-shaped geoid, fault offset, two orbital rings). |
| `L.geo.view({lon, lat, ppd, cx, cy})` | map projection: `.pt(lon, lat)`, `.x(lon)`, `.y(lat)`, `.inv(x, y)`, `.km(km)` → px, `.apply(ctx)`. `ppd` = px per degree latitude. |
| `L.geo.drawLand(ctx, view, {which:'ph'|'luzon'|'region', fill, stroke, lw})`, `L.geo.clipLand(ctx, view)`, `L.geo.graticule(...)` | real coastlines (Natural Earth 10 m). |
| `L.geo.drawGlobe(ctx, {cx, cy, r, lon0, lat0, p, highlight})`, `L.geo.ortho(lon, lat, g)` | orthographic globe with the Philippines highlighted. |
| `L.geo.places.{cabanatuan, manila, baguio, laTrinidad, dagupan, sanJose, gabaldon, tarlac, baler, dingalan}` | `{lon, lat, name}`. |
| `L.geo.faults.pfz` | schematic Philippine Fault Zone trace through central Luzon (lon/lat list). Label it "Philippine Fault Zone (schematic)". |
| `L.geo.footprint(path, lat0, lat1)`, `L.geo.frameLats[280..320]` | ALOS ascending path footprints (447, 448, 449) — schematic. |
| `L.geo.land(lon, lat)`, `L.geo.height(lon, lat)`, `L.geo.grid(lon0, lon1, lat0, lat1, nx, ny)`, `L.geo.hillshade(g, i, j, zf)` | land mask, schematic DEM (m), cached height grids, hillshade. |
| `L.TL.*` | the through-line (below). |

Palette `L.C`: `bg #0B111E`, `card #161F30`, `cardBorder rgba(0,229,255,.15)`, `cyan #00E5FF`, `gold #FFD166`,
`magenta #FF4081`, `amber #F59E0B` (Phase 1), `blue #3B82F6` (ISCE2 core: Phases 2–4), `purple #8B5CF6` (MintPy, Phase 5),
`emerald #10B981` (geocoding/deliverables, Phase 6), `crimson #EF4444` (active subsidence / anomaly), `text #E6F1FF`, `textDim #9FB0C8`.
No other hues except inside data colormaps.

## 3. The through-line: "The Radar Phase Wave"

One luminous object tracked for all 60 s; every act boundary is a physical morph / match cut of it.
State (screen space): `{x, y, size, rot, form, to, k, phase, amp, energy, alpha, tint, cycles, seed, aspect}`.
Forms (closed loops; morphs are point-wise, so `pulse → anything` "opens" the wave into a loop):

| form | look |
|---|---|
| `pulse` | L-band wave packet (`amp`, `cycles` default 3.5, `phase` scrolls it) |
| `pixel` | square SLC pixel with a gold complex phasor inside (`phase` rotates it) |
| `node` | network node: dot + ring + beat ripple |
| `fringe` | interferometric rainbow loop (brand fringe cycle around the ring, `phase` rotates colours) |
| `contour` | irregular crimson subsidence contour (`seed`) |
| `ring` | orbital ellipse (`aspect`, `rot`) with a satellite dot — the logo rings |

Morph: `{form: 'pulse', to: 'pixel', k: 0..1}`. `L.TL.blend(handoff, target, k)` returns a state that is exactly
`handoff` at `k = 0` and exactly `target` at `k = 1` (position, size, form). `L.TL.draw` handles glows.

### Hand-off table (the only coupling between acts)

| cut | outgoing act must END (at lt = dur) with | incoming act must START (lt = 0) with |
|---|---|---|
| 10.0 s | act1: **pure `pulse`**, size 50–150, rot 0 | act2: `L.TL.blend(env.handoff, target, k)` with k = 0 at lt = 0 |
| 18.0 s | act2: **pure `node`**, size 40–110 | act3: same pattern |
| 30.0 s | act3: **pure `fringe`**, size 60–150 | act4 |
| 42.0 s | act4: **pure `pixel`**, size 36–120 | act5 |
| 52.0 s | act5: **pure `contour`**, size 60–160 | act6 |
| 60.0 s | act6 ends on the logo `ring` | — |

Hand off near the size the TL has inside your act (no inflate-then-deflate pump across the cut); an incoming act holds
the hand-off size for at least one beat before resizing. The runtime (main.js) automatically (a) carries the TL's phase
and phase velocity through each cut over the first 1.0 s, and (b) flares the TL and sheds one hairline shock ring in the
first 0.75 s after each cut, in sync with the soundtrack's act impacts — don't add your own cut flash.

**TL motion limits**: peak speed ≲ 1,500 px/s; moves longer than ~400 px take ≥ 0.8 s and preferably follow an arc or ride a
visible data link (leader line, beam, edge); no ping-pong between distant targets; big moves start on a bar or beat.

At every cut the TL centre must be inside x ∈ [560, 1360], y ∈ [380, 720], `alpha` ≥ 0.9, `rot` = 0 (act 6 may tilt).
Positions are **measured at runtime** from your `tl()`, never hard-coded by the next act — so make `tl()` the single
source of truth: compute layout in a pure helper, call it from both `tl()` and `draw()`.
The TL must be visible for the whole act (`alpha` ≥ 0.5, `size` ≥ 24 px) — it can shrink into a node/pixel inside a
visualisation, but it never disappears.

## 4. Hard rules (QA checks most of these automatically)

1. **Determinism**: output depends only on `t`. No `Math.random`, `Date`, `performance.now`, timers, CSS animation,
   or state carried between frames. Caches are fine only if they are pure functions of their keys.
2. **Motion**: springs (ζ 0.82) for every entrance/exit/state change; no bouncy/elastic easing.
   **Major state changes start on whole bars** (t0 + 2k s); micro-movements lock to quarter notes (0.5 s).
   **Zero pop-ins**: everything unfolds, unmasks or constructs along scanlines (text `mode:'scan'`, cards, `polyPartial`,
   clip-wipes). **No static holds > 1.0 s**: something meaningful always moves (beat ticks, scrolling phase, drifting data).
   No particle confetti, no lens flares.
3. **Act edges**: build from the TL in the first 1–2 beats; in the final 1–2 beats every element except the TL
   collapses/unmasks away (reverse reveals, contract into the TL). At lt = dur only the TL (and background/HUD) remains.
   Inside an act, section changes are also transitions (outgoing elements unmask while incoming ones construct).
4. **Layout**: title-safe x 96–1824, y 54–1026. **10–52 s the global HUD owns y < 132 and y > 958** (phase header
   top-left, wordmark top-right, 6-phase tracker at the bottom): keep all scene content inside x 96–1824, y 132–958.
   No overlapping text boxes. Contrast ≥ 4.5:1 below 24 px, ≥ 3:1 at 24 px+ (pass `bg` when text sits on a card;
   put labels over rasters/maps on a card or backplate and pass its colour).
5. **Typography** — one system across all acts:

   | role | style |
   |---|---|
   | hero number | display 700, 64–96 px, phase ink (`L.ink(phase colour)`) or crimson for subsidence; counters never zero-pad and their FINAL value holds ≥ 1.5 s |
   | section title | display 700, 40 px, sentence case, top-left of the content column (x ≈ 150, y ≈ 190) |
   | card header | mono 600, 18 px, tracking 0.12, UPPERCASE, `L.ink(phase colour)` |
   | caption / body | sans 500, 22–26 px, `C.text` or `C.textDim` |
   | parameter annotation | mono 400, 18–20 px |
   | map label | mono 19 px on a backplate (pass `bg`) |
   | footnote / caveat | mono 18 px `C.textDim` — real content, never `role:'deco'` |
   | tick labels only | 15–16 px, `role:'deco'` |

   Conventions: "≈ 90 m" (≈ + space), units cm/yr · km² · m · MHz, separator " · ", institution "UPD NIGS".
   Keep copy short: a viewer gets ~2–4 s per idea. Every readable string stays fully revealed ≥ 1.5 s.
   **Colour semantics (all acts)**: FBS = amber, FBD = blue; Philippine Fault Zone = gold dashed line + `L.ink(C.gold)` label
   with "(schematic)" in `textDim`; away-from-satellite / subsidence = crimson; every velocity map carries "schematic".
6. **Rasters**: generate at ≥ their on-screen size (account for camera zoom up to ~1.13) — no blurry upscaling.
   Intentionally pixelated rasters (e.g. showing 90 m pixels) use `imageSmoothingEnabled = false` so pixels stay crisp.
   Cache static rasters; repaint animated ones at native size with LUTs.
7. **Performance** (QA measures draw + rasterisation): average ≤ 60 ms/frame, max ≤ 150 ms (after `init`). No `shadowBlur`, no `ctx.filter`
   in per-frame paths, avoid per-frame per-pixel `fbm` over large areas (precompute fields in `init`/caches).
8. **Honesty**: numbers come from the fact sheet below. Illustrative graphics (DEM, fringes, networks, maps of
   velocity) are schematic — fine, but never present invented numbers as results.

## 5. Fact sheet (source: LInOG Year-2 semi-annual report + felix archive listing)

- Sensor: **ALOS-1 PALSAR**, **L-band, λ = 23.6 cm**, Level 1.1 SLC, ascending paths **447, 448, 449**; observation span **2007–2011**.
- Raw archive (felix server): **779 PALSAR Level 1.1 archives, ~1.04 TB** (+ NAMRIA IfSAR DTM tiles and SRTM DEM tiles).
- **FBS** = Fine Beam Single (HH, **28 MHz**). **FBD** = Fine Beam Dual (HH + HV, **14 MHz**).
  Pipeline v4.0: FBS is **band-limited to the common 14 MHz bandwidth at its native range sampling** (it stays on the
  **4.68 m** slant-range grid — say "band-limit", not "downsample"); during coregistration the FBD dates are
  **resampled onto the range grid of an FBS reference date**; all dates merge into one stack.
- DEM: **NAMRIA IfSAR** (+ SRTM) for coregistration, geocoding and topographic phase removal.
- Network: temporal baseline **≤ 730 days**, perpendicular baseline **≤ 1,500 m**.
  Example frame P448 F0290: **24 dates staged / 21 used, 149 interferograms formed / 129 inverted**, coregistration reference **2009-02-08** (an FBS date).
- Processing: **ISCE2** (coregistration, interferograms), **SNAPHU** (unwrapping), **MintPy** SBAS (time series).
- Multilook: **28 azimuth × 12 range looks**. 12 × 4.68 m = **56 m slant range → ~86–93 m on the ground** at 37–41° incidence;
  28 azimuth looks ≈ **90 m** → **~90 m × 90 m** square pixels, matching the **1/1200° (~90 m)** geocoded grid.
  (6 range looks would give 45 m × 90 m; 12 looks double the independent looks, √2 less phase noise.)
- QC: interferogram **report grids** (visual inspection) + **23 automated quality gates (G1–G23)** that stop processing on failure.
  **1,779 interferograms formed → 1,634 inverted** across 12 frames (some removed for uncorrected ionospheric signals).
- Time series: **12 frames**, **304 frame-dates staged / 265 used** (frame-dates: an acquisition counts once per frame it covers —
  never write "265 dates"), **1,634 interferograms** inverted (122–166 per frame; per-frame inversions — do not say "simultaneously").
  Per-frame (Table 3 order P447 F0300, F0310, P448 F0280–F0320, P449 F0280–F0320): inverted interferograms 152, 148, 132, 129, 144, 122, 123, 123, 166, 148, 124, 123;
  frame-dates used 24, 24, 22, 21, 23, 21, 22, 19, 24, 23, 21, 21.
  P448 F0290 on screen: act 2 = "24 dates · 149 pairs formed"; act 4 = "21 of 24 dates · 129 of 149 interferograms inverted".
  Corrections: **demErr** (DEM-error / residual topography correction) and **demErr_ramp** (additionally removes residual orbital ramps — "deramping").
  No atmospheric correction applied yet.
- Masks: **temporal coherence ≥ 0.7**, **water mask**, **swath-edge mask**. Low coherence in vegetated mountains
  (Sierra Madre, Cordillera Central); good coherence on the Central Luzon Valley plains.
  Valid area **27,893 km²** (target **25,000 km²**); ~3,910 km² seen by ≥ 2 frames.
- Geocoding to a **1/1200° (~90 m)** lattice. Deliverables: **16 GIS-ready products per frame** (LOS velocity, vertical and
  horizontal (E–W) projections as GeoTIFF / KMZ / hillshade PNG, for demErr and demErr_ramp), checked by a **27-check script** before transfer.
  Vertical = LOS / cos θ; horizontal = LOS / sin θ (end-member assumptions; θ ≈ 38°).
- **Cabanatuan City** (P448 F0290 and P449 F0290 — two independent adjacent ascending tracks): subsidence bowl ~**5 km** across;
  deepest points of the two tracks within 0.1 km.
  P448: LOS 3.7 ± 0.4 cm/yr, θ 37.0°, **vertical 4.7 ± 0.5 cm/yr, ≈ 19 cm** cumulative 2007–2011.
  P449: LOS 3.3 ± 0.4 cm/yr, θ 40.4°, **vertical 4.4 ± 0.5 cm/yr, ≈ 18 cm**.
  → "**−4.4 to −4.7 cm/yr** vertical (assumes purely vertical motion), **~18–19 cm** in 2007–2011".
  Independent check: **CABN GNSS station 4.7 ± 0.4 cm/yr** vertical (consistent).
  InSAR rates are relative to nearby stable ground, single sensor, no tropospheric/ionospheric correction yet;
  the two tracks are independent measurements (say "measured on two adjacent ascending tracks", not "cross-validated").
  Cause: consistent with land subsidence commonly associated with groundwater extraction (under investigation).
  Dagupan City / lower Pampanga: possible subsidence seen on one track only — don't feature it as a result.
- Philippine Fault: no obvious velocity gradient across the fault traces yet (signal near ALOS noise, no atmospheric correction,
  single geometry). **Never imply the fault causes the Cabanatuan subsidence** or that fault creep was measured.
- Institutions: implementing agency **UP Diliman – National Institute of Geological Sciences (UPD NIGS)**;
  funded by **DOST-PCIEERD**; supporting **DOST-PHIVOLCS & PhilSA**. Lab: **Earthquake Geodesy and Geology (EGG) Laboratory**.

## 6. Storyboard (times are global; bars 1-based)

**Act 1 · 0–10 s · The hook & mission** (no HUD)
- Bars 1–2 (0–4): dark slate. Kinetic type **"THE EARTH NEVER STOPS MOVING."** building word by word on quarter notes.
  The TL (cyan L-band pulse) cuts through the text horizontally — the type splits along the wave — with a mono
  annotation "L-BAND · λ = 23.6 cm" and a wavelength bracket.
- Bars 3–5 (4–10): camera pulls out to low Earth orbit (globe with the Philippines highlighted). ALOS-1 sweeps
  north along an ascending pass over Luzon, pulsing radar beams on the beat through procedural cloud wisps
  (radar sees through cloud). Title reveal: **"Project LInOG"** (L, In, O, G highlighted) and
  "Leveraging InSAR for Observation and Modeling of Earthquake Generators".
  Final beats: title unmasks; the TL is a radar pulse travelling down the beam → ends as pure `pulse` near centre.

**Act 2 · 10–18 s · Raw ingestion & unification** (HUD on)
- Bars 6–7 (10–14) · Phase 1 Ingestion & FBS+FBD unification: the pulse compresses into a Level 1.1 SLC pixel
  (`pulse → pixel`) inside an SLC raster (amplitude + phase). A vector UI visualises the **779 archive files** (a grid
  of 779 tiles filling on 16ths with a counter, "779 PALSAR L1.1 archives · 1.04 TB"). A spectrum widget:
  FBS 28 MHz band → bandpass edges slide in → **14 MHz**, matching FBD's 14 MHz; both land on a common
  **4.68 m** slant-range grid (FBD resampled to the FBS reference date).
- Bars 8–9 (14–18) · Phase 2 DEM & network: a 3D wireframe/mesh of Luzon topography (NAMRIA IfSAR / SRTM DEM,
  schematic) drops into place along scanlines. Then the baseline network: acquisition dates (x = 2007–2011,
  y = perpendicular baseline) connected wherever Δt ≤ 730 d and |ΔB⊥| ≤ 1,500 m → a web (P448 F0290: 24 dates,
  149 pairs — make the synthetic network actually produce 149 edges). The TL becomes one network node → pure `node`.

**Act 3 · 18–30 s · Coregistration & interferometry** (HUD on)
- Bars 10–11 (18–22) · Phase 3 Coregistration: the TL snaps between two misaligned SAR image chips (reference
  2009-02-08 FBS vs a secondary date). Cross-correlation offset vectors slide the secondary into sub-pixel
  alignment against the reference. FBD → FBS grid resampling note.
- Bars 12–13 (22–26) · Phase 4 Interferograms: two complex waves multiply (s₁·s₂*), interfere, and wrapped
  rainbow fringes form. Multilooking: **28 az × 12 rg looks** collapse speckly 4.68 m samples into crisp **~90 m**
  pixels — show the arithmetic (12 × 4.68 m = 56 m slant → ~90 m ground; 28 az ≈ 90 m).
- Bars 14–15 (26–30) · QC gate (4.5) + unwrapping: a gate sweeps a grid of interferogram thumbnails and strips
  invalid pairs (**1,779 → 1,634**, gates G1–G23). **SNAPHU** unwraps 2π-cycling fringes into a continuous
  line-of-sight (LOS) deformation field (a wrapped sawtooth profile becomes a smooth curve). End: pure `fringe`.

**Act 4 · 30–42 s · MintPy SBAS time-series inversion** (HUD on)
- Bars 16–18 (30–36) · Phase 5 network inversion & corrections: the TL becomes a node in the SBAS network
  (`fringe → node`, purple tint allowed). Interferograms (edges) invert into a displacement history per date
  (time series 2007–2011 drawing on). Counters: **1,634 interferograms · 265 dates · 12 frames**. Widgets for
  **demErr** (phase vs B⊥ trend removed) and **demErr_ramp** (planar orbital ramp removed).
- Bars 19–21 (36–42) · Coherence masking: velocity map over Central Luzon (paths 448/449 footprints). A
  **temporal coherence ≥ 0.7** threshold sweeps; water mask and swath-edge mask apply; decorrelated water and
  dense forest drop out; plains and fault-trace areas keep valid pixels. "Valid area **27,893 km²** (target 25,000 km²)".
  End: one surviving ~90 m pixel becomes the TL → pure `pixel`.

**Act 4 → Act 5 hand-off pixel**: act 4's coherence-masking zoom ends on a coherent, near-zero-velocity plains pixel near
Tarlac City at **lon 120.620°E, lat 15.470°N** (not Cabanatuan — the Cabanatuan dive is saved for 48 s). Act 5 geocodes
that pixel (cells coloured from `L.velRGB` near zero: slate/blue) and then swoops to Cabanatuan for the finding.

**Act 5 · 42–52 s · Geocoded deliverables & discovery** (HUD on; 48–52 header = FINDINGS)
- Bars 22–24 (42–48) · Phase 6 geocoding: a radar-geometry (slant-range/azimuth, skewed/flipped) grid reprojects
  onto a true geographic **1/1200° (~90 m)** lattice. UI shows the **16 GIS-ready deliverables per frame**
  (LOS velocity GeoTIFF, vertical & horizontal projections, hillshades, KMZ; demErr / demErr_ramp; 27-check verified).
- Bars 25–26 (48–52) · Findings: camera swoops into Cabanatuan City with the Philippine Fault Zone trace nearby
  (labelled schematic). The TL becomes the crimson subsidence contour around a ~5 km bowl: **−4.4 to −4.7 cm/yr**
  vertical, **~18–19 cm** cumulative (2007–2011), measured independently on ascending **paths 448 and 449**
  (+ CABN GNSS 4.7 ± 0.4 cm/yr, consistent). End: pure `contour`.

**Act 6 · 52–60 s · Institutional payoff & outro** (HUD fades out by 52 s)
- Bars 27–28 (52–56): the contour contracts and spins rapidly into the central orbital rings of the EGG Laboratory
  emblem (`contour → ring`; `L.drawEGG` placeholder builds around it).
- Bars 29–30 (56–60): end card: "Project LInOG: Measuring mm-scale crustal movements from space";
  Implementing Agency: UP Diliman – National Institute of Geological Sciences (UPD NIGS); Funded by: DOST-PCIEERD;
  Supporting: DOST-PHIVOLCS & PhilSA; small footer "Values: LInOG Year-2 report (2026) · graphics schematic".
  Motion continues to the very last frame (59.983 s); the final beat cuts at 60.00 s.

## 7. Self-test loop (do this, repeatedly)

```bash
cd explainer
node tools/snap.js --from 18 --to 30 --step 0.5 --out /tmp/<you>/act3 --sheet          # frames + contact sheet
node tools/snap.js --times 17.98,18,18.02,29.98 --out /tmp/<you>/act3_edges             # cuts
node tools/snap.js --from 18 --to 30 --step 1 --out /tmp/<you>/qa --qa                  # automated QA for your range
```
Open the PNGs with the Read tool and look at them critically (layout, legibility, motion between frames,
the TL at both edges). The QA checks safe areas, text overlap, contrast, blank frames, static holds,
performance and the TL match cut at boundaries. Your act is done when QA is clean for your range and the
frames look like a polished scientific motion piece.

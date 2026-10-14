/* Act 4 · 30–42 s · Phase 5 · MintPy time-series inversion (scene 'act4') — v2: narrated, less text, spotlights.
 *
 * VO-10 30.3 "More than sixteen hundred interferograms become one history of the ground."      ★ifg-count 30.7–35.2
 * VO-11 36.3 "Unreliable pixels are masked out. Nearly twenty-eight thousand square kilometres remain."
 *                                                                                              ★valid-area 38.3–41.7
 * Beat plan (lt = t − 30 s; bars at lt 0, 2, 4, 6, 8, 10; beat 0.5 s; 16th 0.125 s; 32nd 0.0625 s).
 * All layout comes from the pure helpers below; tl() and draw() share them.
 *
 * Section A · 30–36 s · NETWORK INVERSION (camera 1.00 → 1.04)
 *  0.00 bar 16  the act-3 fringe (one interferogram) opens both cards as irises around itself, then arcs onto its
 *               pixel on the minimap and becomes a purple node (it keeps its hand-off size for one beat).
 *               Left card "Example pixel · schematic": act 2's 24 → 21-date, 149 → 129-pair network over the pixel's
 *               time series. Right card = ★ifg-count: the hero counter, the 12 frames, the two corrections.
 *  0.10         the minimap (the section-B map at 53 %: hillshade, coastline, the 12 frames) wipes in
 *  0.25 / 0.30  headline; hero counter + caption scan in
 *  0.31–1.00    the counter climbs on 32nds through the real per-frame cumulative sums (Year-2 report, Table 3) and
 *               lands "1,634" · "interferograms · 265 frame-dates · 12 frames" on the 31.0 beat; each step lights its
 *               frame on the minimap and its segment of the bar under the caption
 *  0.30–1.50    the pair arcs construct outward from the reference date (2009-02-08)
 *  2.00 bar 17  inversion: the pairs flash in two beat-locked bursts (2.0, 2.5)
 *  3.00 / 3.50  the cursor steps across on the beat; each date's dot drops into the series: one history
 *  3.25         correction chips; 4.00 bar 18 demErr ✓ (the B⊥-correlated scatter leaves the series);
 *               4.50 demErr_ramp ✓ (the ramp leaves); 5.00 the velocity fit draws through the corrected history
 *  5.50         section change: texts scan out, both cards retract; the minimap leaves its card and grows into the
 *               section-B map (one spring) with the TL riding its pixel; the velocity raster opens from that pixel
 * Section B · 36–42 s · COHERENCE MASKING (camera 1.04 → 1.0816)
 *  5.85         headline; 6.00 bar 19 masks card, footprints draw on; 6.30 legend "LOS velocity · schematic"
 *  6.50         water mask ✓ (sweep) · 7.00 swath-edge mask ✓ · 7.50 / 8.00 temporal coherence ≥ 0.5 → 0.7 ✓
 *  7.60         valid-area card; 8.00 bar 20 the tally scan steps down the map on 8ths and counts the valid area up
 *               (true partial sums of the masked map) → 27,893 km² at ≈ 39.2 s, target 25,000 km² ✓; the valid
 *               pixels pulse on the beat. ★valid-area = the valid-area card + the map stage
 * 10.00 bar 21  map furniture clears; zoom ×227 about the TL's pixel (Tarlac plains, 120.620°E 15.470°N — coherent,
 *               near-zero velocity) while the frame closes on a 9 × 9 window of 1/1200° (~90 m) cells;
 *               "Valid pixel · ≈ 90 m × 90 m"
 * 10.75         the other cells drop ring by ring (16ths); 11.00 the TL (node) becomes the surviving cell
 * 11.40–11.95   the valid-area card, headline, label and frame retract
 * 12.00         pure 'pixel' on that cell (≈ 666, 661 on screen), size ≈ 42 px, rot 0, alpha 1
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, G = L.geo, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp;
  const sp = (lt, at, d) => clamp(L.sp(lt, at, d)); // spring 0..1 (clamped)
  const spo = (lt, at, d) => L.sp(lt, at, d); // spring with its ~1 % overshoot (positions)
  const io = (lt, a, b, i = 0.45, o = 0.45) => clamp(L.inout(lt, a, b, i, o));
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const smooth01 = (v) => L.smooth(clamp(v));
  const hexOf = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const INK = L.ink(C.purple), INK_CARD = L.ink(C.purple, C.card);

  /** Smallest t with spring(t, dur) ≥ v (v in 0..1): lets per-item times follow the same spring as a sweep. */
  const SPR = (() => { const n = 2048, a = new Float32Array(n + 1); for (let i = 0; i <= n; i++) a[i] = L.spring(i / n, 1); return a; })();
  function invSpring(v, dur) {
    let lo = 0, hi = SPR.length - 1;
    if (v <= 0) return 0;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (SPR[mid] >= v) hi = mid; else lo = mid + 1; }
    return (lo / (SPR.length - 1)) * dur;
  }

  /* ================================================================== layout (world space, pre-camera) */
  const LA = {
    title: { x: 170, y: 205 }, // section headlines (both sections use this slot)
    left: { x: 170, y: 240, w: 960, h: 685 }, // "Example pixel · schematic": pair network over the time series
    right: { x: 1170, y: 240, w: 580, h: 685 }, // ★ifg-count: hero counter, the 12 frames, the corrections
    both: { x: 170, y: 240, w: 1580, h: 685 }, // one iris opens both cards out of the hand-off point
  };
  const AX = { x0: 232, x1: 1088, y0: 2007.0, y1: 2011.4, net: 466 }; // shared time axis; the network's axis line
  const TSB = { top: 550, bot: 836, tick: 866, lab: 896 }; // series band (every correction state fits), year ticks
  const xYr = (yr) => AX.x0 + ((yr - AX.y0) / (AX.y1 - AX.y0)) * (AX.x1 - AX.x0);
  const CNT = { x: 1206, num: 350, cap: 396, bar: 422, barW: 508, t0: 0.3125, step: 0.0625 }; // counter: 32nd steps
  const MINI = { cx: 1460, y0: 448, h: 360, t: 0.1, d: 0.6 }; // minimap = the section-B map at h / 676 scale
  const CHIP = { y: 872, gap: 18, t: [3.25, 3.375] };
  const TA = { out: 5.5 }; // section A leaves from beat 4 of bar 18
  const TL_NET = 44; // TL node size on the network (its ring clears the neighbouring date nodes)
  const TL_MAP = 40; // TL node size on the map (the marker of the hand-off pixel)
  // Table 3 (Year-2 report) cumulative sums in table order (P447 F0300, F0310, P448 F0280–F0320, P449 F0280–F0320)
  const T3 = {
    ifg: [152, 300, 432, 561, 705, 827, 950, 1073, 1239, 1387, 1511, 1634],
    fd: [24, 48, 70, 91, 114, 135, 157, 176, 200, 223, 244, 265],
  };
  const FILL = { t: 2.0, d: 0.35, split: 65 }; // inversion bursts: pairs 0–64 on beat 2.0, pairs 65–128 on beat 2.5
  const CUR = { t: 3.0, n: 2, d: 0.3 }; // time-series cursor: crosses the axis in two beat steps (3.0, 3.5)
  const K1 = { t: 4.0, d: 0.5 }, K2 = { t: 4.5, d: 0.5 }; // demErr, demErr_ramp

  // Section B: schematic LOS-velocity map of Central Luzon covering the ALOS footprints
  const VIEW = G.view({ lon: 120.915, lat: 15.825, ppd: 255, cx: 758, cy: 562 }); // top edge clears the headline slot
  const ANC = { lon: 120.62, lat: 15.47 }; // act-4 → act-5 hand-off pixel (Tarlac plains; SCENE_GUIDE §6)
  const AW = VIEW.pt(ANC.lon, ANC.lat); // the pixel on the map: raster iris origin, TL marker, zoom anchor
  const RB = (() => {
    const [x0, y0] = VIEW.pt(119.8, 17.15), [x1, y1] = VIEW.pt(122.03, 14.5);
    return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
  })();
  const RBC = [(RB.x0 + RB.x1) / 2, (RB.y0 + RB.y1) / 2];
  const RS = 1.1; // raster px per world px (camera reaches ×1.0816)
  const FP = [
    { p: 449, la0: 14.51, la1: 17.14, frames: [290, 300, 310, 320] },
    { p: 448, la0: 14.51, la1: 17.14, frames: [290, 300, 310, 320] },
    { p: 447, la0: 15.51, la1: 16.65, frames: [310] },
  ];
  const EW = 0.06; // swath-edge strip (deg, ~7 km) — schematic width, wide enough to read at map scale
  // the minimap → map growth: one similarity transform of the whole map (scale SIG → 1, centre MC → RBC)
  const SIG = MINI.h / (RB.y1 - RB.y0), MC = [MINI.cx, MINI.y0 + MINI.h / 2];
  const GROW = { t: 5.5, d: 1.3 }; // ≈ 740 px ride for the TL: peak ≈ 1,350 px/s
  const PANEL = {
    masks: { x: 1100, y: 240, w: 650, h: 250 },
    valid: { x: 1100, y: 510, w: 650, h: 240 },
    legend: { x: 168, y: 772, w: 288, h: 132 }, // bottom-left, beside the map it explains
  };
  const SL = { x0: 1136, x1: 1714, y: 436 }; // threshold slider (masks card)
  const VB = { x0: 1136, x1: 1714, y: 700, max: 30000 }; // valid-area bar
  // timeline of section B (lt)
  const OPEN = { t: 5.6, d: 0.9 }; // the velocity raster opens from the TL's pixel while the map grows
  const T = { water: 6.5, swath: 7.0, thr: [7.5, 8.0], valid: 7.7, tally: 8.0, zoom: 10.0, tag: 10.05, drop: 10.75, morph: 11.0 };
  const THR = [0.5, 0.7]; // coherence threshold steps on the beat
  const TALLY = { n: 5, step: 0.25, d: 0.2 }; // the tally scan steps down the map on 8ths (8.0 … 9.0)

  // 1/1200° lattice around the hand-off pixel: cell (i, j) is centred at (ANC.lon + i/1200, ANC.lat − j/1200)
  const CW = (G.K * VIEW.ppd) / 1200, CH = VIEW.ppd / 1200; // world px per cell at map scale
  const CELL = 48.4; // mean cell side at the end of the zoom (world px, ~52 px on screen); the TL pixel's square matches it
  const S_END = CELL / (0.5 * (CW + CH)); // map zoom at which one cell is CELL world px (≈ ×227)
  const ZOOM = { d: 1.2, dv: 0.9, x0: 3.2, x1: 5.0 }; // zoom spring, frame spring; raster → lattice cross-fade over S ∈ [x0, x1]
  const R_MAX = 4; // the viewfinder closes on a 9 × 9 window of cells
  const W9 = { hx: (R_MAX + 0.5) * CW * S_END, hy: (R_MAX + 0.5) * CH * S_END }; // its half size (world px)
  const LBL_Y = AW[1] - W9.hy - 34; // the pixel's label sits above that window

  /* ================================================================== SBAS pair network (pure, cached) */
  // Act 2 builds the 24-date / 149-pair P448 F0290 network with this deterministic seed search (its layout constants
  // enter through the node-spacing test). Repeating it here keeps the two acts on the same graph.
  const A2 = { px0: 905, px1: 1710, py0: 322, py1: 814, t0: 2006.95, t1: 2011.25, b: 2600 };
  function act2Network() {
    const REF_YR = 2009 + 38 / 365; // 2009-02-08 (FBS coregistration reference)
    const nxOf = (yr) => A2.px0 + ((yr - A2.t0) / (A2.t1 - A2.t0)) * (A2.px1 - A2.px0);
    const nyOf = (b) => (A2.py0 + A2.py1) / 2 - (b / A2.b) * ((A2.py1 - A2.py0) / 2);
    const gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(TAU * r());
    for (let seed = 1; seed < 200000; seed++) {
      const r = L.rng(0x51a7 + seed * 977);
      const pool = [];
      for (let k = -16; k <= 16; k++) if (k) pool.push(k);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      const ks = [0].concat(pool.slice(0, 23)).sort((a, b) => a - b);
      const drift = (r() - 0.5) * 700, sig = 750 + 400 * r();
      const B = ks.map((k) => (k === 0 ? 0 : drift * ((k * 46) / 365.25) + gauss(r) * sig));
      if (B.some((b) => Math.abs(b) > 2250)) continue;
      { const lo = B.filter((b) => b < -400).length, hi = B.filter((b) => b > 400).length; if (lo < 6 || hi < 6) continue; }
      const E = [], deg = new Array(24).fill(0);
      for (let a = 0; a < 24; a++) for (let b = a + 1; b < 24; b++) {
        const dtDays = 46 * (ks[b] - ks[a]);
        if (dtDays <= 730 && Math.abs(B[b] - B[a]) <= 1500) { E.push([a, b]); deg[a]++; deg[b]++; }
      }
      if (E.length !== 149) continue;
      const ref = ks.indexOf(0);
      if (Math.min(...deg) < 4 || deg[ref] < 9 || deg[ref] > 17) continue;
      const yr = ks.map((k) => REF_YR + (k * 46) / 365.25);
      const fbs = yr.map((y) => { const m = Math.floor((y - Math.floor(y)) * 12); return m >= 10 || m <= 3; });
      const nF = fbs.filter(Boolean).length;
      if (nF < 9 || nF > 15) continue;
      const P = yr.map((y, i) => [nxOf(y), nyOf(B[i])]);
      let ok = true;
      for (let a = 0; a < 24 && ok; a++) for (let b = a + 1; b < 24; b++) if (Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]) < 20) { ok = false; break; }
      if (!ok) continue;
      return { yr, B, E, ref };
    }
    throw new Error('act4: act-2 network search failed');
  }
  /** 24 staged → 21 used, 149 formed → 129 inverted (schematic QC, deterministic):
   *  drop the three least-connected non-reference dates, then reject the longest remaining pairs. */
  function qcNetwork(n) {
    const nD = n.yr.length, deg = new Array(nD).fill(0);
    for (const [a, b] of n.E) { deg[a]++; deg[b]++; }
    const drop = new Set(n.yr.map((_, i) => i).filter((i) => i !== n.ref).sort((p, q) => deg[p] - deg[q] || p - q).slice(0, 3));
    const keep = n.yr.map((_, i) => i).filter((i) => !drop.has(i)), re = new Map(keep.map((i, k) => [i, k]));
    const yr = keep.map((i) => n.yr[i]), B = keep.map((i) => n.B[i]);
    let E = n.E.filter(([a, b]) => !drop.has(a) && !drop.has(b)).map(([a, b]) => [re.get(a), re.get(b)]);
    const d2 = new Array(yr.length).fill(0);
    for (const [a, b] of E) { d2[a]++; d2[b]++; }
    const order = E.map((_, i) => i).sort((p, q) => (yr[E[q][1]] - yr[E[q][0]]) - (yr[E[p][1]] - yr[E[p][0]]) || Math.abs(B[E[q][1]] - B[E[q][0]]) - Math.abs(B[E[p][1]] - B[E[p][0]]) || p - q);
    const rej = new Set();
    for (const i of order) {
      if (E.length - rej.size <= 129) break;
      const [a, b] = E[i];
      if (d2[a] > 4 && d2[b] > 4) { rej.add(i); d2[a]--; d2[b]--; }
    }
    E = E.filter((_, i) => !rej.has(i)).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    return { yr, B, E, ref: re.get(n.ref) };
  }
  let NET = null;
  function net() {
    if (NET) return NET;
    const q = qcNetwork(act2Network());
    const yrs = q.yr, bp = q.B.map(Math.round), pairs = q.E, n = yrs.length, jRef = q.ref;
    const r = L.rng(4481), y0 = yrs[0], span = yrs[n - 1] - y0;
    const trend = yrs.map((y) => -0.8 * ((y - y0) / span));
    const seas = yrs.map((y) => 0.03 * Math.sin(TAU * (y - y0)));
    const dem = bp.map((b) => 0.16 * ((b - bp[0]) / 1250));
    const ramp = yrs.map((y, j) => (j ? 0.1 * (r() * 2 - 1) : 0));
    const noise = yrs.map((y, j) => (j ? 0.016 * (r() * 2 - 1) : 0));
    const x = yrs.map(xYr);
    // arc construction order: outward from the reference date
    const xRef = x[jRef];
    const arcs = pairs.map(([a, b], i) => ({ i, a, b, cx: (x[a] + x[b]) / 2, rx: (x[b] - x[a]) / 2, ref: a === jRef || b === jRef }));
    const byDist = arcs.slice().sort((p, q) => Math.abs(p.cx - xRef) - Math.abs(q.cx - xRef) || p.i - q.i);
    byDist.forEach((a, k) => { a.rank = k / (byDist.length - 1); });
    // fit every state of the series (uncorrected … corrected) inside the band, above the year ticks
    let lo = 0, hi = 0;
    for (let j = 0; j < n; j++) for (const k1 of [0, 1]) for (const k2 of [0, 1]) {
      const d = trend[j] + seas[j] + noise[j] + dem[j] * (1 - k1) + ramp[j] * (1 - k2);
      lo = Math.min(lo, d); hi = Math.max(hi, d);
    }
    const scale = Math.min(228, (TSB.bot - TSB.top) / (hi - lo));
    // per-date solve time: the time-series cursor passes the date (two springs, one per beat step)
    const tPhi = x.map((xx) => {
      const u = clamp((xx - AX.x0) / (AX.x1 - AX.x0)) * CUR.n, c = Math.min(CUR.n - 1, Math.floor(u));
      return CUR.t + 0.5 * c + invSpring(u - c, CUR.d);
    });
    // per-pair flash time of the inversion (two beat-locked bursts)
    const tRow = pairs.map((_, i) => {
      const c = i < FILL.split ? 0 : 1, f = c ? (i - FILL.split) / (pairs.length - 1 - FILL.split) : i / (FILL.split - 1);
      return FILL.t + 0.5 * c + invSpring(Math.min(0.999, f * 0.96 + 0.02), FILL.d);
    });
    NET = { n, yrs, bp, pairs, arcs, x, jRef, xRef, trend, seas, dem, ramp, noise, tPhi, tRow, ts: { y0: TSB.top + hi * scale, scale } };
    return NET;
  }
  /** Displacement of date j (normalised units, ≤ 0 = away from the satellite) after corrections k1 (demErr), k2 (ramp). */
  function disp(N, j, k1, k2) { return N.trend[j] + N.seas[j] + N.noise[j] + N.dem[j] * (1 - k1) + N.ramp[j] * (1 - k2); }
  const tsY = (N, d) => N.ts.y0 - d * N.ts.scale;
  /** Time-series cursor position as an axis fraction (beat-locked staircase). */
  const tsCursor = (lt) => clamp(L.steps(lt - CUR.t, 0.5, CUR.d) / CUR.n);
  /** Index of the counter step (Table 3 row) shown at lt: one per 32nd from CNT.t0, the last on the 31.0 beat. */
  const cntIdx = (lt) => clamp(Math.floor((lt - CNT.t0) / CNT.step), 0, 11);

  /* ================================================================== map fields (precomputed in init) */
  let MAP = null;
  const KX = Math.cos(15.5 * Math.PI / 180) * 111.32, KM = 111.32;
  // LOS velocity field (schematic): soft basin tints and one ~5 km bowl (the real finding belongs to act 5)
  const BOWLS = [
    { lon: 120.967, lat: 15.486, sx: 3.0, sy: 3.0, a: -3.7 }, // ~5 km across at half depth
    { lon: 120.9, lat: 15.84, sx: 15, sy: 24, a: -0.45 }, // soft negative tint across the valley to the north
    { lon: 120.72, lat: 14.93, sx: 15, sy: 11, a: -0.55 }, // lower Pampanga basin (broad, soft)
  ];
  function bowls(lon, lat) {
    let v = 0;
    for (const b of BOWLS) { const dx = ((lon - b.lon) * KX) / b.sx, dy = ((lat - b.lat) * KM) / b.sy; const e = dx * dx + dy * dy; if (e < 14) v += b.a * Math.exp(-e); }
    return v;
  }
  function fpEdge(f, lon, lat) { // > 0 inside the footprint: distance to its nearest edge (deg, lat-equivalent)
    const c = G.PATH_C0[f.p] - 0.22 * (lat - 15.5);
    return Math.min((0.4 - Math.abs(lon - c)) * G.K, lat - f.la0, f.la1 - lat);
  }
  // Table 3 (Year-2 report): the 12 frames in table order with the valid % of each. FOFF are coherence offsets per
  // frame, calibrated offline so the masked map reproduces these percentages (±10 points) and ~27,900 km² valid.
  const FRAMES = [
    { p: 447, f: 300, pct: 20.96 }, { p: 447, f: 310, pct: 77.61 },
    { p: 448, f: 280, pct: 45.88 }, { p: 448, f: 290, pct: 63.5 }, { p: 448, f: 300, pct: 75.57 }, { p: 448, f: 310, pct: 88.32 }, { p: 448, f: 320, pct: 53.76 },
    { p: 449, f: 280, pct: 64.92 }, { p: 449, f: 290, pct: 80.73 }, { p: 449, f: 300, pct: 88.05 }, { p: 449, f: 310, pct: 64.38 }, { p: 449, f: 320, pct: 44.38 },
  ];
  const FOFF = [0.005, 0.833, 0.049, -0.143, 0.361, 0.392, 0.356, 0.144, -0.223, 0.892, 1.46, 1.3];
  // the 12 frames as minimap tiles (inset so neighbours never touch), in big-map world coordinates
  const TILES = FRAMES.map((F) => { const la = G.frameLats[F.f]; return G.footprint(F.p, la[0] + 0.09, la[1] - 0.09, 0.23).map(([lo, l2]) => VIEW.pt(lo, l2)); });
  function cohOffset(lon, lat) {
    let sw = 0, so = 0;
    for (let k = 0; k < FRAMES.length; k++) {
      const F = FRAMES[k], fl = G.frameLats[F.f], c = G.PATH_C0[F.p] - 0.22 * (lat - 15.5);
      const dIn = Math.min(lat - fl[0], fl[1] - lat, (0.4 - Math.abs(lon - c)) * G.K);
      if (dIn < -0.1) continue;
      const w = smooth01((dIn + 0.1) / 0.2);
      sw += w; so += w * FOFF[k];
    }
    return sw > 0 ? so / sw : 0;
  }
  const rgb32 = (r, g, b, a = 255) => ((a << 24) | ((Math.min(255, b) | 0) << 16) | ((Math.min(255, g) | 0) << 8) | (Math.min(255, r) | 0)) >>> 0;
  function buildMap() {
    const w = RB.x1 - RB.x0, h = RB.y1 - RB.y0;
    const RW = Math.round(w * RS), RH = Math.round(h * RS), N = RW * RH;
    const [lonA, latB] = VIEW.inv(RB.x0, RB.y0), [lonB, latA] = VIEW.inv(RB.x1, RB.y1);
    const gx = Math.ceil(RW / 2) + 1, gy = Math.ceil(RH / 2) + 1;
    const g0 = G.grid(lonA, lonB, latA, latB, gx, gy);
    // Workaround: the shared schematic DEM starts the Cordillera Central at 16.0°N, i.e. on the flat
    // Pangasinan / Nueva Ecija plains. Coherence there is good in the report, so flatten that tip for the
    // coherence + relief fields only.
    const g = { ...g0, h: new Float32Array(g0.h.length) };
    const GN = gx * gy, nz = new Float32Array(GN), nz2 = new Float32Array(GN), hs = new Float32Array(GN), cb = new Float32Array(GN);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      const lon = lonA + ((lonB - lonA) * i) / (gx - 1), lat = latB - ((latB - latA) * j) / (gy - 1);
      const wLat = smooth01((lat - 15.62) / 0.08) * (1 - smooth01((lat - 16.1) / 0.25));
      const wLon = smooth01((lon - 120.28) / 0.08) * (1 - smooth01((lon - 120.9) / 0.12));
      const o = j * gx + i;
      g.h[o] = g0.h[o] * (1 - 0.93 * wLat * wLon);
      nz[o] = L.fbm(lon * 9, lat * 9, 3, 21);
      nz2[o] = L.fbm(lon * 3.2 + 7, lat * 3.2, 3, 33);
      // smooth coherence: decorrelates with relief (dense forest on the mountains), calibrated per frame
      cb[o] = 0.93 - 0.62 * smooth01((g.h[o] - 380) / 620) + 0.14 * (nz[o] - 0.5) + cohOffset(lon, lat);
    }
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) hs[j * gx + i] = G.hillshade(g, i, j, 2.2);
    const samp = (arr, fx, fy) => {
      const i = Math.min(gx - 2, Math.max(0, Math.floor(fx))), j = Math.min(gy - 2, Math.max(0, Math.floor(fy)));
      const u = clamp(fx - i), v = clamp(fy - j), o = j * gx + i;
      return (arr[o] * (1 - u) + arr[o + 1] * u) * (1 - v) + (arr[o + gx] * (1 - u) + arr[o + gx + 1] * u) * v;
    };
    const lowA = L.hex('#0A0F19'), hiA = L.hex('#171F2E');
    /** One sample of every field (display pixel or lattice cell). hz: per-sample hash, hb: 2×2-block hash (decorrelation grain). */
    const S = { land: false, edge: 0, c: 0, v: 0, base: 0, col: 0 };
    function sample(lon, lat, wx, wy, hz, hb, vNoise) {
      const fx = ((wx - RB.x0) / w) * (gx - 1), fy = ((wy - RB.y0) / h) * (gy - 1);
      const land = G.land(lon, lat) >= 0.5;
      let edge = -1;
      for (const f of FP) edge = Math.max(edge, fpEdge(f, lon, lat));
      S.land = land; S.edge = edge; S.base = 0;
      let shade = 0.7;
      if (land) {
        shade = clamp(samp(hs, fx, fy) * 1.1 - 0.15);
        const m = clamp(0.15 + 0.75 * shade + 0.0001 * samp(g.h, fx, fy));
        S.base = rgb32(lerp(lowA[0], hiA[0], m), lerp(lowA[1], hiA[1], m), lerp(lowA[2], hiA[2], m));
      }
      if (edge <= 0) { S.c = 0; S.v = 0; S.col = 0; return S; }
      let c, v;
      if (land) {
        c = samp(cb, fx, fy) + 0.07 * (hz - 0.5);
        v = 0.6 * (samp(nz2, fx, fy) - 0.5) + vNoise * (hz - 0.5) + bowls(lon, lat);
        const dec = clamp((0.75 - c) / 0.45);
        v += (hb - 0.5) * 2 * (0.15 + 2.1 * dec); // decorrelated: grainy, capped well below the bowls
      } else {
        c = 0.06 + 0.22 * hz;
        v = (hb - 0.5) * 2 * 2.3;
      }
      S.c = clamp(c, 0, 0.995); S.v = v;
      const rgb = L.velRGB(v, 5), lift = land ? 0.82 + 0.38 * shade : 0.9; // hillshaded velocity (as in the delivered PNGs)
      S.col = rgb32(rgb[0] * lift, rgb[1] * lift, rgb[2] * lift);
      return S;
    }
    const col = new Uint32Array(N), tIn = new Float32Array(N), tOut = new Float32Array(N);
    const rowKept = new Float64Array(RH);
    const base = L.canvas(RW, RH), bx = base.getContext('2d'), bimg = bx.createImageData(RW, RH), b32 = new Uint32Array(bimg.data.buffer);
    const fin = L.canvas(RW, RH), fx2 = fin.getContext('2d'), fimg = fx2.createImageData(RW, RH), f32 = new Uint32Array(fimg.data.buffer);
    const iC = Math.round((AW[0] - RB.x0) * RS - 0.5), jC = Math.round((AW[1] - RB.y0) * RS - 0.5);
    for (let j = 0; j < RH; j++) {
      const par = j & 1, wy = RB.y0 + (j + 0.5) / RS;
      const lat = latB - ((j + 0.5) / RH) * (latB - latA);
      const dyN = j < jC ? (jC - j) / jC : (j - jC) / Math.max(1, RH - 1 - jC);
      for (let i = 0; i < RW; i++) {
        const k = j * RW + i, wx = RB.x0 + (i + 0.5) / RS;
        const lon = lonA + ((i + 0.5) / RW) * (lonB - lonA);
        const s = sample(lon, lat, wx, wy, L.hash2(i, j, 404), L.hash2(i >> 1, j >> 1, 405), 0.25);
        if (s.land) b32[k] = s.base;
        if (s.edge <= 0) { tIn[k] = 1e9; tOut[k] = -1e9; continue; }
        col[k] = s.col & 0x00ffffff;
        // reveal: square iris opening from the TL's pixel (interlaced rows)
        const dxN = i < iC ? (iC - i) / iC : (i - iC) / Math.max(1, RW - 1 - iC);
        tIn[k] = OPEN.t + invSpring(Math.max(dxN, dyN), OPEN.d) + par * 0.04;
        if (!s.land) tOut[k] = T.water + 0.05 + 0.4 * (j / RH) + par * 0.06;
        else if (s.edge < EW) tOut[k] = T.swath + 0.12 + 0.35 * (j / RH) + par * 0.05;
        else if (s.c < 0.7) {
          let st = 0; while (st < THR.length - 1 && s.c >= THR[st]) st++;
          tOut[k] = T.thr[st] + 0.02 + 0.12 * (j / RH) + par * 0.04;
        } else { tOut[k] = 1e9; rowKept[j] += 1; f32[k] = (col[k] | 0xff000000) >>> 0; }
      }
    }
    bx.putImageData(bimg, 0, 0);
    fx2.putImageData(fimg, 0, 0);
    // cumulative valid fraction per row (for the tally counter)
    const cum = new Float64Array(RH); let acc = 0; for (let j = 0; j < RH; j++) { acc += rowKept[j]; cum[j] = acc; }
    for (let j = 0; j < RH; j++) cum[j] /= acc;
    // hero raster canvas (repainted per frame while the reveal and the masks run)
    const cv = L.canvas(RW, RH), cx = cv.getContext('2d'), img = cx.createImageData(RW, RH);
    // 1/1200° lattice around the hand-off pixel (same fields, sampled at 90 m cells; noisier per cell than the display raster)
    const li0 = Math.floor((RB.x0 - AW[0]) / (CW * ZOOM.x0)) - 2, li1 = Math.ceil((RB.x1 - AW[0]) / (CW * ZOOM.x0)) + 2;
    const lj0 = Math.floor((RB.y0 - AW[1]) / (CH * ZOOM.x0)) - 2, lj1 = Math.ceil((RB.y1 - AW[1]) / (CH * ZOOM.x0)) + 2;
    const LWd = li1 - li0 + 1, LHt = lj1 - lj0 + 1;
    const lcv = L.canvas(LWd, LHt), lcx = lcv.getContext('2d'), limg = lcx.createImageData(LWd, LHt), l32 = new Uint32Array(limg.data.buffer);
    const win = new Map(); // css colours of the cells the drop animates
    let anc = null;
    for (let j = lj0; j <= lj1; j++) {
      const lat = ANC.lat - j / 1200, wy = AW[1] + j * CH;
      for (let i = li0; i <= li1; i++) {
        const lon = ANC.lon + i / 1200, wx = AW[0] + i * CW;
        const s = sample(lon, lat, wx, wy, L.hash2(i, j, 406), L.hash2(i >> 1, j >> 1, 407), 0.9);
        const ok = s.edge >= EW && s.land && s.c >= 0.7;
        const v = ok ? (s.col | 0xff000000) >>> 0 : s.land ? s.base : 0;
        l32[(j - lj0) * LWd + (i - li0)] = v;
        if (Math.max(Math.abs(i), Math.abs(j)) <= R_MAX + 1) win.set(i + ',' + j, v ? `rgb(${v & 255},${(v >>> 8) & 255},${(v >>> 16) & 255})` : null);
        if (!i && !j) anc = { ok, c: s.c, v: s.v };
      }
    }
    lcx.putImageData(limg, 0, 0);
    if (!anc || !anc.ok) console.warn('act4: hand-off pixel is not a valid cell', JSON.stringify(anc));
    MAP = { RW, RH, N, col, tIn, tOut, cum, base, fin, cv, cx, img, d32: new Uint32Array(img.data.buffer),
      lat: { cv: lcv, i0: li0, j0: lj0, w: LWd, h: LHt, win }, anc };
    return MAP;
  }
  const map = () => MAP || buildMap();

  /* ================================================================== growth, zoom, viewport, TL layout (shared by tl() and draw()) */
  /** The whole map as one similarity: section A shows it as the minimap (scale SIG, centred on MC); from GROW.t it
   *  grows onto the page (scale → 1, centre → RBC). Scale springs in log space; the centre may overshoot ~1 %. */
  function mapXf(lt) {
    if (lt <= GROW.t) return { s: SIG, cx: MC[0], cy: MC[1], g: 0 };
    const g = spo(lt, GROW.t, GROW.d), gs = sp(lt, GROW.t, GROW.d);
    return { s: Math.exp(lerp(Math.log(SIG), 0, gs)), cx: lerp(MC[0], RBC[0], g), cy: lerp(MC[1], RBC[1], g), g: gs };
  }
  const xfPt = (xf, x, y) => [xf.cx + (x - RBC[0]) * xf.s, xf.cy + (y - RBC[1]) * xf.s];
  /** Map zoom about the hand-off pixel: S = 1 → S_END (log-space spring), from T.zoom. */
  function zoomS(lt) {
    if (lt <= T.zoom) return 1;
    return Math.exp(L.smooth(sp(lt, T.zoom, ZOOM.d)) * Math.log(S_END));
  }
  /** Rings of cells still standing during the drop (R_MAX → 0, continuous); one ring per 16th. */
  const tRing = (r) => T.drop + (R_MAX - r) * 0.125;
  function ringsLeft(lt) { let v = 0; for (let r = 1; r <= R_MAX; r++) v += 1 - sp(lt, tRing(r), 0.28); return v; }
  /** Visible map rect (big-map world coords): the minimap wipes in top → bottom; then the zoom frame closes on the pixel. */
  function viewport(lt, S) {
    if (lt < T.zoom) { const k = sp(lt, MINI.t, MINI.d); return { x0: RB.x0, x1: RB.x1, y0: RB.y0, y1: lerp(RB.y0, RB.y1, k), k }; }
    if (lt < T.drop) { // the zoom: frame closes from the map extent to the 9 × 9 window around the pixel
      const kv = sp(lt, T.zoom, ZOOM.dv);
      return { x0: lerp(RB.x0, AW[0] - W9.hx, kv), x1: lerp(RB.x1, AW[0] + W9.hx, kv), y0: lerp(RB.y0, AW[1] - W9.hy, kv), y1: lerp(RB.y1, AW[1] + W9.hy, kv), k: 1 };
    }
    const rv = ringsLeft(lt), hx = (rv + 0.5) * CW * S, hy = (rv + 0.5) * CH * S;
    return { x0: AW[0] - hx, x1: AW[0] + hx, y0: AW[1] - hy, y1: AW[1] + hy, k: 1 };
  }
  /** Coherence threshold on the slider (0 → 0.5 → 0.7, one spring per beat). */
  function threshold(lt) {
    let v = 0;
    for (let k = 0; k < T.thr.length; k++) {
      if (lt < T.thr[k]) break;
      v = lerp(k ? THR[k - 1] : 0, THR[k], sp(lt, T.thr[k], 0.3));
    }
    return v;
  }
  /** Valid-area tally scan (fraction of the map height), one step per 8th from T.tally. */
  const tallyS = (lt) => clamp(L.steps(lt - T.tally, TALLY.step, TALLY.d) / TALLY.n);
  /** World anchor + size of the TL: the reference date of the network (section A), then — on the same spring that
   *  grows the minimap onto the page — down to the hand-off pixel, where it meets the pixel's marker; then that pixel. */
  function tlWorld(lt) {
    const N = net(), g = lt <= GROW.t ? 0 : spo(lt, GROW.t, GROW.d), gs = sp(lt, GROW.t, GROW.d);
    const bs = lerp(TL_MAP, CELL / 1.24, sp(lt, T.morph, 0.5)); // grows to the cell's own size as it becomes the pixel
    return { x: lerp(N.xRef, AW[0], g), y: lerp(AX.net, AW[1], g), size: lerp(TL_NET, bs, gs) };
  }
  function tlTarget(env) {
    const lt = env.lt, w = tlWorld(lt);
    const [x, y] = env.cam.toScreen(w.x, w.y);
    const lock = L.smooth(clamp((lt - 11.5) / 0.5)); // guarantees a pure form at the cut
    const kx = lerp(sp(lt, T.morph, 0.5), 1, lock);
    const st = { x, y, size: w.size * env.cam.z, rot: 0, alpha: 1, phase: TAU * 2 * env.t, energy: 0.45 + 0.4 * env.pulse, amp: 1 };
    const tint = kx <= 0 ? C.purple : kx >= 0.995 ? undefined : L.mix(C.purple, C.cyan, kx);
    if (kx >= 0.995) return { ...st, form: 'pixel', to: null, k: 0, tint };
    if (kx > 0) return { ...st, form: 'node', to: 'pixel', k: kx, tint };
    return { ...st, form: 'node', tint };
  }

  /* ================================================================== drawing helpers */
  /** Clip to the visible part of a card built with L.card(p) (contents collapse with their card). */
  function cardClip(ctx, x, y, w, h, p) {
    const k = L.ease.outCubic(clamp(p * 1.15));
    ctx.beginPath(); ctx.rect(x - 3, y - 3, w + 6, (h + 6) * k); ctx.clip();
  }
  function clipRect(ctx, r) { ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.clip(); }
  /** Section A's entrance: one iris that opens from the hand-off point (where act 3 left the TL) to both cards. */
  function iris(env, lt) {
    const R = LA.both, h = env.handoff, k = sp(lt, 0.0, 0.9);
    const [hx, hy] = h ? env.cam.toWorld(h.x, h.y) : [R.x + R.w / 2, R.y + R.h / 2];
    const ox = clamp(hx, R.x, R.x + R.w), oy = clamp(hy, R.y, R.y + R.h);
    return { x0: lerp(ox, R.x - 4, k), x1: lerp(ox, R.x + R.w + 4, k), y0: lerp(oy, R.y - 4, k), y1: lerp(oy, R.y + R.h + 4, k), k };
  }
  function plate(ctx, x, y, w, h, a = 0.92) { // backplate for labels over maps
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; L.roundRect(ctx, x, y, w, h, 6); ctx.fillStyle = C.card; ctx.fill();
    ctx.strokeStyle = C.cardBorder; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  /** Map label (sans 500 19 px) on a backplate that wipes open with it. Returns the plate rect. */
  function tag(ctx, str, x, y, o) {
    const size = 19, m = L.measure(ctx, str, { kind: 'sans', size, weight: 500 });
    const bx = o.align === 'right' ? x - m.w : o.align === 'center' ? x - m.w / 2 : x;
    const k = L.ease.outCubic(clamp(o.p * 1.2)), pr = { x: bx - 12, y: y - 17, w: m.w + 24, h: 33 };
    if (o.p > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(pr.x - 3, pr.y - 3, (pr.w + 6) * k, pr.h + 6); ctx.clip();
      plate(ctx, pr.x, pr.y, pr.w, pr.h, 0.95);
      ctx.restore();
    }
    L.text(ctx, str, bx, y, { kind: 'sans', size, weight: 500, color: o.color || C.text, p: o.p, bg: C.card, baseline: 'middle', scanColor: C.cyan, id: o.id });
    return pr;
  }
  /** Card header: sans 600 19 px, sentence case, phase ink (v2 type system). */
  function hdr(ctx, str, x, y, p, id) {
    return L.text(ctx, str, x, y, { kind: 'sans', size: 19, weight: 600, tracking: 0.01, color: INK_CARD, p, bg: C.card, scanColor: C.purple, id });
  }
  /** Section headline: display 700 44 px, ALL CAPS (brand names keep their casing). */
  function headline(ctx, str, p, id) {
    L.text(ctx, L.caps(str), LA.title.x, LA.title.y, { kind: 'display', size: 44, weight: 700, tracking: 0.03, p, scanColor: C.purple, role: 'headline', id });
  }
  /** Check mark in a box (mask rows, chips): box at (bx, by), side s; k = applied (0..1), fl = flash. */
  function checkBox(ctx, bx, by, s, k, fl, a = 1) {
    ctx.strokeStyle = L.rgba(C.cyan, 0.7 * a); ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, s, s);
    if (k <= 0) return;
    ctx.fillStyle = L.rgba(C.cyan, 0.16 * k * a); ctx.fillRect(bx, by, s, s);
    ctx.save();
    ctx.strokeStyle = L.rgba(C.cyan, a); ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    L.polyPartial(ctx, [[bx + s * 0.22, by + s * 0.52], [bx + s * 0.42, by + s * 0.74], [bx + s * 0.78, by + s * 0.27]], k); ctx.stroke();
    ctx.restore();
    if (fl > 0.02) L.glow(ctx, bx + s / 2, by + s / 2, s * 1.4, C.cyan, 0.75 * fl * a);
  }
  /** Correction chip: the pill wipes open left → right (p); its box checks and the pill fills when applied (k). */
  function chip(ctx, label, x, y, p, k, fl, id) {
    const m = L.measure(ctx, label, { kind: 'mono', size: 20, weight: 600 });
    const w = m.w + 68, h = 44, y0 = y - h / 2, fillA = 0.08 + 0.16 * k;
    if (p <= 0) return w;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 3, y0 - 3, (w + 6) * L.ease.outCubic(clamp(p * 1.15)), h + 6); ctx.clip();
    L.roundRect(ctx, x, y0, w, h, 10);
    ctx.fillStyle = L.rgba(C.purple, fillA); ctx.fill();
    ctx.strokeStyle = L.rgba(C.purple, 0.5 + 0.45 * k); ctx.lineWidth = 1.5; ctx.stroke();
    checkBox(ctx, x + 15, y - 11, 22, k, fl);
    ctx.restore();
    L.text(ctx, label, x + 50, y, { kind: 'mono', size: 20, weight: 600, color: k > 0.5 ? C.text : C.textDim, baseline: 'middle', p, bg: hexOf(L.mix(C.card, C.purple, fillA)), scanColor: C.purple, id });
    return w;
  }
  /** Clip that excludes small discs (keeps lines off the TL). */
  function clipHoles(ctx, vp, holes) {
    ctx.beginPath(); ctx.rect(vp.x0 - 4, vp.y0 - 4, vp.x1 - vp.x0 + 8, vp.y1 - vp.y0 + 8);
    for (const [x, y, r] of holes) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU, true); }
    ctx.clip('evenodd');
  }
  function insetFootprint(fp, V) { return G.footprint(fp.p, fp.la0 + EW, fp.la1 - EW, 0.4 - EW / G.K).map(([lo, la]) => V.pt(lo, la)); }

  /* ---------------------------------------------------------------- section A · left card: network over the series */
  function drawLeft(ctx, lt, env, hi) {
    const N = net(), R = LA.left, ay = AX.net;
    if (lt >= TA.out + 0.75) return;
    // entrance: the iris around the hand-off point (the first act-4 elements are built out of the through-line)
    const ir = iris(env, lt);
    const pOut = clamp(1 - L.sp(lt, TA.out + 0.05, 0.48)); // exit: the card retracts upward with its contents
    ctx.save(); clipRect(ctx, ir); L.card(ctx, R.x, R.y, R.w, R.h, { p: pOut, accent: C.purple }); ctx.restore();
    ctx.save(); clipRect(ctx, ir); cardClip(ctx, R.x, R.y, R.w, R.h, pOut);
    const pe = TA.out + 0.3; // texts scan out as the card leaves
    hdr(ctx, 'Example pixel · schematic', R.x + 28, R.y + 42, io(lt, 0.45, pe, 0.4, 0.3), 'a4-ex');
    // one time grid through the network and the series (year labels at the bottom are tick labels)
    for (let yr = 2007; yr <= 2011; yr++) {
      const x = xYr(yr), pt = io(lt, 0.5 + 0.06 * (yr - 2007), pe, 0.4, 0.3);
      if (pt <= 0) continue;
      ctx.strokeStyle = L.rgba(C.cyan, 0.07 * pt); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, R.y + 70); ctx.lineTo(x, TSB.tick); ctx.stroke();
      ctx.strokeStyle = L.rgba(C.textDim, 0.5 * pt); ctx.beginPath(); ctx.moveTo(x, TSB.tick); ctx.lineTo(x, TSB.tick + 8); ctx.stroke();
      L.text(ctx, String(yr), x, TSB.lab, { kind: 'mono', size: 16, color: C.textDim, align: 'center', p: pt, role: 'deco' });
    }
    // network time axis grows out of the reference date
    const ga = sp(lt, 0.15, 0.7) * (1 - sp(lt, TA.out + 0.05, 0.45));
    if (ga > 0) {
      ctx.strokeStyle = L.rgba(C.textDim, 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lerp(N.xRef, AX.x0 - 12, ga), ay); ctx.lineTo(lerp(N.xRef, AX.x1 + 12, ga), ay); ctx.stroke();
    }
    // arcs (one per interferometric pair), constructed outward from the reference date
    const pul = env.pulse, refArcs = [];
    ctx.lineWidth = 1.2; ctx.strokeStyle = L.rgba(INK, 0.3);
    ctx.beginPath();
    for (const a of N.arcs) {
      const p = Math.min(sp(lt, 0.3 + 0.75 * a.rank, 0.4), 1 - sp(lt, TA.out + 0.3 * (1 - a.rank), 0.4));
      if (p <= 0.001) continue;
      if (a.ref) { refArcs.push([a, p]); continue; }
      ctx.moveTo(a.cx - a.rx, ay); ctx.ellipse(a.cx, ay, a.rx, a.rx * 0.75, 0, Math.PI, Math.PI + Math.PI * p);
    }
    ctx.stroke();
    // the reference date's own pairs: brighter, ticking on the beat
    ctx.lineWidth = 1.7; ctx.strokeStyle = L.rgba(INK, 0.45 + 0.35 * pul);
    ctx.beginPath();
    for (const [a, p] of refArcs) { ctx.moveTo(a.cx - a.rx, ay); ctx.ellipse(a.cx, ay, a.rx, a.rx * 0.75, 0, Math.PI, Math.PI + Math.PI * p); }
    ctx.stroke();
    // inversion: the pairs flash in two beat-locked bursts
    if (hi.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [i, wgt] of hi) {
        const a = N.arcs[i];
        ctx.lineWidth = 2.2; ctx.strokeStyle = L.rgba(C.cyan, 0.85 * wgt);
        ctx.beginPath(); ctx.moveTo(a.cx - a.rx, ay); ctx.ellipse(a.cx, ay, a.rx, a.rx * 0.75, 0, Math.PI, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // date nodes, constructed outward from the reference date; each ticks as its phase is solved
    for (let j = 0; j < N.n; j++) {
      const d = Math.abs(N.x[j] - N.xRef) / 860;
      const s = sp(lt, 0.18 + 0.55 * d, 0.35) * (1 - sp(lt, TA.out + 0.05 + 0.35 * (1 - d), 0.35));
      if (s <= 0) continue;
      const tk = lt >= N.tPhi[j] ? Math.exp(-(lt - N.tPhi[j]) / 0.15) : 0;
      if (j === N.jRef) continue; // the TL is this node
      ctx.fillStyle = L.rgba('#C9D6EA', 0.95);
      ctx.beginPath(); ctx.arc(N.x[j], ay, 4.6 * s * (1 + 0.5 * tk), 0, TAU); ctx.fill();
      if (tk > 0.02) { ctx.strokeStyle = L.rgba(INK, 0.8 * tk); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(N.x[j], ay, 7 + 8 * (1 - tk), 0, TAU); ctx.stroke(); }
    }
    // the series: zero line, cursor, dots dropping from their dates, segments, velocity fit
    const y0 = N.ts.y0, az = sp(lt, 1.7, 0.6);
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = L.rgba(C.textDim, 0.45); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(AX.x0 - 10, y0); ctx.lineTo(lerp(AX.x0 - 10, AX.x1 + 10, az), y0); ctx.stroke(); ctx.restore();
    const ca = io(lt, CUR.t - 0.15, CUR.t + 1.35, 0.25, 0.45);
    if (ca > 0) {
      const x = lerp(AX.x0, AX.x1, tsCursor(lt));
      ctx.strokeStyle = L.rgba(INK, 0.75 * ca); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, ay + 14); ctx.lineTo(x, TSB.tick); ctx.stroke();
      ctx.fillStyle = L.rgba(INK, ca); ctx.beginPath(); ctx.moveTo(x - 6, ay + 8); ctx.lineTo(x + 6, ay + 8); ctx.lineTo(x, ay + 16); ctx.closePath(); ctx.fill();
      L.glow(ctx, x, ay + 14, 18, C.purple, 0.6 * ca * env.pulse);
    }
    const k1 = sp(lt, K1.t, K1.d), k2 = sp(lt, K2.t, K2.d);
    const pts = [];
    for (let j = 0; j < N.n; j++) {
      const t0 = N.tPhi[j];
      if (lt < t0) continue;
      const f = spo(lt, t0, 0.45), y = lerp(ay, tsY(N, disp(N, j, k1, k2)), f);
      pts.push([N.x[j], y, f, j]);
    }
    ctx.strokeStyle = L.rgba(INK, 0.6); ctx.lineWidth = 1.6;
    for (let k = 1; k < pts.length; k++) {
      if (pts[k][3] !== pts[k - 1][3] + 1) continue;
      const pp = clamp((pts[k][2] - 0.6) / 0.4);
      if (pp <= 0) continue;
      L.polyPartial(ctx, [pts[k - 1], pts[k]], pp); ctx.stroke();
    }
    const pf = sp(lt, 5.0, 0.45);
    if (pf > 0) {
      const a = [N.x[0], tsY(N, 0)], b = [N.x[N.n - 1], tsY(N, N.trend[N.n - 1])];
      ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.85); ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
      L.polyPartial(ctx, [a, b], pf); ctx.stroke(); ctx.restore();
    }
    for (const [x, y, f, j] of pts) {
      if (f < 0.98) { // falling trail
        ctx.strokeStyle = L.rgba(C.purple, 0.35 * (1 - clamp(f))); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, y); ctx.stroke();
      }
      const r = 5.5 * clamp(f * 3);
      if (r <= 0) continue;
      ctx.fillStyle = j === N.jRef ? C.purple : '#D9E4F5';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (j === N.jRef) { ctx.strokeStyle = L.rgba(INK, 0.9); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 5 + 3 * env.pulse, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- section A · right card (★ifg-count) */
  /** Counter, the bar of 12 frames and the correction chips. Returns the card's iris (it clips the minimap). */
  function drawRight(ctx, lt, env) {
    const R = LA.right;
    if (lt >= TA.out + 0.75) return null;
    const ir = iris(env, lt);
    const pOut = clamp(1 - L.sp(lt, TA.out, 0.42)); // its texts scan out, the minimap leaves, the shell retracts
    ctx.save(); clipRect(ctx, ir); L.card(ctx, R.x, R.y, R.w, R.h, { p: pOut, accent: C.purple }); ctx.restore();
    ctx.save(); clipRect(ctx, ir); cardClip(ctx, R.x, R.y, R.w, R.h, pOut);
    const pe = TA.out + 0.3;
    // hero counter: staircase through the real per-frame cumulative sums (every value is a true partial total)
    const i = cntIdx(lt), nf = i + 1;
    L.text(ctx, fmt(T3.ifg[i]), CNT.x, CNT.num, { kind: 'display', size: 96, weight: 700, color: INK_CARD, p: io(lt, 0.3, pe, 0.35, 0.3), bg: C.card, scanColor: C.purple, id: 'a4-count' });
    L.text(ctx, [
      { s: 'interferograms', color: C.text }, { s: ' · ', color: C.textDim },
      { s: String(T3.fd[i]), color: C.text }, { s: ' frame-dates · ', color: C.textDim },
      { s: String(nf), color: C.text }, { s: nf === 1 ? ' frame' : ' frames', color: C.textDim },
    ], CNT.x, CNT.cap, { kind: 'sans', size: 22, weight: 500, p: io(lt, 0.4, pe, 0.35, 0.3), bg: C.card, scanColor: C.purple, id: 'a4-countcap' });
    // bar under the caption: one segment per frame (width ∝ its interferograms), lit on its counter step
    const pb = io(lt, 0.3, pe, 0.5, 0.3);
    if (pb > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(CNT.x - 2, CNT.bar - 8, CNT.barW * pb + 4, 16); ctx.clip();
      const gap = 3, avail = CNT.barW - gap * 11;
      let x = CNT.x;
      for (let k = 0; k < 12; k++) {
        const w = (avail * (T3.ifg[k] - (k ? T3.ifg[k - 1] : 0))) / T3.ifg[11];
        const tk = CNT.t0 + k * CNT.step, lit = lt >= tk, fl = lit ? Math.exp(-(lt - tk) / 0.12) : 0;
        ctx.fillStyle = lit ? L.rgba(INK, 0.6 + 0.4 * fl) : L.rgba(C.textDim, 0.25);
        ctx.fillRect(x, CNT.bar - (lit ? 2 + fl : 1), w, lit ? 4 + 2 * fl : 2);
        x += w + gap;
      }
      if (lt >= 1.0) L.glow(ctx, CNT.x + CNT.barW, CNT.bar, 26, C.purple, 0.5 * (0.4 + 0.6 * env.pulse));
      ctx.restore();
    }
    // corrections applied to every frame's inversion: tick on bar 18 (demErr) and its beat 2 (demErr_ramp)
    const w1 = L.measure(ctx, 'demErr', { kind: 'mono', size: 20, weight: 600 }).w + 68;
    const w2 = L.measure(ctx, 'demErr_ramp', { kind: 'mono', size: 20, weight: 600 }).w + 68;
    const cx0 = MINI.cx - (w1 + CHIP.gap + w2) / 2;
    const flash = (t0) => (lt >= t0 ? Math.exp(-(lt - t0) / 0.25) : 0);
    chip(ctx, 'demErr', cx0, CHIP.y, io(lt, CHIP.t[0], pe, 0.4, 0.3), sp(lt, K1.t, 0.35), flash(K1.t), 'a4-chip1');
    chip(ctx, 'demErr_ramp', cx0 + w1 + CHIP.gap, CHIP.y, io(lt, CHIP.t[1], pe, 0.4, 0.3), sp(lt, K2.t, 0.35), flash(K2.t), 'a4-chip2');
    ctx.restore();
    return lt < TA.out ? ir : null;
  }

  /* ---------------------------------------------------------------- the map (minimap in A, masking map in B) */
  function paintHero(lt) {
    const M = map();
    if (lt >= T.thr[T.thr.length - 1] + 0.3) return M.fin; // every mask has run: the final valid raster (precomputed)
    const d32 = M.d32, col = M.col, tIn = M.tIn, tOut = M.tOut;
    for (let i = 0, n = M.N; i < n; i++) {
      const a = Math.min(lt - tIn[i], tOut[i] - lt) * 10;
      d32[i] = a <= 0 ? 0 : (col[i] | ((a >= 1 ? 255 : (a * 255) | 0) << 24)) >>> 0;
    }
    M.cx.putImageData(M.img, 0, 0);
    return M.cv;
  }
  /** Zoomed view: same projection, ppd × S, pinned on the hand-off pixel. */
  const zoomView = (S) => (S === 1 ? VIEW : G.view({ lon: ANC.lon, lat: ANC.lat, ppd: VIEW.ppd * S, cx: AW[0], cy: AW[1] }));
  /** Section A: the 12 frames as tiles; each lights on its counter step, then breathes on the beat. They hand over
   *  to the footprints as the map grows. */
  function drawTiles(ctx, lt, env, u) {
    const tA = 1 - sp(lt, GROW.t + 0.05, 0.55);
    if (tA <= 0.003) return;
    ctx.lineJoin = 'round';
    for (let k = 0; k < 12; k++) {
      const tk = CNT.t0 + k * CNT.step, lit = lt >= tk, fl = lit ? Math.exp(-(lt - tk) / 0.14) : 0;
      L.poly(ctx, TILES[k], true);
      ctx.fillStyle = lit ? L.rgba(C.purple, (0.3 + 0.4 * fl + 0.08 * env.pulse) * tA) : L.rgba('#C9D6EA', 0.05 * tA);
      ctx.fill();
      ctx.strokeStyle = lit ? L.rgba(INK, (0.7 + 0.3 * fl) * tA) : L.rgba('#C9D6EA', 0.35 * tA);
      ctx.lineWidth = (1.2 + 1.3 * fl) * u; ctx.stroke();
    }
  }
  function drawMap(ctx, lt, env, clipA) {
    if (lt < MINI.t || lt >= 12) return;
    const M = map(), W = RB.x1 - RB.x0, H = RB.y1 - RB.y0;
    const xf = mapXf(lt), S = zoomS(lt), V = zoomView(S), vp = viewport(lt, S);
    const u = 1 / xf.s; // map px per screen-ish px under the growth (keeps hairlines hairline)
    const xl = smooth01((S - ZOOM.x0) / (ZOOM.x1 - ZOOM.x0)); // display raster → 90 m lattice
    const zf = 1 - sp(lt, T.zoom, 0.45); // map furniture fades as the zoom starts
    const cellW = CW * S, cellH = CH * S;
    ctx.save();
    if (clipA) clipRect(ctx, clipA); // section A: the summary card's iris
    ctx.translate(xf.cx, xf.cy); ctx.scale(xf.s, xf.s); ctx.translate(-RBC[0], -RBC[1]);
    ctx.save();
    ctx.beginPath(); ctx.rect(vp.x0, vp.y0, vp.x1 - vp.x0, vp.y1 - vp.y0); ctx.clip();
    // section A: a dark map window inside the card; its fill fades once the map has grown onto the page
    const wb = 1 - sp(lt, GROW.t + 0.25, 0.6);
    if (wb > 0.003) { ctx.fillStyle = L.rgba(C.bg, 0.9 * wb); ctx.fillRect(RB.x0, RB.y0, W, H); }
    if (lt < T.drop) {
      if (xl < 1) { // hillshade base + LOS velocity raster (all masks applied per pixel), zoomed about the pixel
        ctx.save();
        if (S !== 1) { ctx.translate(AW[0], AW[1]); ctx.scale(S, S); ctx.translate(-AW[0], -AW[1]); }
        ctx.beginPath(); ctx.rect(RB.x0, RB.y0, W, H); ctx.clip();
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.globalAlpha = 0.95; ctx.drawImage(M.base, RB.x0, RB.y0, W, H); ctx.globalAlpha = 1;
        if (lt >= OPEN.t) ctx.drawImage(paintHero(lt), RB.x0, RB.y0, W, H);
        // the valid pixels pulse on the beat while the narration names the area (until the dive)
        const sh = lt > T.tally + 1.0 ? (1 - sp(lt, T.zoom, 0.3)) * sp(lt, T.tally + 1.0, 0.4) * env.pulse : 0;
        if (sh > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2 * sh; ctx.drawImage(M.fin, RB.x0, RB.y0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        ctx.restore();
      }
      if (xl > 0) { // the 1/1200° lattice: nearest-neighbour once a cell spans more than ~1.5 screen px
        const LT = M.lat;
        const ia = Math.max(LT.i0, Math.floor((vp.x0 - AW[0]) / cellW - 0.5)), ib = Math.min(LT.i0 + LT.w - 1, Math.ceil((vp.x1 - AW[0]) / cellW + 0.5));
        const ja = Math.max(LT.j0, Math.floor((vp.y0 - AW[1]) / cellH - 0.5)), jb = Math.min(LT.j0 + LT.h - 1, Math.ceil((vp.y1 - AW[1]) / cellH + 0.5));
        if (ib >= ia && jb >= ja) {
          ctx.save(); ctx.globalAlpha = xl;
          ctx.imageSmoothingEnabled = cellH * env.cam.z < 1.5;
          ctx.drawImage(LT.cv, ia - LT.i0, ja - LT.j0, ib - ia + 1, jb - ja + 1, AW[0] + (ia - 0.5) * cellW, AW[1] + (ja - 0.5) * cellH, (ib - ia + 1) * cellW, (jb - ja + 1) * cellH);
          ctx.restore();
        }
      }
      // cell boundaries appear once cells are large enough to read
      const ga = smooth01((cellH * env.cam.z - 9) / 14);
      if (ga > 0) {
        ctx.strokeStyle = L.rgba(C.bg, 0.9 * ga); ctx.lineWidth = 1.2 / env.cam.z;
        ctx.beginPath();
        for (let i = Math.ceil((vp.x0 - AW[0]) / cellW - 0.5); i <= (vp.x1 - AW[0]) / cellW - 0.5; i++) { const x = AW[0] + (i + 0.5) * cellW; ctx.moveTo(x, vp.y0); ctx.lineTo(x, vp.y1); }
        for (let j = Math.ceil((vp.y0 - AW[1]) / cellH - 0.5); j <= (vp.y1 - AW[1]) / cellH - 0.5; j++) { const y = AW[1] + (j + 0.5) * cellH; ctx.moveTo(vp.x0, y); ctx.lineTo(vp.x1, y); }
        ctx.stroke();
      }
    } else { // bar 21 · beat 2½: every cell but the TL's drops, ring by ring from the outside in (one ring per 16th)
      const gap = 0.6 / env.cam.z;
      for (let j = -R_MAX; j <= R_MAX; j++) for (let i = -R_MAX; i <= R_MAX; i++) {
        const r = Math.max(Math.abs(i), Math.abs(j));
        const k = r === 0 ? 1 : 1 - sp(lt, tRing(r), 0.28);
        const a = r === 0 ? 1 - sp(lt, 11.4, 0.55) : 1; // the surviving cell's fill hands over to the TL pixel
        if (k <= 0 || a <= 0.003) continue;
        const css = M.lat.win.get(i + ',' + j);
        if (!css) continue;
        const cxw = AW[0] + i * cellW, cyw = AW[1] + j * cellH;
        if (cxw + cellW / 2 < vp.x0 || cxw - cellW / 2 > vp.x1 || cyw + cellH / 2 < vp.y0 || cyw - cellH / 2 > vp.y1) continue;
        ctx.globalAlpha = a; ctx.fillStyle = css;
        ctx.fillRect(cxw - (cellW / 2 - gap) * k, cyw - (cellH / 2 - gap) * k, (cellW - 2 * gap) * k, (cellH - 2 * gap) * k);
        ctx.globalAlpha = 1;
      }
    }
    // coastline (fades out with the zoom)
    if (zf > 0) G.drawLand(ctx, V, { which: 'ph', stroke: L.rgba(C.cyan, 0.42 * zf), lw: 1.2 * u });
    drawTiles(ctx, lt, env, u);
    // the example pixel on the minimap: a small node that rhymes with the TL; it meets the TL as the map lands
    const mk = io(lt, 0.55, GROW.t + GROW.d * 0.75, 0.4, 0.45);
    if (mk > 0) {
      const ph = (env.t * 2) % 1;
      ctx.fillStyle = L.rgba(INK, mk); ctx.beginPath(); ctx.arc(AW[0], AW[1], 3.6 * u, 0, TAU); ctx.fill();
      ctx.strokeStyle = L.rgba(INK, 0.95 * mk); ctx.lineWidth = 1.8 * u; ctx.beginPath(); ctx.arc(AW[0], AW[1], 9 * u, 0, TAU); ctx.stroke();
      ctx.strokeStyle = L.rgba(INK, 0.6 * (1 - ph) * mk); ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.arc(AW[0], AW[1], (11 + 12 * ph) * u, 0, TAU); ctx.stroke();
    }
    // mask sweeps (water) and the 8th-stepped tally scan
    if (lt >= T.water + 0.05 && lt <= T.water + 0.65) {
      const s = clamp((lt - T.water - 0.05) / 0.45), y = RB.y0 + H * s, a = Math.sin(Math.PI * clamp((lt - T.water - 0.05) / 0.6));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = L.rgba(C.cyan, 0.85 * a); ctx.fillRect(RB.x0, y - 1, W, 2);
      ctx.fillStyle = L.rgba(C.cyan, 0.2 * a); ctx.fillRect(RB.x0, y - 8, W, 16);
      ctx.restore();
    }
    const tEnd = T.tally + (TALLY.n - 1) * TALLY.step;
    if (lt >= T.tally && lt < tEnd + 0.7) {
      const s = tallyS(lt), y = RB.y0 + H * s, a = (1 - sp(lt, tEnd + 0.1, 0.45)) * (0.65 + 0.35 * env.pulse);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = L.rgba(C.purple, 0.95 * a); ctx.fillRect(RB.x0, y - 1, W, 2);
      const gr = ctx.createLinearGradient(0, y - 46, 0, y);
      gr.addColorStop(0, L.rgba(C.purple, 0)); gr.addColorStop(1, L.rgba(C.purple, 0.16 * a));
      ctx.fillStyle = gr; ctx.fillRect(RB.x0, y - 46, W, 46);
      ctx.restore();
    }
    // swath-edge mask: the inner offset of the footprint union flashes on the beat, then its strip drops
    const pe = sp(lt, T.swath, 0.35) * (1 - sp(lt, T.swath + 0.5, 0.45));
    if (pe > 0.002) {
      const ins = FP.map((fp) => insetFootprint(fp, V));
      ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 1.8; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -lt * 40;
      ins.forEach((pts, k) => {
        ctx.save();
        ctx.beginPath(); ctx.rect(RB.x0 - 10, RB.y0 - 10, W + 20, H + 20);
        ins.forEach((o, m) => { if (m === k) return; ctx.moveTo(o[0][0], o[0][1]); for (let q = 1; q < o.length; q++) ctx.lineTo(o[q][0], o[q][1]); ctx.closePath(); });
        ctx.clip('evenodd');
        ctx.globalAlpha = Math.min(1, pe * 1.4);
        L.polyPartial(ctx, [...pts, pts[0]], sp(lt, T.swath, 0.4)); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
    // footprints (P447/448/449) and frame ticks draw on as the map lands — kept off the TL
    const fa = sp(lt, OPEN.t + 0.4, 0.6) * zf;
    if (fa > 0.002) {
      const fpts = FP.map((fp) => G.footprint(fp.p, fp.la0, fp.la1).map(([lo, la]) => V.pt(lo, la)));
      const tw = tlWorld(lt), [hx, hy] = [RBC[0] + (tw.x - xf.cx) / xf.s, RBC[1] + (tw.y - xf.cy) / xf.s]; // the TL in map coords
      ctx.save(); clipHoles(ctx, vp, [[hx, hy, (tw.size * 0.62) / xf.s]]);
      FP.forEach((fp, k) => {
        const p = sp(lt, OPEN.t + 0.4 + 0.12 * k, 0.7);
        if (p <= 0) return;
        const pts = fpts[k];
        ctx.strokeStyle = L.rgba('#C9D6EA', 0.75 * fa); ctx.lineWidth = 1.6 * u; ctx.setLineDash([]);
        L.polyPartial(ctx, [...pts, pts[0]], p); ctx.stroke();
        const pf = sp(lt, OPEN.t + 0.8 + 0.1 * k, 0.5);
        ctx.strokeStyle = L.rgba('#C9D6EA', 0.35 * pf * fa); ctx.lineWidth = u; ctx.setLineDash([4 * u, 5 * u]);
        ctx.beginPath();
        for (const fr of fp.frames) {
          const la = G.frameLats[fr][0];
          const c = G.PATH_C0[fp.p] - 0.22 * (la - 15.5);
          const [xa, ya] = V.pt(c - 0.4, la), [xb] = V.pt(c + 0.4, la);
          ctx.moveTo(xa, ya); ctx.lineTo(lerp(xa, xb, pf), ya);
        }
        ctx.stroke(); ctx.setLineDash([]);
      });
      ctx.restore();
    }
    // the TL's cell: outlined once the lattice is legible
    const ph = io(lt, T.tag + 0.3, T.morph + 0.55, 0.35, 0.3);
    if (ph > 0) {
      const hx = cellW / 2, hy = cellH / 2;
      ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 2 / env.cam.z;
      L.polyPartial(ctx, [[AW[0] - hx, AW[1] - hy], [AW[0] + hx, AW[1] - hy], [AW[0] + hx, AW[1] + hy], [AW[0] - hx, AW[1] + hy], [AW[0] - hx, AW[1] - hy]], ph); ctx.stroke();
    }
    ctx.restore(); // viewport clip
    // the map frame = the viewport (minimap window → page map → zoom frame → contracting viewfinder)
    if (vp.x1 - vp.x0 > 1 && vp.y1 - vp.y0 > 1) {
      const moving = (lt > GROW.t && lt < GROW.t + GROW.d) || lt >= T.zoom;
      const fr = lt >= T.drop ? 1 - sp(lt, T.morph + 0.3, 0.3) : 1;
      if (fr > 0) {
        ctx.strokeStyle = L.rgba(C.cyan, (moving ? 0.55 : lt < GROW.t ? 0.3 : 0.22) * fr); ctx.lineWidth = 1.2 * u;
        ctx.strokeRect(vp.x0, vp.y0, vp.x1 - vp.x0, vp.y1 - vp.y0);
        const bk = lt >= T.zoom ? sp(lt, T.zoom, 0.3) * fr : io(lt, GROW.t, GROW.t + GROW.d + 0.2, 0.3, 0.4);
        if (bk > 0) { // viewfinder corner brackets while the frame moves
          const c = Math.min(20 * u, 0.25 * Math.min(vp.x1 - vp.x0, vp.y1 - vp.y0) + 4);
          ctx.strokeStyle = L.rgba(C.cyan, 0.9 * bk); ctx.lineWidth = 2 * u; ctx.beginPath();
          for (const [cx, cy, sx, sy] of [[vp.x0, vp.y0, 1, 1], [vp.x1, vp.y0, -1, 1], [vp.x0, vp.y1, 1, -1], [vp.x1, vp.y1, -1, -1]]) { ctx.moveTo(cx + sx * c, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * c); }
          ctx.stroke();
        }
      }
      if (vp.k < 1) { // the minimap's wipe front
        const a = Math.sin(Math.PI * clamp(vp.k)) * 0.85;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = L.rgba(C.purple, a); ctx.fillRect(vp.x0 - 10 * u, vp.y1 - u, vp.x1 - vp.x0 + 20 * u, 2 * u);
        ctx.fillStyle = L.rgba(C.purple, 0.25 * a); ctx.fillRect(vp.x0 - 10 * u, vp.y1 - 5 * u, vp.x1 - vp.x0 + 20 * u, 10 * u);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- section B · cards */
  function drawMasks(ctx, lt, env, thr) {
    const R = PANEL.masks, pc = io(lt, 6.0, T.zoom + 0.45, 0.5, 0.45);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pe = T.zoom + 0.3;
    const row = (k, label, tCheck, y) => {
      const p = io(lt, 6.1 + 0.1 * k, pe, 0.4, 0.3);
      if (p <= 0) return;
      const ck = sp(lt, tCheck, 0.35);
      checkBox(ctx, SL.x0, y - 13, 26, ck * p, lt >= tCheck ? Math.exp(-(lt - tCheck) / 0.25) : 0, p);
      L.text(ctx, label, SL.x0 + 46, y, { kind: 'sans', size: 24, weight: 500, color: ck > 0.5 ? C.text : C.textDim, baseline: 'middle', p, bg: C.card, scanColor: C.purple, id: 'a4-mask' + k });
    };
    row(0, 'Water mask', T.water + 0.05, R.y + 52);
    row(1, 'Swath-edge mask', T.swath + 0.05, R.y + 100);
    row(2, 'Temporal coherence ≥ 0.7', T.thr[1] + 0.05, R.y + 148);
    // threshold slider (the coherence mask's control): 0 → 0.5 → 0.7 on the beat
    const ps = sp(lt, 6.3, 0.6) * (1 - sp(lt, pe - 0.25, 0.4));
    if (ps > 0) {
      const tw = (SL.x1 - SL.x0) * ps;
      ctx.fillStyle = L.rgba(C.textDim, 0.25); ctx.fillRect(SL.x0, SL.y - 2, tw, 4);
      for (let s = 0; s <= 10; s++) { const x = SL.x0 + ((SL.x1 - SL.x0) * s) / 10; if (x > SL.x0 + tw) break; ctx.fillStyle = L.rgba(C.textDim, s === 7 ? 0.9 : 0.45); ctx.fillRect(x - 0.75, SL.y + 8, 1.5, s === 7 ? 12 : 7); }
      const o = { kind: 'mono', size: 16, color: C.textDim, p: ps, role: 'deco' };
      L.text(ctx, '0', SL.x0, SL.y + 38, o);
      L.text(ctx, '0.7', SL.x0 + (SL.x1 - SL.x0) * 0.7, SL.y + 38, { ...o, align: 'center' });
      L.text(ctx, '1', SL.x1, SL.y + 38, { ...o, align: 'right' });
      const kx = SL.x0 + (SL.x1 - SL.x0) * thr;
      ctx.fillStyle = C.purple; ctx.fillRect(SL.x0, SL.y - 2, kx - SL.x0, 4);
      L.glow(ctx, kx, SL.y, 26, C.purple, (0.4 + 0.6 * env.pulse) * ps);
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(kx, SL.y, 8 * ps, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.purple; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(kx, SL.y, 8 * ps, 0, TAU); ctx.stroke();
      if (lt >= T.thr[0]) { const ph = (env.t * 2) % 1; ctx.strokeStyle = L.rgba(INK, 0.6 * (1 - ph) * ps); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(kx, SL.y, 12 + 10 * ph, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawValid(ctx, lt, env) {
    const M = map(), R = PANEL.valid, pc = io(lt, T.valid, 11.95, 0.5, 0.4);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pe = 11.9; // texts scan out while the card retracts (no empty shell)
    // live tally: counts up as the scan line confirms the masked rows, one step per 8th (true partial sums of the map)
    const s = lt >= T.tally ? tallyS(lt) : 0;
    const rowI = Math.min(M.RH - 1, Math.floor(s * M.RH));
    const area = s >= 0.995 ? 27893 : s <= 0 ? 0 : Math.round(27893 * M.cum[rowI]);
    L.text(ctx, [{ s: fmt(area), color: INK_CARD }, { s: ' km²', color: C.textDim }], VB.x0, R.y + 106, { kind: 'display', size: 88, weight: 700, p: io(lt, T.valid + 0.12, pe, 0.4, 0.3), bg: C.card, scanColor: C.purple, id: 'a4-area' });
    const hit = area >= 25000, pcap = io(lt, T.valid + 0.22, pe, 0.4, 0.3);
    const cb = L.text(ctx, [{ s: 'Valid area', color: C.text }, { s: ' · target 25,000 km²', color: C.textDim }], VB.x0, R.y + 154, { kind: 'sans', size: 22, weight: 500, p: pcap, bg: C.card, scanColor: C.purple, id: 'a4-areacap' });
    // bar with the target tick (the target is reached during the tally: the tick lights, a check draws after the caption)
    const pb = sp(lt, T.valid + 0.3, 0.6) * (1 - sp(lt, pe - 0.25, 0.35)), bw = (VB.x1 - VB.x0) * pb;
    ctx.fillStyle = L.rgba(C.textDim, 0.2); ctx.fillRect(VB.x0, VB.y, bw, 10);
    ctx.fillStyle = C.purple; ctx.fillRect(VB.x0, VB.y, Math.min(bw, (VB.x1 - VB.x0) * (area / VB.max)), 10);
    const tx = VB.x0 + (VB.x1 - VB.x0) * (25000 / VB.max);
    ctx.fillStyle = L.rgba(hit ? C.cyan : C.text, 0.9 * pb); ctx.fillRect(tx - 1, VB.y - 12, 2, 34);
    if (hit) {
      L.glow(ctx, tx, VB.y + 5, 30, C.cyan, 0.6 * (0.6 + 0.4 * env.pulse) * pb);
      const tHit = T.tally + (TALLY.n - 1) * TALLY.step; // ≈ when the scan passes 25,000 (the last 8th)
      const k = sp(lt, tHit, 0.35) * pcap, x = cb.x + cb.w + 14, y = R.y + 154 - 15;
      ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      L.polyPartial(ctx, [[x, y + 9], [x + 6, y + 15], [x + 17, y + 2]], k); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function drawLegend(ctx, lt) {
    const R = PANEL.legend, pc = io(lt, 6.3, T.zoom + 0.5, 0.5, 0.45);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pt = io(lt, 6.4, T.zoom + 0.35, 0.4, 0.3), x0 = R.x + 24, x1 = R.x + R.w - 24;
    hdr(ctx, 'LOS velocity · schematic', x0, R.y + 40, pt, 'a4-lgT');
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    for (let s = 0; s <= 12; s++) g.addColorStop(s / 12, L.css(L.velRGB(-1 + s / 6, 1)));
    const pb = sp(lt, 6.5, 0.6) * (1 - sp(lt, T.zoom, 0.35));
    ctx.save(); ctx.beginPath(); ctx.rect(x0, R.y + 58, (x1 - x0) * pb, 12); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x0, R.y + 58, x1 - x0, 12); ctx.restore();
    const o = { kind: 'mono', size: 16, color: C.textDim, p: pt, role: 'deco' }; // colour-bar tick labels
    L.text(ctx, 'away', x0, R.y + 98, o);
    L.text(ctx, '0', (x0 + x1) / 2, R.y + 98, { ...o, align: 'center' });
    L.text(ctx, 'toward', x1, R.y + 98, { ...o, align: 'right' });
    ctx.restore();
  }
  /** The hand-off pixel's label, above the zoom window, with a leader to whatever of the window remains. */
  function drawPixelLabel(ctx, lt) {
    const p = io(lt, T.tag, 11.95, 0.35, 0.3);
    if (p <= 0) return;
    const b = tag(ctx, 'Valid pixel · ≈ 90 m × 90 m', AW[0], LBL_Y, { p, align: 'center', id: 'a4-pix' });
    const vp = viewport(lt, zoomS(lt)), y1 = b.y + b.h + 2;
    if (vp.y0 > y1 + 4) {
      ctx.strokeStyle = L.rgba(C.cyan, 0.7 * p); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(AW[0], y1); ctx.lineTo(AW[0], lerp(y1, vp.y0 - 2, clamp(p * 1.2))); ctx.stroke();
    }
  }

  /* ================================================================== scene */
  L.scene({
    id: 'act4', t0: 30, t1: 42,
    init() { net(); map(); },
    tl(env) {
      const target = tlTarget(env), lt = env.lt, h = env.handoff;
      if (!h || lt >= 2.6) return target;
      // land on the network's reference date in one arcing gesture (longer moves take longer: peak speed stays
      // ≲ 1,100 px/s); the hand-off size holds for one beat before the TL resizes
      const dist = Math.hypot(h.x - target.x, h.y - target.y), dur = clamp(0.6 + dist / 900, 1.0, 1.5);
      const k = spo(lt, 0, dur);
      const s = L.TL.blend(h, target, k);
      s.y -= 0.12 * dist * Math.sin(Math.PI * clamp(k));
      s.size = lerp(h.size, target.size, spo(lt, 0.5, 0.9));
      s.tint = L.mix(C.cyan, C.purple, clamp(k));
      return s;
    },
    draw(ctx, env) {
      const lt = env.lt;
      let clipA = null;
      if (lt < TA.out + 0.75) {
        // pairs flashing in the inversion bursts
        const hi = [];
        if (lt > FILL.t && lt < FILL.t + 1.2) { const N = net(); for (let i = 0; i < 129; i++) { const d = lt - N.tRow[i]; if (d >= 0 && d < 0.2) hi.push([i, 1 - d / 0.2]); } }
        drawLeft(ctx, lt, env, hi);
        clipA = drawRight(ctx, lt, env);
        const ir = iris(env, lt);
        if (ir.k < 0.995) { ctx.strokeStyle = L.rgba(C.purple, 0.9 * (1 - ir.k)); ctx.lineWidth = 1.5; ctx.strokeRect(ir.x0, ir.y0, ir.x1 - ir.x0, ir.y1 - ir.y0); } // the iris edge
        headline(ctx, 'Network inversion', io(lt, 0.25, TA.out + 0.3, 0.5, 0.3), 'a4-title');
      }
      drawMap(ctx, lt, env, clipA);
      if (lt >= 5.8) {
        headline(ctx, 'Coherence masking', io(lt, 5.85, 11.8, 0.5, 0.4), 'a4-titleB');
        drawMasks(ctx, lt, env, threshold(lt));
        drawLegend(ctx, lt);
        drawValid(ctx, lt, env);
        drawPixelLabel(ctx, lt);
      }
      // VO spotlights (several rectangles per target are allowed)
      if (lt >= 0.55 && lt < 5.4) L.spot.mark(ctx, 'ifg-count', LA.right.x, LA.right.y, LA.right.w, LA.right.h, { pad: 14, r: 16 });
      if (lt >= 8.15 && lt < 11.85) {
        const R = PANEL.valid;
        L.spot.mark(ctx, 'valid-area', R.x, R.y, R.w, R.h, { pad: 14, r: 16 });
        L.spot.mark(ctx, 'valid-area', RB.x0, RB.y0, RB.x1 - RB.x0, RB.y1 - RB.y0, { pad: 14, r: 12 });
      }
    },
  });
})();

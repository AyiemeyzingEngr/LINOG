/* Act 4 · 30–42 s · Phase 05/06 · MintPy SBAS time-series inversion (scene 'act4')
 *
 * Beat plan (lt = t − 30 s; 1 beat = 0.5 s; bars start at lt 0, 2, 4, 6, 8, 10).
 * All layout comes from the pure geometry helpers below; tl() and draw() share them.
 *
 * Section A · 30–36 s · network inversion & corrections (camera 1.00 → 1.04)
 *  0.00 bar 16  TL (act-3 fringe) springs into a purple network node on the 2009-02-08 reference date of the
 *               P448 F0290 pair network (act 2's 24-date / 149-pair graph after QC: 21 dates, 129 pairs);
 *               the time axis grows out of it, date nodes + pair arcs construct outward from the TL.
 *  0.25         title "Network inversion"; 0.5 counters "1,634 interferograms · 265 dates · 12 frames"
 *  1.00         "one SBAS inversion per frame"
 *  1.50 / 1.75  design-matrix card ("A · φ = Δφ") and time-series card construct
 *  2.00 bar 17  inversion: A fills row by row, each row lights its arc in the network; Δφ fills alongside
 *  2.95         solved φ column fills; each date's dot drops from its network node into the time series
 *  3.00 / 3.25  demErr and demErr_ramp widgets construct (overlapping the φ fill)
 *  4.00 bar 18  demErr: phase-vs-B⊥ trend flattens; the B⊥-correlated scatter leaves the time series
 *  4.50         demErr_ramp: the unwrapped planar ramp on the tile is subtracted to flat; the series tightens
 *  4.90         linear velocity fit draws through the corrected history
 *  5.50         section change (overlapping): every card unmasks together with its contents (5.5–6.3) while
 *               the map iris opens around Cabanatuan City and the TL glides there (5.5–6.4)
 * Section B · 36–42 s · coherence masking (camera 1.04 → 1.0816)
 *  6.00 bar 19  footprints P447/448/449 + frame ticks, PFZ (schematic), panel and coherence inset construct
 *  7.00         water mask: sea pixels drop on an interlaced sweep ✓
 *  7.50         swath-edge mask: dashed inner offset of the footprint union flashes, its strip drops ✓
 *  8.00 bar 20  slider "temporal coherence ≥ 0.1 → 0.7" steps on 16ths; decorrelated pixels drop per step
 *  8.50         tally scan: valid area counts up to 27,893 km², passing the 25,000 km² target ✓
 *  9.00         map zooms into the Cabanatuan bowl until the 1/1200° (~90 m) lattice shows as crisp cells
 *  9.60         the bowl's deepest cell is outlined: "1 pixel ≈ 90 m × 90 m"
 * 10.00 bar 21  every other cell drops (rings, outside → in); the viewfinder contracts onto the survivor
 * 10.25         the TL (node) claims the surviving cell and morphs node → pixel (purple → cyan)
 * 10.90         the TL grows to 96 px and glides to the hand-off spot; 11.6–11.95 the tag and last panel unmask
 * 12.00         pure 'pixel', size 96, (940, 556), rot 0, alpha 1
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, G = L.geo, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp;
  const sp = (lt, at, d) => clamp(L.sp(lt, at, d)); // spring 0..1 (clamped)
  const spo = (lt, at, d) => L.sp(lt, at, d); // spring with its ~1 % overshoot (positions)
  const io = (lt, a, b, i = 0.45, o = 0.45) => clamp(L.inout(lt, a, b, i, o));
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const wrapPI = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
  const smooth01 = (v) => L.smooth(clamp(v));
  const INK = L.ink(C.purple), INK_CARD = L.ink(C.purple, C.card);

  /* ================================================================== geometry (world space) */
  const LA = {
    title: { x: 170, y: 200 },
    counters: { x: 1750, y: 188 }, sub: { x: 1750, y: 222 },
    net: { x: 170, y: 240, w: 960, h: 300, axisY: 496 },
    ts: { x: 170, y: 560, w: 960, h: 365 },
    mat: { x: 1170, y: 240, w: 580, h: 370 },
    dem: { x: 1170, y: 630, w: 580, h: 140 },
    ramp: { x: 1170, y: 790, w: 580, h: 135 },
  };
  const AX = { x0: 232, x1: 1088, y0: 2007.0, y1: 2011.4 };
  const xYr = (yr) => AX.x0 + ((yr - AX.y0) / (AX.y1 - AX.y0)) * (AX.x1 - AX.x0);
  const xYrLabel = (yr) => xYr(Math.min(yr + 0.5, (yr + AX.y1) / 2)); // year label centred in its span
  const MX = { ax: 1194, ay: 312, cw: 11, rh: 2.2, px: 1450, dx: 1496, colW: 14 }; // design matrix block
  const DP = { x0: 1500, x1: 1730, y0: 652, y1: 758 }; // demErr scatter
  const RT = { x: 1500, y: 803, w: 230, h: 108 }; // ramp tile
  // section A leaves from beat 4 of bar 18: each card retracts upward carrying its contents (no empty shells),
  // right column first; texts scan out over the same window. End times (lt) per card:
  const TA = { out: 5.5, dem: 5.85, ramp: 5.9, mat: 5.95, net: 6.1, ts: 6.2, text: 5.8 };
  const TL_NET = 44; // TL node size inside the network (its ring clears the neighbouring date nodes)

  // Section B: map of Central Luzon covering the ALOS footprints
  const VIEW = G.view({ lon: 120.915, lat: 15.825, ppd: 268, cx: 758, cy: 549 });
  const CAB = G.places.cabanatuan, DAG = G.places.dagupan;
  const AW = VIEW.pt(CAB.lon, CAB.lat); // the Cabanatuan bowl's deepest cell: iris + zoom anchor (world)
  const RB = (() => {
    const [x0, y0] = VIEW.pt(119.8, 17.15), [x1, y1] = VIEW.pt(122.03, 14.5);
    return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
  })();
  const RS = 1.1; // raster px per world px (camera reaches ×1.0816)
  const FP = [
    { p: 449, la0: 14.51, la1: 17.14, frames: [290, 300, 310, 320] },
    { p: 448, la0: 14.51, la1: 17.14, frames: [290, 300, 310, 320] },
    { p: 447, la0: 15.51, la1: 16.65, frames: [310] },
  ];
  const EW = 0.06; // swath-edge strip (deg, ~7 km) — schematic width, wide enough to read at map scale
  const INSET = { x: 175, y: 245, w: 265, h: 480, rx: 193, ry: 296, rw: 229 };
  INSET.rh = Math.round((INSET.rw * (RB.y1 - RB.y0)) / (RB.x1 - RB.x0));
  INSET.s = INSET.rw / (RB.x1 - RB.x0);
  const VIEW_IN = G.view({ lon: VIEW.lon, lat: VIEW.lat, ppd: VIEW.ppd * INSET.s, cx: INSET.rx + (VIEW.cx - RB.x0) * INSET.s, cy: INSET.ry + (VIEW.cy - RB.y0) * INSET.s });
  const PANEL = {
    title: { x: 1090, y: 214 },
    masks: { x: 1090, y: 245, w: 660, h: 250 },
    valid: { x: 1090, y: 515, w: 660, h: 230 },
    legend: { x: 1090, y: 765, w: 660, h: 150 },
  };
  const SL = { x0: 1115, x1: 1725, y: 338 };
  const VB = { x0: 1115, x1: 1725, y: 660, max: 30000 };
  const END = { x: 940, y: 556, size: 96 }; // hand-off pixel (screen space)

  // timeline of section B (lt)
  const OPEN = { t: TA.out, d: 0.9 }; // map iris opens around the bowl while section A leaves
  const T = { water: 7.0, swath: 7.5, thr: 8.0, tally: 8.5, zoom: 9.0, tag: 9.6, drop: 10.0, on: 10.25, morph: 10.375, fin: 10.9 };
  const THR = [0.1, 0.3, 0.5, 0.7]; // slider steps on 16ths from T.thr

  // 1/1200° lattice around the bowl: cell (i, j) is centred at (CAB.lon + i/1200, CAB.lat − j/1200)
  const CW = (G.K * VIEW.ppd) / 1200, CH = VIEW.ppd / 1200; // world px per cell at map scale
  const S_END = 197; // map zoom at which one cell is ~44 world px (~47 px on screen)
  const ZOOM = { d: 1.5, dv: 1.0, x0: 3.2, x1: 5.0 }; // zoom spring (settled by T.drop), frame spring; raster → lattice cross-fade over S ∈ [x0, x1]
  const R_MAX = 4; // the viewfinder closes on a 9 × 9 window of cells
  const W9 = { hx: (R_MAX + 0.5) * CW * S_END, hy: (R_MAX + 0.5) * CH * S_END }; // its half size (world px)
  const TL_OUT = W9.hx + 44; // the TL steps outside the window while the lattice resolves

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
    const yrs = q.yr, bp = q.B.map(Math.round), pairs = q.E, n = yrs.length, jTL = q.ref;
    const r = L.rng(4481), y0 = yrs[0], span = yrs[n - 1] - y0;
    const trend = yrs.map((y) => -0.8 * ((y - y0) / span));
    const seas = yrs.map((y) => 0.03 * Math.sin(TAU * (y - y0)));
    const dem = bp.map((b) => 0.16 * ((b - bp[0]) / 1250));
    const ramp = yrs.map((y, j) => (j ? 0.1 * (r() * 2 - 1) : 0));
    const noise = yrs.map((y, j) => (j ? 0.016 * (r() * 2 - 1) : 0));
    const x = yrs.map(xYr);
    const dObs = (j) => trend[j] + seas[j] + noise[j] + dem[j] + ramp[j];
    const dphi = pairs.map(([a, b]) => dObs(b) - dObs(a) + 0.02 * (r() * 2 - 1));
    // arc construction order: outward from the TL node
    const xT = x[jTL];
    const arcs = pairs.map(([a, b], i) => ({ i, a, b, cx: (x[a] + x[b]) / 2, rx: (x[b] - x[a]) / 2, tl: a === jTL || b === jTL }));
    const byDist = arcs.slice().sort((p, q) => Math.abs(p.cx - xT) - Math.abs(q.cx - xT));
    byDist.forEach((a, k) => { a.rank = k / (byDist.length - 1); });
    const bpMax = Math.max(...bp.map((b) => Math.abs(b - bp[0])));
    // fit every state of the series (uncorrected … corrected) inside the plot band, above the year ticks
    let lo = 0, hi = 0;
    for (let j = 0; j < n; j++) for (const k1 of [0, 1]) for (const k2 of [0, 1]) {
      const d = trend[j] + seas[j] + noise[j] + dem[j] * (1 - k1) + ramp[j] * (1 - k2);
      lo = Math.min(lo, d); hi = Math.max(hi, d);
    }
    const top = LA.ts.y + 80, bot = LA.ts.y + LA.ts.h - 70;
    const scale = Math.min(228, (bot - top) / (hi - lo));
    NET = { n, yrs, bp, bpMax, pairs, arcs, x, jTL, xT, trend, seas, dem, ramp, noise, dphi, ts: { y0: top + hi * scale, scale } };
    return NET;
  }
  /** Displacement of date j (normalised units, ≤ 0 = away from the satellite) after corrections k1 (demErr), k2 (ramp). */
  function disp(N, j, k1, k2) { return N.trend[j] + N.seas[j] + N.noise[j] + N.dem[j] * (1 - k1) + N.ramp[j] * (1 - k2); }
  const tsY = (N, d) => N.ts.y0 - d * N.ts.scale;
  const tRow = (i) => 2.0 + (0.9 * i) / 128; // design-matrix row fill
  const tPhi = (j) => 2.95 + 0.45 * (j / 20); // solved column + dot drop

  /* ================================================================== map fields (precomputed in init) */
  let MAP = null;
  const KX = Math.cos(15.5 * Math.PI / 180) * 111.32, KM = 111.32;
  const BOWLS = [
    { lon: CAB.lon, lat: CAB.lat, sx: 3.0, sy: 3.0, a: -3.7 }, // Cabanatuan City: ~5 km across at half depth
    { lon: DAG.lon + 0.025, lat: DAG.lat - 0.02, sx: 2.3, sy: 2.3, a: -2.9 }, // Dagupan City (smaller, weaker)
    { lon: 120.9, lat: 15.84, sx: 15, sy: 24, a: -0.45 }, // soft negative tint across the valley north of Cabanatuan
    { lon: 120.72, lat: 14.93, sx: 15, sy: 11, a: -0.55 }, // lower Pampanga basin (broad, soft)
  ];
  const DAGB = BOWLS[1];
  function bowls(lon, lat) {
    let v = 0;
    for (const b of BOWLS) { const dx = ((lon - b.lon) * KX) / b.sx, dy = ((lat - b.lat) * KM) / b.sy; const e = dx * dx + dy * dy; if (e < 14) v += b.a * Math.exp(-e); }
    return v;
  }
  function fpEdge(f, lon, lat) { // > 0 inside the footprint: distance to its nearest edge (deg, lat-equivalent)
    const c = G.PATH_C0[f.p] - 0.22 * (lat - 15.5);
    return Math.min((0.4 - Math.abs(lon - c)) * G.K, lat - f.la0, f.la1 - lat);
  }
  // Table 3 (Year-2 report): valid % of each imaged frame. FOFF are coherence offsets per frame, calibrated offline so
  // the masked map reproduces these percentages (±10 points) and ~27,900 km² valid at the drawn scale.
  const FRAMES = [
    { p: 447, f: 300, pct: 20.96 }, { p: 447, f: 310, pct: 77.61 },
    { p: 448, f: 280, pct: 45.88 }, { p: 448, f: 290, pct: 63.5 }, { p: 448, f: 300, pct: 75.57 }, { p: 448, f: 310, pct: 88.32 }, { p: 448, f: 320, pct: 53.76 },
    { p: 449, f: 280, pct: 64.92 }, { p: 449, f: 290, pct: 80.73 }, { p: 449, f: 300, pct: 88.05 }, { p: 449, f: 310, pct: 64.38 }, { p: 449, f: 320, pct: 44.38 },
  ];
  const FOFF = [0.005, 0.833, 0.049, -0.143, 0.361, 0.392, 0.356, 0.144, -0.223, 0.892, 1.46, 1.3];
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
  /** Smallest t with spring(t, dur) ≥ v (v in 0..1): lets per-pixel times follow the same spring as the iris. */
  const SPR = (() => { const n = 2048, a = new Float32Array(n + 1); for (let i = 0; i <= n; i++) a[i] = L.spring(i / n, 1); return a; })();
  function invSpring(v, dur) {
    let lo = 0, hi = SPR.length - 1;
    if (v <= 0) return 0;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (SPR[mid] >= v) hi = mid; else lo = mid + 1; }
    return (lo / (SPR.length - 1)) * dur;
  }
  const rgb32 = (r, g, b, a = 255) => ((a << 24) | ((Math.min(255, b) | 0) << 16) | ((Math.min(255, g) | 0) << 8) | (Math.min(255, r) | 0)) >>> 0;
  function buildMap() {
    const w = RB.x1 - RB.x0, h = RB.y1 - RB.y0;
    const RW = Math.round(w * RS), RH = Math.round(h * RS), N = RW * RH;
    const [lonA, latB] = VIEW.inv(RB.x0, RB.y0), [lonB, latA] = VIEW.inv(RB.x1, RB.y1);
    const gx = Math.ceil(RW / 2) + 1, gy = Math.ceil(RH / 2) + 1;
    const g0 = G.grid(lonA, lonB, latA, latB, gx, gy);
    // Workaround: the shared schematic DEM starts the Cordillera Central at 16.0°N, i.e. on the flat
    // Pangasinan / Nueva Ecija plains (Dagupan ≈ 760 m, Rosales ≈ 2,000 m). Coherence there is good in the
    // report (Dagupan subsidence is measured), so flatten that tip for the coherence + relief fields only.
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
    /** One sample of every field (hero pixel or lattice cell). hz: per-sample hash, hb: 2×2-block hash (decorrelation grain). */
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
    const col = new Uint32Array(N), tIn = new Float32Array(N), tOut = new Float32Array(N), coh = new Float32Array(N);
    const uni = new Uint8Array(N), keep = new Uint8Array(N), rowKept = new Float64Array(RH);
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
        uni[k] = 1; coh[k] = s.c; col[k] = s.col & 0x00ffffff;
        // reveal: square iris opening from the bowl (interlaced rows)
        const dxN = i < iC ? (iC - i) / iC : (i - iC) / Math.max(1, RW - 1 - iC);
        tIn[k] = OPEN.t + invSpring(Math.max(dxN, dyN), OPEN.d) + par * 0.04;
        if (!s.land) tOut[k] = T.water + 0.05 + 0.4 * (j / RH) + par * 0.06;
        else if (s.edge < EW) tOut[k] = T.swath + 0.12 + 0.35 * (j / RH) + par * 0.05;
        else if (s.c < 0.7) {
          let st = 0; while (st < 3 && s.c >= THR[st]) st++;
          tOut[k] = T.thr + 0.02 + st * 0.125 + 0.08 * (j / RH) + par * 0.04;
        } else { tOut[k] = 1e9; keep[k] = 1; rowKept[j] += 1; f32[k] = (col[k] | 0xff000000) >>> 0; }
      }
    }
    bx.putImageData(bimg, 0, 0);
    fx2.putImageData(fimg, 0, 0);
    // cumulative valid fraction per row (for the tally counter)
    const cum = new Float64Array(RH); let acc = 0; for (let j = 0; j < RH; j++) { acc += rowKept[j]; cum[j] = acc; }
    for (let j = 0; j < RH; j++) cum[j] /= acc;
    // hero raster canvas (repainted per frame while the masks run)
    const cv = L.canvas(RW, RH), cx = cv.getContext('2d'), img = cx.createImageData(RW, RH);
    // coherence inset (nearest sample of the same field)
    const IW = Math.round(INSET.rw * RS), IH = Math.round(INSET.rh * RS);
    const icoh = new Float32Array(IW * IH), iuni = new Uint8Array(IW * IH);
    for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) {
      const si = Math.min(RW - 1, Math.floor(((i + 0.5) / IW) * RW)), sj = Math.min(RH - 1, Math.floor(((j + 0.5) / IH) * RH));
      const k = sj * RW + si; icoh[j * IW + i] = coh[k]; iuni[j * IW + i] = uni[k];
    }
    const icv = L.canvas(IW, IH), icx = icv.getContext('2d'), iimg = icx.createImageData(IW, IH);
    // 1/1200° lattice around the bowl (same fields, sampled at 90 m cells; noisier per cell than the display raster)
    const li0 = Math.floor((RB.x0 - AW[0]) / (CW * ZOOM.x0)) - 2, li1 = Math.ceil((RB.x1 - AW[0]) / (CW * ZOOM.x0)) + 2;
    const lj0 = Math.floor((RB.y0 - AW[1]) / (CH * ZOOM.x0)) - 2, lj1 = Math.ceil((RB.y1 - AW[1]) / (CH * ZOOM.x0)) + 2;
    const LWd = li1 - li0 + 1, LHt = lj1 - lj0 + 1;
    const lcv = L.canvas(LWd, LHt), lcx = lcv.getContext('2d'), limg = lcx.createImageData(LWd, LHt), l32 = new Uint32Array(limg.data.buffer);
    const win = new Map(); // css colours of the cells the drop animates
    for (let j = lj0; j <= lj1; j++) {
      const lat = CAB.lat - j / 1200, wy = AW[1] + j * CH;
      for (let i = li0; i <= li1; i++) {
        const lon = CAB.lon + i / 1200, wx = AW[0] + i * CW;
        const s = sample(lon, lat, wx, wy, L.hash2(i, j, 406), L.hash2(i >> 1, j >> 1, 407), 1.2);
        const ok = s.edge >= EW && s.land && s.c >= 0.7;
        const v = ok ? (s.col | 0xff000000) >>> 0 : s.land ? s.base : 0;
        l32[(j - lj0) * LWd + (i - li0)] = v;
        if (Math.max(Math.abs(i), Math.abs(j)) <= R_MAX + 1) win.set(i + ',' + j, v ? `rgb(${v & 255},${(v >>> 8) & 255},${(v >>> 16) & 255})` : null);
      }
    }
    lcx.putImageData(limg, 0, 0);
    const c0 = l32[(0 - lj0) * LWd + (0 - li0)];
    MAP = { RW, RH, N, col, tIn, tOut, coh, uni, keep, cum, base, fin, cv, cx, img, d32: new Uint32Array(img.data.buffer),
      IW, IH, icoh, iuni, icv, icx, iimg, i32: new Uint32Array(iimg.data.buffer), insetKey: '',
      lat: { cv: lcv, i0: li0, j0: lj0, w: LWd, h: LHt, win, c0: [c0 & 255, (c0 >>> 8) & 255, (c0 >>> 16) & 255] }, lonA, lonB, latA, latB };
    return MAP;
  }
  const map = () => MAP || buildMap();

  /* ================================================================== zoom, viewport, TL layout (shared by tl() and draw()) */
  /** Map zoom about the bowl: S = 1 → S_END (log-space spring), from T.zoom. */
  function zoomS(lt) {
    if (lt <= T.zoom) return 1;
    return Math.exp(L.smooth(sp(lt, T.zoom, ZOOM.d)) * Math.log(S_END));
  }
  /** Rings of cells still standing during the drop (R_MAX → 0, continuous). */
  const tRing = (r) => T.drop + (R_MAX - r) * 0.1;
  function ringsLeft(lt) { let v = 0; for (let r = 1; r <= R_MAX; r++) v += 1 - sp(lt, tRing(r), 0.28); return v; }
  /** Visible map rect (world, pre-camera): iris opening from the bowl, then the zoom frame contracting onto one cell. */
  function viewport(lt, S) {
    if (lt < T.zoom) {
      const f = sp(lt, OPEN.t, OPEN.d);
      return { x0: lerp(AW[0], RB.x0, f), x1: lerp(AW[0], RB.x1, f), y0: lerp(AW[1], RB.y0, f), y1: lerp(AW[1], RB.y1, f), f };
    }
    if (lt < T.drop) { // the zoom: frame closes from the map extent to the 9 × 9 window around the bowl
      const kv = sp(lt, T.zoom, ZOOM.dv);
      return { x0: lerp(RB.x0, AW[0] - W9.hx, kv), x1: lerp(RB.x1, AW[0] + W9.hx, kv), y0: lerp(RB.y0, AW[1] - W9.hy, kv), y1: lerp(RB.y1, AW[1] + W9.hy, kv), f: 1 };
    }
    const rv = ringsLeft(lt), hx = (rv + 0.5) * CW * S, hy = (rv + 0.5) * CH * S;
    return { x0: AW[0] - hx, x1: AW[0] + hx, y0: AW[1] - hy, y1: AW[1] + hy, f: 1 };
  }
  /** Coherence threshold shown on the slider (0.1 → 0.7 in four 16th-note steps from T.thr). */
  function threshold(lt) {
    if (lt < T.thr) return 0;
    let v = 0;
    for (let i = 0; i < THR.length; i++) {
      const at = T.thr + i * 0.125;
      if (lt < at) break;
      v = lerp(i ? THR[i - 1] : 0, THR[i], clamp(L.spring(lt - at, 0.12)));
    }
    return v;
  }
  /** World anchor + size of the TL before the finale glide. */
  function tlWorld(lt) {
    const N = net();
    const g = spo(lt, TA.out, 0.9), gs = sp(lt, TA.out, 0.9); // network → beside the bowl
    const kOn = spo(lt, T.on, 0.5), kS = sp(lt, T.on, 0.5); // onto the surviving cell
    const cell = 0.5 * (CW + CH) * S_END; // world px
    const off = lerp(46, TL_OUT, sp(lt, T.zoom, ZOOM.dv));
    const bx = AW[0] + off * (1 - kOn), by = AW[1], bs = lerp(40, cell / 1.24, kS);
    return { x: lerp(N.xT, bx, g), y: lerp(LA.net.axisY, by, g) - 60 * Math.sin(Math.PI * clamp(g)), size: lerp(TL_NET, bs, gs) };
  }
  /** Finale weights; each reaches exactly 1 at lt = 12. */
  function finale(lt) {
    const lock = L.smooth(clamp((lt - 11.45) / 0.55));
    const k = (v) => v + (1 - v) * lock;
    return { kx: k(sp(lt, T.morph, 0.5)), kp: k(sp(lt, T.fin, 0.9)), km: k(spo(lt, T.fin, 0.9)) };
  }
  function tlTarget(env) {
    const lt = env.lt, w = tlWorld(lt), f = finale(lt);
    let [x, y] = env.cam.toScreen(w.x, w.y);
    let size = w.size * env.cam.z;
    x = lerp(x, END.x, f.km); y = lerp(y, END.y, f.km); size = lerp(size, END.size, f.kp); // grow + glide to the hand-off
    const st = { x, y, size, rot: 0, alpha: 1, phase: TAU * 2 * env.t, energy: 0.45 + 0.4 * env.pulse, amp: 1 };
    const tint = f.kx <= 0 ? C.purple : f.kx >= 0.9999 ? undefined : L.mix(C.purple, C.cyan, f.kx);
    if (f.kx >= 0.9999) return { ...st, form: 'pixel', to: null, k: 0, tint };
    if (f.kx > 0) return { ...st, form: 'node', to: 'pixel', k: f.kx, tint };
    return { ...st, form: 'node', tint };
  }

  /* ================================================================== drawing helpers */
  /** Clip to the visible part of a card built with L.card(p) (contents collapse with their card). */
  function cardClip(ctx, x, y, w, h, p) {
    const k = L.ease.outCubic(clamp(p * 1.15));
    ctx.beginPath(); ctx.rect(x - 3, y - 3, w + 6, (h + 6) * k); ctx.clip();
  }
  function plate(ctx, x, y, w, h, a = 0.92) { // backplate for labels over maps
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; L.roundRect(ctx, x, y, w, h, 6); ctx.fillStyle = C.card; ctx.fill();
    ctx.strokeStyle = C.cardBorder; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  /** Mono label on a backplate (map annotations). */
  function tag(ctx, str, x, y, o) {
    const m = L.measure(ctx, str, { kind: 'mono', size: 18, weight: o.weight || 400 });
    const bx = o.align === 'right' ? x - m.w : o.align === 'center' ? x - m.w / 2 : x;
    const k = L.ease.outCubic(clamp(o.p * 1.2));
    if (o.p > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 12, y - 18, (m.w + 24) * k, 30); ctx.clip();
      plate(ctx, bx - 8, y - 15, m.w + 16, 24, 0.94);
      ctx.restore();
    }
    L.text(ctx, str, bx, y + 2, { kind: 'mono', size: 18, weight: o.weight || 400, color: o.color || C.text, p: o.p, bg: C.card, baseline: 'middle', id: o.id });
  }

  /* ---------------------------------------------------------------- section A */
  function drawTitleA(ctx, lt) {
    const pT = io(lt, 0.25, TA.text, 0.5, 0.35);
    L.text(ctx, 'Network inversion', LA.title.x, LA.title.y, { kind: 'display', size: 40, weight: 700, p: pT, scanColor: C.purple, id: 'a4-titleA' });
    const pc = io(lt, 0.5, TA.text, 0.4, 0.35), c = sp(lt, 0.5, 0.9);
    const s1 = fmt(1634 * c).padStart(5, ' '), s2 = fmt(265 * c).padStart(3, ' '), s3 = fmt(12 * c).padStart(2, ' ');
    L.text(ctx, [{ s: s1, color: C.text }, { s: ' interferograms · ', color: C.textDim }, { s: s2, color: C.text }, { s: ' dates · ', color: C.textDim }, { s: s3, color: C.text }, { s: ' frames', color: C.textDim }],
      LA.counters.x, LA.counters.y, { kind: 'mono', size: 22, weight: 600, align: 'right', p: pc, scanColor: C.purple, id: 'a4-count' });
    L.text(ctx, [{ s: 'one SBAS inversion ', color: C.textDim }, { s: 'per frame', color: INK }], LA.sub.x, LA.sub.y, { kind: 'sans', size: 22, weight: 500, align: 'right', p: io(lt, 1.0, TA.text, 0.4, 0.35), scanColor: C.purple, id: 'a4-sub' });
  }

  function drawNetwork(ctx, lt, env, hi) {
    const N = net(), R = LA.net, ay = R.axisY;
    const pc = io(lt, 0.05, TA.net, 0.6, 0.55);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    L.text(ctx, [{ s: 'P448 F0290', color: INK_CARD }, { s: ' · 21 dates · 129 interferograms', color: C.textDim }], R.x + 22, R.y + 34, { kind: 'mono', size: 18, p: io(lt, 0.5, TA.net - 0.1, 0.4, 0.4), bg: C.card, scanColor: C.purple, id: 'a4-nethead' });
    // time axis grows out of the TL node, retracts into it
    const ga = sp(lt, 0.12, 0.7) * (1 - sp(lt, TA.out + 0.1, 0.5));
    if (ga > 0) {
      ctx.strokeStyle = L.rgba(C.textDim, 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lerp(N.xT, AX.x0 - 12, ga), ay); ctx.lineTo(lerp(N.xT, AX.x1 + 12, ga), ay); ctx.stroke();
      for (let yr = 2007; yr <= 2011; yr++) {
        const x = xYr(yr), d = Math.abs(x - N.xT) / 500;
        const pt = io(lt, 0.45 + 0.25 * d, TA.net - 0.1, 0.35, 0.4);
        ctx.strokeStyle = L.rgba(C.textDim, 0.5 * pt); ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 8 * pt); ctx.stroke();
        L.text(ctx, String(yr), xYrLabel(yr), ay + 30, { kind: 'mono', size: 16, color: C.textDim, align: 'center', p: pt, role: 'deco' });
      }
    }
    // arcs (one per interferometric pair)
    const pul = env.pulse;
    ctx.lineWidth = 1.2; ctx.strokeStyle = L.rgba(INK, 0.3);
    ctx.beginPath();
    const tlArcs = [];
    for (const a of N.arcs) {
      const p = Math.min(sp(lt, 0.3 + 0.75 * a.rank, 0.4), 1 - sp(lt, TA.out + 0.3 * (1 - a.rank), 0.4));
      a.p = p;
      if (p <= 0.001) continue;
      if (a.tl) { tlArcs.push(a); continue; }
      ctx.moveTo(a.cx - a.rx, ay); ctx.ellipse(a.cx, ay, a.rx, a.rx * 0.8, 0, Math.PI, Math.PI + Math.PI * p);
    }
    ctx.stroke();
    // the TL node's own pairs: brighter purple, breathing on the beat
    ctx.lineWidth = 1.7; ctx.strokeStyle = L.rgba(INK, 0.55 + 0.3 * pul);
    ctx.beginPath();
    for (const a of tlArcs) { ctx.moveTo(a.cx - a.rx, ay); ctx.ellipse(a.cx, ay, a.rx, a.rx * 0.8, 0, Math.PI, Math.PI + Math.PI * a.p); }
    ctx.stroke();
    // rows being filled in the design matrix light their arcs
    if (hi.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [i, wgt] of hi) {
        const a = N.arcs[i];
        ctx.lineWidth = 2.2; ctx.strokeStyle = L.rgba(C.cyan, 0.85 * wgt);
        ctx.beginPath(); ctx.moveTo(a.cx - a.rx, ay); ctx.ellipse(a.cx, ay, a.rx, a.rx * 0.8, 0, Math.PI, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // date nodes, constructed outward from the TL
    for (let j = 0; j < N.n; j++) {
      if (j === N.jTL) continue; // the TL is this node
      const d = Math.abs(N.x[j] - N.xT) / 860;
      const s = sp(lt, 0.18 + 0.55 * d, 0.35) * (1 - sp(lt, TA.out + 0.05 + 0.35 * (1 - d), 0.35));
      if (s <= 0) continue;
      ctx.fillStyle = L.rgba('#C9D6EA', 0.95);
      ctx.beginPath(); ctx.arc(N.x[j], ay, 4.6 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawMatrix(ctx, lt) {
    const N = net(), R = LA.mat;
    const pc = io(lt, 1.5, TA.mat, 0.55, 0.5);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pt = io(lt, 1.62, TA.mat - 0.05, 0.45, 0.4);
    L.text(ctx, [{ s: 'A', color: C.text }, { s: ' · ', color: C.textDim }, { s: 'φ', color: INK_CARD }, { s: ' = ', color: C.textDim }, { s: 'Δφ', color: C.text }], R.x + 26, R.y + 46, { kind: 'sans', size: 34, weight: 600, p: pt, bg: C.card, scanColor: C.purple, id: 'a4-eq' });
    const out = 1; // contents leave with the card (clip)
    const cont = sp(lt, 1.8, 0.5);
    const H = 129 * MX.rh, cols = N.n;
    // frames of A, φ and Δφ
    ctx.strokeStyle = L.rgba(C.cyan, 0.22 * cont); ctx.lineWidth = 1;
    ctx.strokeRect(MX.ax - 0.5, MX.ay - 0.5, cols * MX.cw + 1, H + 1);
    ctx.strokeRect(MX.px - 0.5, MX.ay - 0.5, MX.colW + 1, H + 1);
    ctx.strokeRect(MX.dx - 0.5, MX.ay - 0.5, MX.colW + 1, H + 1);
    ctx.fillStyle = L.rgba(C.cyan, 0.05 * cont);
    for (let c = 1; c < cols; c += 2) ctx.fillRect(MX.ax + c * MX.cw, MX.ay, MX.cw, H);
    L.text(ctx, '·', (MX.ax + cols * MX.cw + MX.px) / 2, MX.ay + H / 2, { kind: 'sans', size: 30, weight: 700, color: C.textDim, align: 'center', baseline: 'middle', p: cont, role: 'deco' });
    L.text(ctx, '=', (MX.px + MX.colW + MX.dx) / 2, MX.ay + H / 2, { kind: 'sans', size: 26, weight: 600, color: C.textDim, align: 'center', baseline: 'middle', p: cont, role: 'deco' });
    // rows of A (−1 at the earlier date, +1 at the later date) and the observed Δφ
    const G1 = L.hex(C.gold), C1 = L.hex(C.cyan);
    for (let i = 0; i < 129; i++) {
      const a = clamp((lt - tRow(i)) / 0.07) * out;
      if (a <= 0) continue;
      const [ja, jb] = N.pairs[i], y = MX.ay + i * MX.rh;
      ctx.fillStyle = L.css(G1, a); ctx.fillRect(MX.ax + ja * MX.cw + 1, y, MX.cw - 2, MX.rh - 0.3);
      ctx.fillStyle = L.css(C1, a); ctx.fillRect(MX.ax + jb * MX.cw + 1, y, MX.cw - 2, MX.rh - 0.3);
      ctx.fillStyle = L.css(L.velRGB(N.dphi[i], 0.5), a); ctx.fillRect(MX.dx + 1, y, MX.colW - 2, MX.rh - 0.3);
    }
    // solved φ (displacement per date) — live with the corrections
    const k1 = sp(lt, 4.0, 0.7), k2 = sp(lt, 4.5, 0.7), ch = H / cols;
    for (let j = 0; j < cols; j++) {
      const a = clamp((lt - tPhi(j)) / 0.1) * out;
      if (a <= 0) continue;
      ctx.fillStyle = L.css(L.velRGB(disp(N, j, k1, k2), 0.9), a);
      ctx.fillRect(MX.px + 1, MX.ay + j * ch + 0.5, MX.colW - 2, ch - 1);
    }
    // fill cursor
    if (lt > 2.0 && lt < 3.0) {
      const r = clamp((lt - 2.0) / 0.9) * 128, y = MX.ay + r * MX.rh;
      const a = Math.sin(Math.PI * clamp((lt - 2.0) / 0.95));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = L.rgba(C.cyan, 0.8 * a); ctx.fillRect(MX.ax - 6, y - 1, MX.dx + MX.colW + 6 - MX.ax + 6, 2);
      ctx.fillStyle = L.rgba(C.cyan, 0.18 * a); ctx.fillRect(MX.ax - 6, y - 6, MX.dx + MX.colW + 12 - MX.ax, 12);
      ctx.restore();
    }
    // legend
    const lx = 1540, pl = (k) => io(lt, 1.85 + 0.12 * k, TA.mat - 0.05, 0.4, 0.4);
    ctx.fillStyle = L.rgba(C.cyan, pl(0)); ctx.fillRect(lx, 333, 14, 14);
    L.text(ctx, '+1 later date', lx + 24, 346, { kind: 'mono', size: 18, color: C.text, p: pl(0), bg: C.card, id: 'a4-lg1' });
    ctx.fillStyle = L.rgba(C.gold, pl(1)); ctx.fillRect(lx, 365, 14, 14);
    L.text(ctx, '−1 earlier date', lx + 24, 378, { kind: 'mono', size: 18, color: C.text, p: pl(1), bg: C.card, id: 'a4-lg2' });
    L.textLines(ctx, ['rows: pairs', 'cols: dates'], lx, 440, { kind: 'mono', size: 18, color: C.textDim, lh: 28, p: pl(2), bg: C.card, id: 'a4-lg3' });
    L.textLines(ctx, ['least squares,', 'per pixel'], lx, 556, { kind: 'mono', size: 18, color: INK_CARD, lh: 28, p: io(lt, 2.4, TA.mat - 0.05, 0.4, 0.4), bg: C.card, id: 'a4-lg4' });
    ctx.restore();
  }

  function drawSeries(ctx, lt, env) {
    const N = net(), R = LA.ts;
    const pc = io(lt, 1.75, TA.ts, 0.55, 0.55);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pe = TA.ts - 0.1; // texts scan out as the card retracts
    L.text(ctx, [{ s: 'example pixel', color: C.text }, { s: ' · schematic', color: C.textDim }], R.x + 22, R.y + 34, { kind: 'mono', size: 18, p: io(lt, 1.9, pe, 0.4, 0.4), bg: C.card, scanColor: C.purple, id: 'a4-tshead' });
    L.text(ctx, 'cumulative LOS displacement', R.x + R.w - 22, R.y + 34, { kind: 'mono', size: 18, color: C.textDim, align: 'right', p: io(lt, 2.05, pe, 0.4, 0.4), bg: C.card, id: 'a4-tsy' });
    const out = 1; // contents leave with the card (clip)
    const ax = sp(lt, 2.0, 0.6);
    // zero line + year grid
    const y0 = N.ts.y0;
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = L.rgba(C.textDim, 0.45); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(AX.x0 - 10, y0); ctx.lineTo(lerp(AX.x0 - 10, AX.x1 + 10, ax), y0); ctx.stroke(); ctx.restore();
    for (let yr = 2007; yr <= 2011; yr++) {
      const x = xYr(yr), pt = io(lt, 2.05 + 0.06 * (yr - 2007), pe, 0.4, 0.4);
      ctx.strokeStyle = L.rgba(C.cyan, 0.07 * pt); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, R.y + 52); ctx.lineTo(x, R.y + R.h - 44); ctx.stroke();
      ctx.strokeStyle = L.rgba(C.textDim, 0.5 * pt); ctx.beginPath(); ctx.moveTo(x, R.y + R.h - 44); ctx.lineTo(x, R.y + R.h - 36); ctx.stroke();
      L.text(ctx, String(yr), xYrLabel(yr), R.y + R.h - 18, { kind: 'mono', size: 16, color: C.textDim, align: 'center', p: pt, role: 'deco' });
    }
    // sign convention (the series has no value axis: schematic)
    L.text(ctx, [{ s: '↓', color: INK_CARD }, { s: ' away from satellite', color: C.textDim }], AX.x0 + 8, R.y + R.h - 56, { kind: 'mono', size: 18, p: io(lt, 2.3, pe, 0.4, 0.4), bg: C.card, id: 'a4-sign' });
    const k1 = sp(lt, 4.0, 0.7), k2 = sp(lt, 4.5, 0.7);
    // dots drop from their network node; each segment draws on as its later dot lands
    const pts = [];
    for (let j = 0; j < N.n; j++) {
      const t0 = tPhi(j);
      if (lt < t0) break;
      const f = spo(lt, t0, 0.5), y = lerp(LA.net.axisY, tsY(N, disp(N, j, k1, k2)), f);
      pts.push([N.x[j], y, f, j]);
    }
    ctx.strokeStyle = L.rgba(INK, 0.6 * out); ctx.lineWidth = 1.6;
    for (let k = 1; k < pts.length; k++) {
      const pp = clamp((pts[k][2] - 0.6) / 0.4);
      if (pp <= 0) continue;
      L.polyPartial(ctx, [pts[k - 1], pts[k]], pp); ctx.stroke();
    }
    // velocity fit through the corrected series
    const pf = sp(lt, 4.9, 0.45) * out;
    if (pf > 0) {
      const a = [N.x[0], tsY(N, 0)], b = [N.x[N.n - 1], tsY(N, N.trend[N.n - 1])];
      ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.85); ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
      L.polyPartial(ctx, [a, b], pf); ctx.stroke(); ctx.restore();
    }
    for (const [x, y, f, j] of pts) {
      if (f < 0.98) { // falling trail
        ctx.strokeStyle = L.rgba(C.purple, 0.35 * (1 - clamp(f))); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, LA.net.axisY); ctx.lineTo(x, y); ctx.stroke();
      }
      const r = 5.5 * clamp(f * 3) * out;
      if (r <= 0) continue;
      ctx.fillStyle = j === N.jTL ? C.purple : '#D9E4F5';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (j === N.jTL) { ctx.strokeStyle = L.rgba(INK, 0.9 * out); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 5 + 3 * env.pulse, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawDem(ctx, lt) {
    const N = net(), R = LA.dem;
    const pc = io(lt, 2.95, TA.dem, 0.5, 0.45);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pt = (k) => io(lt, 3.05 + 0.1 * k, TA.dem - 0.05, 0.4, 0.4);
    L.text(ctx, 'demErr', R.x + 22, R.y + 40, { kind: 'mono', size: 22, weight: 600, color: INK_CARD, p: pt(0), bg: C.card, scanColor: C.purple, id: 'a4-dem1' });
    L.text(ctx, 'DEM-error correction', R.x + 22, R.y + 74, { kind: 'sans', size: 22, weight: 500, color: C.text, p: pt(1), bg: C.card, id: 'a4-dem2' });
    L.text(ctx, 'phase vs B⊥ trend → 0', R.x + 22, R.y + 110, { kind: 'mono', size: 18, color: C.textDim, p: pt(2), bg: C.card, id: 'a4-dem3' });
    const k1 = sp(lt, 4.0, 0.7), out = 1, pa = sp(lt, 3.2, 0.5); // contents leave with the card (clip)
    const ym = (DP.y0 + DP.y1) / 2, xm = (DP.x0 + DP.x1) / 2, sx = (DP.x1 - DP.x0) / 2 - 8, sy = (DP.y1 - DP.y0) / 2 - 6;
    ctx.strokeStyle = L.rgba(C.textDim, 0.45 * pa); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(DP.x0, ym); ctx.lineTo(lerp(DP.x0, DP.x1, pa), ym); ctx.moveTo(xm, DP.y1); ctx.lineTo(xm, lerp(DP.y1, DP.y0, pa)); ctx.stroke();
    L.text(ctx, 'B⊥', DP.x1, ym + 20, { kind: 'mono', size: 16, color: C.textDim, align: 'right', p: pa, role: 'deco' });
    L.text(ctx, 'phase', xm + 8, DP.y0 + 12, { kind: 'mono', size: 16, color: C.textDim, p: pa, role: 'deco' });
    // x = B⊥ of each date, y = residual topographic phase ∝ B⊥ (DEM error); removed by demErr
    const bmin = Math.min(...N.bp), bmax = Math.max(...N.bp), bmid = (bmin + bmax) / 2, bh = (bmax - bmin) / 2;
    const px = (b) => xm + ((b - bmid) / bh) * sx;
    const py = (b, extra) => ym - (((b - bmid) / bh) * 0.5 * (1 - k1) + extra) * sy * 1.6; // offset is arbitrary: centred
    const pl = sp(lt, 3.35, 0.4) * out; // regression line rotates flat as the DEM error is removed
    if (pl > 0) {
      ctx.strokeStyle = L.rgba(C.cyan, 0.9); ctx.lineWidth = 2;
      L.polyPartial(ctx, [[px(bmin) - 4, py(bmin - 4 * bh / sx, 0)], [px(bmax) + 4, py(bmax + 4 * bh / sx, 0)]], pl); ctx.stroke();
    }
    for (let j = 0; j < N.n; j++) {
      const x = px(N.bp[j]), y = py(N.bp[j], (N.noise[j] / 0.16) * 0.6);
      const r = 3.6 * sp(lt, 3.25 + 0.015 * j, 0.3) * out;
      if (r <= 0) continue;
      ctx.fillStyle = j === N.jTL ? C.purple : L.rgba('#D9E4F5', 0.95);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawRamp(ctx, lt) {
    const R = LA.ramp;
    const pc = io(lt, 3.1, TA.ramp, 0.5, 0.45);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pt = (k) => io(lt, 3.2 + 0.1 * k, TA.ramp - 0.05, 0.4, 0.4);
    L.text(ctx, 'demErr_ramp', R.x + 22, R.y + 40, { kind: 'mono', size: 22, weight: 600, color: INK_CARD, p: pt(0), bg: C.card, scanColor: C.purple, id: 'a4-rmp1' });
    L.text(ctx, '+ orbital ramp removal', R.x + 22, R.y + 74, { kind: 'sans', size: 22, weight: 500, color: C.text, p: pt(1), bg: C.card, id: 'a4-rmp2' });
    L.text(ctx, 'planar ramp → flat', R.x + 22, R.y + 108, { kind: 'mono', size: 18, color: C.textDim, p: pt(2), bg: C.card, id: 'a4-rmp3' });
    // tile: unwrapped residual LOS (velocity colours) = planar orbital ramp + noise; the plane is subtracted
    const k2 = sp(lt, 4.5, 0.7), rv = sp(lt, 3.3, 0.45); // leaves with the card (clip)
    if (rv > 0) {
      const tw = Math.round(RT.w * RS), th = Math.round(RT.h * RS);
      const r = L.rasterCanvas('a4-ramp', tw, th), d = r.img.data, lut = L.LUT.vel;
      const amp = 0.8 * (1 - k2);
      for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
        const u = i / tw - 0.5, v = j / th - 0.5;
        const val = amp * (1.3 * u + 0.55 * v) + 0.1 * (L.hash2(i >> 1, j >> 1, 77) - 0.5) + 0.05 * Math.sin(u * 9 + v * 5);
        const idx = ((clamp((val + 1) / 2) * 255) | 0) * 3, o = (j * tw + i) * 4;
        d[o] = lut[idx]; d[o + 1] = lut[idx + 1]; d[o + 2] = lut[idx + 2]; d[o + 3] = 255;
      }
      r.x.putImageData(r.img, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(RT.x, RT.y, RT.w, RT.h * L.ease.outCubic(rv)); ctx.clip();
      ctx.drawImage(r.c, RT.x, RT.y, RT.w, RT.h);
      // profile along the tile: tilted with the ramp, rotates flat as it is removed
      const ym = RT.y + RT.h / 2, tilt = 0.42 * RT.h * (1 - k2);
      ctx.strokeStyle = L.rgba(C.text, 0.85); ctx.lineWidth = 2;
      L.polyPartial(ctx, [[RT.x + 8, ym + tilt / 2], [RT.x + RT.w - 8, ym - tilt / 2]], sp(lt, 3.45, 0.45)); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = L.rgba(C.cyan, 0.35 * rv); ctx.lineWidth = 1; ctx.strokeRect(RT.x - 0.5, RT.y - 0.5, RT.w + 1, RT.h + 1);
      // subtraction sweep
      if (lt > 4.5 && lt < 5.3) {
        const s = sp(lt, 4.5, 0.6), x = RT.x + RT.w * s, a = Math.sin(Math.PI * clamp((lt - 4.5) / 0.8));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = L.rgba(C.cyan, 0.8 * a); ctx.fillRect(x - 1, RT.y, 2, RT.h);
        ctx.fillStyle = L.rgba(C.cyan, 0.15 * a); ctx.fillRect(x - 8, RT.y, 16, RT.h);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- section B */
  function paintHero(lt) {
    const M = map();
    if (lt >= T.thr + 0.6) return M.fin; // every mask has run: the final valid raster (precomputed)
    const d32 = M.d32, col = M.col, tIn = M.tIn, tOut = M.tOut;
    for (let i = 0, n = M.N; i < n; i++) {
      const a = Math.min(lt - tIn[i], tOut[i] - lt) * 10;
      d32[i] = a <= 0 ? 0 : (col[i] | ((a >= 1 ? 255 : (a * 255) | 0) << 24)) >>> 0;
    }
    M.cx.putImageData(M.img, 0, 0);
    return M.cv;
  }
  function paintInset(thr, rev) {
    const M = map(), IW = M.IW, IH = M.IH;
    const rows = Math.floor(IH * rev), key = rows + ':' + thr.toFixed(3);
    if (key === M.insetKey) return M.icv; // pure cache: same inputs, same pixels
    M.insetKey = key;
    const lut = L.LUT.coh, i32 = M.i32;
    for (let j = 0; j < IH; j++) {
      const on = j <= rows || ((j & 1) === 0 && j <= rows * 1.15);
      for (let i = 0; i < IW; i++) {
        const k = j * IW + i;
        if (!on || !M.iuni[k]) { i32[k] = 0; continue; }
        const c = M.icoh[k], o = Math.min(255, (c * 255) | 0) * 3;
        const low = c < thr;
        const m = low ? 0.3 : 1, a = low ? 170 : 255;
        i32[k] = ((a << 24) | (((lut[o + 2] * m) | 0) << 16) | (((lut[o + 1] * m) | 0) << 8) | ((lut[o] * m) | 0)) >>> 0;
      }
    }
    M.icx.putImageData(M.iimg, 0, 0);
    return M.icv;
  }
  /** Zoomed view: same projection, ppd × S, pinned on the bowl's cell. */
  const zoomView = (S) => (S === 1 ? VIEW : G.view({ lon: CAB.lon, lat: CAB.lat, ppd: VIEW.ppd * S, cx: AW[0], cy: AW[1] }));
  /** Clip that excludes small discs (keeps lines off the bowl and the TL). */
  function clipHoles(ctx, vp, holes) {
    ctx.beginPath(); ctx.rect(vp.x0 - 4, vp.y0 - 4, vp.x1 - vp.x0 + 8, vp.y1 - vp.y0 + 8);
    for (const [x, y, r] of holes) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU, true); }
    ctx.clip('evenodd');
  }
  function insetFootprint(fp, V) { return G.footprint(fp.p, fp.la0 + EW, fp.la1 - EW, 0.4 - EW / G.K).map(([lo, la]) => V.pt(lo, la)); }

  function drawMap(ctx, lt, env) {
    if (lt < OPEN.t || lt > T.fin + 0.2) return;
    const M = map(), W = RB.x1 - RB.x0, H = RB.y1 - RB.y0;
    const S = zoomS(lt), V = zoomView(S), vp = viewport(lt, S);
    const xf = smooth01((S - ZOOM.x0) / (ZOOM.x1 - ZOOM.x0)); // display raster → 90 m lattice
    const zf = 1 - sp(lt, T.zoom, 0.45); // map furniture fades as the zoom starts
    const cellW = CW * S, cellH = CH * S;
    ctx.save();
    ctx.beginPath(); ctx.rect(vp.x0, vp.y0, vp.x1 - vp.x0, vp.y1 - vp.y0); ctx.clip();
    if (lt < T.drop) {
      if (xf < 1) { // hillshade base + LOS velocity raster (all masks applied per pixel), zoomed about the bowl
        ctx.save();
        ctx.translate(AW[0], AW[1]); ctx.scale(S, S); ctx.translate(-AW[0], -AW[1]);
        ctx.beginPath(); ctx.rect(RB.x0, RB.y0, W, H); ctx.clip();
        ctx.globalAlpha = 0.95; ctx.drawImage(M.base, RB.x0, RB.y0, W, H); ctx.globalAlpha = 1;
        ctx.drawImage(paintHero(lt), RB.x0, RB.y0, W, H);
        ctx.restore();
      }
      if (xf > 0) { // the 1/1200° lattice: nearest-neighbour once a cell spans more than ~1.5 screen px
        const LT = M.lat;
        const ia = Math.max(LT.i0, Math.floor((vp.x0 - AW[0]) / cellW - 0.5)), ib = Math.min(LT.i0 + LT.w - 1, Math.ceil((vp.x1 - AW[0]) / cellW + 0.5));
        const ja = Math.max(LT.j0, Math.floor((vp.y0 - AW[1]) / cellH - 0.5)), jb = Math.min(LT.j0 + LT.h - 1, Math.ceil((vp.y1 - AW[1]) / cellH + 0.5));
        if (ib >= ia && jb >= ja) {
          ctx.save(); ctx.globalAlpha = xf;
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
    } else { // bar 21: every cell but the bowl's deepest one drops, ring by ring from the outside in
      const gap = 0.6 / env.cam.z;
      for (let j = -R_MAX; j <= R_MAX; j++) for (let i = -R_MAX; i <= R_MAX; i++) {
        const r = Math.max(Math.abs(i), Math.abs(j));
        const k = r === 0 ? (lt < T.fin ? 1 : 0) : 1 - sp(lt, tRing(r), 0.28);
        if (k <= 0) continue;
        const css = M.lat.win.get(i + ',' + j);
        if (!css) continue;
        const cxw = AW[0] + i * cellW, cyw = AW[1] + j * cellH;
        if (cxw + cellW / 2 < vp.x0 || cxw - cellW / 2 > vp.x1 || cyw + cellH / 2 < vp.y0 || cyw - cellH / 2 > vp.y1) continue;
        ctx.fillStyle = css;
        ctx.fillRect(cxw - (cellW / 2 - gap) * k, cyw - (cellH / 2 - gap) * k, (cellW - 2 * gap) * k, (cellH - 2 * gap) * k);
      }
    }
    // coastline (fades out with the zoom)
    if (zf > 0) G.drawLand(ctx, V, { which: 'ph', stroke: L.rgba(C.cyan, 0.42 * zf), lw: 1.2 });
    // mask sweeps (water, swath edge) and the tally scan
    const sweep = (t0, dur, color, w = 2) => {
      if (lt < t0 || lt > t0 + dur + 0.15) return;
      const s = clamp((lt - t0) / dur), y = RB.y0 + H * s, a = Math.sin(Math.PI * clamp((lt - t0) / (dur + 0.15)));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = L.rgba(color, 0.85 * a); ctx.fillRect(RB.x0, y - w / 2, W, w);
      ctx.fillStyle = L.rgba(color, 0.2 * a); ctx.fillRect(RB.x0, y - 8, W, 16);
      ctx.restore();
    };
    sweep(T.water + 0.05, 0.45, C.cyan);
    if (lt >= T.tally && lt < T.tally + 0.9) {
      const s = sp(lt, T.tally, 0.5), y = RB.y0 + H * s, a = 1 - sp(lt, T.tally + 0.4, 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = L.rgba(C.cyan, 0.9 * a); ctx.fillRect(RB.x0, y - 1, W, 2);
      const gr = ctx.createLinearGradient(0, y - 60, 0, y);
      gr.addColorStop(0, L.rgba(C.cyan, 0)); gr.addColorStop(1, L.rgba(C.cyan, 0.12 * a));
      ctx.fillStyle = gr; ctx.fillRect(RB.x0, y - 60, W, 60);
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
    // footprints (P447/448/449) and frame ticks — kept off the bowl and the TL
    const tlw = tlWorld(lt);
    const fa = sp(lt, OPEN.t + 0.6, 0.6) * zf;
    const fpts = FP.map((fp) => G.footprint(fp.p, fp.la0, fp.la1).map(([lo, la]) => V.pt(lo, la)));
    if (fa > 0.002) {
      ctx.save(); clipHoles(ctx, vp, [[AW[0], AW[1], 22], [tlw.x, tlw.y, tlw.size * 0.62]]);
      FP.forEach((fp, k) => {
        const p = sp(lt, OPEN.t + 0.6 + 0.12 * k, 0.7);
        if (p <= 0) return;
        const pts = fpts[k];
        ctx.strokeStyle = L.rgba('#C9D6EA', 0.75 * fa); ctx.lineWidth = 1.6; ctx.setLineDash([]);
        L.polyPartial(ctx, [...pts, pts[0]], p); ctx.stroke();
        const pf = sp(lt, OPEN.t + 1.0 + 0.1 * k, 0.5);
        ctx.strokeStyle = L.rgba('#C9D6EA', 0.35 * pf * fa); ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
        ctx.beginPath();
        for (const fr of fp.frames) {
          const la = G.frameLats[fr][0];
          const c = G.PATH_C0[fp.p] - 0.22 * (la - 15.5);
          const [xa, ya] = V.pt(c - 0.4, la), [xb] = V.pt(c + 0.4, la);
          ctx.moveTo(xa, ya); ctx.lineTo(lerp(xa, xb, pf), ya);
        }
        ctx.stroke(); ctx.setLineDash([]);
      });
      // Philippine Fault Zone (schematic), drawn on south → north
      const pp = sp(lt, OPEN.t + 1.05, 0.9);
      if (pp > 0) {
        ctx.strokeStyle = L.rgba(C.gold, 0.92 * zf); ctx.lineWidth = 2.4; ctx.setLineDash([12, 6]);
        L.polyPartial(ctx, G.faults.pfz.map(([lo, la]) => V.pt(lo, la)), pp); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    }
    // bowl markers (same treatment for both sites)
    const pr = io(lt, OPEN.t + 1.3, T.zoom + 0.35, 0.4, 0.35);
    if (pr > 0) {
      const [dx, dy] = V.pt(DAGB.lon, DAGB.lat);
      ctx.strokeStyle = L.rgba(C.text, 0.85 * pr); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(dx, dy, 13 * pr, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(AW[0], AW[1], 15 * pr, 0, TAU); ctx.stroke();
    }
    // the bowl's deepest cell: outlined once the lattice is legible
    const ph = io(lt, T.tag, T.on + 0.55, 0.35, 0.3);
    if (ph > 0) {
      const hx = cellW / 2, hy = cellH / 2;
      ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 2 / env.cam.z;
      L.polyPartial(ctx, [[AW[0] - hx, AW[1] - hy], [AW[0] + hx, AW[1] - hy], [AW[0] + hx, AW[1] + hy], [AW[0] - hx, AW[1] + hy], [AW[0] - hx, AW[1] - hy]], ph); ctx.stroke();
    }
    ctx.restore(); // viewport clip
    // map frame = the viewport (iris → zoom frame → contracting viewfinder)
    if (vp.x1 - vp.x0 > 1) {
      const moving = lt < OPEN.t + 0.95 || lt >= T.zoom;
      const fr = lt >= T.drop ? 1 - sp(lt, T.on + 0.3, 0.3) : 1;
      if (fr > 0) {
        ctx.strokeStyle = L.rgba(C.cyan, (moving ? 0.6 : 0.22) * fr); ctx.lineWidth = 1.2;
        ctx.strokeRect(vp.x0 - 0.5, vp.y0 - 0.5, vp.x1 - vp.x0 + 1, vp.y1 - vp.y0 + 1);
        const bk = lt >= T.zoom ? sp(lt, T.zoom, 0.3) * fr : 1 - sp(lt, OPEN.t + 0.6, 0.4);
        if (bk > 0) { // viewfinder corner brackets while the frame moves
          const c = Math.min(20, 0.25 * Math.min(vp.x1 - vp.x0, vp.y1 - vp.y0) + 4);
          ctx.strokeStyle = L.rgba(C.cyan, 0.9 * bk); ctx.lineWidth = 2; ctx.beginPath();
          for (const [cx, cy, sx, sy] of [[vp.x0, vp.y0, 1, 1], [vp.x1, vp.y0, -1, 1], [vp.x0, vp.y1, 1, -1], [vp.x1, vp.y1, -1, -1]]) { ctx.moveTo(cx + sx * c, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * c); }
          ctx.stroke();
        }
      }
    }
    // labels (on backplates, anchored at map scale): they clear just before the zoom; Cabanatuan's rides into it
    const pl = (a, b = T.zoom + 0.2) => io(lt, a, b, 0.4, 0.3);
    const f0 = FP.map((fp) => G.footprint(fp.p, fp.la0, fp.la1).map(([lo, la]) => VIEW.pt(lo, la)));
    tag(ctx, 'P449', (f0[0][2][0] + f0[0][3][0]) / 2, f0[0][3][1] + 22, { p: pl(6.75), align: 'center', id: 'a4-p449' });
    tag(ctx, 'P448', (f0[1][2][0] + f0[1][3][0]) / 2, f0[1][3][1] + 22, { p: pl(6.82), align: 'center', id: 'a4-p448' });
    tag(ctx, 'P447', (f0[2][2][0] + f0[2][3][0]) / 2, f0[2][3][1] - 18, { p: pl(6.9), align: 'center', id: 'a4-p447' });
    const [dgx, dgy] = VIEW.pt(DAGB.lon, DAGB.lat);
    tag(ctx, 'Dagupan City', dgx, dgy - 30, { p: pl(6.95), align: 'center', id: 'a4-dag' });
    tag(ctx, 'Cabanatuan City', AW[0] - 26, AW[1] + 1, { p: pl(6.7, T.zoom + 0.55), align: 'right', id: 'a4-cab' });
    const [fx, fy] = VIEW.pt(120.93, 16.33);
    const pfl = pl(6.95);
    if (pfl > 0) {
      ctx.strokeStyle = L.rgba(C.gold, 0.7 * pfl); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(fx + 3, fy); ctx.lineTo(fx + 30 * pfl, fy - 26 * pfl); ctx.stroke();
    }
    tag(ctx, 'Philippine Fault Zone', fx + 40, fy - 44, { p: pfl, color: C.gold, id: 'a4-pfz1' });
    tag(ctx, '(schematic)', fx + 40, fy - 14, { p: pfl, color: C.textDim, id: 'a4-pfz2' });
  }

  function drawInset(ctx, lt, thr) {
    const R = INSET;
    const pc = io(lt, 6.0, 11.25, 0.5, 0.5);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc <= 0) return;
    ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
    const pe = 11.1;
    L.text(ctx, 'temporal coherence', R.rx, R.y + 34, { kind: 'sans', size: 22, weight: 600, color: C.text, p: io(lt, 6.1, pe, 0.4, 0.35), bg: C.card, id: 'a4-cohT' });
    const rev = sp(lt, 6.2, 0.7);
    if (rev > 0) {
      ctx.drawImage(paintInset(thr, clamp(rev * 1.05)), R.rx, R.ry, R.rw, R.rh);
      ctx.save(); ctx.beginPath(); ctx.rect(R.rx, R.ry, R.rw, R.rh * rev); ctx.clip();
      G.drawLand(ctx, VIEW_IN, { which: 'ph', stroke: L.rgba(C.cyan, 0.5), lw: 1 });
      ctx.restore();
      ctx.strokeStyle = L.rgba(C.cyan, 0.2); ctx.lineWidth = 1; ctx.strokeRect(R.rx - 0.5, R.ry - 0.5, R.rw + 1, R.rh + 1);
    }
    // colorbar with the moving threshold marker
    const by = R.ry + R.rh + 22, pb = io(lt, 6.45, pe, 0.4, 0.35);
    if (pb > 0) {
      const g = ctx.createLinearGradient(R.rx, 0, R.rx + R.rw, 0);
      for (let s = 0; s <= 10; s++) g.addColorStop(s / 10, L.css(L.cohRGB(s / 10)));
      ctx.save(); ctx.beginPath(); ctx.rect(R.rx, by, R.rw * pb, 10); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(R.rx, by, R.rw, 10); ctx.restore();
      ctx.strokeStyle = L.rgba(C.cyan, 0.3 * pb); ctx.strokeRect(R.rx - 0.5, by - 0.5, R.rw + 1, 11);
      L.text(ctx, '0', R.rx, by + 30, { kind: 'mono', size: 16, color: C.textDim, p: pb, role: 'deco' });
      L.text(ctx, '1', R.rx + R.rw, by + 30, { kind: 'mono', size: 16, color: C.textDim, align: 'right', p: pb, role: 'deco' });
      const tx = R.rx + R.rw * thr;
      if (thr > 0) {
        ctx.fillStyle = L.rgba(INK, pb); ctx.beginPath(); ctx.moveTo(tx, by - 2); ctx.lineTo(tx - 6, by - 11); ctx.lineTo(tx + 6, by - 11); ctx.closePath(); ctx.fill();
        ctx.fillRect(tx - 1, by - 2, 2, 14);
      }
    }
    L.textLines(ctx, ['dark = decorrelated:', 'forest · mountains', 'water'], R.rx, by + 64, { kind: 'mono', size: 18, color: C.textDim, lh: 26, p: io(lt, 6.65, pe, 0.45, 0.35), bg: C.card, id: 'a4-cohN' });
    ctx.restore();
  }

  function drawPanel(ctx, lt, env, thr) {
    const M = map();
    // title
    L.text(ctx, 'Coherence masking', PANEL.title.x, PANEL.title.y, { kind: 'display', size: 40, weight: 700, p: io(lt, 5.75, 11.2, 0.5, 0.4), scanColor: C.purple, id: 'a4-titleB' });
    // masks card
    let R = PANEL.masks, pc = io(lt, 5.9, 11.3, 0.5, 0.5);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc > 0) {
      ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
      const pe = 11.2;
      const pt = io(lt, 6.05, pe, 0.4, 0.35);
      const val = (Math.round(thr * 10) / 10).toFixed(1);
      L.text(ctx, [{ s: 'temporal coherence ≥ ', color: C.text }, { s: val, color: INK_CARD, weight: 600 }], SL.x0, R.y + 50, { kind: 'mono', size: 24, p: pt, bg: C.card, scanColor: C.purple, id: 'a4-slT' });
      // slider
      const ps = sp(lt, 6.15, 0.6) * (1 - sp(lt, pe - 0.3, 0.4));
      const tw = (SL.x1 - SL.x0) * ps;
      ctx.fillStyle = L.rgba(C.textDim, 0.25); ctx.fillRect(SL.x0, SL.y - 2, tw, 4);
      for (let s = 0; s <= 10; s++) { const x = SL.x0 + (SL.x1 - SL.x0) * s / 10; if (x > SL.x0 + tw) break; ctx.fillStyle = L.rgba(C.textDim, s === 7 ? 0.9 : 0.45); ctx.fillRect(x - 0.75, SL.y + 8, 1.5, s === 7 ? 12 : 7); }
      L.text(ctx, '0', SL.x0, SL.y + 40, { kind: 'mono', size: 16, color: C.textDim, p: ps, role: 'deco' });
      L.text(ctx, '0.7', SL.x0 + (SL.x1 - SL.x0) * 0.7, SL.y + 40, { kind: 'mono', size: 16, color: C.textDim, align: 'center', p: ps, role: 'deco' });
      L.text(ctx, '1', SL.x1, SL.y + 40, { kind: 'mono', size: 16, color: C.textDim, align: 'right', p: ps, role: 'deco' });
      const kx = SL.x0 + (SL.x1 - SL.x0) * thr;
      if (ps > 0.05) {
        ctx.fillStyle = C.purple; ctx.fillRect(SL.x0, SL.y - 2, kx - SL.x0, 4);
        L.glow(ctx, kx, SL.y, 26, C.purple, (0.4 + 0.6 * env.pulse) * ps);
        ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(kx, SL.y, 8 * ps, 0, TAU); ctx.fill();
        ctx.strokeStyle = L.rgba(C.purple, 1); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(kx, SL.y, 8 * ps, 0, TAU); ctx.stroke();
        if (thr >= 0.7 - 1e-6) { const ph = (env.t * 2) % 1; ctx.strokeStyle = L.rgba(INK, 0.6 * (1 - ph) * ps); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(kx, SL.y, 12 + 10 * ph, 0, TAU); ctx.stroke(); }
      }
      // mask checklist
      const row = (k, label, tCheck, y) => {
        const p = io(lt, 6.25 + 0.12 * k, pe, 0.4, 0.35);
        if (p <= 0) return;
        const bx = SL.x0, by = y - 13;
        ctx.strokeStyle = L.rgba(C.cyan, 0.6 * p); ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, 24, 24);
        const ck = sp(lt, tCheck, 0.35);
        if (ck > 0) {
          ctx.fillStyle = L.rgba(C.cyan, 0.16 * ck); ctx.fillRect(bx, by, 24, 24);
          ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          L.polyPartial(ctx, [[bx + 5, by + 12], [bx + 10, by + 18], [bx + 19, by + 6]], ck * p); ctx.stroke(); ctx.lineCap = 'butt';
        }
        L.text(ctx, label, bx + 44, y, { kind: 'sans', size: 24, weight: 500, color: ck > 0.5 ? C.text : C.textDim, baseline: 'middle', p, bg: C.card, id: 'a4-mask' + k });
      };
      row(0, 'water mask', T.water + 0.05, R.y + 170);
      row(1, 'swath-edge mask', T.swath + 0.3, R.y + 216);
      ctx.restore();
    }
    // valid-area card (stays longest: the final number reads for > 1.5 s)
    R = PANEL.valid; pc = io(lt, 6.15, 11.6, 0.5, 0.55);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc > 0) {
      ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
      const pe = 11.55; // texts scan out while the card retracts (no empty shell)
      L.text(ctx, 'valid area', VB.x0, R.y + 42, { kind: 'sans', size: 22, weight: 500, color: C.textDim, p: io(lt, 6.55, pe, 0.4, 0.35), bg: C.card, id: 'a4-vaL' });
      const s = sp(lt, T.tally, 0.5);
      const rowI = Math.min(M.RH - 1, Math.floor(s * M.RH));
      const area = s >= 0.999 ? 27893 : Math.round(27893 * (lt >= T.tally ? M.cum[rowI] : 0));
      // placeholder until the tally scan runs, then the live count (same id: they swap in place)
      const ph = io(lt, 6.7, T.tally + 0.05, 0.4, 0.25);
      if (ph > 0) L.text(ctx, [{ s: '—', color: C.textDim }, { s: ' km²', color: C.textDim }], VB.x0, R.y + 118, { kind: 'display', size: 64, weight: 700, p: ph, bg: C.card, scanColor: C.purple, id: 'a4-area' });
      const pn = io(lt, T.tally - 0.05, pe, 0.35, 0.35);
      L.text(ctx, [{ s: fmt(area), color: C.text }, { s: ' km²', color: C.textDim }], VB.x0, R.y + 118, { kind: 'display', size: 64, weight: 700, p: pn, bg: C.card, scanColor: C.purple, id: 'a4-area' });
      // bar with the target tick
      const pb = sp(lt, 6.6, 0.6) * (1 - sp(lt, pe - 0.2, 0.4)), bw = (VB.x1 - VB.x0) * pb;
      ctx.fillStyle = L.rgba(C.textDim, 0.2); ctx.fillRect(VB.x0, VB.y, bw, 10);
      ctx.fillStyle = C.purple; ctx.fillRect(VB.x0, VB.y, Math.min(bw, (VB.x1 - VB.x0) * (area / VB.max)), 10);
      const tx = VB.x0 + (VB.x1 - VB.x0) * (25000 / VB.max);
      const hit = area >= 25000;
      const ptg = io(lt, 6.75, pe, 0.4, 0.35);
      ctx.fillStyle = L.rgba(hit ? C.cyan : C.text, 0.9 * ptg); ctx.fillRect(tx - 1, VB.y - 12, 2, 34);
      if (hit) L.glow(ctx, tx, VB.y + 5, 30, C.cyan, 0.6 * sp(lt, T.tally + 0.3, 0.3) * (0.6 + 0.4 * env.pulse) * ptg);
      L.text(ctx, [{ s: 'target 25,000 km²', color: hit ? C.text : C.textDim }, { s: hit ? ' ✓' : '', color: C.cyan }], tx, VB.y + 52, { kind: 'mono', size: 18, align: 'center', p: ptg, bg: C.card, id: 'a4-target' });
      L.text(ctx, '12 frames · paths 447–449', VB.x0, VB.y + 52, { kind: 'mono', size: 18, color: C.textDim, p: io(lt, 6.85, pe, 0.4, 0.35), bg: C.card, id: 'a4-frames' });
      ctx.restore();
    }
    // LOS velocity legend
    R = PANEL.legend; pc = io(lt, 6.35, 11.4, 0.5, 0.5);
    L.card(ctx, R.x, R.y, R.w, R.h, { p: pc, accent: C.purple });
    if (pc > 0) {
      ctx.save(); cardClip(ctx, R.x, R.y, R.w, R.h, pc);
      const pt = io(lt, 6.5, 11.25, 0.4, 0.35);
      L.text(ctx, [{ s: 'LOS velocity', color: C.text }, { s: ' · schematic', color: C.textDim }], VB.x0, R.y + 40, { kind: 'mono', size: 18, p: pt, bg: C.card, id: 'a4-lgT' });
      const g = ctx.createLinearGradient(VB.x0, 0, VB.x1, 0);
      for (let s = 0; s <= 12; s++) g.addColorStop(s / 12, L.css(L.velRGB(-1 + s / 6, 1)));
      const pb = sp(lt, 6.6, 0.6) * (1 - sp(lt, 10.95, 0.35));
      ctx.save(); ctx.beginPath(); ctx.rect(VB.x0, R.y + 58, (VB.x1 - VB.x0) * pb, 16); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(VB.x0, R.y + 58, VB.x1 - VB.x0, 16); ctx.restore();
      L.text(ctx, '← away (subsidence)', VB.x0, R.y + 106, { kind: 'mono', size: 18, color: C.text, p: pt, bg: C.card, id: 'a4-lgA' });
      L.text(ctx, 'toward →', VB.x1, R.y + 106, { kind: 'mono', size: 18, color: C.text, align: 'right', p: pt, bg: C.card, id: 'a4-lgB' });
      L.text(ctx, '0', (VB.x0 + VB.x1) / 2, R.y + 100, { kind: 'mono', size: 16, color: C.textDim, align: 'center', p: pt, role: 'deco' });
      ctx.restore();
    }
  }

  /* ================================================================== scene */
  L.scene({
    id: 'act4', t0: 30, t1: 42,
    init() { net(); map(); },
    tl(env) {
      const target = tlTarget(env), lt = env.lt, h = env.handoff;
      if (!h || lt >= 1.25) return target;
      const k = spo(lt, 0, 1.0), kk = clamp(k);
      const s = L.TL.blend(h, target, k);
      s.phase = (h.phase || 0) + TAU * 2 * lt + kk * wrapPI(-(h.phase || 0));
      s.tint = L.mix(C.cyan, C.purple, kk);
      return s;
    },
    draw(ctx, env) {
      const lt = env.lt;
      if (lt < TA.ts + 0.05) {
        // design-matrix rows currently being filled light their arcs
        const hi = [];
        if (lt > 2.0 && lt < 3.1) for (let i = 0; i < 129; i++) { const d = lt - tRow(i); if (d >= 0 && d < 0.16) hi.push([i, 1 - d / 0.16]); }
        drawNetwork(ctx, lt, env, hi);
        drawSeries(ctx, lt, env);
        drawMatrix(ctx, lt);
        drawDem(ctx, lt);
        drawRamp(ctx, lt);
        drawTitleA(ctx, lt);
      }
      if (lt >= OPEN.t) {
        const thr = threshold(lt);
        drawMap(ctx, lt, env);
        const fa = 1 - sp(lt, T.fin + 0.05, 0.5);
        if (lt >= T.fin && fa > 0.003 && env.tl) { // the surviving cell keeps its (subsiding) velocity colour as it becomes the TL
          const h = env.tl.size * 0.62;
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = L.css(map().lat.c0, fa); ctx.fillRect(env.tl.x - h, env.tl.y - h, 2 * h, 2 * h);
          ctx.restore();
        }
        drawInset(ctx, lt, thr);
        drawPanel(ctx, lt, env, thr);
      }
    },
    overlay(ctx, env) {
      // "1 pixel ≈ 90 m × 90 m" under the outlined lattice cell, then under the TL that became it
      const lt = env.lt, p = io(lt, T.tag, 11.95, 0.35, 0.3);
      if (p <= 0 || !env.tl) return;
      let cx, by;
      if (lt < T.fin) {
        const vp = viewport(lt, zoomS(lt)), [sx, sy] = env.cam.toScreen(AW[0], vp.y1);
        cx = sx; by = sy;
      } else { cx = env.tl.x; by = env.tl.y + env.tl.size * 0.62; }
      tag(ctx, '1 pixel ≈ 90 m × 90 m', cx, by + 30, { p, align: 'center', id: 'a4-pix' });
    },
  });
})();

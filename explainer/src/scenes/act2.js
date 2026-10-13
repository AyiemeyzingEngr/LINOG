/* Act 2 — Raw ingestion & unification (10–18 s) · pipeline Phases 01–02.
 *
 * LAYOUT  Phase 01: SLC chip on the RIGHT (the act-1 pulse arrives at ≈(1296,554), so the pixel seats ~75 px away);
 *         archive (top) + spectrum (bottom) on the LEFT.  Phase 02: the DEM mesh builds where the chip was (right),
 *         the baseline network where the spectrum was (left).  Everything stays inside the HUD-safe box at the
 *         section's maximum camera push (×1.04 in 10–14, ×1.0816 in 14–18).
 *
 * BEAT PLAN  (lt = t − 10 s · 1 beat = 0.5 s · bars start at 10, 12, 14, 16 s)
 * ── Bar 6 · 10–12 s · PHASE 01 (the HUD header is automatic; only sub-labels here) ────────────────
 *  10.000  TL (L-band pulse from act 1) compresses into a Level 1.1 SLC pixel (pulse→pixel, spring 0.85 s),
 *          seating on cell (3,4) of a 12×12 SLC chip.  10.25 the SLC card blooms OUT OF the TL's live position.
 *  10.500  "LEVEL 1.1 SLC" / 10.625 "complex: amplitude + phase"; archive card constructs.
 *  10.625  speckled SLC scene strip scans in above the chip (crisp 2:1); 10.75 zoom box, 10.875 zoom leaders
 *          → the chip is that box blown up: one sample per cell.  10.75–11.625: 41×19 = 779 tiles fill in
 *          eight 16th-note sweeps, mono counter rolls 000 → 779.  11.0 "PALSAR Level 1.1 archives · 1.04 TB".
 *  10.875  spectrum card constructs; 11.0 frequency axis −14…+14 MHz.  11.125 phase channel scans over the chip
 *          (phasors: origin dot + stroke, faint hue; a 3-row phase band steps down the chip on every beat).
 *  11.125  FBS 28 MHz band (amber) rises + row tag "28 MHz" (legible ≥ 0.5 s before the bar).  11.375 FBD 14 MHz
 *          band (blue) + "14 MHz"; bandpass edges draw down at ±14 MHz with the bracket readout "28 MHz".
 *  11.750 / 11.875  captions (a pickup into the bar, so they hold ≥ 1.5 s before the exit wipe).
 * ── Bar 7 · 12–14 s ────────────────────────────────────────────────────────────────────────────────
 *  12.000  bandpass edges spring ±14 → ±7 MHz (0.5 s; readout + FBS tag roll 28 → 14), FBS out-of-band energy
 *          is clipped to a dashed ghost.  A divider separates the spectral domain from "RANGE SAMPLES";
 *          the inset 4.68 m slant-range ruler constructs.  12.125 FBS samples seat on every tick.
 *  12.250  FBD native samples arrive (coarser, offset).  12.5 resampling: interpolated FBD samples grow on
 *          every FBS tick while the native ones stay behind as fading ghost rings (no sliding).
 *  13.000  a lock sweep crosses the shared grid; both sample rows pulse together on the beat.
 *  13.250→13.60 archive · 13.50→13.85 SLC · 13.65→14.00 spectrum unmask (bottom-up scan wipes, ending ≤ 14.0).
 *          Under the departing chip the DEM's sea-level grid, coastline and a flat land lattice are already
 *          there (13.5 on, S→N); the network card constructs from 13.75 where the archive/spectrum leave.
 * ── Bar 8 · 14–16 s · PHASE 02 ─────────────────────────────────────────────────────────────────────
 *  14.000  central-Luzon DEM wireframe drops in row by row (N→S, springs, cyan while in flight, ×16 vertical);
 *          the TL pixel glides onto Cabanatuan (stem to the surface).  14.125 network axes (2007…2011 × B⊥ rel.
 *          reference); 14.25 network title + DEM label card; 14.75 footprint P448 F0290 draws on, N arrow;
 *          15.0–15.25 place tags Cabanatuan · Sierra Madre · Zambales Mts.
 *  15.000–15.625  24 acquisition dates land on 16ths (FBS amber / FBD blue); the reference slot is a ring.
 *  15.375  reference label; search window ±730 d × ±1,500 m springs open around the slot (labels 15.5).
 *  15.625  "· 000 pairs" joins the title; 15.75–16.25 the 132 pairs not involving the reference draw on in
 *          16th-note batches (left → right), the mono pair counter rolls with them.
 * ── Bar 9 · 16–18 s ────────────────────────────────────────────────────────────────────────────────
 *  16.000  TL flies (spring 0.6, slight sag under the reference label, low energy, behind the dates) to the
 *          reference slot, pixel → node.
 *  16.375  once landed, its 17 pairs radiate from it → counter reaches 149 (buildNetwork() searches seeds so
 *          that exactly 149 pairs satisfy Δt ≤ 730 d and |ΔB⊥| ≤ 1,500 m).
 *  16.5–17.25  the full web holds: a beat-locked signal pulse travels out along the reference pairs.
 *  17.000  mesh unmasks S→N, tags go.  17.25 labels scan out, window collapses.  17.5 edges + nodes contract
 *          into the TL (one spring), TL glides toward centre (17.5→17.875); 17.625→18.0 network card unmasks.
 *  18.000  only the TL remains: pure node (≈63 px), rippling on the beat, inside the hand-off box.
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp;
  const T0 = 10, T1 = 18;

  /* ---------------------------------------------------------------- timing helpers */
  /** reveal 0..1 (spring, clamped, exact 0 before it starts) */
  const rv = (lt, at, d = 0.4) => { const v = L.sp(lt, at, d); return v < 0.003 ? 0 : clamp(v); };
  /** in at a, out at b (both springs) */
  const vis = (lt, a, b, din = 0.4, dout = 0.4) => { const v = Math.min(rv(lt, a, din), 1 - rv(lt, b, dout)); return v < 0.01 ? 0 : v; };
  /** exit progress: springs from (end − d), exactly 1 from `end` on */
  const qOut = (lt, end, d) => (lt >= end ? 1 : lt <= end - d ? 0 : clamp(L.spring(lt - (end - d), d * 0.8)));

  let INK = null;
  const ink = () => INK || (INK = {
    amber: L.ink(C.amber, C.card), blue: L.ink(C.blue, C.card), cyan: L.ink(C.cyan, C.card), cyanBg: L.ink(C.cyan, C.bg),
  });

  /* ---------------------------------------------------------------- layout (world coords) */
  // Phase 01 — archive (top left), spectrum (bottom left), SLC chip (right, next to the act-1 hand-off)
  const A = { x: 170, y: 170, w: 930, h: 300, cols: 41, rows: 19, px: 21, py: 10, tw: 17, th: 7, gx: 206, gy: 268 };
  const F = { x: 170, y: 494, w: 930, h: 436, lx: 202, px0: 430, px1: 1064, r1: 628, r2: 698, bh: 42, ax: 712, top: 572,
    div: 748, hd: 775, ru: 810, rx0: 292, rx1: 1014, c1: 874, c2: 906 };
  F.xc = (F.px0 + F.px1) / 2; F.ppm = (F.px1 - F.px0) / 29.6;
  const S = { x: 1140, y: 170, w: 640, h: 760, n: 12, cell: 38, tc: 3, tr: 4, gy: 412, stx: 1172, sty: 284, sw: 288, sh: 48, bx: 134, by: 18 };
  S.gw = S.n * S.cell; S.gx = S.x + (S.w - S.gw) / 2;
  const slcCell = (c, r) => [S.gx + (c + 0.5) * S.cell, S.gy + (r + 0.5) * S.cell];
  // Phase 02 — DEM mesh (right), network (left)
  const M = { lon0: 119.85, lon1: 121.85, lat0: 14.45, lat1: 16.95, nx: 41, ny: 52, S: 205, VX: 16, cx: 1452, cy: 492, pitch: 0.86, yaw: -0.26,
    anchor: [L.geo.places.cabanatuan.lon, L.geo.places.cabanatuan.lat] };
  M.ZS = (M.VX * M.S) / 111320; // world units per metre of height → vertical exaggeration ×VX
  const ML = { x: 1150, y: 800, w: 600, h: 116 };
  const N = { x: 172, y: 176, w: 930, h: 744, px0: 262, px1: 1067, py0: 322, py1: 814, t0: 2006.95, t1: 2011.25, b: 2600 };
  const nxOf = (yr) => N.px0 + ((yr - N.t0) / (N.t1 - N.t0)) * (N.px1 - N.px0);
  const nyOf = (b) => (N.py0 + N.py1) / 2 - (b / N.b) * ((N.py1 - N.py0) / 2);
  const END = [720, 560]; // where the TL node settles for the 18 s hand-off (world)
  const TLS = { pix: 35, node: 58 };
  const ARC = -36; // the 16.0 flight sags by this much (world px): it passes under the reference label, behind the dates
  const TAGS = [
    { s: 'Cabanatuan', lon: M.anchor[0], lat: M.anchor[1], at: 5.0, up: -34, side: -1 },
    { s: 'Sierra Madre', lon: 121.52, lat: 16.3, at: 5.125, up: 40, side: 1 },
    { s: 'Zambales Mts', lon: 120.13, lat: 15.5, at: 5.25, up: 44, side: 1 },
  ];

  /* ---------------------------------------------------------------- pure data (lazy: tl() may run before init) */
  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    GEO = { mesh: buildMesh(), net: buildNetwork() };
    return GEO;
  }
  let IMG = null;
  function imgs() {
    if (IMG) return IMG;
    const n = S.n;
    // the SLC scene strip (amplitude) — the chip is its zoom box, one sample per cell
    const strip = L.sarImage(S.sw, S.sh, { seed: 41, scale: 26, water: 0.3 });
    const sd = strip.getContext('2d').getImageData(0, 0, S.sw, S.sh).data;
    const a = new Float32Array(n * n), phi = new Float32Array(n * n), an = new Float32Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c;
      a[i] = sd[((S.by + r) * S.sw + S.bx + c) * 4 + 2] / 255;
      phi[i] = TAU * L.hash2(c, r, 77); // fully developed speckle: uniformly random phase
    }
    const srt = Array.from(a).sort((p, q) => p - q), lo = srt[3], hi = srt[n * n - 4];
    const pc = L.canvas(n, n), px = pc.getContext('2d'), im = px.createImageData(n, n);
    const ac = L.canvas(n, n), ax = ac.getContext('2d'), ai = ax.createImageData(n, n);
    const c0 = L.hex('#0A111D'), c1 = L.hex('#E2EEF6');
    for (let i = 0; i < n * n; i++) {
      const col = L.fringeRGB(phi[i]);
      im.data[i * 4] = col[0]; im.data[i * 4 + 1] = col[1]; im.data[i * 4 + 2] = col[2]; im.data[i * 4 + 3] = 255;
      const v = Math.pow(clamp((a[i] - lo) / Math.max(1e-3, hi - lo)), 1.1);
      an[i] = v;
      for (let ch = 0; ch < 3; ch++) ai.data[i * 4 + ch] = lerp(c0[ch], c1[ch], v);
      ai.data[i * 4 + 3] = 255;
    }
    px.putImageData(im, 0, 0); ax.putImageData(ai, 0, 0);
    // archive tiles: brightness level (neutral — no FBS/FBD split is implied) + 16th-note sweep slot
    const nt = A.cols * A.rows, lev = new Uint8Array(nt), slot = new Uint8Array(nt);
    for (let c = 0; c < A.cols; c++) for (let r = 0; r < A.rows; r++) {
      const i = c * A.rows + r;
      lev[i] = Math.min(2, Math.floor(L.hash2(c, r, 9) * 3));
      slot[i] = Math.floor(clamp((c + r * 0.55) / (A.cols - 1 + (A.rows - 1) * 0.55)) * 7.999);
    }
    IMG = { strip, amp: ac, an, phi, phase: pc, lev, slot };
    return IMG;
  }

  /* ---- DEM mesh (schematic: L.geo.grid over central Luzon) */
  function buildMesh() {
    const g = L.geo.grid(M.lon0, M.lon1, M.lat0, M.lat1, M.nx, M.ny);
    const lonC = (M.lon0 + M.lon1) / 2, latC = (M.lat0 + M.lat1) / 2, K = L.geo.K;
    const n = M.nx * M.ny, X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), H = new Float32Array(n);
    for (let j = 0; j < M.ny; j++) for (let i = 0; i < M.nx; i++) {
      const k = j * M.nx + i;
      if (g.h[k] <= 0) continue;
      let s = 0, w = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const jj = j + dj, ii = i + di;
        if (jj < 0 || ii < 0 || jj >= M.ny || ii >= M.nx) continue;
        const ww = di || dj ? 1 : 2; s += g.h[jj * M.nx + ii] * ww; w += ww;
      }
      H[k] = s / w;
    }
    for (let j = 0; j < M.ny; j++) for (let i = 0; i < M.nx; i++) {
      const k = j * M.nx + i;
      const lon = M.lon0 + ((M.lon1 - M.lon0) * i) / (M.nx - 1), lat = M.lat1 - ((M.lat1 - M.lat0) * j) / (M.ny - 1);
      X[k] = (lon - lonC) * K * M.S; Y[k] = (lat - latC) * M.S; Z[k] = H[k] * M.ZS;
    }
    const bin = (h) => (h < 3 ? 0 : h < 140 ? 1 : h < 420 ? 2 : h < 850 ? 3 : h < 1400 ? 4 : 5);
    const rowBin = new Uint8Array(M.ny * (M.nx - 1)), colBin = new Uint8Array(M.ny * M.nx);
    for (let j = 0; j < M.ny; j++) for (let i = 0; i < M.nx - 1; i++) rowBin[j * (M.nx - 1) + i] = bin(0.5 * (H[j * M.nx + i] + H[j * M.nx + i + 1]));
    for (let j = 1; j < M.ny; j++) for (let i = 0; i < M.nx; i++) colBin[j * M.nx + i] = bin(0.5 * (H[j * M.nx + i] + H[(j - 1) * M.nx + i]));
    const toW = (lon, lat, lift = 0) => [(lon - lonC) * K * M.S, (lat - latC) * M.S, L.geo.height(lon, lat) * M.ZS + lift];
    // P448 F0290 footprint (schematic), draped on the surface
    const fp = L.geo.footprint(448, L.geo.frameLats[290][0], L.geo.frameLats[290][1]), fpW = [];
    for (let e = 0; e < 4; e++) {
      const a = fp[e], b = fp[(e + 1) % 4];
      for (let s = 0; s < 18; s++) { const k = s / 18; fpW.push(toW(lerp(a[0], b[0], k), lerp(a[1], b[1], k), 4)); }
    }
    fpW.push(fpW[0]);
    // Luzon coastline (Natural Earth) inside the mesh window, as runs of [X, Y, row]
    const ring = L.geo.rings.luzon[0], coast = [];
    let run = null;
    for (let i = 0; i <= ring.length; i += 2) {
      const lon = ring[i % ring.length], lat = ring[(i + 1) % ring.length];
      const inside = lon > M.lon0 + 0.02 && lon < M.lon1 - 0.02 && lat > M.lat0 + 0.02 && lat < M.lat1 - 0.02;
      if (!inside) { if (run && run.length > 3) coast.push(run); run = null; continue; }
      if (!run) run = [];
      run.push((lon - lonC) * K * M.S, (lat - latC) * M.S, Math.round(((M.lat1 - lat) / (M.lat1 - M.lat0)) * (M.ny - 1)));
    }
    if (run && run.length > 3) coast.push(run);
    const tags = TAGS.map((tg) => ({ ...tg, w: toW(tg.lon, tg.lat, 3) }));
    const north = [toW(121.7, 14.6, 0), toW(121.7, 14.93, 0)];
    north[0][2] = 0; north[1][2] = 0;
    return { X, Y, Z, rowBin, colBin, fpW, coast, tags, north, fpNE: toW(fp[2][0], fp[2][1], 4),
      anchorS: toW(M.anchor[0], M.anchor[1], 3), anchor: toW(M.anchor[0], M.anchor[1], 46) };
  }
  const meshProj = (lt) => L.persp({ yaw: M.yaw + 0.06 * Math.sin((TAU * (lt - 4)) / 16), pitch: M.pitch, dist: 1600, f: 1600, cx: M.cx, cy: M.cy });

  /* ---- Baseline network for P448 F0290 (synthetic, seeded; dates on the ALOS 46-day repeat grid).
   *      Deterministic seed search until exactly 149 pairs satisfy Δt ≤ 730 d and |ΔB⊥| ≤ 1,500 m. */
  function buildNetwork() {
    const REF_YR = 2009 + 38 / 365; // 2009-02-08 (FBS coregistration reference)
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
      // draw order: the pairs NOT involving the reference sweep in first (left → right by midpoint, five
      // 16th-note batches 15.75–16.25), then the TL lands and its own pairs radiate from it (16.375)
      const refE = E.filter((e) => e[0] === ref || e[1] === ref);
      const mid = (e) => P[e[0]][0] + P[e[1]][0];
      const other = E.filter((e) => e[0] !== ref && e[1] !== ref).sort((p, q) => mid(p) - mid(q) || p[0] - q[0] || p[1] - q[1]);
      const order = other.map((e, i) => ({ a: e[0], b: e[1], ref: false, at: 5.75 + Math.floor((i / other.length) * 5) * 0.125, d: 0.3 }));
      refE.forEach((e) => order.push({ a: ref, b: e[0] === ref ? e[1] : e[0], ref: true, at: 6.375, d: 0.32 }));
      // reference label: first candidate box that stays clear of every other node and inside the plot
      const LW = 300, LH = 30, cands = [[46, -66], [46, 46], [-46 - LW, -66], [-46 - LW, 46], [60, -120]];
      let lab = cands[0];
      for (const c of cands) {
        const x0 = P[ref][0] + c[0] - 10, y0 = P[ref][1] + c[1] - 22, x1 = x0 + LW + 20, y1 = y0 + LH + 14;
        if (x0 < N.px0 + 8 || x1 > N.px1 || y0 < N.py0 + 30 || y1 > N.py1 - 8) continue;
        if (P.some((p, i) => i !== ref && p[0] > x0 - 10 && p[0] < x1 + 10 && p[1] > y0 - 10 && p[1] < y1 + 10)) continue;
        lab = c; break;
      }
      return { seed, ks, yr, B, fbs, P, E: order, ref, nEdges: E.length, nRef: refE.length, refYr: REF_YR, lab };
    }
    throw new Error('act2: no network seed gives 149 pairs');
  }
  const netRef = () => { const n = geo().net; return n.P[n.ref]; };
  const edgeP = (lt, e) => clamp(L.spring(lt - e.at, e.d));
  const pairsDrawn = (lt) => { let c = 0; for (const e of geo().net.E) if (lt - e.at >= e.d * 0.32) c++; return c; };

  /* ---------------------------------------------------------------- the through-line (world units) */
  function meshAnchor(lt) {
    const m = geo().mesh, pr = meshProj(lt)(m.anchor[0], m.anchor[1], m.anchor[2]);
    return [pr[0], pr[1]];
  }
  function tlWorld(lt, t) {
    const c0 = slcCell(S.tc, S.tr);
    let x = c0[0], y = c0[1], size = TLS.pix, fly = 0;
    const m1 = L.sp(lt, 4.0, 0.9);
    if (m1 > 0) { const q = meshAnchor(lt); x = lerp(x, q[0], m1); y = lerp(y, q[1], m1); }
    const m2 = L.sp(lt, 6.0, 0.6);
    if (m2 > 0) {
      const q = netRef(), k = clamp(m2);
      x = lerp(x, q[0], m2); y = lerp(y, q[1], m2) - ARC * 4 * k * (1 - k); size = lerp(size, TLS.node, m2);
      fly = Math.sin(Math.PI * k);
    }
    const m3 = L.sp(lt, 7.5, 0.375);
    if (m3 > 0) { x = lerp(x, END[0], m3); y = lerp(y, END[1], m3); }
    const kN = clamp(L.sp(lt, 6.0, 0.6));
    // phase: a slow phasor turn while a pixel, beat-locked ripple once a node (both 0 at 16.0 s → continuous)
    const phase = lerp(1.6 * (lt - 6), (TAU * (lt - 6)) / 0.5, kN);
    const st = { x, y, size, phase, energy: lerp(0.62, 0.42, clamp(m1)) + 0.45 * L.pulse(t) - 0.35 * fly, form: 'pixel', to: null, k: 0 };
    if (kN >= 0.999) st.form = 'node';
    else if (kN > 0) { st.to = 'node'; st.k = kN; }
    return st;
  }

  /* ---------------------------------------------------------------- small drawing helpers */
  function scanEdge(ctx, x, y, w, q, color) {
    if (q <= 0.002 || q >= 0.998) return;
    const a = 0.9 * Math.sin(Math.PI * q);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = L.rgba(color, a); ctx.fillRect(x - 8, y - 1, w + 16, 2);
    ctx.fillStyle = L.rgba(color, a * 0.22); ctx.fillRect(x - 8, y - 6, w + 16, 12);
    ctx.restore();
  }
  /** Card that constructs with L.card and exits with a bottom-up scan wipe (q 0..1); fn draws the contents clipped. */
  function panel(ctx, x, y, w, h, pIn, q, accent, fn) {
    if (pIn <= 0 || q >= 0.998) return;
    ctx.save();
    const k = L.ease.outCubic(clamp(pIn * 1.15));
    const vh = Math.min(pIn < 1 ? (h + 4) * k : h + 40, (h + 4) * (1 - q));
    ctx.beginPath(); ctx.rect(x - 24, y - 24, w + 48, vh + 24); ctx.clip();
    L.card(ctx, x, y, w, h, { p: pIn, accent });
    fn();
    ctx.restore();
    if (q > 0) scanEdge(ctx, x, y + (h + 4) * (1 - q), w, q, accent);
  }
  const cardText = (ctx, s, x, y, o) => L.text(ctx, s, x, y, Object.assign({ bg: C.card }, o));
  /** label on a small backplate (for text over meshes / plots) */
  function plateText(ctx, s, x, y, o, plate = C.card, pad = 7) {
    const p = o.p === undefined ? 1 : o.p;
    if (p <= 0) return;
    const m = L.measure(ctx, s, o);
    const x0 = o.align === 'right' ? x - m.w : o.align === 'center' ? x - m.w / 2 : x;
    // the plate unfolds from the anchored side together with the text's scan
    const pw = (m.w + 2 * pad) * L.ease.outCubic(clamp(p * 1.25)), px = o.align === 'right' ? x0 + m.w + pad - pw : x0 - pad;
    ctx.save(); ctx.globalAlpha *= clamp(p * 2);
    ctx.fillStyle = L.rgba(plate, 0.92); ctx.fillRect(px, y - m.capH - pad - 1, pw, m.capH + 2 * pad + 3);
    ctx.restore();
    L.text(ctx, s, x, y, Object.assign({ bg: plate }, o));
  }

  /* ================================================================ PHASE 01 · SLC chip */
  function drawSLC(ctx, lt, t, org) {
    const open = rv(lt, 0.25, 0.8), ex = qOut(lt, 3.85, 0.35);
    if (open <= 0 || ex >= 0.998) return;
    const I = imgs(), n = S.n, cs = S.cell;
    const [cx, cy] = slcCell(S.tc, S.tr), hc = cs / 2;
    // the card blooms out of the TL's live position (it is still compressing in from the hand-off)
    const ox = org ? org[0] : cx, oy = org ? org[1] : cy, oh = org ? org[2] : hc;
    const x0 = lerp(ox - oh, S.x, open), y0 = lerp(oy - oh, S.y, open);
    const x1 = lerp(ox + oh, S.x + S.w, open), yb = lerp(oy + oh, S.y + S.h, open);
    const y1 = lerp(yb, y0, ex);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2); ctx.clip();
    L.card(ctx, S.x, S.y, S.w, S.h, { p: 1, accent: C.amber });
    // --- SLC scene strip (crisp 2:1 speckle) with the zoom box that the chip blows up
    const sW = S.sw * 2, sH = S.sh * 2, pS = rv(lt, 0.625, 0.5);
    if (pS > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(S.stx, S.sty, sW, sH * pS); ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(I.strip, S.stx, S.sty, sW, sH); ctx.imageSmoothingEnabled = true;
      ctx.restore();
      ctx.strokeStyle = L.rgba(C.cyan, 0.22 * pS); ctx.lineWidth = 1; ctx.strokeRect(S.stx - 0.5, S.sty - 0.5, sW + 1, sH + 1);
      scanEdge(ctx, S.stx, S.sty + sH * pS, sW, pS, C.cyan);
    }
    const bx = S.stx + S.bx * 2, by = S.sty + S.by * 2, bs = n * 2;
    const pB = rv(lt, 0.75, 0.4), pLd = rv(lt, 0.875, 0.45);
    if (pLd > 0) {
      ctx.strokeStyle = L.rgba(C.cyan, 0.4); ctx.lineWidth = 1.1;
      L.polyPartial(ctx, [[bx, by + bs], [S.gx, S.gy - 2]], pLd); ctx.stroke();
      L.polyPartial(ctx, [[bx + bs, by + bs], [S.gx + S.gw, S.gy - 2]], pLd); ctx.stroke();
    }
    if (pB > 0) {
      ctx.strokeStyle = L.rgba(C.cyan, 0.75 + 0.25 * L.pulse(t)); ctx.lineWidth = 1.6;
      L.polyPartial(ctx, [[bx, by], [bx + bs, by], [bx + bs, by + bs], [bx, by + bs], [bx, by]], pB); ctx.stroke();
      ctx.fillStyle = L.rgba(C.cyan, pB * (0.6 + 0.4 * L.pulse(t)));
      ctx.fillRect(bx + S.tc * 2, by + S.tr * 2, 2, 2);
    }
    // --- the chip: amplitude, one crisp speckle sample per cell
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(I.amp, S.gx, S.gy, S.gw, S.gw);
    ctx.imageSmoothingEnabled = true;
    // phase channel: scans in top → bottom (faint hue + phasor |s|·e^iφ per pixel); a 3-row phase band steps
    // down the chip on every beat so the complex nature reads without muddying the amplitude
    const ph = rv(lt, 1.125, 0.7);
    if (ph > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(S.gx, S.gy, S.gw, S.gw * ph); ctx.clip();
      ctx.globalCompositeOperation = 'color'; ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.1; ctx.drawImage(I.phase, S.gx, S.gy, S.gw, S.gw);
      const br = ((L.steps(Math.max(0, lt - 1.5), 0.5, 0.3) * 3) % (n + 3)) - 3;
      ctx.beginPath(); ctx.rect(S.gx, S.gy + br * cs, S.gw, 3 * cs); ctx.clip();
      ctx.globalAlpha = 0.26 * clamp((lt - 1.5) * 4); ctx.drawImage(I.phase, S.gx, S.gy, S.gw, S.gw);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(S.gx, S.gy, S.gw, S.gw * ph); ctx.clip();
      ctx.strokeStyle = L.rgba(C.gold, 0.85); ctx.fillStyle = L.rgba(C.gold, 0.95); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      const dots = new Path2D();
      ctx.beginPath();
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (r === S.tr && c === S.tc) continue;
        const i = r * n + c, [qx, qy] = slcCell(c, r), len = (0.14 + 0.3 * I.an[i]) * cs;
        ctx.moveTo(qx, qy); ctx.lineTo(qx + Math.cos(I.phi[i]) * len, qy + Math.sin(I.phi[i]) * len);
        dots.moveTo(qx + 2.2, qy); dots.arc(qx, qy, 2.2, 0, TAU);
      }
      ctx.stroke(); ctx.fill(dots);
      ctx.restore();
      scanEdge(ctx, S.gx, S.gy + S.gw * ph, S.gw, ph, C.gold);
    }
    // pixel grid
    ctx.strokeStyle = 'rgba(11,17,30,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k <= n; k++) { const v = Math.round(k * cs) + 0.5; ctx.moveTo(S.gx + v, S.gy); ctx.lineTo(S.gx + v, S.gy + S.gw); ctx.moveTo(S.gx, S.gy + v); ctx.lineTo(S.gx + S.gw, S.gy + v); }
    ctx.stroke();
    ctx.strokeStyle = L.rgba(C.cyan, 0.35); ctx.strokeRect(S.gx - 0.5, S.gy - 0.5, S.gw + 1, S.gw + 1);
    // crosshair through the TL pixel (range line / azimuth column), pulsing on the beat
    const xa = 0.16 + 0.22 * L.pulse(t);
    ctx.fillStyle = L.rgba(C.cyan, xa * 0.35);
    ctx.fillRect(S.gx, cy - hc, S.gw, cs); ctx.fillRect(cx - hc, S.gy, cs, S.gw);
    ctx.fillStyle = 'rgba(8,13,24,0.82)'; ctx.fillRect(cx - hc + 1, cy - hc + 1, cs - 2, cs - 2);
    L.glow(ctx, cx, cy, cs * 1.6, C.cyan, 0.35 + 0.35 * L.pulse(t));
    ctx.fillStyle = L.rgba(C.cyan, 0.9);
    for (const [px, py, w, h] of [[cx - 1, S.gy - 9, 2, 7], [cx - 1, S.gy + S.gw + 2, 2, 7], [S.gx - 9, cy - 1, 7, 2], [S.gx + S.gw + 2, cy - 1, 7, 2]]) ctx.fillRect(px, py, w, h);
    // labels (they leave with the card's scan wipe)
    cardText(ctx, 'LEVEL 1.1 SLC', S.x + 32, 224, { kind: 'display', size: 36, weight: 700, p: rv(lt, 0.5, 0.4), scanColor: C.amber });
    cardText(ctx, 'complex: amplitude + phase', S.x + 32, 256, { kind: 'mono', size: 20, weight: 400, color: C.textDim, p: rv(lt, 0.625, 0.4) });
    L.text(ctx, 'range → · azimuth ↓', S.stx + sW, S.sty - 8, { kind: 'mono', size: 15, color: C.textDim, p: rv(lt, 0.875, 0.4), role: 'deco', align: 'right' });
    // legend: amplitude ramp + phase wheel
    const ly = 904, pL = rv(lt, 1.375, 0.4);
    if (pL > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(pL * 1.4);
      const gr = ctx.createLinearGradient(S.gx, 0, S.gx + 96 * pL, 0);
      gr.addColorStop(0, '#0E1522'); gr.addColorStop(1, '#D2E6F2');
      ctx.fillStyle = gr; ctx.fillRect(S.gx, ly - 14, 96 * pL, 14);
      const wx = S.gx + 300, wy = ly - 7;
      for (let s = 0; s < 24; s++) {
        if (s / 24 > pL) break;
        ctx.strokeStyle = L.css(L.fringeRGB((s / 24) * TAU)); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(wx, wy, 10, (s / 24) * TAU, ((s + 1) / 24) * TAU + 0.02); ctx.stroke();
      }
      ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 7 * Math.cos(-0.7), wy + 7 * Math.sin(-0.7)); ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, wy, 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    cardText(ctx, 'amplitude |s|', S.gx + 110, ly, { kind: 'mono', size: 18, color: C.textDim, p: pL });
    cardText(ctx, 'phase φ', S.gx + 320, ly, { kind: 'mono', size: 18, color: C.textDim, p: pL });
    ctx.restore();
    // construction outline (grows from the TL pixel) and exit scan
    if (open < 0.999) {
      ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.85 * (1 - open)); ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, y0, x1 - x0, yb - y0); ctx.restore();
    }
    if (ex > 0) scanEdge(ctx, S.x, y1, S.w, ex, C.amber);
  }

  /* ================================================================ PHASE 01 · archive (779 files) */
  function drawArchive(ctx, lt, t) {
    const pIn = rv(lt, 0.5, 0.5), q = qOut(lt, 3.6, 0.35);
    panel(ctx, A.x, A.y, A.w, A.h, pIn, q, C.amber, () => {
      const I = imgs();
      // tiles grouped by brightness (3 amber fills) + a write-head flash group
      const groups = [[], [], []], flash = [];
      let count = 0;
      for (let c = 0; c < A.cols; c++) for (let r = 0; r < A.rows; r++) {
        const i = c * A.rows + r, at = 0.75 + I.slot[i] * 0.125, age = lt - at;
        if (age <= 0) continue;
        if (age >= 0.07) count++;
        const s = clamp(L.spring(age, 0.3));
        const x = A.gx + c * A.px, y = A.gy + r * A.py;
        groups[I.lev[i]].push(x, y, A.tw * s);
        if (age < 0.2) flash.push(x, y, A.tw * s, 1 - age / 0.2);
      }
      const al = [0.3, 0.5, 0.74];
      for (let gI = 0; gI < 3; gI++) {
        const g = groups[gI]; if (!g.length) continue;
        ctx.fillStyle = L.rgba(C.amber, al[gI]); ctx.beginPath();
        for (let k = 0; k < g.length; k += 3) ctx.rect(g[k], g[k + 1], g[k + 2], A.th);
        ctx.fill();
      }
      if (flash.length) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < flash.length; k += 4) { ctx.fillStyle = L.rgba(C.text, 0.55 * flash[k + 3]); ctx.fillRect(flash[k], flash[k + 1], flash[k + 2], A.th); }
        ctx.restore();
      }
      // read head: once the archive is in, an index sweep crosses the grid every two beats
      if (lt > 1.75) {
        const hx = A.gx - 60 + (((lt - 1.75) / 1.0) % 1) * (A.cols * A.px + 120);
        const g = ctx.createLinearGradient(hx - 60, 0, hx + 8, 0);
        g.addColorStop(0, L.rgba(C.cyan, 0)); g.addColorStop(0.85, L.rgba(C.cyan, 0.16)); g.addColorStop(1, L.rgba(C.cyan, 0));
        ctx.save(); ctx.beginPath(); ctx.rect(A.gx - 2, A.gy - 3, A.cols * A.px, A.rows * A.py + 3); ctx.clip();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(hx - 60, A.gy - 3, 68, A.rows * A.py + 3);
        ctx.restore();
      }
      // counter + caption
      const b = cardText(ctx, String(count).padStart(3, '0'), A.gx - 2, 244, { kind: 'mono', size: 58, weight: 600, p: rv(lt, 0.625, 0.3), scanColor: C.amber, id: 'a2-count' });
      cardText(ctx, 'PALSAR Level 1.1 archives · 1.04 TB', A.gx + b.w + 26, 240, { kind: 'sans', size: 26, weight: 500, p: rv(lt, 1.0, 0.4), scanColor: C.amber });
    });
  }

  /* ================================================================ PHASE 01 · range spectrum + common grid */
  function bandH(f, half, lt, seed) {
    const af = Math.abs(f), ro = 0.7;
    let a;
    if (af <= half - ro) a = 1; else if (af >= half + ro) a = 0; else a = 0.5 + 0.5 * Math.cos((Math.PI * (af - (half - ro))) / (2 * ro));
    const rip = 0.08 * (L.noise2(f * 1.1 + seed, lt * 2.4, 9) - 0.5) + 0.025 * Math.sin(f * 2.3 + lt * 3.1 + seed);
    return 0.05 + 0.95 * a * (0.92 + rip);
  }
  function bandPts(base, half, hs, lt, seed) {
    const pts = [[F.xc - 14.8 * F.ppm, base]];
    for (let f = -14.8; f <= 14.8 + 1e-6; f += 0.2) pts.push([F.xc + f * F.ppm, base - F.bh * hs * bandH(f, half, lt, seed)]);
    pts.push([F.xc + 14.8 * F.ppm, base]);
    return pts;
  }
  function fillBand(ctx, pts, base, color, aIn, aOut, fe) {
    const xl = F.xc - fe * F.ppm, xr = F.xc + fe * F.ppm;
    const g = ctx.createLinearGradient(0, base - F.bh, 0, base);
    g.addColorStop(0, L.rgba(color, 0.85)); g.addColorStop(1, L.rgba(color, 0.18));
    ctx.save(); ctx.beginPath(); ctx.rect(xl, base - F.bh - 10, xr - xl, F.bh + 12); ctx.clip();
    L.poly(ctx, pts, true); ctx.globalAlpha = aIn; ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = aIn; L.poly(ctx, pts.slice(1, -1)); ctx.stroke();
    ctx.restore();
    if (aOut > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(F.px0 - 30, base - F.bh - 10, xl - F.px0 + 30, F.bh + 12); ctx.rect(xr, base - F.bh - 10, F.px1 + 30 - xr, F.bh + 12); ctx.clip();
      L.poly(ctx, pts, true); ctx.globalAlpha = aOut; ctx.fillStyle = L.rgba(color, 0.35); ctx.fill();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = L.rgba(color, 0.9); ctx.lineWidth = 1.2; L.poly(ctx, pts.slice(1, -1)); ctx.stroke();
      ctx.restore();
    }
  }
  function drawSpectrum(ctx, lt, t) {
    const pIn = rv(lt, 0.875, 0.5), q = qOut(lt, 4.0, 0.35);
    const I = ink();
    panel(ctx, F.x, F.y, F.w, F.h, pIn, q, C.amber, () => {
      // ---------------- spectral domain: range bandwidth
      cardText(ctx, 'RANGE BANDWIDTH', F.lx, 534, { kind: 'mono', size: 18, weight: 600, color: C.textDim, tracking: 0.12, p: rv(lt, 1.0, 0.4) });
      const pa = rv(lt, 1.0, 0.5);
      if (pa > 0) {
        ctx.strokeStyle = L.rgba(C.textDim, 0.7); ctx.lineWidth = 1.2;
        L.polyPartial(ctx, [[F.px0 - 8, F.ax], [F.px1 + 8, F.ax]], pa); ctx.stroke();
        for (const f of [-14, -7, 0, 7, 14]) {
          const x = F.xc + f * F.ppm, k = clamp(pa * 1.6 - Math.abs(f) / 28);
          ctx.beginPath(); ctx.moveTo(x, F.ax); ctx.lineTo(x, F.ax + 7 * k); ctx.stroke();
          L.text(ctx, f === 0 ? '0' : (f > 0 ? '+' : '−') + Math.abs(f), x, F.ax + 24, { kind: 'mono', size: 15, color: C.textDim, align: 'center', p: rv(lt, 1.125 + Math.abs(f) / 56, 0.4), role: 'deco' });
        }
        L.text(ctx, 'MHz', F.px0 - 26, F.ax + 24, { kind: 'mono', size: 15, color: C.textDim, align: 'right', p: rv(lt, 1.25, 0.4), role: 'deco' });
        // faint guide lines at ±7 MHz (the common band)
        ctx.setLineDash([3, 5]); ctx.strokeStyle = L.rgba(C.textDim, 0.18 * pa); ctx.beginPath();
        for (const f of [-7, 7]) { const x = F.xc + f * F.ppm; ctx.moveTo(x, F.top); ctx.lineTo(x, F.ax); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      const cut = L.sp(lt, 2.0, 0.5), fe = 14 - 7 * cut, bw = Math.round(2 * fe);
      // row labels: mode + polarisation, and the bandwidth tag (FBS rolls 28 → 14 with the bandpass edges)
      cardText(ctx, 'FBS', F.lx, F.r1 - 14, { kind: 'display', size: 30, weight: 700, color: I.amber, p: rv(lt, 1.125, 0.4), scanColor: C.amber });
      cardText(ctx, 'HH', F.lx + 70, F.r1 - 14, { kind: 'mono', size: 18, color: C.textDim, p: rv(lt, 1.1875, 0.4) });
      cardText(ctx, `${bw} MHz`, F.lx, F.r1 + 14, { kind: 'mono', size: 18, weight: 600, color: I.amber, p: rv(lt, 1.1875, 0.35), id: 'a2-fbs-bw' });
      cardText(ctx, 'FBD', F.lx, F.r2 - 14, { kind: 'display', size: 30, weight: 700, color: I.blue, p: rv(lt, 1.375, 0.4), scanColor: C.blue });
      cardText(ctx, 'HH+HV', F.lx + 70, F.r2 - 14, { kind: 'mono', size: 18, color: C.textDim, p: rv(lt, 1.4375, 0.4) });
      cardText(ctx, '14 MHz', F.lx, F.r2 + 14, { kind: 'mono', size: 18, weight: 600, color: I.blue, p: rv(lt, 1.4375, 0.35) });
      // bands
      const h1 = rv(lt, 1.125, 0.55), h2 = rv(lt, 1.375, 0.55);
      if (h1 > 0) fillBand(ctx, bandPts(F.r1, 14, h1, lt, 3), F.r1, C.amber, 1, lerp(0.85, 0.3, clamp(cut)), fe);
      if (h2 > 0) fillBand(ctx, bandPts(F.r2, 7, h2, lt, 17), F.r2, C.blue, 1, 0.5, 14.6);
      // bandpass edges (cyan), drawn down at ±14 MHz, then spring in to ±7 MHz on the bar
      const pe = rv(lt, 1.375, 0.4);
      if (pe > 0) {
        for (const sgn of [-1, 1]) {
          const x = F.xc + sgn * fe * F.ppm;
          L.glow(ctx, x, (F.top + F.ax) / 2, 26, C.cyan, 0.35 * pe);
          ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 2;
          L.polyPartial(ctx, [[x, F.top], [x, F.ax]], pe); ctx.stroke();
          ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.moveTo(x, F.top - 1); ctx.lineTo(x - sgn * 9 * pe, F.top - 6); ctx.lineTo(x, F.top - 11); ctx.closePath(); ctx.fill();
        }
        // bracket + rolling readout (28 → 14 MHz)
        const pb = rv(lt, 1.375, 0.3);
        if (pb > 0) {
          const xl = F.xc - fe * F.ppm + 6, xr = F.xc + fe * F.ppm - 6, yb = F.top - 6;
          ctx.strokeStyle = L.rgba(C.cyan, 0.7 * pb); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xl + 8, yb); ctx.lineTo(xr - 8, yb); ctx.stroke();
          cardText(ctx, `${bw} MHz`, F.xc, yb - 10, { kind: 'mono', size: 18, weight: 600, color: I.cyan, align: 'center', p: pb, id: 'a2-bw' });
        }
      }
      // ---------------- spatial domain: range samples on the common 4.68 m slant-range grid
      const pr = rv(lt, 2.0, 0.45);
      if (pr > 0) {
        ctx.strokeStyle = L.rgba(C.cyan, 0.16); ctx.lineWidth = 1;
        L.polyPartial(ctx, [[F.lx, F.div], [F.px1, F.div]], pr); ctx.stroke();
      }
      cardText(ctx, 'RANGE SAMPLES', F.lx, F.hd, { kind: 'mono', size: 18, weight: 600, color: C.textDim, tracking: 0.12, p: rv(lt, 2.0, 0.4) });
      cardText(ctx, [{ s: '4.68 m', color: I.cyan, weight: 600 }, { s: ' slant-range grid', color: C.textDim }], F.rx1, F.hd, { kind: 'mono', size: 18, align: 'right', p: rv(lt, 2.0625, 0.4) });
      const NT = 24, sp = (F.rx1 - F.rx0) / NT;
      if (pr > 0) {
        ctx.strokeStyle = L.rgba(C.textDim, 0.65); ctx.lineWidth = 1.2;
        L.polyPartial(ctx, [[F.rx0, F.ru], [F.rx1, F.ru]], pr); ctx.stroke();
        ctx.strokeStyle = L.rgba(C.cyan, 0.35); ctx.beginPath();
        for (let i = 0; i <= NT; i++) {
          const k = clamp(L.spring(lt - 2.0 - i * 0.012, 0.3));
          if (k <= 0) continue;
          const x = F.rx0 + i * sp; ctx.moveTo(x, F.ru - 18 * k); ctx.lineTo(x, F.ru + 18 * k);
        }
        ctx.stroke();
        // dimension bracket over the last interval: this is the 4.68 m spacing
        const pd = rv(lt, 2.125, 0.4);
        if (pd > 0) {
          const xa = F.rx1 - sp, yb = F.ru - 26;
          ctx.strokeStyle = L.rgba(C.cyan, 0.85); ctx.lineWidth = 1.3;
          L.polyPartial(ctx, [[xa, yb + 5], [xa, yb], [F.rx1, yb], [F.rx1, yb + 5]], pd); ctx.stroke();
        }
        const beat = lt > 3.0 ? L.pulse(t) : 0;
        // FBS samples (upper row) on every tick — native sampling kept
        ctx.fillStyle = C.amber; ctx.beginPath();
        for (let i = 0; i <= NT; i++) {
          const k = clamp(L.spring(lt - 2.125 - i * 0.01, 0.3)); if (k <= 0) continue;
          const x = F.rx0 + i * sp, r = 4 * k * (1 + 0.3 * beat); ctx.moveTo(x + r, F.ru - 12); ctx.arc(x, F.ru - 12, r, 0, TAU);
        }
        ctx.fill();
        // FBD native samples: coarser, on their own (offset) grid; they stay behind as ghosts once resampled
        const rs = rv(lt, 2.5, 0.5);
        const nat = new Path2D(), ghost = new Path2D();
        let anyN = false;
        for (let i = 0; i < NT; i += 2) {
          const k = clamp(L.spring(lt - 2.25 - i * 0.01, 0.3)); if (k <= 0) continue;
          const x = F.rx0 + (i + 0.42) * sp; anyN = true;
          nat.moveTo(x + 4 * k, F.ru + 12); nat.arc(x, F.ru + 12, 4 * k, 0, TAU);
          ghost.moveTo(x + 5.5, F.ru + 12); ghost.arc(x, F.ru + 12, 5.5, 0, TAU);
        }
        if (anyN) {
          ctx.fillStyle = L.rgba(C.blue, 1 - 0.85 * rs); ctx.fill(nat);
          if (rs > 0) { ctx.strokeStyle = L.rgba(C.blue, 0.55 * rs); ctx.lineWidth = 1.2; ctx.stroke(ghost); }
        }
        // FBD resampled onto every FBS tick (interpolated samples grow in place — no sliding)
        if (rs > 0) {
          ctx.fillStyle = C.blue; ctx.beginPath();
          for (let i = 0; i <= NT; i++) {
            const k = clamp(L.spring(lt - 2.5 - i * 0.012, 0.3)); if (k <= 0) continue;
            const x = F.rx0 + i * sp, r = 4 * k * (1 + 0.3 * beat); ctx.moveTo(x + r, F.ru + 12); ctx.arc(x, F.ru + 12, r, 0, TAU);
          }
          ctx.fill();
        }
        // 13.0 s: both rows now share one grid — a lock sweep runs across the ticks
        const sw = (lt - 3.0) / 0.45;
        if (sw > 0 && sw < 1) {
          const xs = lerp(F.rx0 - 20, F.rx1 + 20, L.ease.inOutSine(sw)), a = Math.sin(Math.PI * sw);
          const g = ctx.createLinearGradient(xs - 90, 0, xs + 6, 0);
          g.addColorStop(0, L.rgba(C.cyan, 0)); g.addColorStop(0.9, L.rgba(C.cyan, 0.32 * a)); g.addColorStop(1, L.rgba(C.cyan, 0));
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(xs - 90, F.ru - 24, 96, 48);
          ctx.fillStyle = L.rgba(C.cyan, 0.9 * a); ctx.fillRect(xs - 1, F.ru - 24, 2, 48); ctx.restore();
        }
      }
      cardText(ctx, 'FBS', F.lx, F.ru - 12, { kind: 'mono', size: 18, weight: 600, color: I.amber, baseline: 'middle', p: rv(lt, 2.125, 0.4) });
      cardText(ctx, 'FBD', F.lx, F.ru + 13, { kind: 'mono', size: 18, weight: 600, color: I.blue, baseline: 'middle', p: rv(lt, 2.25, 0.4) });
      // captions (revealed as a pickup into the 12.0 bar so they hold ≥ 1.5 s before the exit wipe)
      cardText(ctx, [{ s: 'FBS', color: I.amber, weight: 700 }, { s: ' 28 → 14 MHz · band-limited, native 4.68 m sampling kept', color: C.text }], F.lx, F.c1, { kind: 'sans', size: 22, weight: 500, p: rv(lt, 1.75, 0.35), scanColor: C.amber });
      cardText(ctx, [{ s: 'FBD', color: I.blue, weight: 700 }, { s: ' 14 MHz · resampled onto the FBS reference grid', color: C.text }], F.lx, F.c2, { kind: 'sans', size: 22, weight: 500, p: rv(lt, 1.875, 0.35), scanColor: C.blue });
    });
  }

  /* ================================================================ PHASE 02 · DEM wireframe */
  const BIN_STYLE = [
    ['rgba(0,229,255,0.2)', 1],
    [L.css(L.mix('#1D5A63', C.cyan, 0.32), 0.6), 1.1],
    [L.css(L.mix('#3C8A84', C.cyan, 0.18), 0.72), 1.15],
    [L.css(L.demRGB(1550), 0.82), 1.2],
    [L.css(L.demRGB(2150), 0.9), 1.25],
    [L.css(L.demRGB(2750), 0.95), 1.3],
  ];
  const _sx = new Float32Array(M.nx * M.ny), _sy = new Float32Array(M.nx * M.ny);
  const _gx = new Float32Array(M.nx * M.ny), _gy = new Float32Array(M.nx * M.ny);
  function drawMesh(ctx, lt) {
    if (lt < 3.5 || lt > 7.95) return;
    const m = geo().mesh, pr = meshProj(lt), nx = M.nx, ny = M.ny, Ik = ink();
    const rowA = new Float32Array(ny), rowQ = new Float32Array(ny), rowG = new Float32Array(ny), rowF = new Float32Array(ny);
    let any = false;
    for (let j = 0; j < ny; j++) {
      const f = j / (ny - 1);
      // sea-level plane: revealed S → N while the SLC chip wipes away above it (13.5–13.85)
      // land rows: in, drop N → S on the 14.0 bar; out, unmask S → N through the cyan scan tint (no displacement)
      const gIn = rv(lt, 3.5 + (1 - f) * 0.3, 0.3);
      const d = L.sp(lt, 4.0 + f * 0.72, 0.5), e = clamp(L.sp(lt, 7.0 + (1 - f) * 0.45, 0.3));
      const out = clamp(1 - (e - 0.35) / 0.65);
      rowG[j] = gIn * out;
      const a = clamp(d * 1.5) * out;
      rowF[j] = gIn * (1 - clamp(d * 1.6)); // flat land lattice: the map under the chip, replaced as relief lands
      rowA[j] = a; rowQ[j] = Math.min(clamp((d - 0.55) / 0.4), 1 - clamp(e * 2.2));
      if (a > 0.004 || rowG[j] > 0.004) any = true;
      const dz = (1 - d) * 130;
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i, p = pr(m.X[k], m.Y[k], m.Z[k] + dz); _sx[k] = p[0]; _sy[k] = p[1];
        const g = pr(m.X[k], m.Y[k], 0); _gx[k] = g[0]; _gy[k] = g[1];
      }
    }
    if (!any) return;
    ctx.save(); ctx.lineJoin = 'round';
    // ---- sea-level plane (sea cells only) + coastline
    for (let j = 0; j < ny; j++) {
      if (rowG[j] <= 0.004) continue;
      ctx.beginPath(); let has = false;
      for (let i = 0; i < nx - 1; i++) if (m.rowBin[j * (nx - 1) + i] === 0) { const k = j * nx + i; ctx.moveTo(_gx[k], _gy[k]); ctx.lineTo(_gx[k + 1], _gy[k + 1]); has = true; }
      if (j > 0) for (let i = 0; i < nx; i++) if (m.colBin[j * nx + i] === 0) { const k = j * nx + i; ctx.moveTo(_gx[k - nx], _gy[k - nx]); ctx.lineTo(_gx[k], _gy[k]); has = true; }
      if (!has) continue;
      ctx.globalAlpha = rowG[j]; ctx.strokeStyle = BIN_STYLE[0][0]; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let j = 0; j < ny; j++) {
      if (rowF[j] <= 0.004) continue;
      ctx.beginPath(); let has = false;
      for (let i = 0; i < nx - 1; i++) if (m.rowBin[j * (nx - 1) + i] > 0) { const k = j * nx + i; ctx.moveTo(_gx[k], _gy[k]); ctx.lineTo(_gx[k + 1], _gy[k + 1]); has = true; }
      if (j > 0) for (let i = 0; i < nx; i++) if (m.colBin[j * nx + i] > 0) { const k = j * nx + i; ctx.moveTo(_gx[k - nx], _gy[k - nx]); ctx.lineTo(_gx[k], _gy[k]); has = true; }
      if (!has) continue;
      ctx.globalAlpha = rowF[j]; ctx.strokeStyle = 'rgba(0,229,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const run of m.coast) {
      let pen = false;
      for (let k = 0; k < run.length; k += 3) {
        const j = run[k + 2];
        if (rowG[j] < 0.5) { pen = false; continue; }
        const p = pr(run[k], run[k + 1], 2);
        if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; }
      }
    }
    ctx.strokeStyle = L.rgba(C.cyan, 0.62); ctx.lineWidth = 1.5; ctx.stroke();
    // ---- land rows
    const strokeRows = (rows, alpha, cyanMix) => {
      if (cyanMix < 1) for (let b = 1; b < 6; b++) {
        ctx.beginPath(); let has = false;
        for (const j of rows) {
          for (let i = 0; i < nx - 1; i++) if (m.rowBin[j * (nx - 1) + i] === b) { const k = j * nx + i; ctx.moveTo(_sx[k], _sy[k]); ctx.lineTo(_sx[k + 1], _sy[k + 1]); has = true; }
          if (j > 0) for (let i = 0; i < nx; i++) if (m.colBin[j * nx + i] === b) { const k = j * nx + i; ctx.moveTo(_sx[k - nx], _sy[k - nx]); ctx.lineTo(_sx[k], _sy[k]); has = true; }
        }
        if (!has) continue;
        ctx.globalAlpha = alpha * (1 - cyanMix); ctx.strokeStyle = BIN_STYLE[b][0]; ctx.lineWidth = BIN_STYLE[b][1]; ctx.stroke();
      }
      if (cyanMix > 0) {
        ctx.beginPath();
        for (const j of rows) {
          for (let i = 0; i < nx - 1; i++) if (m.rowBin[j * (nx - 1) + i] > 0) { const k = j * nx + i; ctx.moveTo(_sx[k], _sy[k]); ctx.lineTo(_sx[k + 1], _sy[k + 1]); }
          if (j > 0) for (let i = 0; i < nx; i += 2) if (m.colBin[j * nx + i] > 0) { const k = j * nx + i; ctx.moveTo(_sx[k - nx], _sy[k - nx]); ctx.lineTo(_sx[k], _sy[k]); }
        }
        ctx.globalAlpha = alpha * cyanMix; ctx.strokeStyle = L.rgba(C.cyan, 0.75); ctx.lineWidth = 1.3; ctx.stroke();
      }
    };
    const settled = [];
    for (let j = 0; j < ny; j++) {
      if (rowA[j] <= 0.004) continue;
      if (rowA[j] >= 0.999 && rowQ[j] >= 0.999) settled.push(j);
      else strokeRows([j], rowA[j], 1 - rowQ[j]);
    }
    if (settled.length) strokeRows(settled, 1, 0);
    ctx.globalAlpha = 1;
    // ---- P448 F0290 footprint draped on the DEM (draws on, then retracts)
    const pf = Math.min(rv(lt, 4.75, 0.7), 1 - rv(lt, 7.0, 0.4));
    if (pf > 0) {
      const pts = m.fpW.map((w) => { const p = pr(w[0], w[1], w[2]); return [p[0], p[1]]; });
      ctx.save();
      L.poly(ctx, pts, true); ctx.fillStyle = L.rgba(C.cyan, 0.08 * pf); ctx.fill();
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = -lt * 24; ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 1.8;
      L.polyPartial(ctx, pts, pf); ctx.stroke();
      ctx.restore();
    }
    // ---- north arrow on the sea-level plane
    const pn = Math.min(rv(lt, 4.75, 0.5), 1 - rv(lt, 7.0, 0.35));
    if (pn > 0) {
      const a = pr(...m.north[0]), b = pr(...m.north[1]);
      const ux = b[0] - a[0], uy = b[1] - a[1], ul = Math.hypot(ux, uy) || 1, nxv = ux / ul, nyv = uy / ul;
      ctx.strokeStyle = L.rgba(C.text, 0.85); ctx.fillStyle = L.rgba(C.text, 0.85 * pn); ctx.lineWidth = 1.6;
      L.polyPartial(ctx, [[a[0], a[1]], [b[0], b[1]]], pn); ctx.stroke();
      if (pn > 0.6) {
        ctx.beginPath(); ctx.moveTo(b[0] + nxv * 4, b[1] + nyv * 4);
        ctx.lineTo(b[0] - nxv * 9 - nyv * 5, b[1] - nyv * 9 + nxv * 5); ctx.lineTo(b[0] - nxv * 9 + nyv * 5, b[1] - nyv * 9 - nxv * 5); ctx.closePath(); ctx.fill();
      }
      L.text(ctx, 'N', b[0] + nxv * 20, b[1] + nyv * 20, { kind: 'mono', size: 18, weight: 600, color: C.text, align: 'center', baseline: 'middle', p: pn });
    }
    // ---- stem from the TL pixel to the surface
    const ps = Math.min(rv(lt, 4.6, 0.4), 1 - rv(lt, 5.9, 0.3));
    if (ps > 0) {
      const s = pr(m.anchorS[0], m.anchorS[1], m.anchorS[2]), tw = tlWorld(lt, lt + T0);
      ctx.strokeStyle = L.rgba(C.cyan, 0.7 * ps); ctx.lineWidth = 1.4;
      L.polyPartial(ctx, [[s[0], s[1]], [tw.x, tw.y]], ps); ctx.stroke();
      ctx.fillStyle = L.rgba(C.cyan, 0.9 * ps); ctx.beginPath(); ctx.ellipse(s[0], s[1], 6 * ps, 2.6 * ps, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // ---- place tags (ride the projection) + footprint label, each on a backplate
    for (const tg of m.tags) {
      const p = vis(lt, tg.at, 7.0, 0.4, 0.35);
      if (p <= 0) continue;
      const s = pr(tg.w[0], tg.w[1], tg.w[2]), ly = s[1] - tg.up;
      ctx.save(); ctx.globalAlpha *= clamp(p * 1.5);
      ctx.strokeStyle = L.rgba(C.text, 0.6); ctx.lineWidth = 1.1;
      L.polyPartial(ctx, [[s[0], s[1]], [s[0], ly]], p); ctx.stroke();
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(s[0], s[1], 3, 0, TAU); ctx.fill();
      ctx.restore();
      plateText(ctx, tg.s, s[0] + tg.side * 8, ly + 6, { kind: 'mono', size: 18, weight: 500, color: C.text, align: tg.side < 0 ? 'right' : 'left', p }, C.bg, 6);
    }
    const pl = vis(lt, 5.0, 7.0, 0.4, 0.35);
    if (pl > 0) {
      const ne = pr(m.fpNE[0], m.fpNE[1], m.fpNE[2]);
      plateText(ctx, 'P448 F0290', ne[0] + 14, ne[1] - 2, { kind: 'mono', size: 18, weight: 600, color: Ik.cyanBg, p: pl }, C.bg, 6);
    }
  }
  function drawMeshLabel(ctx, lt) {
    const pIn = rv(lt, 4.25, 0.5), q = qOut(lt, 7.6, 0.35);
    panel(ctx, ML.x, ML.y, ML.w, ML.h, pIn, q, C.blue, () => {
      cardText(ctx, 'NAMRIA IfSAR DEM (+ SRTM) · schematic', ML.x + 24, ML.y + 38, { kind: 'sans', size: 24, weight: 600, p: rv(lt, 4.375, 0.4), scanColor: C.blue });
      cardText(ctx, `central Luzon · vertical ×${M.VX}`, ML.x + 24, ML.y + 70, { kind: 'mono', size: 18, color: C.text, p: rv(lt, 4.5, 0.4) });
      cardText(ctx, 'coregistration · geocoding · topo-phase removal', ML.x + 24, ML.y + 98, { kind: 'mono', size: 18, color: C.textDim, p: rv(lt, 4.625, 0.4) });
    });
  }

  /* ================================================================ PHASE 02 · baseline network */
  function drawNetwork(ctx, lt, t, env) {
    const n = geo().net, I = ink();
    const pIn = rv(lt, 3.75, 0.6), q = qOut(lt, 8.0, 0.375), OUT = 7.25;
    if (pIn <= 0) return;
    const tw = tlWorld(lt, t), ref = n.P[n.ref];
    const hw = (730 / 365.25 / (N.t1 - N.t0)) * (N.px1 - N.px0), hh = (1500 / N.b) * ((N.py1 - N.py0) / 2);
    panel(ctx, N.x, N.y, N.w, N.h, pIn, q, C.blue, () => {
      const tb = cardText(ctx, 'P448 F0290 · 24 dates', N.x + 34, 230, { kind: 'display', size: 36, weight: 700, p: vis(lt, 4.25, OUT), scanColor: C.blue });
      // the pair count is earned: it rolls with the edges as they draw
      cardText(ctx, [{ s: ' · ', color: C.text }, { s: String(pairsDrawn(lt)).padStart(3, '0'), kind: 'mono', weight: 600, color: I.cyan }, { s: ' pairs', color: C.text }],
        N.x + 34 + tb.w, 230, { kind: 'display', size: 36, weight: 700, p: vis(lt, 5.625, OUT), scanColor: C.cyan, id: 'a2-pairs' });
      cardText(ctx, 'Δt ≤ 730 days · |B⊥| ≤ 1,500 m', N.x + 34, 266, { kind: 'mono', size: 20, weight: 600, color: I.cyan, p: vis(lt, 4.375, OUT) });
      // legend
      const pg = vis(lt, 4.5, OUT);
      if (pg > 0) {
        const lgx = N.x + N.w - 34;
        const b2 = L.measure(ctx, 'FBD', { kind: 'mono', size: 18, weight: 600 }).w, b1 = L.measure(ctx, 'FBS', { kind: 'mono', size: 18, weight: 600 }).w;
        const xD = lgx - b2, xS = xD - 40 - b1;
        ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(xS - 14, 222, 6 * pg, 0, TAU); ctx.fill();
        ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(xD - 14, 222, 6 * pg, 0, TAU); ctx.fill();
        cardText(ctx, 'FBS', xS, 228, { kind: 'mono', size: 18, weight: 600, color: I.amber, p: pg });
        cardText(ctx, 'FBD', xD, 228, { kind: 'mono', size: 18, weight: 600, color: I.blue, p: pg });
      }
      // axes
      const pa = rv(lt, 4.125, 0.6);
      if (pa > 0) {
        ctx.strokeStyle = L.rgba(C.textDim, 0.6); ctx.lineWidth = 1.2;
        L.polyPartial(ctx, [[N.px0, N.py0], [N.px0, N.py1], [N.px1, N.py1]], pa); ctx.stroke();
        for (let y = 2007; y <= 2011; y++) {
          const x = nxOf(y), k = clamp(pa * 1.5 - (y - 2007) * 0.1);
          ctx.strokeStyle = L.rgba(C.cyan, 0.07); ctx.beginPath(); ctx.moveTo(x, N.py1); ctx.lineTo(x, lerp(N.py1, N.py0, k)); ctx.stroke();
          ctx.strokeStyle = L.rgba(C.textDim, 0.6); ctx.beginPath(); ctx.moveTo(x, N.py1); ctx.lineTo(x, N.py1 + 7 * k); ctx.stroke();
          L.text(ctx, String(y), x, N.py1 + 30, { kind: 'mono', size: 16, color: C.textDim, align: 'center', p: vis(lt, 4.375 + (y - 2007) * 0.03, OUT), role: 'deco' });
        }
        for (const b of [-2000, -1000, 0, 1000, 2000]) {
          const y = nyOf(b), k = clamp(pa * 1.5 - Math.abs(b) / 8000);
          ctx.strokeStyle = L.rgba(b === 0 ? C.cyan : C.textDim, b === 0 ? 0.22 : 0.08); ctx.setLineDash(b === 0 ? [5, 6] : []);
          ctx.beginPath(); ctx.moveTo(N.px0, y); ctx.lineTo(lerp(N.px0, N.px1, k), y); ctx.stroke(); ctx.setLineDash([]);
          L.text(ctx, b === 0 ? '0' : (b > 0 ? '+' : '−') + Math.abs(b), N.px0 - 12, y + 5, { kind: 'mono', size: 15, color: C.textDim, align: 'right', p: vis(lt, 4.375 + Math.abs(b) / 40000, OUT), role: 'deco' });
        }
        cardText(ctx, 'B⊥ rel. 2009-02-08 (m)', N.x + 34, 304, { kind: 'mono', size: 18, color: C.textDim, p: vis(lt, 4.5, OUT) });
        cardText(ctx, 'dates and baselines schematic', N.px1, N.y + N.h - 22, { kind: 'mono', size: 18, color: C.textDim, align: 'right', p: vis(lt, 4.625, OUT) });
      }
      // search window around the reference date: ±730 d × ±1,500 m (labels pinned at the open corners)
      const pw = Math.min(rv(lt, 5.375, 0.55), 1 - rv(lt, OUT, 0.4));
      if (pw > 0) {
        const x0 = ref[0] - hw * pw, y0 = ref[1] - hh * pw;
        ctx.fillStyle = L.rgba(C.cyan, 0.05 * pw); ctx.fillRect(x0, y0, 2 * hw * pw, 2 * hh * pw);
        ctx.setLineDash([6, 6]); ctx.lineDashOffset = -lt * 20; ctx.strokeStyle = L.rgba(C.cyan, 0.55 * pw); ctx.lineWidth = 1.3;
        ctx.strokeRect(x0, y0, 2 * hw * pw, 2 * hh * pw); ctx.setLineDash([]);
      }
    });
    const pwl = (at) => vis(lt, at, OUT, 0.3, 0.35);
    plateText(ctx, '±730 d', ref[0] + hw - 10, ref[1] - hh + 24, { kind: 'mono', size: 18, weight: 600, color: I.cyan, align: 'right', p: pwl(5.5) }, C.card, 5);
    plateText(ctx, '±1,500 m', ref[0] - hw + 10, ref[1] - hh + 24, { kind: 'mono', size: 18, weight: 600, color: I.cyan, p: pwl(5.5625) }, C.card, 5);

    // ----- edges and nodes are drawn above the card so they can contract into the TL
    const ce = rv(lt, 7.5, 0.4); // contraction into the TL (one spring for every edge and node)
    const P = n.P.map((p) => (ce > 0 ? [lerp(p[0], tw.x, ce), lerp(p[1], tw.y, ce)] : p));
    if (lt >= 6.0) P[n.ref] = [tw.x, tw.y]; // the TL is the reference node
    const fade = 1 - ce;
    if (lt >= 5.75 && ce < 0.995) {
      const full = [[], []];
      for (const e of n.E) {
        const p = edgeP(lt, e);
        if (p <= 0) continue;
        const pa = P[e.a], pb = P[e.b];
        if (p >= 0.999) { full[e.ref ? 1 : 0].push(pa, pb); continue; }
        ctx.strokeStyle = e.ref ? L.rgba(C.cyan, 0.9 * fade) : L.rgba(C.textDim, 0.6 * fade); ctx.lineWidth = e.ref ? 1.8 : 1.2;
        L.polyPartial(ctx, [pa, pb], p); ctx.stroke();
      }
      const beat = lt > 6.5 ? L.pulse(t) : 0;
      for (const [fi, col, a, w] of [[0, C.textDim, 0.34 + 0.08 * beat, 1.1], [1, C.cyan, 0.55 + 0.3 * beat, 1.6]]) {
        const f = full[fi]; if (!f.length) continue;
        ctx.beginPath(); for (let k = 0; k < f.length; k += 2) { ctx.moveTo(f[k][0], f[k][1]); ctx.lineTo(f[k + 1][0], f[k + 1][1]); }
        ctx.strokeStyle = L.rgba(col, a * fade); ctx.lineWidth = w; ctx.stroke();
      }
      // the held web: a beat-locked signal pulse travels out along the reference pairs
      if (lt >= 6.5 && ce < 0.9) {
        const f = ((lt - 6.5) / 0.5) % 1, u = L.ease.outCubic(f), a = Math.sin(Math.PI * Math.min(1, f * 1.4)) * 0.85 * fade;
        if (a > 0.01) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          ctx.strokeStyle = L.rgba(C.cyan, a); ctx.lineWidth = 3; ctx.beginPath();
          for (const e of n.E) {
            if (!e.ref) continue;
            const pa = P[e.a], pb = P[e.b], u0 = Math.max(0, u - 0.12);
            ctx.moveTo(lerp(pa[0], pb[0], u0), lerp(pa[1], pb[1], u0)); ctx.lineTo(lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u));
          }
          ctx.stroke(); ctx.restore();
        }
      }
    }
    // during its flight the TL passes BEHIND the dates (over the faint pairs), at low energy
    if (env && lt >= 6.0 && lt < 6.45) env.drawTL();
    // nodes (24 dates) — land on 16ths, left → right
    if (ce < 0.99) {
      for (let i = 0; i < 24; i++) {
        const at = 5.0 + Math.floor(i / 4) * 0.125, age = lt - at;
        if (age <= 0) continue;
        const s = clamp(L.spring(age, 0.3)) * (1 - 0.6 * ce);
        const [x, y] = P[i];
        if (i === n.ref) {
          // reserved slot for the TL: dashed ring, released as the TL lands
          const pr = Math.min(s, 1 - rv(lt, 6.25, 0.3));
          if (pr > 0) {
            ctx.save(); ctx.setLineDash([4, 4]); ctx.lineDashOffset = -lt * 12; ctx.strokeStyle = L.rgba(C.cyan, 0.9 * pr); ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(ref[0], ref[1], 15 * pr, 0, TAU); ctx.stroke(); ctx.restore();
          }
          continue;
        }
        ctx.save(); ctx.globalAlpha *= clamp(fade * 1.6);
        if (age < 0.35) { ctx.strokeStyle = L.rgba(C.text, 0.6 * (1 - age / 0.35)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 7 + 16 * (age / 0.35), 0, TAU); ctx.stroke(); }
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, y, 8.5 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = n.fbs[i] ? C.amber : C.blue; ctx.beginPath(); ctx.arc(x, y, 6.5 * s, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    // reference-date label (backplate), leader to the slot
    const pr = vis(lt, 5.0 + Math.floor(n.ref / 4) * 0.125, OUT);
    if (pr > 0) {
      const lx = ref[0] + n.lab[0], ly = ref[1] + n.lab[1] + 20;
      const ax = n.lab[0] > 0 ? lx - 6 : lx + 306, ay = n.lab[1] < 0 ? ly + 6 : ly - 22;
      ctx.save(); ctx.globalAlpha *= clamp(pr * 1.5);
      ctx.strokeStyle = L.rgba(C.cyan, 0.6); ctx.lineWidth = 1.2;
      const dx = ax - ref[0], dy = ay - ref[1], dl = Math.hypot(dx, dy) || 1;
      L.polyPartial(ctx, [[ref[0] + (dx / dl) * 18, ref[1] + (dy / dl) * 18], [ax, ay]], pr); ctx.stroke();
      ctx.restore();
      plateText(ctx, 'reference 2009-02-08 · FBS', lx, ly, { kind: 'mono', size: 18, weight: 600, color: I.cyan, p: pr }, C.card, 8);
    }
  }

  /* ================================================================ scene */
  L.scene({
    id: 'act2', t0: T0, t1: T1,
    init() { geo(); imgs(); ink(); },
    /** read-only probe for self-tests: the synthetic P448 F0290 network */
    get net() { return geo().net; },
    tl(env) {
      // Own camera clamped inside the act: the runtime measures the hand-off at t = t1, where L.cam already
      // belongs to act 3 (z = 1.00). Using our last-frame camera keeps the TL continuous across the cut.
      const t = Math.min(env.t, T1 - 1e-6), lt = t - T0, cam = L.cam(t);
      const w = tlWorld(lt, t), sc = cam.toScreen(w.x, w.y);
      const tgt = { x: sc[0], y: sc[1], size: w.size * cam.z, rot: 0, form: w.form, to: w.to, k: w.k, phase: w.phase, energy: w.energy, alpha: 1 };
      if (env.handoff && lt < 1.6) return L.TL.blend(env.handoff, tgt, L.sp(lt, 0, 0.85));
      return tgt;
    },
    draw(ctx, env) {
      const lt = env.lt, t = env.t;
      ink();
      if (lt >= 3.5) drawMesh(ctx, lt);
      if (lt < 4.0) {
        const tw = env.tl ? env.cam.toWorld(env.tl.x, env.tl.y) : null;
        drawArchive(ctx, lt, t);
        drawSpectrum(ctx, lt, t);
        drawSLC(ctx, lt, t, tw ? [tw[0], tw[1], (env.tl.size * 0.62) / env.cam.z] : null);
      }
      if (lt >= 3.75) {
        drawMeshLabel(ctx, lt);
        drawNetwork(ctx, lt, t, env);
      }
    },
  });
})();

/* Act 2 — Phases 0–1 (10–14 s): stage, unpack and unify the two modes · Phase 2 (14–18 s): DEM and stack configuration.
 *
 * LAYOUT  Phases 0–1: archive card on the LEFT — the 779 counter, the archive grid and the FBS/FBD unification (the
 *         VO-05 spotlight target 'archives': it must read on its own while the rest of the frame is dimmed); SLC chip
 *         on the RIGHT (the act-1 pulse arrives right of centre and seats in it as one complex pixel).
 *         Phase 2: the DEM mesh builds where the chip was (right), the baseline network where the archive was (left;
 *         the VO-06 spotlight target 'network').  Everything stays inside the HUD-safe box at the section's maximum
 *         camera push (×1.04 in 10–14, ×1.0816 in 14–18).
 * TEXT  (v2, narrated film: ≤ 6 readable strings per section; the narration carries the story)
 *   10–14  "779" · "PALSAR Level 1.1 archives · 1.04 TB" · "FBS" · "FBD" ·
 *          "FBS band-limited 28 → 14 MHz · FBS + FBD merged into one stack" · "Level 1.1 SLC"
 *   14–18  "Elevation model" · "NAMRIA IfSAR DEM (+ SRTM) · schematic" · "Baseline network" · "P448 F0290 · 24 dates" ·
 *          "· 149 pairs formed" · "Schematic dates and baselines"
 *   Counters roll as unregistered digits ('deco'); only the settled value registers, and it holds ≥ 1.5 s.
 *   Tick labels (MHz, years, B⊥) are 'deco'.
 *
 * BEAT PLAN  (lt = t − 10 s · 1 beat = 0.5 s · bars start at 10, 12, 14, 16 s)
 * ── Bar 6 · 10–12 s · Phases 0–1 (the HUD header is automatic) ──────────────────────────────────────
 *  10.000  TL (L-band pulse from act 1) springs onto cell (3,4) of a 12×12 SLC chip and opens into a pixel
 *          (pulse→pixel, 0.85 s) at the hand-off size; on the 10.5 beat it compresses into the cell (0.75 s).
 *          10.25 the SLC card blooms OUT OF the TL's live position; 10.5 its header "Level 1.1 SLC".
 *  10.500  archive card constructs (left).  10.6–13.7 VO-05 spotlight: the card is marked 'archives' every frame.
 *  10.625  speckled SLC scene strip scans in above the chip (crisp 2:1); 10.75 zoom box, 10.875 zoom leaders → the
 *          chip is that box blown up, one sample per cell.  11.125 the phase channel scans over the chip.
 *  10.750–11.625  41×19 = 779 tiles fill in eight 16th-note sweeps; the hero counter (display 700, amber ink) rolls
 *          0 → 779 with them and holds to the end of the section.  10.875 "PALSAR Level 1.1 archives · 1.04 TB".
 *  11.000  divider; 11.25 frequency axis (deco ticks −14…+14 MHz); 11.5 FBS 28 MHz band (amber) + label;
 *          11.75 FBD 14 MHz band (blue) + label.
 * ── Bar 7 · 12–14 s ────────────────────────────────────────────────────────────────────────────────
 *  12.000  bandpass edges draw down at ±14 MHz through both rows; the unification line scans in (holds 1.7 s).
 *  12.500  the edges spring ±14 → ±7 MHz (0.35 s): FBS is band-limited to 14 MHz, its out-of-band energy a dashed ghost.
 *  13.000  "unified": the common 14 MHz band between the edges lights up across both rows, breathing on the beat.
 *  13.50→13.85  the SLC card scan-wipes away (the DEM sea-level grid + coastline are already under it, S→N);
 *  13.70→14.00  the archive card unmasks (right after the spotlight window).
 * ── Bar 8 · 14–16 s · Phase 2 ──────────────────────────────────────────────────────────────────────
 *  14.000  central-Luzon DEM wireframe drops in N→S in six 16th-note bands (springs, cyan while in flight, ×16
 *          vertical); the TL pixel glides onto Cabanatuan (stem to the surface).  The network card constructs (left).
 *  14.125  DEM card: 14.25 "Elevation model", 14.375 "NAMRIA IfSAR DEM (+ SRTM) · schematic".
 *  14.250  "Baseline network" + axes; 14.375 "P448 F0290 · 24 dates"; 14.625 "Schematic dates and baselines".
 *  14.500–15.125  24 acquisition dates land on 16ths (FBS amber / FBD blue); the reference slot is a dashed ring.
 *  14.750  footprint P448 F0290 draws on the DEM (dashed).
 *  15.375  the reference slot's 17 pairs radiate; 15.5–15.875 the other 132 pairs draw on in 16th-note batches
 *          (left → right); the counter rolls with them → 149 by ~15.97 and holds to 17.625.  15.5 a dashed data link
 *          draws from the TL's DEM marker to the reference slot.  15.6–17.6 VO-06 spotlight: the card is 'network'.
 * ── Bar 9 · 16–18 s ────────────────────────────────────────────────────────────────────────────────
 *  16.000  the TL rides that link to the slot (spring 1.5 s, peak ≈ 1,350 px/s, sagging below the B⊥ = 0 line,
 *          behind the dates, low energy), pixel → node (0.9 s); the travelled part of the link glows.
 *  16.6–17.1  as it docks, the reference pairs latch onto it; 17.0 they light up and a beat-locked signal pulse
 *          travels out along them; the link unmasks from the DEM end.  17.0 mesh unmasks S→N; DEM card leaves.
 *  17.500  labels scan out; edges + nodes contract into the TL (one spring).  17.625 title + count scan out,
 *          17.625→18.0 the network card unmasks.
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
    amber: L.ink(C.amber, C.card), blue: L.ink(C.blue, C.card),
  });

  /* ---------------------------------------------------------------- layout (world coords) */
  // Phases 0–1 — archive card (left: counter row, archive grid, FBS/FBD unification) and SLC chip card (right)
  const A = { x: 170, y: 170, w: 930, h: 730, cols: 41, rows: 19, px: 21, py: 10, tw: 17, th: 7, gx: 206, gy: 304, cy: 276 };
  const U = { lx: 206, px0: 336, px1: 1064, r1: 644, r2: 720, bh: 42, ax: 754, top: 594, div: 542, cap: 852 };
  U.xc = (U.px0 + U.px1) / 2; U.ppm = (U.px1 - U.px0) / 29.6;
  const S = { x: 1140, y: 170, w: 640, h: 730, n: 12, cell: 38, tc: 3, tr: 4, gy: 412, hd: 214, stx: 1172, sty: 252, sw: 288, sh: 48, bx: 134, by: 18 };
  S.gw = S.n * S.cell; S.gx = S.x + (S.w - S.gw) / 2;
  const slcCell = (c, r) => [S.gx + (c + 0.5) * S.cell, S.gy + (r + 0.5) * S.cell];
  // Phase 2 — DEM mesh (right) + its card, network (left)
  const M = { lon0: 119.85, lon1: 121.85, lat0: 14.45, lat1: 16.95, nx: 41, ny: 52, S: 205, VX: 16, cx: 1452, cy: 492, pitch: 0.86, yaw: -0.26,
    anchor: [L.geo.places.cabanatuan.lon, L.geo.places.cabanatuan.lat] };
  M.ZS = (M.VX * M.S) / 111320; // world units per metre of height → vertical exaggeration ×VX
  const ML = { x: 1150, y: 796, w: 600, h: 104 };
  const N = { x: 172, y: 176, w: 930, h: 744, px0: 262, px1: 1067, py0: 322, py1: 814, t0: 2006.95, t1: 2011.25, b: 2600 };
  const nxOf = (yr) => N.px0 + ((yr - N.t0) / (N.t1 - N.t0)) * (N.px1 - N.px0);
  const nyOf = (b) => (N.py0 + N.py1) / 2 - (b / N.b) * ((N.py1 - N.py0) / 2);
  const TLS = { pix: 35, node: 58 };
  const FLY = 1.5; // 16.0 flight DEM → network (≈ 860 px on screen): spring long enough to keep the peak speed ≲ 1,500 px/s
  const SAG = 60;  // the flight path (and its leader) sags by this much (world px): it docks from below, clear of the B⊥ = 0 line
  // spotlight targets (VO cue sheet): marked every frame their card is on screen; the runtime uses them inside the windows
  const SPOT_PAD = { pad: 14, r: 16 };

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
    return { X, Y, Z, rowBin, colBin, fpW, coast, anchorS: toW(M.anchor[0], M.anchor[1], 3), anchor: toW(M.anchor[0], M.anchor[1], 46) };
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
      // draw order (16th-note batches, so the pair counter runs 15.375–15.97 with the draw-on, under VO-06's "linked,
      // pair by pair"): the reference slot's own pairs radiate first (15.375), then the other pairs sweep in left → right
      // by midpoint in four batches 15.5–15.875.  The TL docks into the reserved slot later (16.0–17.0).
      const refE = E.filter((e) => e[0] === ref || e[1] === ref);
      const mid = (e) => P[e[0]][0] + P[e[1]][0];
      const other = E.filter((e) => e[0] !== ref && e[1] !== ref).sort((p, q) => mid(p) - mid(q) || p[0] - q[0] || p[1] - q[1]);
      const order = refE.map((e) => ({ a: ref, b: e[0] === ref ? e[1] : e[0], ref: true, at: 5.375, d: 0.32 }));
      other.forEach((e, i) => order.push({ a: e[0], b: e[1], ref: false, at: 5.5 + Math.floor((i / other.length) * 4) * 0.125, d: 0.3 }));
      // when each date gets its first pair (its node pulses as it is connected)
      const conn = new Array(24).fill(99);
      for (const e of order) { const tc = e.at + e.d * 0.6; conn[e.a] = Math.min(conn[e.a], tc); conn[e.b] = Math.min(conn[e.b], tc); }
      return { seed, ks, yr, B, fbs, P, E: order, conn, ref, nEdges: E.length, nRef: refE.length, refYr: REF_YR };
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
  /** TL world position before the 16.0 flight: SLC cell → (14.0) Cabanatuan on the DEM. */
  function flightFrom(lt) {
    const c0 = slcCell(S.tc, S.tr), m1 = L.sp(lt, 4.0, 0.9);
    if (m1 <= 0) return [c0[0], c0[1], 0];
    const q = meshAnchor(lt);
    return [lerp(c0[0], q[0], m1), lerp(c0[1], q[1], m1), m1];
  }
  /** The 16.0 flight path (shared by the TL and its leader): DEM marker → reference slot, sagging below it. */
  const flightPt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + SAG * 4 * clamp(k) * (1 - clamp(k))];
  const flightK = (lt) => L.sp(lt, 6.0, FLY);
  function tlWorld(lt, t) {
    const f0 = flightFrom(lt), m1 = f0[2];
    let x = f0[0], y = f0[1], size = TLS.pix, fly = 0;
    const m2 = flightK(lt);
    if (m2 > 0) {
      const q = flightPt(f0, netRef(), m2);
      x = q[0]; y = q[1]; size = lerp(size, TLS.node, m2);
      fly = Math.sin(Math.PI * clamp(m2));
    }
    // (no final glide: the node hands off where it docked, so the TL doesn't reverse direction across the 18 s cut)
    const kN = clamp(L.sp(lt, 6.0, 0.9));
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
  /** Card header (v2 typography: sans 600 19 px, sentence case, phase ink). */
  const header = (ctx, s, x, y, color, p, scan) => cardText(ctx, s, x, y, { kind: 'sans', size: 19, weight: 600, color, tracking: 0.01, p, scanColor: scan });
  /** A rolling counter: plain integers right-aligned in a fixed box (the words after it never move). While it rolls the
   *  digits are unregistered ('deco'); the settled value registers once, together with its prefix/suffix, as ONE string
   *  drawn at exactly the same glyph positions. */
  function counter(ctx, x, y, value, final, o, pre, post, id) {
    const done = value >= final, numW = L.measure(ctx, String(final), o).w, preW = pre ? L.measure(ctx, pre.s, o).w : 0;
    if (done) {
      const segs = [];
      if (pre) segs.push(pre);
      segs.push({ s: String(final), color: o.color });
      if (post) segs.push(post);
      return cardText(ctx, segs, x, y, Object.assign({}, o, { color: C.text, id }));
    }
    const d = Object.assign({}, o, { role: 'deco' });
    if (pre) cardText(ctx, pre.s, x, y, Object.assign({}, d, { color: pre.color }));
    cardText(ctx, String(value), x + preW + numW, y, Object.assign({}, d, { align: 'right' }));
    if (post) cardText(ctx, post.s, x + preW + numW, y, Object.assign({}, d, { color: post.color }));
    return null;
  }

  /* ================================================================ PHASES 0–1 · SLC chip (right) */
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
    // card header (leaves with the card's scan wipe)
    header(ctx, 'Level 1.1 SLC', S.x + 32, S.hd, ink().amber, rv(lt, 0.5, 0.4), C.amber);
    ctx.restore();
    // construction outline (grows from the TL pixel) and exit scan
    if (open < 0.999) {
      ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.85 * (1 - open)); ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, y0, x1 - x0, yb - y0); ctx.restore();
    }
    if (ex > 0) scanEdge(ctx, S.x, y1, S.w, ex, C.amber);
  }

  /* ================================================================ PHASES 0–1 · archive + unification (left) */
  function bandH(f, half, lt, seed) {
    const af = Math.abs(f), ro = 0.7;
    let a;
    if (af <= half - ro) a = 1; else if (af >= half + ro) a = 0; else a = 0.5 + 0.5 * Math.cos((Math.PI * (af - (half - ro))) / (2 * ro));
    const rip = 0.08 * (L.noise2(f * 1.1 + seed, lt * 2.4, 9) - 0.5) + 0.025 * Math.sin(f * 2.3 + lt * 3.1 + seed);
    return 0.05 + 0.95 * a * (0.92 + rip);
  }
  function bandPts(base, half, hs, lt, seed) {
    const pts = [[U.xc - 14.8 * U.ppm, base]];
    for (let f = -14.8; f <= 14.8 + 1e-6; f += 0.2) pts.push([U.xc + f * U.ppm, base - U.bh * hs * bandH(f, half, lt, seed)]);
    pts.push([U.xc + 14.8 * U.ppm, base]);
    return pts;
  }
  function fillBand(ctx, pts, base, color, aIn, aOut, fe) {
    const xl = U.xc - fe * U.ppm, xr = U.xc + fe * U.ppm;
    const g = ctx.createLinearGradient(0, base - U.bh, 0, base);
    g.addColorStop(0, L.rgba(color, 0.85)); g.addColorStop(1, L.rgba(color, 0.18));
    ctx.save(); ctx.beginPath(); ctx.rect(xl, base - U.bh - 10, xr - xl, U.bh + 12); ctx.clip();
    L.poly(ctx, pts, true); ctx.globalAlpha = aIn; ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = aIn; L.poly(ctx, pts.slice(1, -1)); ctx.stroke();
    ctx.restore();
    if (aOut > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(U.px0 - 30, base - U.bh - 10, xl - U.px0 + 30, U.bh + 12); ctx.rect(xr, base - U.bh - 10, U.px1 + 30 - xr, U.bh + 12); ctx.clip();
      L.poly(ctx, pts, true); ctx.globalAlpha = aOut; ctx.fillStyle = L.rgba(color, 0.35); ctx.fill();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = L.rgba(color, 0.9); ctx.lineWidth = 1.2; L.poly(ctx, pts.slice(1, -1)); ctx.stroke();
      ctx.restore();
    }
  }
  /** Unify the two modes: FBS (28 MHz) is band-limited to the common 14 MHz band of FBD — one stack. */
  function drawUnify(ctx, lt, t) {
    const I = ink();
    // divider between the archive grid and the two modes
    const pd = rv(lt, 1.0, 0.6);
    if (pd > 0) { ctx.strokeStyle = L.rgba(C.cyan, 0.16); ctx.lineWidth = 1; L.polyPartial(ctx, [[U.lx, U.div], [U.px1, U.div]], pd); ctx.stroke(); }
    // range-frequency axis (deco tick labels −14…+14 MHz) + faint guides at ±7 MHz (the common band)
    const pa = rv(lt, 1.25, 0.5);
    if (pa > 0) {
      ctx.strokeStyle = L.rgba(C.textDim, 0.7); ctx.lineWidth = 1.2;
      L.polyPartial(ctx, [[U.px0 - 8, U.ax], [U.px1 + 8, U.ax]], pa); ctx.stroke();
      for (const f of [-14, -7, 0, 7, 14]) {
        const x = U.xc + f * U.ppm, k = clamp(pa * 1.6 - Math.abs(f) / 28);
        ctx.beginPath(); ctx.moveTo(x, U.ax); ctx.lineTo(x, U.ax + 7 * k); ctx.stroke();
        L.text(ctx, f === 0 ? '0' : (f > 0 ? '+' : '−') + Math.abs(f), x, U.ax + 24, { kind: 'mono', size: 15, color: C.textDim, align: 'center', p: rv(lt, 1.375 + Math.abs(f) / 56, 0.4), role: 'deco' });
      }
      L.text(ctx, 'MHz', U.px0 - 26, U.ax + 24, { kind: 'mono', size: 15, color: C.textDim, align: 'right', p: rv(lt, 1.5, 0.4), role: 'deco' });
      ctx.setLineDash([3, 5]); ctx.strokeStyle = L.rgba(C.textDim, 0.18 * pa); ctx.beginPath();
      for (const f of [-7, 7]) { const x = U.xc + f * U.ppm; ctx.moveTo(x, U.top); ctx.lineTo(x, U.ax); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // 13.0 "unified" (VO-05's last word): the common 14 MHz band lights up across both rows — it rises from the axis
    // with a flash on the downbeat, then breathes on the beat (drawn under the bands)
    const pu = rv(lt, 3.0, 0.5), fl = lt >= 3.0 ? Math.exp(-(lt - 3.0) / 0.3) : 0;
    if (pu > 0) {
      const xl = U.xc - 7 * U.ppm, xr = U.xc + 7 * U.ppm, y0 = U.top + 2, y1 = U.ax - 2, bt = L.pulse(t);
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, L.rgba(C.cyan, (0.07 + 0.05 * bt + 0.14 * fl) * pu)); g.addColorStop(1, L.rgba(C.cyan, (0.16 + 0.08 * bt + 0.2 * fl) * pu));
      ctx.fillStyle = g; ctx.fillRect(xl, y1 - (y1 - y0) * pu, xr - xl, (y1 - y0) * pu);
    }
    // bands: FBS holds its 28 MHz until the 12.5 beat, then the bandpass edges slide in to ±7 MHz (band-limit)
    const cut = L.sp(lt, 2.5, 0.35), fe = 14 - 7 * cut;
    const h1 = rv(lt, 1.5, 0.55), h2 = rv(lt, 1.75, 0.55);
    if (h1 > 0) fillBand(ctx, bandPts(U.r1, 14, h1, lt, 3), U.r1, C.amber, 1, lerp(0.85, 0.3, clamp(cut)), fe);
    if (h2 > 0) fillBand(ctx, bandPts(U.r2, 7, h2, lt, 17), U.r2, C.blue, 1, 0.5, 14.6);
    // row labels (the colour semantics carry through the act: FBS = amber, FBD = blue)
    const lo = { kind: 'display', size: 30, weight: 700 };
    cardText(ctx, 'FBS', U.lx, U.r1 - 9, Object.assign({ color: I.amber, p: rv(lt, 1.5, 0.4), scanColor: C.amber }, lo));
    cardText(ctx, 'FBD', U.lx, U.r2 - 9, Object.assign({ color: I.blue, p: rv(lt, 1.75, 0.4), scanColor: C.blue }, lo));
    // bandpass edges (cyan), drawn down through both rows at ±14 MHz (12.0), then springing in to ±7 MHz (12.5)
    const pe = rv(lt, 2.0, 0.4);
    if (pe > 0) {
      for (const sgn of [-1, 1]) {
        const x = U.xc + sgn * fe * U.ppm;
        L.glow(ctx, x, (U.top + U.ax) / 2, 30 + 16 * fl, C.cyan, (0.3 + 0.15 * L.pulse(t) + 0.45 * fl) * pe);
        ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 2;
        L.polyPartial(ctx, [[x, U.top], [x, U.ax]], pe); ctx.stroke();
        ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.moveTo(x, U.top - 1); ctx.lineTo(x - sgn * 9 * pe, U.top - 6); ctx.lineTo(x, U.top - 11); ctx.closePath(); ctx.fill();
      }
      // bracket between the edges (follows them in)
      const xl = U.xc - fe * U.ppm + 6, xr = U.xc + fe * U.ppm - 6, yb = U.top - 6;
      ctx.strokeStyle = L.rgba(C.cyan, 0.7 * pe); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lerp(U.xc, xl + 8, pe), yb); ctx.lineTo(lerp(U.xc, xr - 8, pe), yb); ctx.stroke();
    }
    // the unification, in one line (revealed with the edges so it holds ≥ 1.5 s before the card leaves)
    // Phase 1 per the Y2Q2 report: FBS band-limited to the common 14 MHz, then all dates merged into one stack
    // (the FBD → FBS-grid resampling happens later, at coregistration — act 3)
    cardText(ctx, [{ s: 'FBS', color: I.amber, weight: 700 }, { s: ' band-limited 28 → 14 MHz · ', color: C.text }, { s: 'FBS', color: I.amber, weight: 700 }, { s: ' + ', color: C.text }, { s: 'FBD', color: I.blue, weight: 700 }, { s: ' merged into one stack', color: C.text }],
      U.lx, U.cap, { kind: 'sans', size: 24, weight: 500, p: rv(lt, 2.0, 0.45), scanColor: C.amber, id: 'a2-unify' });
  }
  function drawArchive(ctx, lt, t) {
    const pIn = rv(lt, 0.5, 0.5), q = qOut(lt, 4.0, 0.3);
    if (pIn <= 0 || q >= 0.998) return;
    // VO-05 spotlight target: the whole card (779 counter + archive grid + the unification) — constant box
    L.spot.mark(ctx, 'archives', A.x, A.y, A.w, A.h, SPOT_PAD);
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
      // hero counter (display 700, phase ink) + caption
      const co = { kind: 'display', size: 88, weight: 700, color: ink().amber, p: rv(lt, 0.625, 0.3), scanColor: C.amber };
      counter(ctx, A.gx - 4, A.cy, count, A.cols * A.rows, co, null, null, 'a2-count');
      const wBox = L.measure(ctx, '779', co).w;
      cardText(ctx, 'PALSAR Level 1.1 archives · 1.04 TB', A.gx - 4 + wBox + 26, A.cy, { kind: 'sans', size: 26, weight: 500, p: rv(lt, 0.875, 0.4), scanColor: C.amber });
      drawUnify(ctx, lt, t);
    });
  }

  /* ================================================================ PHASE 2 · DEM wireframe */
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
    const m = geo().mesh, pr = meshProj(lt), nx = M.nx, ny = M.ny;
    const rowA = new Float32Array(ny), rowQ = new Float32Array(ny), rowG = new Float32Array(ny), rowF = new Float32Array(ny);
    let any = false;
    for (let j = 0; j < ny; j++) {
      const f = j / (ny - 1);
      // sea-level plane: revealed S → N while the SLC chip wipes away above it (13.5–13.85)
      // land rows: in, drop N → S from the 14.0 bar in six 16th-note bands (beat-locked); out, unmask S → N
      // through the cyan scan tint (no displacement)
      const gIn = rv(lt, 3.5 + (1 - f) * 0.3, 0.3), band = Math.min(5, Math.floor(f * 6));
      const d = L.sp(lt, 4.0 + band * 0.125 + (f * 6 - band) * 0.03, 0.5), e = clamp(L.sp(lt, 7.0 + (1 - f) * 0.45, 0.3));
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
    // ---- P448 F0290 footprint draped on the DEM (draws on, then retracts); named by the network title
    const pf = Math.min(rv(lt, 4.75, 0.7), 1 - rv(lt, 7.0, 0.4));
    if (pf > 0) {
      const pts = m.fpW.map((w) => { const p = pr(w[0], w[1], w[2]); return [p[0], p[1]]; });
      ctx.save();
      L.poly(ctx, pts, true); ctx.fillStyle = L.rgba(C.cyan, 0.08 * pf); ctx.fill();
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = -lt * 24; ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 1.8;
      L.polyPartial(ctx, pts, pf); ctx.stroke();
      ctx.restore();
    }
    // ---- stem from the TL pixel to the surface
    const ps = Math.min(rv(lt, 4.6, 0.4), 1 - rv(lt, 5.75, 0.3));
    if (ps > 0) {
      const s = pr(m.anchorS[0], m.anchorS[1], m.anchorS[2]), tw = tlWorld(lt, lt + T0);
      ctx.strokeStyle = L.rgba(C.cyan, 0.7 * ps); ctx.lineWidth = 1.4;
      L.polyPartial(ctx, [[s[0], s[1]], [tw.x, tw.y]], ps); ctx.stroke();
      ctx.fillStyle = L.rgba(C.cyan, 0.9 * ps); ctx.beginPath(); ctx.ellipse(s[0], s[1], 6 * ps, 2.6 * ps, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawMeshLabel(ctx, lt) {
    const pIn = rv(lt, 4.125, 0.5), q = qOut(lt, 7.6, 0.35);
    panel(ctx, ML.x, ML.y, ML.w, ML.h, pIn, q, C.blue, () => {
      header(ctx, 'Elevation model', ML.x + 24, ML.y + 38, ink().blue, rv(lt, 4.25, 0.4), C.blue);
      cardText(ctx, [{ s: 'NAMRIA IfSAR DEM (+ SRTM)', color: C.text }, { s: ' · schematic', color: C.textDim }], ML.x + 24, ML.y + 76,
        { kind: 'sans', size: 24, weight: 500, p: rv(lt, 4.375, 0.4), scanColor: C.blue });
    });
  }

  /* ================================================================ PHASE 2 · baseline network */
  function drawNetwork(ctx, lt, t, env) {
    const n = geo().net, I = ink();
    // OUT: header + caveat scan out · OUT_T: title + pair count (the settled "149" holds ~15.97 → 17.7)
    const pIn = rv(lt, 4.0, 0.6), q = qOut(lt, 8.0, 0.375), OUT = 7.5, OUT_T = 7.625;
    if (pIn <= 0) return;
    // VO-06 spotlight target: the network card — constant box while it is on screen (14.0–18.0)
    if (q < 0.998) L.spot.mark(ctx, 'network', N.x, N.y, N.w, N.h, SPOT_PAD);
    const tw = tlWorld(lt, t), ref = n.P[n.ref], beat = L.pulse(t);
    panel(ctx, N.x, N.y, N.w, N.h, pIn, q, C.blue, () => {
      header(ctx, 'Baseline network', N.x + 34, 214, I.blue, vis(lt, 4.25, OUT), C.blue);
      const to = { kind: 'display', size: 36, weight: 700 };
      const tb = cardText(ctx, 'P448 F0290 · 24 dates', N.x + 34, 262, Object.assign({ p: vis(lt, 4.375, OUT_T), scanColor: C.blue }, to));
      // the pair count is earned: it rolls with the edges as they draw (15.375–15.97)
      counter(ctx, N.x + 34 + tb.w, 262, pairsDrawn(lt), n.nEdges, Object.assign({ p: vis(lt, 5.375, OUT_T), scanColor: C.blue, color: I.blue }, to),
        { s: ' · ', color: C.text }, { s: ' pairs formed', color: C.text }, 'a2-pairs');
      // axes (deco tick labels)
      const pa = rv(lt, 4.25, 0.6);
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
        L.text(ctx, 'B⊥ (m)', N.px0 - 12, N.py0 + 6, { kind: 'mono', size: 15, color: C.textDim, align: 'right', p: vis(lt, 4.5, OUT), role: 'deco' });
      }
      // honest caveat: the counts are real, the plotted dates and baselines are not
      cardText(ctx, 'Schematic dates and baselines', N.px1, N.y + N.h - 24, { kind: 'sans', size: 18, weight: 500, color: C.textDim, align: 'right', p: vis(lt, 4.625, OUT) });
    });

    // ----- edges and nodes are drawn above the card so they can contract into the TL
    const ce = rv(lt, 7.5, 0.4); // contraction into the TL (one spring for every edge and node)
    const m2 = clamp(flightK(lt));
    const latch = L.ease.inOutSine(clamp((m2 - 0.85) / 0.15)); // the reference pairs latch onto the TL as it docks
    const P = n.P.map((p) => (ce > 0 ? [lerp(p[0], tw.x, ce), lerp(p[1], tw.y, ce)] : p));
    if (latch > 0) P[n.ref] = [lerp(ref[0], tw.x, latch), lerp(ref[1], tw.y, latch)];
    const fade = 1 - ce, lit = rv(lt, 7.0, 0.35); // lit: the docked TL lights up its own pairs (17.0)
    if (lt >= 5.375 && ce < 0.995) {
      const full = [[], []];
      for (const e of n.E) {
        const p = edgeP(lt, e);
        if (p <= 0) continue;
        const pa = P[e.a], pb = P[e.b];
        if (p >= 0.999) { full[e.ref ? 1 : 0].push(pa, pb); continue; }
        ctx.strokeStyle = e.ref ? L.rgba(C.cyan, 0.75 * fade) : L.rgba(C.textDim, 0.7 * fade); ctx.lineWidth = e.ref ? 1.6 : 1.2;
        L.polyPartial(ctx, [pa, pb], p); ctx.stroke();
      }
      // the held web breathes on the beat
      const bw = lt > 6.0 ? beat : 0;
      for (const [fi, col, a, w] of [[0, C.textDim, 0.27 + 0.22 * bw, 1.1], [1, C.cyan, lerp(0.34 + 0.2 * bw, 0.58 + 0.34 * bw, lit), lerp(1.3, 1.8, lit)]]) {
        const f = full[fi]; if (!f.length) continue;
        ctx.beginPath(); for (let k = 0; k < f.length; k += 2) { ctx.moveTo(f[k][0], f[k][1]); ctx.lineTo(f[k + 1][0], f[k + 1][1]); }
        ctx.strokeStyle = L.rgba(col, a * fade); ctx.lineWidth = w; ctx.stroke();
      }
      // once docked: a beat-locked signal pulse travels out from the TL along its pairs
      if (lt >= 7.0 && ce < 0.9) {
        const f = ((lt - 7.0) / 0.5) % 1, u = L.ease.outCubic(f), a = Math.sin(Math.PI * Math.min(1, f * 1.4)) * 0.85 * fade;
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
    // ----- the data link the TL rides (16.0): from its DEM marker (P448 F0290, Cabanatuan) to the reserved
    // reference slot. It draws on a beat ahead (15.5), the travelled part glows behind the TL, and it unmasks
    // from the DEM end once the TL has docked (17.0).
    const pL = rv(lt, 5.5, 0.6), rL = rv(lt, 7.0, 0.45);
    if (pL > rL && rL < 0.995) {
      const a = flightFrom(lt), seg = (k0, k1) => { const o = []; for (let i = 0; i <= 48; i++) o.push(flightPt(a, ref, lerp(k0, k1, i / 48))); return o; };
      ctx.save(); ctx.lineCap = 'round';
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -lt * 40;
      ctx.strokeStyle = L.rgba(C.cyan, 0.8); ctx.lineWidth = 1.6; L.poly(ctx, seg(rL, pL)); ctx.stroke();
      ctx.setLineDash([]);
      const kt = Math.min(m2, pL);
      if (kt > rL + 0.002) {
        ctx.globalCompositeOperation = 'lighter';
        const tp = seg(rL, kt);
        ctx.strokeStyle = L.rgba(C.cyan, 0.16); ctx.lineWidth = 7; L.poly(ctx, tp); ctx.stroke();
        ctx.strokeStyle = L.rgba(C.cyan, 0.7); ctx.lineWidth = 2; L.poly(ctx, tp); ctx.stroke();
      }
      ctx.restore();
    }
    // during its flight the TL passes BEHIND the dates (over the faint pairs), at low energy
    if (env && lt >= 6.0 && lt < 7.0) env.drawTL();
    // nodes (24 dates) — land on 16ths, left → right (14.5–15.125); each pulses as it is connected, then on the beat
    if (ce < 0.99) {
      for (let i = 0; i < 24; i++) {
        const at = 4.5 + Math.floor(i / 4) * 0.125, age = lt - at;
        if (age <= 0) continue;
        const s = clamp(L.spring(age, 0.3)) * (1 - 0.6 * ce);
        const [x, y] = P[i];
        if (i === n.ref) {
          // reserved slot for the TL: dashed ring, released as the TL docks
          const pr = Math.min(s, 1 - rv(lt, 6.875, 0.3));
          if (pr > 0) {
            ctx.save(); ctx.setLineDash([4, 4]); ctx.lineDashOffset = -lt * 12; ctx.strokeStyle = L.rgba(C.cyan, 0.9 * pr); ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(ref[0], ref[1], 15 * pr * (1 + 0.12 * (lt > 5.0 ? beat : 0)), 0, TAU); ctx.stroke(); ctx.restore();
          }
          continue;
        }
        const cA = lt - n.conn[i], pul = cA > 0 ? beat * clamp(cA * 4) : 0;
        ctx.save(); ctx.globalAlpha *= clamp(fade * 1.6);
        if (age < 0.35) { ctx.strokeStyle = L.rgba(C.text, 0.6 * (1 - age / 0.35)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 7 + 16 * (age / 0.35), 0, TAU); ctx.stroke(); }
        if (cA > 0 && cA < 0.4) { ctx.strokeStyle = L.rgba(C.cyan, 0.75 * (1 - cA / 0.4)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 8 + 12 * (cA / 0.4), 0, TAU); ctx.stroke(); }
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, y, 8.5 * s * (1 + 0.28 * pul), 0, TAU); ctx.fill();
        ctx.fillStyle = n.fbs[i] ? C.amber : C.blue; ctx.beginPath(); ctx.arc(x, y, 6.5 * s * (1 + 0.34 * pul), 0, TAU); ctx.fill();
        ctx.restore();
      }
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
      if (env.handoff && lt < 1.6) {
        // position + form spring from the cut; the size holds the hand-off size for one beat, then the pixel
        // compresses into its SLC cell (10.5–11.25)
        const st = L.TL.blend(env.handoff, tgt, L.sp(lt, 0, 0.85));
        st.size = lerp(env.handoff.size, tgt.size, L.sp(lt, 0.5, 0.75));
        return st;
      }
      return tgt;
    },
    draw(ctx, env) {
      const lt = env.lt, t = env.t;
      ink();
      if (lt >= 3.5) drawMesh(ctx, lt);
      if (lt < 4.0) {
        const tw = env.tl ? env.cam.toWorld(env.tl.x, env.tl.y) : null;
        drawArchive(ctx, lt, t);
        drawSLC(ctx, lt, t, tw ? [tw[0], tw[1], (env.tl.size * 0.62) / env.cam.z] : null);
      }
      if (lt >= 4.0) {
        drawMeshLabel(ctx, lt);
        drawNetwork(ctx, lt, t, env);
      }
    },
  });
})();

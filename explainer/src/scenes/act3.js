/* Act 3 · 18–30 s · Coregistration & phase interferometry (ISCE2 Phases 3–4, QC, SNAPHU).
 *
 * Beat plan (lt = t − 18 s · 1 beat = 0.5 s · bars start at lt 0, 2, 4, 6, 8, 10 · springs ζ 0.82)
 *  A · PHASE 03 COREGISTRATION (18–22, camera 1.00 → 1.04)
 *   0.0  the two chip frames unfold out of the incoming TL node while the TL flies to the reference
 *        and becomes the 'pixel' correlation window; images scan in (0.2 / 0.3), labels 0.25 / 0.5.
 *   0.5  cross-correlation card; correlation surface 0.75; the reference river is traced (0.75).
 *   1.0  TL snaps to the matching window on the secondary; correlation peak rises off-centre; offset
 *        vectors grow; the reference river ghost (cyan, dashed) and the secondary river (gold) sit apart.
 *   1.5  TL → reference patch 2; caption "→ sub-pixel alignment".
 *   2.0  BAR · TL → window 2'. The secondary springs into alignment (1.0 s): gold river lands on the cyan
 *        ghost, vectors shrink to dots, the correlation peak walks to zero offset.
 *   2.5 / 3.0  TL samples patch 3 / 3' (now aligned).   3.5–4.0  A contracts into the TL and unmasks.
 *  B · PHASE 04 INTERFEROGRAMS (22–26, camera 1.04 → 1.08)
 *   3.75 TL pixel → 'pulse' = complex wave s₁ (lands ≈ 4.3).  4.0 BAR wave guides construct from the TL.
 *   4.25 s₂ (gold) draws on, date labels.  4.5 multiply sweep s₁ · s₂* → product strip; phasor (one tick,
 *        then frozen).  4.75 / 5.0 "phase difference Δφ" / "wrapped into (−π, π]".
 *   5.0  wrapped single-look raster extrudes from the strip (5.0–6.0); multilook card (5.0), header 5.25,
 *        28 × 12 sample block 5.25; 5.75 zoom call-out from one ~90 m cell (drawn above the raster).
 *   6.0  BAR · the 28 azimuth looks merge + "28 az looks ≈ 90 m"; colour bar.
 *   6.5  the 12 range looks merge → ONE pixel + "12 × 4.68 m = 56 m slant → ~90 m ground", "→ ~90 × 90 m pixels".
 *   7.0–7.5 the raster wipes noisy single-look → crisp multilooked (nearest-neighbour).
 *   7.15–7.5 phasor unmasks; 7.5 QC card constructs (counter rolls 1,779 → 1,634 on 16ths, lands 8.1).
 *  C · QC + SNAPHU (26–30, camera 1.08 → 1.125)
 *   8.0  BAR · the multilooked raster springs into its slot of a 6 × 4 thumbnail grid; the TL becomes the
 *        gate head; waves unmask; multilook card unmasks 8.35–8.65 while the right columns construct.
 *   8.5  report-grid gate sweeps (8.5–9.5); two tiles (poor coherence, ionospheric) get a crimson strike and
 *        collapse out; the matching reason in the QC card flashes.
 *   9.5  tiles shrink + unmask (bottom row first); the kept interferogram expands into the field; TL morphs
 *        pixel → 'fringe' on the bowl; 9.75 transect + wrapped sawtooth profile draw on, reference point marked.
 *   10.0 BAR · SNAPHU: the unwrapping front grows out of the reference point (10.0–10.7); every pixel goes
 *        cyclic → continuous, every 2π segment of the profile drops into one smooth curve; the y-axis
 *        follows the curve (2π ticks). Settled ≈ 11.0, held to 11.5.
 *   11.5 final beat · field + profile contract into the TL; text unmasks 11.85–12.0;
 *        TL → pure 'fringe', size 120, at screen (960, 450), rot 0, alpha 1.
 * Values: 2009-02-08 FBS reference, 4.68 m grid, 28 × 12 looks, ~90 m, 1,779 → 1,634, G1–G23 (fact sheet).
 * Offsets, fringes, phases, tiles and the reference point are schematic (no invented numbers are printed).
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp, sp = L.sp, io = L.inout;
  const sine = L.ease.inOutSine;
  const wrap = (x) => x - TAU * Math.floor((x + Math.PI) / TAU); // → (−π, π]
  const outP = (lt, b, d) => (lt >= b ? 0 : clamp(1 - L.spring(lt - (b - d), d * 0.8)));

  const INK = { blueCard: L.ink(C.blue, C.card) };
  const END = { x: 960, y: 450, size: 120 }; // hand-off at 30.0 s (screen space)

  /* ================================================================ layout (world coordinates)
   * Each section keeps its content inside the HUD-safe box at that section's maximum camera zoom. */
  const A = {
    ref: { x: 150, y: 300, s: 460 }, sec: { x: 690, y: 300, s: 460 },
    card: { x: 1230, y: 300, w: 530, h: 460 },
    T: [16, -10], rot: (1.0 * Math.PI) / 180, // illustrative misregistration of the secondary (px, rad)
    patches: [[132, 42], [-134, -128], [-48, 138]], win: 66, grid: 92, ex: 2.5,
    snaps: [[0.0, 0, 0], [1.0, 1, 0], [1.5, 0, 1], [2.0, 1, 1], [2.5, 0, 2], [3.0, 1, 2]], // [lt, chip 0 ref / 1 sec, patch]
    alignAt: 2.0, cIn: 3.5, out: 4.1, outD: 0.55, capY: 842,
  };
  const B = {
    r: { x: 620, y: 360, s: 480 }, NSL: 520, NML: 40,
    wave: { x: 860, y1: 236, y2: 296, half: 240, amp: 0.3, cyc: 9 },
    strip: { y: 331, h: 10 },
    ph: { x: 395, y: 540, r: 100 },
    card: { x: 1170, y: 222, w: 560, h: 540 },
    blk: { x: 1360, y: 330, s: 228 }, ml: [27, 15],
    wOut: 8.1, phOut: 7.5, cOut: 8.65, move: 8.0,
    azAt: 6.0, rgAt: 6.5, wipe: 7.0,
  };
  const Q = {
    grid: { x: 775, y: 262, cols: 6, rows: 4, t: 120, g: 14 },
    bad: { 13: 'decor', 10: 'iono' }, keep: 7,
    gate: { x0: 761, x1: 1579, y0: 240, y1: 806, head: 216, t0: 8.5, t1: 9.5 },
    qc: { x: 184, y: 352, w: 420, h: 340 }, qcIn: 7.5, qcOut: 9.9,
    field: { x: 740, y: 215, s: 440 }, fieldAt: 9.5,
    prof: { x: 740, y: 700, w: 440, h: 160 },
  };
  const UW = { t0: 10.0, d: 0.7, ref: [0.1, 0.12] }; // unwrapping front: starts on the bar at the reference point
  const DMAX = Math.hypot(1 - UW.ref[0], 1 - UW.ref[1]);
  const uwTime = (u, v) => UW.t0 + (UW.d * Math.acos(1 - 2 * clamp(Math.hypot(u - UW.ref[0], v - UW.ref[1]) / DMAX))) / Math.PI;
  const BOWL = { cx: 0.5, cy: 0.5, sig: 0.17, D: 6.6 * Math.PI };

  /* ================================================================ synthetic phase (pure functions) */
  const bowl = (u, v) => { const dx = u - BOWL.cx, dy = v - BOWL.cy; return -BOWL.D * Math.exp(-(dx * dx + dy * dy) / (2 * BOWL.sig * BOWL.sig)); };
  function gridOf(fn, n) { const g = new Float32Array((n + 1) * (n + 1)); for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) g[j * (n + 1) + i] = fn(i / n, j / n); return g; }
  function bil(g, n, u, v) {
    const x = clamp(u, 0, 1) * n, y = clamp(v, 0, 1) * n, i = Math.min(n - 1, x | 0), j = Math.min(n - 1, y | 0), fx = x - i, fy = y - j, w = n + 1;
    const a = g[j * w + i], b = g[j * w + i + 1], c = g[(j + 1) * w + i], d = g[(j + 1) * w + i + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const gauss = (i, j, s) => Math.sqrt(-2 * Math.log(1 - L.hash2(i, j, s) * 0.9999)) * Math.cos(TAU * L.hash2(i, j, s + 101));
  const fmt = (n) => `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}`;

  /* ================================================================ caches (pure functions of constants) */
  let K = null;
  const cache = () => K || (K = build());
  function u32(r, g, b) { return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; }
  function build() {
    const k = {};
    k.fr32 = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { const f = L.LUT.fringe; k.fr32[i] = u32(f[i * 3], f[i * 3 + 1], f[i * 3 + 2]); }
    // smooth components on a coarse grid (bilinear) — residual topography + gentle ramp, coherence
    const GN = 128;
    k.topoG = gridOf((u, v) => 4.8 * (L.fbm(u * 3.1 + 1.7, v * 3.1 + 4.2, 4, 21) - 0.5) + 0.9 * (u - 0.5), GN);
    k.cohG = gridOf((u, v) => 0.92 - 0.78 * L.smooth((L.fbm(u * 2.3 + 8.1, v * 2.3 + 2.6, 3, 5) - 0.5) / 0.17), GN);
    const topo = (u, v) => bil(k.topoG, GN, u, v), coh = (u, v) => bil(k.cohG, GN, u, v);
    k.base = (u, v) => bowl(u, v) + topo(u, v);
    // single-look wrapped interferogram (phase + noise), NSL²
    const N = B.NSL, M = B.NML, bs = N / M;
    k.sl = new Float32Array(N * N); k.slBase = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N, b = k.base(u, v), g = coh(u, v);
      const sig = 0.3 + 2.7 * (1 - g) * (1 - g);
      k.slBase[j * N + i] = b; k.sl[j * N + i] = b + sig * gauss(i, j, 31);
    }
    let rm = 0; for (let i = 0; i < N; i++) rm += k.slBase[i];
    k.row0Mean = rm / N;
    // multilooked (complex average of bs × bs blocks), its unwrapped value, and the unwrap time of each pixel
    k.ml = new Float32Array(M * M); k.mlU = new Float32Array(M * M); k.uwT = new Float32Array(M * M);
    let mlMin = 0;
    for (let J = 0; J < M; J++) for (let I = 0; I < M; I++) {
      let re = 0, im = 0;
      for (let j = J * bs; j < (J + 1) * bs; j++) for (let i = I * bs; i < (I + 1) * bs; i++) { const p = k.sl[j * N + i]; re += Math.cos(p); im += Math.sin(p); }
      const w = Math.atan2(im, re), bc = k.base((I + 0.5) / M, (J + 0.5) / M), id = J * M + I;
      k.ml[id] = w; k.mlU[id] = w + TAU * Math.round((bc - w) / TAU); mlMin = Math.min(mlMin, k.mlU[id]);
      k.uwT[id] = uwTime((I + 0.5) / M, (J + 0.5) / M);
    }
    k.vmax = 1.35 * Math.abs(mlMin); // bowl bottom lands on the crimson stop (−0.74), never on the pale end
    // multilook inset cells: 12 range × 28 azimuth samples around the chosen 90 m cell
    k.cells = new Float32Array(12 * 28);
    for (let j = 0; j < 28; j++) for (let i = 0; i < 12; i++) k.cells[j * 12 + i] = 0.95 * gauss(i + 40, j + 40, 57);
    k.colMean = new Float32Array(12);
    for (let i = 0; i < 12; i++) { let re = 0, im = 0; for (let j = 0; j < 28; j++) { re += Math.cos(k.cells[j * 12 + i]); im += Math.sin(k.cells[j * 12 + i]); } k.colMean[i] = Math.atan2(im, re); }
    k.mlMean = k.ml[B.ml[1] * M + B.ml[0]];
    // SAR amplitude chips (shared ground, partly shared speckle) + the river centreline (chip-centred world px)
    k.sar = sarChips();
    k.river = [];
    for (let x = 0; x <= k.sar.NR; x += 4) {
      const y = 0.64 * k.sar.NR + 30 * Math.sin(x / 61) + 13 * Math.sin(x / 23 + 1.3), sc = A.ref.s / k.sar.NR;
      k.river.push([(x - k.sar.NR / 2) * sc, (y - k.sar.NR / 2) * sc]);
    }
    // QC thumbnails (40 × 40 multilooked interferograms, static)
    k.tiles = [];
    for (let n = 0; n < Q.grid.cols * Q.grid.rows; n++) k.tiles.push(tileCanvas(k, n, topo, coh));
    // profile along the field's centre row (smooth phase), wrapped + 2π segment index + segment unwrap time
    const NP = 221; k.prof = { U: new Float32Array(NP), W: new Float32Array(NP), n: new Int16Array(NP), tSeg: new Float32Array(NP), NP };
    let mn = 0;
    for (let i = 0; i < NP; i++) {
      const u = i / (NP - 1), U = k.base(u, 0.5), W = wrap(U);
      k.prof.U[i] = U; k.prof.W[i] = W; k.prof.n[i] = Math.round((U - W) / TAU); mn = Math.min(mn, U);
    }
    let s0 = 0;
    for (let i = 0; i < NP; i++) { if (i && k.prof.n[i] !== k.prof.n[i - 1]) s0 = i / (NP - 1); k.prof.tSeg[i] = uwTime(s0, 0.5); }
    k.prof.min = mn;
    // colour bars
    k.barFr = L.canvas(256, 1); k.barVel = L.canvas(256, 1);
    { const x = k.barFr.getContext('2d'), im = x.createImageData(256, 1);
      for (let i = 0; i < 256; i++) { const c = L.fringeRGB(-Math.PI + (TAU * i) / 255); im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0); }
    { const x = k.barVel.getContext('2d'), im = x.createImageData(256, 1), v = L.LUT.vel;
      for (let i = 0; i < 256; i++) { im.data[i * 4] = v[i * 3]; im.data[i * 4 + 1] = v[i * 3 + 1]; im.data[i * 4 + 2] = v[i * 3 + 2]; im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0); }
    return k;
  }

  function sarChips() {
    const NR = 484, MG = 28, NS = NR + 2 * MG, SC = 100; // canvas px (drawn into 460 world px)
    const GS = 2, gw = Math.ceil((NS + 8) / GS) + 1;
    const hg = new Float32Array(gw * gw);
    for (let j = 0; j < gw; j++) for (let i = 0; i < gw; i++) hg[j * gw + i] = L.fbm((i * GS - MG - 4) / SC, (j * GS - MG - 4) / SC, 5, 11);
    const H = (x, y) => {
      const fx = clamp((x + MG + 4) / GS, 0, gw - 1.001), fy = clamp((y + MG + 4) / GS, 0, gw - 1.001);
      const i = fx | 0, j = fy | 0, a = fx - i, b = fy - j;
      const p = hg[j * gw + i], q = hg[j * gw + i + 1], r = hg[(j + 1) * gw + i], s = hg[(j + 1) * gw + i + 1];
      return p + (q - p) * a + (r - p) * b + (p - q - r + s) * a * b;
    };
    function make(N, off, own) {
      const c = L.canvas(N, N), cx = c.getContext('2d'), img = cx.createImageData(N, N), d = img.data;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = i - off, y = j - off;
        const h = H(x, y), gx = ((H(x + 2, y) - H(x - 2, y)) / 4) * SC;
        let s = 0.55 + 0.6 * Math.tanh(gx * 1.6) + 0.9 * (h - 0.5);
        // river (dark, specular water) and a straight bright road: features that make misregistration visible
        const ry = 0.64 * NR + 30 * Math.sin(x / 61) + 13 * Math.sin(x / 23 + 1.3), dr = Math.abs(y - ry);
        if (dr < 8) s *= 0.07 + 0.93 * L.smooth((dr - 3.5) / 4.5);
        const dl = Math.abs(0.42 * x - y + 92) / 1.088;
        if (dl < 1.6 && x > 40 && x < 420) s *= 2.4;
        const tx = x - 318, ty = y - 128;
        if (tx * tx + ty * ty < 46 * 46 && L.hash2(Math.round(x) + 999, Math.round(y) + 999, 5) > 0.9) s *= 5.5;
        s = Math.max(0.1, s);
        const e1 = -Math.log(1 - L.hash2(Math.round(x) + 1000, Math.round(y) + 1000, 77) * 0.999);
        const e2 = -Math.log(1 - L.hash2(i, j, own) * 0.999);
        const a = Math.sqrt(s * (0.62 * e1 + 0.38 * e2)), v = Math.min(255, Math.pow(a / 1.25, 0.75) * 150);
        const o = (j * N + i) * 4;
        d[o] = v * 0.82; d[o + 1] = v * 0.95; d[o + 2] = v; d[o + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      return c;
    }
    return { ref: make(NR, 0, 401), sec: make(NS, MG, 977), NR, NS };
  }

  function tileCanvas(k, n, topo, coh) {
    const M = 40, c = L.canvas(M, M), x = c.getContext('2d'), img = x.createImageData(M, M), d32 = new Uint32Array(img.data.buffer);
    const hk = (q) => L.hash1(n * 13 + q, 3);
    const s = 0.25 + 1.0 * hk(1), ax = (hk(2) - 0.5) * 6, ay = (hk(3) - 0.5) * 4, tk = (hk(4) - 0.5) * 2.4, nk = 0.08 + 0.22 * hk(5);
    const kind = Q.bad[n];
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const u = (i + 0.5) / M, v = (j + 0.5) / M;
      let p;
      if (n === Q.keep) p = k.ml[j * M + i];
      else {
        const g = coh(u, v);
        p = s * bowl(u, v) + ax * u + ay * v + (1 + tk) * topo(u, v) + (nk + 0.9 * (1 - g) * (1 - g)) * gauss(i + n * 50, j, 13);
        if (kind === 'decor') p += (2.9 - 1.2 * g) * gauss(i, j + n * 50, 17); // poor coherence: phase noise everywhere
        if (kind === 'iono') { const w = u - 0.3 - 0.35 * v; p += 13 * Math.exp(-(w * w) / (2 * 0.075 * 0.075)) + 2.2 * Math.sin(v * 9 + u * 2); } // ionospheric streak
      }
      d32[j * M + i] = k.fr32[((p + 64 * TAU) * (256 / TAU)) & 255];
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  /* ================================================================ drawing helpers */
  /** Interlaced scanline construct for images/shapes (same grammar as text 'scan'). p 0..1; reversing p unmasks. */
  function scanDraw(ctx, x, y, w, h, p, color, fn) {
    if (p <= 0) return;
    if (p >= 1) { fn(); return; }
    const rowH = 4, rows = Math.max(1, Math.ceil(h / rowH)), f1 = clamp(p * 2), f2 = clamp(p * 2 - 1);
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < rows; i++) { const fr = (i + 0.5) / rows; if (fr <= (i % 2 ? f2 : f1)) ctx.rect(x - 1, y + i * rowH, w + 2, rowH + 0.5); }
    ctx.clip(); fn(); ctx.restore();
    const f = p < 0.5 ? p * 2 : p * 2 - 1, yy = y + h * f, a = 0.8 * Math.sin(Math.PI * clamp(p));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = L.rgba(color, a); ctx.fillRect(x - 8, yy - 1, w + 16, 2);
    ctx.fillStyle = L.rgba(color, a * 0.22); ctx.fillRect(x - 8, yy - 5, w + 16, 10);
    ctx.restore();
  }
  function glowLine(ctx, pts, color, p, lw = 2.4) {
    if (p <= 0) return;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
    ctx.strokeStyle = L.rgba(color, 0.09); ctx.lineWidth = lw * 5.5; L.polyPartial(ctx, pts, p); ctx.stroke();
    ctx.strokeStyle = L.rgba(color, 0.2); ctx.lineWidth = lw * 2.4; L.polyPartial(ctx, pts, p); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round';
    ctx.strokeStyle = L.rgba(color, 1); ctx.lineWidth = lw; L.polyPartial(ctx, pts, p); ctx.stroke();
    ctx.restore();
  }
  const sqPts = (cx, cy, s) => { const h = s / 2; return [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h], [cx - h, cy - h]]; };
  const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  function arrowHead(ctx, x0, y0, x1, y1, hs) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hs * Math.cos(a - 0.45), y1 - hs * Math.sin(a - 0.45));
    ctx.lineTo(x1 - hs * Math.cos(a + 0.45), y1 - hs * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
  }
  function bracketH(ctx, x0, x1, y, p, tick = 8) { L.polyPartial(ctx, [[x0, y - tick], [x0, y], [(x0 + x1) / 2, y], [(x0 + x1) / 2, y + 6], [(x0 + x1) / 2, y], [x1, y], [x1, y - tick]], p); ctx.stroke(); }
  function bracketV(ctx, x, y0, y1, p, tick = 8) { L.polyPartial(ctx, [[x + tick, y0], [x, y0], [x, (y0 + y1) / 2], [x - 6, (y0 + y1) / 2], [x, (y0 + y1) / 2], [x, y1], [x + tick, y1]], p); ctx.stroke(); }
  function crossMark(ctx, x, y, r, p) { // small crimson × (vector glyph)
    if (p <= 0) return;
    ctx.save(); ctx.strokeStyle = C.crimson; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    L.polyPartial(ctx, [[x - r, y - r], [x + r, y + r]], clamp(p * 2)); ctx.stroke();
    L.polyPartial(ctx, [[x + r, y - r], [x - r, y + r]], clamp(p * 2 - 1)); ctx.stroke();
    ctx.restore();
  }
  function refMark(ctx, x, y, p) { // reference-point marker (ring + dot on a dark backplate)
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(p);
    ctx.fillStyle = 'rgba(5,8,15,0.75)'; ctx.beginPath(); ctx.arc(x, y, 11 * clamp(p * 1.2), 0, TAU); ctx.fill();
    ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p)); ctx.stroke();
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function paintPhase(key, n, arr, lut, off) {
    const r = L.rasterCanvas(key, n, n);
    if (!r.u32 || r.u32.buffer !== r.img.data.buffer) r.u32 = new Uint32Array(r.img.data.buffer);
    const o = off + 64 * TAU, sc = 256 / TAU, u = r.u32;
    for (let i = 0, N = n * n; i < N; i++) u[i] = lut[((arr[i] + o) * sc) & 255];
    r.x.putImageData(r.img, 0, 0);
    return r.c;
  }
  const phaseAt = (lt) => 2.4 * lt + 0.8 * L.steps(lt, 0.5, 0.3);

  /* ================================================================ section A geometry */
  const alignK = (lt) => sp(lt, A.alignAt, 1.0);
  function secX(m) { const th = A.rot * m; return { c: Math.cos(th), s: Math.sin(th), tx: A.T[0] * m, ty: A.T[1] * m, th }; }
  const secPoint = (r, X) => [X.c * r[0] - X.s * r[1] + X.tx, X.s * r[0] + X.c * r[1] + X.ty]; // where reference point r shows in the secondary
  const chipC = (ch) => [ch.x + ch.s / 2, ch.y + ch.s / 2];
  function snapPos(i, X) {
    const sn = A.snaps[i], r = A.patches[sn[2]];
    if (sn[1] === 0) { const c = chipC(A.ref); return [c[0] + r[0], c[1] + r[1]]; }
    const c = chipC(A.sec), q = secPoint(r, X);
    return [c[0] + q[0], c[1] + q[1]];
  }
  function snapIndex(lt) { let i = 0; while (i + 1 < A.snaps.length && lt >= A.snaps[i + 1][0]) i++; return i; }
  function tlPosA(lt) {
    const X = secX(1 - alignK(lt)), i = snapIndex(lt), p = snapPos(i, X);
    if (i === 0) return p;
    const q = snapPos(i - 1, X), k = sp(lt, A.snaps[i][0], 0.3);
    return [lerp(q[0], p[0], k), lerp(q[1], p[1], k)];
  }
  function peakAt(lt) {
    const X = secX(1 - alignK(lt));
    const ss = A.snaps.filter((s) => s[1] === 1);
    const off = (pi) => { const r = A.patches[pi], q = secPoint(r, X); return [(q[0] - r[0]) / 30, (q[1] - r[1]) / 30]; };
    let i = -1;
    for (let n = 0; n < ss.length; n++) if (lt >= ss[n][0]) i = n;
    if (i <= 0) return off(ss[0][2]);
    const a = off(ss[i - 1][2]), b = off(ss[i][2]), k = sp(lt, ss[i][0], 0.4);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  }

  /* ================================================================ section C geometry */
  const gateU = (lt) => sine(clamp((lt - Q.gate.t0) / (Q.gate.t1 - Q.gate.t0)));
  const gateX = (lt) => lerp(Q.gate.x0, Q.gate.x1, gateU(lt));
  const gateTimeAt = (x) => Q.gate.t0 + ((Q.gate.t1 - Q.gate.t0) * Math.acos(1 - 2 * clamp((x - Q.gate.x0) / (Q.gate.x1 - Q.gate.x0)))) / Math.PI;
  const tileRect = (n) => { const G = Q.grid, c = n % G.cols, r = (n / G.cols) | 0; return [G.x + c * (G.t + G.g), G.y + r * (G.t + G.g), G.t]; };
  const strikeTime = (n) => gateTimeAt(tileRect(n)[0] + Q.grid.t / 2);
  function fieldRect(lt) {
    const e = sp(lt, Q.fieldAt, 0.55), [tx0, ty0, tt] = tileRect(Q.keep), F = Q.field;
    return { x: lerp(tx0, F.x, e), y: lerp(ty0, F.y, e), s: lerp(tt, F.s, e) };
  }

  /* ================================================================ the through-line */
  function morph(a, b, k) {
    const kk = clamp(k);
    const s = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), size: lerp(a.size, b.size, k), amp: (a.form === 'pulse' ? a.amp : b.amp) || 1, cycles: a.cycles || b.cycles };
    if (a.form === b.form || kk >= 0.999) return { ...s, form: b.form, to: null, k: 0 };
    if (kk <= 0.001) return { ...s, form: a.form, to: null, k: 0 };
    return { ...s, form: a.form, to: b.form, k: kk };
  }
  /** TL in WORLD coordinates (pure; shared by tl() and draw()). */
  function tlWorld(lt) {
    const ph = phaseAt(lt), a = tlPosA(lt);
    const sA = { x: a[0], y: a[1], size: A.win / 1.24, form: 'pixel' };
    if (lt < 3.75) return { ...sA, phase: ph };
    const W = B.wave, sB = { x: W.x, y: W.y1, size: W.half, form: 'pulse', amp: W.amp, cycles: W.cyc };
    if (lt < 8) return { ...morph(sA, sB, sp(lt, 3.75, 0.8)), phase: ph };
    const sC = { x: gateX(lt), y: Q.gate.head, size: 30, form: 'pixel' };
    if (lt < Q.fieldAt) return { ...morph(sB, sC, sp(lt, 8, 0.7)), phase: ph };
    const fr = fieldRect(lt), sD = { x: fr.x + fr.s * BOWL.cx, y: fr.y + fr.s * BOWL.cy, size: 64, form: 'fringe' };
    return { ...morph(sC, sD, sp(lt, Q.fieldAt, 0.75)), phase: ph };
  }

  /* ================================================================ A · coregistration */
  /** Chip whose frame unfolds out of point O (the incoming TL) and whose image scans in inside it. */
  function drawChip(ctx, ch, O, kf, pImg, aOut, color, content) {
    if (kf <= 0.001 || aOut <= 0) return;
    const fx = lerp(O[0], ch.x, kf), fy = lerp(O[1], ch.y, kf), fs = ch.s * kf;
    if (pImg > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fs, fs); ctx.clip();
      scanDraw(ctx, ch.x, ch.y, ch.s, ch.s, pImg, color, () => {
        ctx.save(); ctx.beginPath(); ctx.rect(ch.x, ch.y, ch.s, ch.s); ctx.clip();
        content();
        // range/azimuth sample grid (schematic, fixed to the reference geometry)
        ctx.strokeStyle = 'rgba(0,229,255,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let g = 22; g < ch.s; g += 22) { ctx.moveTo(ch.x + g + 0.5, ch.y); ctx.lineTo(ch.x + g + 0.5, ch.y + ch.s); ctx.moveTo(ch.x, ch.y + g + 0.5); ctx.lineTo(ch.x + ch.s, ch.y + g + 0.5); }
        ctx.stroke(); ctx.restore();
      });
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha *= clamp(aOut) * clamp(kf * 3);
    ctx.strokeStyle = L.rgba(color, 0.55); ctx.lineWidth = 1.5; ctx.strokeRect(fx, fy, fs, fs);
    ctx.strokeStyle = L.rgba(color, 1); ctx.lineWidth = 3; const b = Math.min(18, fs * 0.3);
    for (const [cx, cy, sx, sy] of [[fx, fy, 1, 1], [fx + fs, fy, -1, 1], [fx, fy + fs, 1, -1], [fx + fs, fy + fs, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx + sx * b, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * b); ctx.stroke();
    }
    ctx.restore();
  }

  function drawA(ctx, env) {
    const lt = env.lt, k = cache(), al = alignK(lt), X = secX(1 - al), S = k.sar;
    const aOut = outP(lt, A.out, A.outD);
    const tOut = (a, d = 0.4) => io(lt, a, A.out, d, 0.4); // text: fully revealed until 3.7
    const sc = A.ref.s / S.NR, scn = chipC(A.sec), rcn = chipC(A.ref);
    const tlW = env.tl ? env.cam.toWorld(env.tl.x, env.tl.y) : scn;
    const O = env.handoff ? env.cam.toWorld(env.handoff.x, env.handoff.y) : scn;

    ctx.save();
    // final beat of the section: everything contracts into the TL while it unmasks
    const fc = sp(lt, A.cIn, 0.6);
    if (fc > 0) { const s = lerp(1, 0.1, clamp(fc)); ctx.translate(tlW[0], tlW[1]); ctx.scale(s, s); ctx.translate(-tlW[0], -tlW[1]); }

    // chips: frames unfold out of the incoming TL node, images scan in
    drawChip(ctx, A.ref, O, sp(lt, 0.0, 0.6), io(lt, 0.2, A.out, 0.6, A.outD), aOut, C.cyan, () => { ctx.drawImage(S.ref, A.ref.x, A.ref.y, A.ref.s, A.ref.s); });
    drawChip(ctx, A.sec, O, sp(lt, 0.08, 0.6), io(lt, 0.3, A.out, 0.6, A.outD), aOut, C.gold, () => {
      ctx.save(); ctx.translate(scn[0] + X.tx, scn[1] + X.ty); ctx.rotate(X.th);
      ctx.drawImage(S.sec, (-S.NS / 2) * sc, (-S.NS / 2) * sc, S.NS * sc, S.NS * sc);
      ctx.restore();
    });
    // chip labels
    const label = (ch, tag, col, name, a) => {
      const p = tOut(a);
      L.text(ctx, tag, ch.x, ch.y - 56, { kind: 'mono', size: 18, weight: 600, color: col, tracking: 0.12, p, scanColor: col });
      L.text(ctx, name, ch.x, ch.y - 20, { kind: 'sans', size: 24, weight: 600, color: C.text, p: clamp(p * 1.15 - 0.1), scanColor: col });
    };
    label(A.ref, 'REFERENCE', C.cyan, '2009-02-08 · FBS', 0.25);
    label(A.sec, 'SECONDARY', C.gold, 'FBD → resampled to FBS grid', 0.5);

    // river centreline: traced on the reference (cyan), ghosted on the secondary at the reference position
    // (cyan, dashed) next to the secondary's own river (gold) — on the bar the gold line lands on the ghost.
    const riv = k.river;
    const pR = Math.min(sp(lt, 0.75, 0.6), aOut), pS = Math.min(sp(lt, 1.0, 0.6), aOut);
    if (pR > 0 || pS > 0) {
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (pR > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(A.ref.x, A.ref.y, A.ref.s, A.ref.s); ctx.clip();
        ctx.strokeStyle = L.rgba(C.cyan, 0.85); ctx.lineWidth = 1.6;
        L.polyPartial(ctx, riv.map((r) => [rcn[0] + r[0], rcn[1] + r[1]]), pR); ctx.stroke(); ctx.restore();
      }
      if (pS > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(A.sec.x, A.sec.y, A.sec.s, A.sec.s); ctx.clip();
        ctx.strokeStyle = 'rgba(5,8,15,0.55)'; ctx.lineWidth = 4;
        L.polyPartial(ctx, riv.map((r) => { const q = secPoint(r, X); return [scn[0] + q[0], scn[1] + q[1]]; }), pS); ctx.stroke();
        ctx.strokeStyle = L.rgba(C.gold, 0.95); ctx.lineWidth = 1.8; ctx.stroke();
        ctx.setLineDash([7, 6]); ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 1.6;
        L.polyPartial(ctx, riv.map((r) => [scn[0] + r[0], scn[1] + r[1]]), pS); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.restore();
    }

    // sampled patches: reference windows (cyan) and matched windows in the secondary (gold, ride the alignment)
    ctx.save(); ctx.lineWidth = 2;
    A.snaps.forEach((sn, i) => {
      if (i === 0 && lt < 0.6) return;
      const pp = sp(lt, i === 0 ? 0.6 : sn[0] + 0.12, 0.35);
      if (pp <= 0) return;
      const pos = snapPos(i, X), col = sn[1] ? C.gold : C.cyan;
      ctx.globalAlpha = aOut;
      ctx.strokeStyle = L.rgba(col, 0.9); ctx.fillStyle = L.rgba(col, 0.08 * clamp(pp));
      ctx.fillRect(pos[0] - A.win / 2, pos[1] - A.win / 2, A.win, A.win);
      L.polyPartial(ctx, sqPts(pos[0], pos[1], A.win), pp); ctx.stroke();
    });
    ctx.restore();

    // dense offset field on the secondary (exaggerated), shrinking to dots on alignment
    const pV = Math.min(io(lt, 0.3, A.out, 0.6, A.outD), aOut);
    if (pV > 0) {
      ctx.save();
      const dotCol = L.css(L.mix(C.gold, C.cyan, al));
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const r = [i * A.grid, j * A.grid], q = secPoint(r, X), g = sp(lt, 1.0 + 0.045 * (i + 2 + j + 2), 0.45) * pV;
        if (g <= 0) continue;
        const x0 = scn[0] + r[0], y0 = scn[1] + r[1];
        const vx = (q[0] - r[0]) * A.ex * g, vy = (q[1] - r[1]) * A.ex * g, len = Math.hypot(vx, vy);
        ctx.globalAlpha = clamp(g);
        ctx.fillStyle = 'rgba(5,8,15,0.6)'; ctx.beginPath(); ctx.arc(x0, y0, 4.2, 0, TAU); ctx.fill();
        ctx.fillStyle = dotCol; ctx.beginPath(); ctx.arc(x0, y0, 2.6 + 1.4 * al * env.pulse, 0, TAU); ctx.fill();
        const aA = clamp((len - 4) / 8);
        if (aA > 0) {
          ctx.globalAlpha = clamp(g) * aA;
          ctx.strokeStyle = 'rgba(5,8,15,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + vx, y0 + vy); ctx.stroke();
          ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 1.7;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + vx * 0.85, y0 + vy * 0.85); ctx.stroke();
          arrowHead(ctx, x0, y0, x0 + vx, y0 + vy, 8);
        }
      }
      ctx.restore();
    }

    // cross-correlation card
    const cd = A.card, pc = io(lt, 0.5, A.out, 0.5, A.outD);
    L.card(ctx, cd.x, cd.y, cd.w, cd.h, { p: pc, accent: C.blue });
    L.text(ctx, 'CROSS-CORRELATION', cd.x + 26, cd.y + 44, { kind: 'mono', size: 18, weight: 600, color: INK.blueCard, tracking: 0.1, p: tOut(0.65), bg: C.card, scanColor: C.blue });
    corrSurface(ctx, env, cd, io(lt, 0.75, A.out, 0.6, A.outD), al, tOut(0.9));
    L.text(ctx, 'peak position = sub-pixel offset', cd.x + 26, cd.y + cd.h - 30, { kind: 'sans', size: 22, weight: 500, color: C.textDim, p: tOut(1.0), bg: C.card });

    // caption
    const o = { kind: 'display', size: 36, weight: 700 };
    const c1 = 'cross-correlation', c2 = '  →  sub-pixel alignment';
    const w1 = L.measure(ctx, c1, o).w, w2 = L.measure(ctx, c2, o).w, x0 = (A.ref.x + A.sec.x + A.sec.s) / 2 - (w1 + w2) / 2;
    L.text(ctx, c1, x0, A.capY, { ...o, color: C.text, p: tOut(1.0) });
    L.text(ctx, c2, x0 + w1, A.capY, { ...o, color: C.cyan, p: tOut(1.5) });
    ctx.restore();

    // crosshair ticks around the TL correlation window (not scaled: they belong to the TL)
    const tl = env.tl;
    if (tl) {
      const wPix = L.TL.weight(tl, 'pixel') * outP(lt, 3.9, 0.4);
      if (wPix > 0.01) {
        const h = (tl.size / env.cam.z) * 0.62;
        ctx.save(); ctx.globalAlpha = wPix; ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(tlW[0] + dx * (h + 6), tlW[1] + dy * (h + 6)); ctx.lineTo(tlW[0] + dx * (h + 20), tlW[1] + dy * (h + 20)); }
        ctx.stroke(); ctx.restore();
      }
    }
  }

  function corrSurface(ctx, env, cd, p, al, pl) {
    if (p <= 0) return;
    const lt = env.lt, cx = cd.x + cd.w / 2, cy = cd.y + cd.h / 2 + 30, S = 120;
    const pr = (gx, gy, z) => [cx + (gx - gy) * S * 0.86, cy + (gx + gy) * S * 0.36 - z * 118];
    const pk = peakAt(lt), rise = sp(lt, 1.0, 0.5), br = 0.93 + 0.07 * env.pulse;
    const Z = (gx, gy) => { const dx = gx - pk[0], dy = gy - pk[1]; return rise * br * Math.exp(-(dx * dx + dy * dy) / 0.07) + 0.09 * (L.noise2(gx * 2.6 + 9, gy * 2.6 + 4, 7) - 0.5) * (1 - 0.5 * al) + 0.015; };
    const n = 17, m = 24, lv = 7, paths = [];
    for (let q = 0; q < lv; q++) paths.push(new Path2D());
    for (let dir = 0; dir < 2; dir++) for (let a = 0; a < n; a++) {
      const A0 = -1 + (2 * a) / (n - 1);
      let prev = null, pz = 0;
      for (let b = 0; b <= m; b++) {
        const B0 = -1 + (2 * b) / m, gx = dir ? B0 : A0, gy = dir ? A0 : B0, z = Z(gx, gy), pt = pr(gx, gy, z);
        if (prev) { const q = Math.min(lv - 1, Math.max(0, Math.floor(((z + pz) / 2 + 0.02) * lv))); paths[q].moveTo(prev[0], prev[1]); paths[q].lineTo(pt[0], pt[1]); }
        prev = pt; pz = z;
      }
    }
    const top = pr(-1, -1, 0)[1] - 130, bot = pr(1, 1, 0)[1] + 4, lx = pr(-1, 1, 0)[0] - 6, rx = pr(1, -1, 0)[0] + 6;
    scanDraw(ctx, lx, top, rx - lx, bot - top, p, C.blue, () => {
      ctx.save(); ctx.lineWidth = 1.2;
      for (let q = 0; q < lv; q++) { const t = q / (lv - 1); ctx.strokeStyle = L.css(t < 0.5 ? L.mix(C.blue, C.cyan, t * 2) : L.mix(C.cyan, C.text, (t - 0.5) * 2), 0.45 + 0.5 * t); ctx.stroke(paths[q]); }
      // base: zero-offset crosshair, offset vector, peak marker
      const o0 = pr(0, 0, 0), ob = pr(pk[0], pk[1], 0), ot = pr(pk[0], pk[1], Z(pk[0], pk[1]));
      ctx.strokeStyle = L.rgba(C.text, 0.6); ctx.lineWidth = 1.5; ctx.beginPath();
      const e1 = pr(0.16, 0, 0), e2 = pr(-0.16, 0, 0), e3 = pr(0, 0.16, 0), e4 = pr(0, -0.16, 0);
      ctx.moveTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.moveTo(e3[0], e3[1]); ctx.lineTo(e4[0], e4[1]); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = L.rgba(C.text, 0.55); ctx.beginPath(); ctx.moveTo(ob[0], ob[1]); ctx.lineTo(ot[0], ot[1]); ctx.stroke(); ctx.setLineDash([]);
      const len = Math.hypot(ob[0] - o0[0], ob[1] - o0[1]);
      if (len > 6) { ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(o0[0], o0[1]); ctx.lineTo(ob[0], ob[1]); ctx.stroke(); arrowHead(ctx, o0[0], o0[1], ob[0], ob[1], 8); }
      const pc = L.mix(C.gold, C.cyan, al);
      L.glow(ctx, ot[0], ot[1], 26, L.css(pc), 0.8 * rise);
      ctx.fillStyle = L.css(pc); ctx.beginPath(); ctx.arc(ot[0], ot[1], 5 * rise, 0, TAU); ctx.fill();
      ctx.restore();
    });
    const a1 = pr(1, -1, 0), a2 = pr(-1, 1, 0);
    L.text(ctx, 'Δ range', a1[0] + 8, a1[1] + 32, { kind: 'mono', size: 18, color: C.textDim, align: 'right', bg: C.card, p: pl });
    L.text(ctx, 'Δ azimuth', a2[0] - 8, a2[1] + 32, { kind: 'mono', size: 18, color: C.textDim, bg: C.card, p: pl });
  }

  /* ================================================================ B · interferogram formation + multilook */
  const rowAt = (lt) => sine(clamp(lt - 5.0));
  function dphiRow(k, q, row) {
    const N = B.NSL, i = Math.min(N - 1, (q * N) | 0), j = Math.min(N - 1, (row * N) | 0);
    return k.slBase[j * N + i];
  }
  const fringeOff = (lt) => (lt < 8 ? 0.55 * Math.sin((TAU * (lt - 4)) / 4) : 0); // subtle fringe drift, back to 0 at 26 s

  function drawB(ctx, env) {
    const lt = env.lt, k = cache(), W = B.wave, R = B.r;
    if (lt >= B.cOut) return;
    const off = fringeOff(lt), ph = phaseAt(lt), row = rowAt(lt);
    const x0 = W.x - W.half;
    const wo = (a, d = 0.5) => io(lt, a, B.wOut, d, 0.35);

    // ---- guides: s₁ / s₂ baselines and the product-strip slot construct outward from the arriving TL (bar)
    const pgd = Math.min(sp(lt, 3.75, 0.6), outP(lt, B.wOut, 0.35));
    if (pgd > 0) {
      const h = W.half * clamp(pgd);
      ctx.save(); ctx.strokeStyle = L.rgba(C.text, 0.14); ctx.lineWidth = 1; ctx.beginPath();
      for (const y of [W.y1, W.y2]) { ctx.moveTo(W.x - h, y); ctx.lineTo(W.x + h, y); }
      ctx.stroke();
      ctx.strokeStyle = L.rgba(C.cyan, 0.3); ctx.strokeRect(W.x - h, B.strip.y - B.strip.h / 2 - 0.5, 2 * h, B.strip.h + 1);
      ctx.restore();
    }
    // ---- s₂ (gold): same carrier as the TL's s₁, shifted by the interferometric phase. A fixed row and a damped
    //      share of the along-range variation keep it reading as "same wave, phase-shifted" (the strip carries Δφ).
    const pG = wo(4.25, 0.6);
    if (pG > 0) {
      const pts = [], mean = k.row0Mean + off;
      for (let i = 0; i <= 200; i++) {
        const q = i / 200, e = Math.pow(Math.sin(Math.PI * q), 1.15), d = mean + 0.3 * (dphiRow(k, q, 0) + off - mean);
        pts.push([x0 + 2 * W.half * q, W.y2 - W.amp * 0.34 * e * Math.sin(TAU * W.cyc * q - ph - d) * W.half]);
      }
      glowLine(ctx, pts, C.gold, pG, 2.2);
    }
    // ---- labels
    const pl1 = wo(4.25, 0.4), pl2 = wo(4.35, 0.4), pl3 = wo(4.5, 0.4);
    L.text(ctx, 's₁', x0 - 20, W.y1 + 12, { kind: 'sans', size: 34, weight: 700, color: C.cyan, align: 'right', p: pl1 });
    L.text(ctx, 'date 1', x0 - 72, W.y1 + 8, { kind: 'mono', size: 18, color: C.textDim, align: 'right', p: pl1 });
    L.text(ctx, 's₂', x0 - 20, W.y2 + 12, { kind: 'sans', size: 34, weight: 700, color: C.gold, align: 'right', p: pl2, scanColor: C.gold });
    L.text(ctx, 'date 2', x0 - 72, W.y2 + 8, { kind: 'mono', size: 18, color: C.textDim, align: 'right', p: pl2, scanColor: C.gold });
    L.text(ctx, 's₁ · s₂*', x0 - 20, B.strip.y + 14, { kind: 'sans', size: 28, weight: 700, color: C.text, align: 'right', p: pl3 });

    // ---- product strip (multiply sweep 4.5–5.0)
    const pS = wo(4.5, 0.5);
    if (pS > 0) {
      const r = L.rasterCanvas('a3-strip', 240, 1);
      if (!r.u32 || r.u32.buffer !== r.img.data.buffer) r.u32 = new Uint32Array(r.img.data.buffer);
      for (let i = 0; i < 240; i++) r.u32[i] = k.fr32[((dphiRow(k, (i + 0.5) / 240, row) + off + 64 * TAU) * (256 / TAU)) & 255];
      r.x.putImageData(r.img, 0, 0);
      const wk = lt < 5.2 ? sine(clamp((lt - 4.5) / 0.5)) : 1;
      const ww = 2 * W.half * wk * clamp(pS);
      ctx.save(); ctx.globalAlpha *= clamp(pS); ctx.beginPath(); ctx.rect(x0, B.strip.y - B.strip.h / 2, ww, B.strip.h); ctx.clip();
      ctx.drawImage(r.c, x0, B.strip.y - B.strip.h / 2, 2 * W.half, B.strip.h); ctx.restore();
      if (wk > 0 && wk < 1) { // multiply sweep through both waves
        const sx = x0 + ww;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(sx - 18, 0, sx + 2, 0); g.addColorStop(0, 'rgba(230,241,255,0)'); g.addColorStop(1, 'rgba(230,241,255,0.35)');
        ctx.fillStyle = g; ctx.fillRect(sx - 18, W.y1 - 40, 20, B.strip.y - W.y1 + 46);
        ctx.fillStyle = 'rgba(230,241,255,0.9)'; ctx.fillRect(sx - 1, W.y1 - 40, 2, B.strip.y - W.y1 + 46);
        ctx.restore();
      }
    }

    // colour bar (wrapped, cyclic) under the raster
    const pB = wo(6.0, 0.5);
    if (pB > 0) {
      const by = R.y + R.s + 18;
      ctx.save(); ctx.globalAlpha *= clamp(pB); ctx.beginPath(); ctx.rect(R.x, by, R.s * clamp(pB), 10); ctx.clip(); ctx.drawImage(k.barFr, R.x, by, R.s, 10); ctx.restore();
      const lo = { kind: 'mono', size: 16, color: C.textDim, role: 'deco', p: pB };
      L.text(ctx, '−π', R.x, by + 32, lo);
      L.text(ctx, '0', R.x + R.s / 2, by + 32, { ...lo, align: 'center' });
      L.text(ctx, '+π', R.x + R.s, by + 32, { ...lo, align: 'right' });
    }

    // ---- phasor widget: s₁ and s₂ share the carrier (one quarter-turn tick, then frozen); the angle between them is Δφ
    const P = B.ph, pP = io(lt, 4.5, B.phOut, 0.6, 0.35);
    if (pP > 0) {
      const dphi = wrap(dphiRow(k, 0.5, row) + off);
      const th1 = -0.6 - (Math.PI / 2) * L.steps(Math.min(lt, 5.0) - 4.5, 0.5, 0.3), th2 = th1 - dphi;
      ctx.save();
      ctx.strokeStyle = L.rgba(C.text, 0.22); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(P.x, P.y, P.r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(pP)); ctx.stroke();
      ctx.strokeStyle = L.rgba(C.text, 0.1); ctx.beginPath(); ctx.moveTo(P.x - P.r - 12, P.y); ctx.lineTo(P.x + P.r + 12, P.y); ctx.moveTo(P.x, P.y - P.r - 12); ctx.lineTo(P.x, P.y + P.r + 12); ctx.stroke();
      const g = clamp(pP * 1.4 - 0.4), rr = P.r * g;
      if (g > 0) {
        // Δφ arc
        ctx.lineWidth = 7; ctx.lineCap = 'butt';
        const n = 24, a0 = Math.min(th1, th2), a1 = Math.max(th1, th2);
        for (let i = 0; i < n; i++) {
          const f0 = a0 + ((a1 - a0) * i) / n, f1 = a0 + ((a1 - a0) * (i + 1.05)) / n;
          ctx.strokeStyle = L.css(L.fringeRGB(((th1 - (f0 + f1) / 2) / (th1 - th2 || 1)) * dphi), 0.95);
          ctx.beginPath(); ctx.arc(P.x, P.y, rr * 0.42, f0, f1); ctx.stroke();
        }
        for (const [th, col] of [[th2, C.gold], [th1, C.cyan]]) {
          const ex = P.x + Math.cos(th) * rr, ey = P.y + Math.sin(th) * rr;
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + Math.cos(th) * (rr - 8), P.y + Math.sin(th) * (rr - 8)); ctx.stroke();
          arrowHead(ctx, P.x, P.y, ex, ey, 13);
        }
        ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(P.x, P.y, 4, 0, TAU); ctx.fill();
        // labels: s₁ / s₂ spread apart when Δφ is small; Δφ sits on the bisector, clear of both shafts
        const am = (th1 + th2) / 2, half = Math.max(Math.abs(dphi) / 2, 0.42), sg = dphi >= 0 ? 1 : -1;
        const lbl = (th, s, col) => L.text(ctx, s, P.x + Math.cos(th) * (rr + 24), P.y + Math.sin(th) * (rr + 24), { kind: 'sans', size: 20, weight: 700, color: col, align: 'center', baseline: 'middle', role: 'deco', p: g, mode: 'fade' });
        lbl(am + sg * half, 's₁', C.cyan); lbl(am - sg * half, 's₂', C.gold);
        const rl = clamp(24 / Math.sin(Math.max(Math.abs(dphi) / 2, 0.02)), rr * 0.64, rr + 28);
        L.text(ctx, 'Δφ', P.x + Math.cos(am) * rl, P.y + Math.sin(am) * rl, { kind: 'sans', size: 18, weight: 600, color: C.text, align: 'center', baseline: 'middle', role: 'deco', p: g, mode: 'fade' });
      }
      ctx.restore();
    }
    L.text(ctx, 'phase difference Δφ', P.x, P.y + P.r + 76, { kind: 'sans', size: 24, weight: 600, color: C.text, align: 'center', p: io(lt, 4.75, B.phOut, 0.4, 0.35) });
    L.text(ctx, 'wrapped into (−π, π]', P.x, P.y + P.r + 110, { kind: 'mono', size: 18, color: C.textDim, align: 'center', p: io(lt, 5.0, B.phOut, 0.4, 0.35) });

    // ---- multilook card: each arithmetic line arrives with the merge it explains
    const cd = B.card, co = (a, d = 0.3) => io(lt, a, B.cOut, d, 0.3);
    L.card(ctx, cd.x, cd.y, cd.w, cd.h, { p: co(5.0, 0.5), accent: C.blue });
    const tx = cd.x + 26;
    const h1 = io(lt, B.azAt, B.azAt + 0.9, 0.25, 0.3), h2 = io(lt, B.rgAt, B.rgAt + 0.9, 0.25, 0.3);
    L.text(ctx, 'MULTILOOK', tx, cd.y + 40, { kind: 'mono', size: 18, weight: 600, color: INK.blueCard, tracking: 0.12, p: co(5.1, 0.4), bg: C.card, scanColor: C.blue });
    L.text(ctx, '28 az × 12 rg looks', tx, cd.y + 78, { kind: 'mono', size: 24, weight: 600, color: C.text, p: co(5.25, 0.4), bg: C.card });
    L.text(ctx, '28 az looks ≈ 90 m', tx, cd.y + 428, { kind: 'mono', size: 19, color: L.css(L.mix(C.text, C.gold, clamp(h1))), p: co(B.azAt), bg: C.card, scanColor: C.gold });
    L.text(ctx, '12 × 4.68 m = 56 m slant → ~90 m ground', tx, cd.y + 464, { kind: 'mono', size: 19, color: L.css(L.mix(C.text, C.gold, clamp(h2))), p: co(B.rgAt), bg: C.card, scanColor: C.gold });
    L.text(ctx, '→ ~90 × 90 m pixels', tx, cd.y + 504, { kind: 'mono', size: 22, weight: 600, color: C.cyan, p: co(B.rgAt + 0.03), bg: C.card });
    drawLookBlock(ctx, env, k, off, co(5.25, 0.5), h1, h2);
  }

  /** Zoom call-out from one multilooked cell on the raster to the inset — drawn AFTER the raster so it stays on top. */
  function drawCallout(ctx, env) {
    const lt = env.lt, R = B.r, pz = Math.min(sp(lt, 5.75, 0.5), outP(lt, B.move, 0.25));
    if (pz <= 0 || lt < 5.0) return;
    const cs = R.s / B.NML, mx = R.x + B.ml[0] * cs, my = R.y + B.ml[1] * cs, bk = B.blk;
    const cell = rectPts(mx, my, cs, cs), l1 = [[mx + cs, my], [bk.x, bk.y]], l2 = [[mx + cs, my + cs], [bk.x, bk.y + bk.s]];
    ctx.save(); ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(5,8,15,0.6)'; ctx.lineWidth = 2.5;
    L.polyPartial(ctx, l1, pz); ctx.stroke(); L.polyPartial(ctx, l2, pz); ctx.stroke();
    ctx.strokeStyle = L.rgba(C.text, 0.5); ctx.lineWidth = 1;
    L.polyPartial(ctx, l1, pz); ctx.stroke(); L.polyPartial(ctx, l2, pz); ctx.stroke();
    ctx.strokeStyle = 'rgba(5,8,15,0.75)'; ctx.lineWidth = 3.5;
    L.polyPartial(ctx, cell, clamp(pz * 1.5)); ctx.stroke();
    ctx.strokeStyle = L.rgba(C.text, 0.98); ctx.lineWidth = 1.5;
    L.polyPartial(ctx, cell, clamp(pz * 1.5)); ctx.stroke();
    ctx.restore();
  }

  /** Wrapped interferogram raster: extrudes from the product strip (5.0–6.0), wipes noisy → multilooked (7.0–7.5),
   *  then (8.0, the bar) springs into its slot in the QC thumbnail grid — the match cut into section C. */
  function drawRaster(ctx, env) {
    const lt = env.lt, R = B.r, k = cache(), off = fringeOff(lt), row = rowAt(lt);
    if (lt < 5.0 || lt >= B.move + 0.75) return; // from 8.75 the QC grid draws the landed tile
    const mv = sp(lt, B.move, 0.6), [tx0, ty0, tt] = tileRect(Q.keep);
    const rx = lerp(R.x, tx0, mv), ry = lerp(R.y, ty0, mv), rs = lerp(R.s, tt, mv);
    const hk = row, hy = ry + rs * hk;
    const wipe = sine(clamp((lt - B.wipe) / 0.5)), wy = ry + rs * wipe;
    if (wipe > 0) {
      const mlc = paintPhase('a3-ml', B.NML, k.ml, k.fr32, off);
      ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rs, Math.min(wy, hy) - ry); ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(mlc, rx, ry, rs, rs); ctx.restore();
    }
    if (wipe < 1) {
      const slc = paintPhase('a3-sl', B.NSL, k.sl, k.fr32, off);
      ctx.save(); ctx.beginPath(); ctx.rect(rx, wy, rs, hy - wy); ctx.clip();
      ctx.drawImage(slc, rx, ry, rs, rs); ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (hk < 1) { // extrusion head
      ctx.fillStyle = 'rgba(230,241,255,0.85)'; ctx.fillRect(rx - 6, hy - 1, rs + 12, 2);
      ctx.fillStyle = 'rgba(0,229,255,0.18)'; ctx.fillRect(rx - 6, hy - 6, rs + 12, 12);
    }
    if (wipe > 0 && wipe < 1) {
      ctx.fillStyle = L.rgba(C.cyan, 0.9); ctx.fillRect(rx - 8, wy - 1, rs + 16, 2);
      ctx.fillStyle = L.rgba(C.cyan, 0.2); ctx.fillRect(rx - 8, wy - 6, rs + 16, 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = L.rgba(C.cyan, lerp(0.35, 0.5, mv)); ctx.lineWidth = 1.25;
    ctx.strokeRect(rx, ry, rs, hy - ry);
    ctx.restore();
  }

  /** 12 range × 28 azimuth single-look samples → one ~90 m pixel: the 28 azimuth looks merge on the bar (6.0),
   *  then the 12 range looks (6.5). Colours are complex averages of the sample phases. */
  function drawLookBlock(ctx, env, k, off, p, h1, h2) {
    if (p <= 0) return;
    const lt = env.lt, bk = B.blk, cw = bk.s / 12, ch = bk.s / 28, cx = bk.x + bk.s / 2, cy = bk.y + bk.s / 2;
    const mean = k.mlMean + off, meanC = L.fringeRGB(mean);
    const a1 = clamp(sp(lt, B.azAt, 0.45)), a2 = clamp(sp(lt, B.rgAt, 0.45));
    scanDraw(ctx, bk.x, bk.y, bk.s, bk.s, p, C.blue, () => {
      ctx.save();
      ctx.fillStyle = 'rgba(5,8,15,0.9)'; ctx.fillRect(bk.x, bk.y, bk.s, bk.s);
      if (a2 >= 0.995) { ctx.fillStyle = L.css(meanC); ctx.fillRect(bk.x, bk.y, bk.s, bk.s); }
      else for (let i = 0; i < 12; i++) {
        const colC = L.mix(L.fringeRGB(mean + k.colMean[i]), meanC, a2);
        const gx = 1.6 * (1 - a2), x = bk.x + i * cw + gx / 2, w = cw - gx;
        if (a1 >= 0.995) { ctx.fillStyle = L.css(colC); ctx.fillRect(x, bk.y, w, bk.s); continue; }
        const gy = 1.3 * (1 - a1);
        for (let j = 0; j < 28; j++) {
          ctx.fillStyle = L.css(L.mix(L.fringeRGB(mean + k.cells[j * 12 + i]), colC, a1));
          ctx.fillRect(x, bk.y + j * ch + gy / 2, w, ch - gy);
        }
      }
      // merge sweeps: azimuth (top → bottom), then range (left → right)
      ctx.globalCompositeOperation = 'lighter';
      if (lt > B.azAt && lt < B.azAt + 0.5) { const f = sine(clamp((lt - B.azAt) / 0.5)), yy = bk.y + bk.s * f; ctx.fillStyle = L.rgba(C.gold, 0.8 * Math.sin(Math.PI * f)); ctx.fillRect(bk.x, yy - 1, bk.s, 2); }
      if (lt > B.rgAt && lt < B.rgAt + 0.5) { const f = sine(clamp((lt - B.rgAt) / 0.5)), xx = bk.x + bk.s * f; ctx.fillStyle = L.rgba(C.gold, 0.8 * Math.sin(Math.PI * f)); ctx.fillRect(xx - 1, bk.y, 2, bk.s); }
      ctx.restore();
    });
    ctx.save();
    ctx.strokeStyle = L.rgba(C.cyan, 0.9 * clamp(p)); ctx.lineWidth = 2;
    L.polyPartial(ctx, rectPts(bk.x, bk.y, bk.s, bk.s), clamp(p * 1.2)); ctx.stroke();
    if (a2 > 0.01) L.glow(ctx, cx, cy, bk.s * 0.7, L.css(meanC), 0.3 * a2 * clamp(p) * (0.75 + 0.25 * env.pulse));
    const pb = clamp(p * 1.3 - 0.3);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = L.css(L.mix(C.textDim, C.gold, clamp(h2)), 0.9); bracketH(ctx, bk.x, bk.x + bk.s, bk.y + bk.s + 16, pb);
    ctx.strokeStyle = L.css(L.mix(C.textDim, C.gold, clamp(h1)), 0.9); bracketV(ctx, bk.x - 16, bk.y, bk.y + bk.s, pb);
    ctx.restore();
    L.text(ctx, '12 rg', cx, bk.y + bk.s + 44, { kind: 'mono', size: 18, weight: 600, color: L.css(L.mix(C.textDim, C.gold, clamp(h2))), align: 'center', p: pb, bg: C.card });
    L.text(ctx, '28 az', bk.x - 30, cy + 6, { kind: 'mono', size: 18, weight: 600, color: L.css(L.mix(C.textDim, C.gold, clamp(h1))), align: 'right', p: pb, bg: C.card });
  }

  /* ================================================================ C · QC gate + SNAPHU */
  function drawQC(ctx, env, k) {
    const lt = env.lt, G = Q.grid, gx = gateX(lt);
    const kc = Q.keep % G.cols, kr = (Q.keep / G.cols) | 0;
    for (let n = 0; n < G.cols * G.rows; n++) {
      const [x, y, t] = tileRect(n), c = n % G.cols, r = (n / G.cols) | 0;
      if (n === Q.keep && (lt < B.move + 0.75 || lt >= Q.fieldAt)) continue;
      // left columns build radially around the landed raster; right columns wait for the multilook card to clear
      const tin = c <= 2 ? 8.05 + 0.065 * Math.hypot(c - kc, r - kr) : 8.5 + 0.05 * (c - 3) + 0.03 * r;
      const pin = sp(lt, tin, 0.45);
      const pout = n === Q.keep ? 1 : outP(lt, 9.72 + 0.04 * (3 - r), 0.3); // bottom row (under the profile) leaves first
      const p = Math.min(pin, pout);
      if (p <= 0) continue;
      const tc = gateTimeAt(x + t / 2), bad = Q.bad[n];
      const strike = bad ? sp(lt, tc, 0.22) : 0, coll = bad ? sp(lt, tc + 0.25, 0.4) : 0;
      const s = 1 - clamp(coll);
      if (bad && coll > 0.02) { // removed: faint dashed footprint
        ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = L.rgba(C.crimson, 0.45 * clamp(coll) * p); ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1); ctx.restore();
      }
      if (s <= 0.01) continue;
      ctx.save();
      const so = lerp(0.5, 1, clamp(pout)); // outgoing tiles shrink toward their centres while they unmask
      ctx.translate(x + t / 2, y + t / 2); ctx.scale(lerp(1, 0.6, clamp(coll)) * so, s * so); ctx.translate(-(x + t / 2), -(y + t / 2));
      ctx.globalAlpha *= clamp(0.35 + 0.65 * s) * clamp(pout * 1.5);
      scanDraw(ctx, x, y, t, t, p, C.blue, () => { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(k.tiles[n], x, y, t, t); ctx.restore(); });
      const pass = lt > tc ? Math.exp(-(lt - tc) * 4) : 0;
      ctx.globalAlpha *= clamp(p);
      ctx.strokeStyle = bad && strike > 0 ? L.rgba(C.crimson, 0.95) : L.rgba(C.cyan, (lt > tc ? 0.5 : 0.22) + 0.5 * pass);
      ctx.lineWidth = bad && strike > 0 ? 2.5 : 1.25;
      L.polyPartial(ctx, rectPts(x, y, t, t), clamp(pin)); ctx.stroke();
      if (strike > 0) {
        ctx.fillStyle = `rgba(11,17,30,${0.6 * clamp(strike)})`; ctx.fillRect(x, y, t, t);
        ctx.fillStyle = L.rgba(C.crimson, 0.18 * clamp(strike)); ctx.fillRect(x, y, t, t);
        ctx.lineCap = 'round';
        const x1 = [[x + 14, y + t - 14], [x + t - 14, y + 14]], x2 = [[x + 14, y + 14], [x + t - 14, y + t - 14]];
        for (const [lw, col] of [[8, 'rgba(11,17,30,0.7)'], [4, C.crimson]]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw;
          L.polyPartial(ctx, x1, strike); ctx.stroke();
          L.polyPartial(ctx, x2, clamp(strike * 2 - 1)); ctx.stroke();
        }
      }
      ctx.restore();
    }
    // gate scanline (TL = its head)
    const pg = Math.min(sp(lt, 8.25, 0.45), outP(lt, 9.75, 0.3));
    if (pg > 0) {
      const g = Q.gate, yb = lerp(g.y0, g.y1, clamp(pg));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(gx - 26, 0, gx + 4, 0);
      gr.addColorStop(0, 'rgba(0,229,255,0)'); gr.addColorStop(1, 'rgba(0,229,255,0.22)');
      ctx.fillStyle = gr; ctx.fillRect(gx - 26, g.y0, 28, yb - g.y0);
      ctx.fillStyle = L.rgba(C.cyan, 0.95); ctx.fillRect(gx - 1, g.y0, 2, yb - g.y0);
      ctx.restore();
    }
    // QC card (constructs at 7.5 so every line is readable ≥ 1.5 s before it unmasks at 9.6–9.9)
    const q = Q.qc, qo = (a) => io(lt, a, Q.qcOut, 0.3, 0.3), pq = qo(Q.qcIn);
    L.card(ctx, q.x, q.y, q.w, q.h, { p: pq, accent: C.blue });
    const tx = q.x + 26, big = { kind: 'display', size: 48, weight: 700 };
    L.text(ctx, 'INTERFEROGRAM QC', tx, q.y + 40, { kind: 'mono', size: 18, weight: 600, color: INK.blueCard, tracking: 0.12, p: qo(7.55), bg: C.card, scanColor: C.blue });
    // counter: rolls 1,779 → 1,634 on sixteenth notes, landing at 8.1
    const roll = clamp(L.steps(lt - 7.625, 0.125, 0.1) / 4), nNow = Math.round(1779 - 145 * roll);
    const w1 = L.measure(ctx, '1,779', big).w, wa = L.measure(ctx, '1,779 → ', big).w, w3 = L.measure(ctx, '1,634', big).w;
    L.text(ctx, [{ s: '1,779', color: C.textDim }, { s: ' → ', color: C.textDim }, { s: fmt(nNow), color: C.cyan }], tx, q.y + 104, { ...big, p: qo(7.6), bg: C.card, id: 'a3-count' });
    L.text(ctx, 'formed', tx + w1 / 2, q.y + 142, { kind: 'mono', size: 18, color: C.textDim, align: 'center', bg: C.card, p: qo(7.65) });
    L.text(ctx, 'inverted', tx + wa + w3 / 2, q.y + 142, { kind: 'mono', size: 18, color: C.textDim, align: 'center', bg: C.card, p: qo(7.65) });
    L.text(ctx, 'interferograms (12 frames)', tx, q.y + 178, { kind: 'sans', size: 24, weight: 500, color: C.text, p: qo(7.7), bg: C.card });
    L.text(ctx, 'visual report grids flag:', tx, q.y + 220, { kind: 'sans', size: 22, weight: 500, color: C.textDim, p: qo(7.75), bg: C.card });
    // reasons (crimson × glyphs) — each flashes when the gate strikes its tile
    const rs = { kind: 'mono', size: 18, color: C.text, bg: C.card, p: qo(7.8) };
    const ry = q.y + 256, rw = L.measure(ctx, 'poor coherence', rs).w;
    const reasons = [[tx + 8, 'poor coherence', 13], [tx + 8 + 22 + rw + 26, 'ionospheric', 10]];
    for (const [rx, s, n] of reasons) {
      crossMark(ctx, rx, ry - 6, 5.5, qo(7.8));
      L.text(ctx, s, rx + 14, ry, rs);
      const ts = strikeTime(n);
      if (lt > ts && pq > 0) L.glow(ctx, rx, ry - 6, 26, C.crimson, 0.9 * Math.exp(-(lt - ts) * 4) * pq);
    }
    L.text(ctx, 'gates G1–G23 halt on failure', tx, q.y + 300, { kind: 'mono', size: 18, weight: 600, color: C.text, p: qo(7.8), bg: C.card });
    let hit = 0;
    for (const n of Object.keys(Q.bad)) { const ts = strikeTime(+n); if (lt > ts) hit += Math.exp(-(lt - ts) * 5); }
    if (hit > 0.01) L.glow(ctx, tx + wa + w3 / 2, q.y + 88, 80, C.cyan, 0.45 * clamp(hit) * pq);
  }

  function drawSnaphu(ctx, env, k) {
    const lt = env.lt, PR = Q.prof;
    // final beat: everything contracts into the TL and unmasks
    const fc = sp(lt, 11.5, 0.45);
    const fr = fieldRect(lt), fx = fr.x, fy = fr.y, fs = fr.s;
    const [tw, th] = env.tl ? env.cam.toWorld(env.tl.x, env.tl.y) : [fx + fs / 2, fy + fs / 2];
    ctx.save();
    if (fc > 0) { const s = lerp(1, 0.3, clamp(fc)); ctx.translate(tw, th); ctx.scale(s, s); ctx.translate(-tw, -th); }
    const pEnd = outP(lt, 12.0, 0.45);

    // ---- field: grows out of the kept thumbnail, then unwraps pixel by pixel as the front passes
    const M = B.NML, r = L.rasterCanvas('a3-field', M, M);
    if (!r.u32 || r.u32.buffer !== r.img.data.buffer) r.u32 = new Uint32Array(r.img.data.buffer);
    const vmax = k.vmax, fl = L.LUT.fringe, vl = L.LUT.vel;
    for (let i = 0; i < M * M; i++) {
      const iw = (((k.ml[i] + 64 * TAU) * (256 / TAU)) & 255) * 3;
      if (lt <= k.uwT[i]) { r.u32[i] = u32(fl[iw], fl[iw + 1], fl[iw + 2]); continue; }
      const m = clamp(sp(lt, k.uwT[i], 0.3)), iv = (clamp((k.mlU[i] / vmax + 1) / 2) * 255 | 0) * 3;
      r.u32[i] = u32(lerp(fl[iw], vl[iv], m) | 0, lerp(fl[iw + 1], vl[iv + 1], m) | 0, lerp(fl[iw + 2], vl[iv + 2], m) | 0);
    }
    r.x.putImageData(r.img, 0, 0);
    scanDraw(ctx, fx, fy, fs, fs, pEnd, C.cyan, () => { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(r.c, fx, fy, fs, fs); ctx.restore(); });
    ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.45 * pEnd); ctx.lineWidth = 1.25; ctx.strokeRect(fx, fy, fs, fs); ctx.restore();

    // unwrapping front: a ring growing out of the reference point (relative phase = 0 there)
    const rpx = fx + fs * UW.ref[0], rpy = fy + fs * UW.ref[1];
    if (lt > UW.t0 && lt < UW.t0 + UW.d + 0.15) {
      const rad = DMAX * fs * sine((lt - UW.t0) / UW.d), a = Math.sin(Math.PI * clamp((lt - UW.t0) / (UW.d + 0.15)));
      ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fs, fs); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = L.rgba(C.gold, 0.22 * a); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(rpx, rpy, Math.max(0, rad - 5), 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = L.rgba(C.gold, 0.95 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rpx, rpy, rad, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    refMark(ctx, rpx, rpy, Math.min(sp(lt, 9.75, 0.4), pEnd));

    // transect A–A′ across the bowl
    const pT = Math.min(sp(lt, 9.75, 0.45), pEnd), yT = fy + fs * BOWL.cy;
    if (pT > 0) {
      ctx.save(); ctx.strokeStyle = L.rgba(C.text, 0.9); ctx.lineWidth = 1.5; ctx.setLineDash([7, 5]);
      L.polyPartial(ctx, [[fx, yT], [fx + fs, yT]], pT); ctx.stroke(); ctx.restore();
      const lo = { kind: 'mono', size: 16, weight: 600, color: C.text, role: 'deco', p: pT, baseline: 'middle' };
      L.text(ctx, 'A', fx - 10, yT, { ...lo, align: 'right' });
      L.text(ctx, 'A′', fx + fs + 10, yT, lo);
    }

    // ---- profile: wrapped sawtooth → unwrapped curve; the y-range follows the curve (no lag, no clipping)
    const pP = io(lt, 9.75, 12.0, 0.45, 0.45);
    if (pP > 0) {
      const pf = k.prof, vals = new Float32Array(pf.NP);
      let cur = 0;
      for (let i = 0; i < pf.NP; i++) {
        const m = pf.n[i] ? clamp(sp(lt, pf.tSeg[i], 0.3), 0, 1.02) : 0;
        vals[i] = pf.W[i] + TAU * pf.n[i] * m; cur = Math.min(cur, vals[i]);
      }
      const lo0 = -1.3 * Math.PI, loF = pf.min - 1.4, lo = Math.min(lo0, cur - 1.4), hi = 1.3 * Math.PI;
      const g = clamp((lo0 - lo) / (lo0 - loF));
      const Y = (v) => PR.y + PR.h - ((v - lo) / (hi - lo)) * PR.h;
      ctx.save();
      ctx.globalAlpha *= clamp(pP);
      // axes
      ctx.strokeStyle = L.rgba(C.text, 0.35); ctx.lineWidth = 1.2;
      L.polyPartial(ctx, [[PR.x, PR.y], [PR.x, PR.y + PR.h], [PR.x + PR.w, PR.y + PR.h]], clamp(pP * 1.2)); ctx.stroke();
      // −π…π band + 2π grid
      const yp = Y(Math.PI), ym = Y(-Math.PI);
      ctx.fillStyle = L.rgba(C.cyan, 0.07); ctx.fillRect(PR.x, yp, PR.w * clamp(pP), ym - yp);
      ctx.setLineDash([4, 5]); ctx.strokeStyle = L.rgba(C.cyan, 0.35); ctx.beginPath();
      ctx.moveTo(PR.x, yp); ctx.lineTo(PR.x + PR.w * clamp(pP), yp); ctx.moveTo(PR.x, ym); ctx.lineTo(PR.x + PR.w * clamp(pP), ym); ctx.stroke();
      ctx.strokeStyle = L.rgba(C.text, 0.14 * g); ctx.beginPath();
      for (let j = 1; j <= 4; j++) { const yy = Y(-TAU * j); if (yy < PR.y + PR.h - 2 && yy > PR.y) { ctx.moveTo(PR.x, yy); ctx.lineTo(PR.x + PR.w, yy); } }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      // curve
      const pts = [];
      for (let i = 0; i < pf.NP; i++) pts.push([PR.x + (i / (pf.NP - 1)) * PR.w, Y(vals[i])]);
      ctx.save();
      ctx.beginPath(); ctx.rect(PR.x - 4, PR.y - 30, PR.w + 8, PR.h + 34); ctx.clip();
      glowLine(ctx, pts, C.cyan, Math.min(sp(lt, 9.75, 0.5), pEnd), 2.2);
      ctx.restore();
      // ticks: ±π while wrapped → 0, −2π, −4π, −6π once unwrapped
      const tk = { kind: 'mono', size: 16, color: C.textDim, role: 'deco', baseline: 'middle', align: 'right' };
      L.text(ctx, '+π', PR.x - 10, yp, { ...tk, p: pP * (1 - g) });
      L.text(ctx, '−π', PR.x - 10, ym, { ...tk, p: pP * (1 - g) });
      for (let j = 0; j <= 3; j++) {
        const yy = Y(-TAU * j);
        if (yy > PR.y + PR.h + 2 || yy < PR.y - 2) continue;
        L.text(ctx, j ? `−${2 * j}π` : '0', PR.x - 10, yy, { ...tk, p: pP * g });
      }
      L.text(ctx, 'A', PR.x, PR.y + PR.h + 20, { kind: 'mono', size: 16, color: C.textDim, role: 'deco', p: pP });
      L.text(ctx, 'A′', PR.x + PR.w, PR.y + PR.h + 20, { kind: 'mono', size: 16, color: C.textDim, role: 'deco', p: pP, align: 'right' });
    }

    ctx.restore(); // end of the contraction transform: text + legend stay put and unmask in the final beat

    // ---- text column + legend (all revealed by 10.1 → readable ≥ 1.5 s before the 11.85 unmask)
    const pt = (a) => io(lt, a, 12.0, 0.25, 0.15);
    L.text(ctx, 'SNAPHU', 220, 316, { kind: 'display', size: 56, weight: 700, color: C.text, p: pt(10.0) });
    L.text(ctx, 'phase unwrapping', 220, 360, { kind: 'sans', size: 26, weight: 500, color: C.textDim, p: pt(10.02) });
    L.text(ctx, [{ s: '2π cycles', color: C.text }, { s: ' →', color: C.gold }], 220, 444, { kind: 'sans', size: 28, weight: 600, p: pt(10.04) });
    L.text(ctx, 'continuous line-of-sight phase', 220, 482, { kind: 'sans', size: 28, weight: 600, color: C.text, p: pt(10.06) });
    refMark(ctx, 229, 536, pt(10.08));
    L.text(ctx, 'relative to a stable reference point', 248, 542, { kind: 'mono', size: 18, color: C.textDim, p: pt(10.08) });
    const lx = 1306, lw = 370;
    const pl = pt(10.0);
    L.text(ctx, 'WRAPPED · CYCLIC', lx, 330, { kind: 'mono', size: 18, weight: 600, color: C.text, tracking: 0.08, p: pl });
    if (pl > 0) { ctx.save(); ctx.beginPath(); ctx.rect(lx, 346, lw * clamp(pl), 14); ctx.clip(); ctx.drawImage(k.barFr, lx, 346, lw, 14); ctx.restore(); }
    L.text(ctx, '−π', lx, 386, { kind: 'mono', size: 18, color: C.textDim, p: pl });
    L.text(ctx, '+π', lx + lw, 386, { kind: 'mono', size: 18, color: C.textDim, p: pl, align: 'right' });
    const pa = Math.min(sp(lt, 10.0, 0.6), pt(10.0));
    if (pa > 0) {
      ctx.save(); ctx.strokeStyle = L.rgba(C.gold, 0.95); ctx.fillStyle = C.gold; ctx.lineWidth = 2.5;
      const ax = lx + lw / 2, y0 = 402, y1 = lerp(y0, 446, clamp(pa));
      ctx.beginPath(); ctx.moveTo(ax, y0); ctx.lineTo(ax, y1 - 6); ctx.stroke(); arrowHead(ctx, ax, y0, ax, y1, 11); ctx.restore();
    }
    const pl2 = pt(10.05);
    L.text(ctx, 'UNWRAPPED · CONTINUOUS', lx, 486, { kind: 'mono', size: 18, weight: 600, color: C.text, tracking: 0.08, p: pl2 });
    if (pl2 > 0) { ctx.save(); ctx.beginPath(); ctx.rect(lx, 502, lw * clamp(pl2), 14); ctx.clip(); ctx.drawImage(k.barVel, lx, 502, lw, 14); ctx.restore(); }
    L.text(ctx, 'away', lx, 542, { kind: 'mono', size: 18, color: C.textDim, p: pl2 });
    L.text(ctx, 'toward', lx + lw, 542, { kind: 'mono', size: 18, color: C.textDim, p: pl2, align: 'right' });
  }

  function drawC(ctx, env) {
    const k = cache();
    if (env.lt < 10.0) drawQC(ctx, env, k);
    if (env.lt >= Q.fieldAt) drawSnaphu(ctx, env, k);
  }

  /* ================================================================ scene */
  L.scene({
    id: 'act3', t0: 18, t1: 30,
    focus: [960, 540],
    init() { cache(); },
    tl(env) {
      const lt = env.lt, cam = env.cam, w = tlWorld(lt), p = cam.toScreen(w.x, w.y);
      const st = { x: p[0], y: p[1], size: w.size * cam.z, form: w.form, to: w.to, k: w.k, phase: w.phase, amp: w.amp, cycles: w.cycles, rot: 0, alpha: 1, energy: 0.42 + 0.45 * env.pulse };
      const f = sp(lt, 11.5, 0.45);
      const wFr = L.TL.weight(st, 'fringe');
      st.lw = 1 + 0.5 * wFr * clamp(1 - f);
      st.energy *= 1 - 0.45 * L.TL.weight(st, 'pulse'); // the wide s₁ packet keeps a tighter glow
      if (lt >= Q.fieldAt) st.energy *= 1 - 0.8 * wFr * clamp(1 - f); // no additive hot spot on the bowl; restored for the hand-off
      if (f > 0) { st.x = lerp(st.x, END.x, f); st.y = lerp(st.y, END.y, f); st.size = lerp(st.size, END.size, f); }
      if (env.handoff && lt < 2) return L.TL.blend(env.handoff, st, sp(lt, 0, 0.9));
      return st;
    },
    draw(ctx, env) {
      const lt = env.lt;
      if (lt < A.out) drawA(ctx, env);
      if (lt >= 3.75 && lt < B.cOut) drawB(ctx, env);
      if (lt < B.move) { drawRaster(ctx, env); drawCallout(ctx, env); }
      if (lt >= Q.qcIn) drawC(ctx, env);
      if (lt >= B.move) drawRaster(ctx, env); // match cut: the raster lands in its QC-grid slot on top of the new tiles
    },
  });
})();

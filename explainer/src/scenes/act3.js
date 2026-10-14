/* Act 3 · 18–30 s · Phase 3 Coregistration · Phase 4 Interferograms (form, multilook, SNAPHU unwrapping) ·
 * Phase 4.5 Interferogram Report Pages.
 *
 * Beat plan (lt = t − 18 s · 1 beat = 0.5 s · bars at lt 0, 2, 4, 6, 8, 10 · springs ζ 0.82). Voice-over + spotlight
 * targets from src/vo_cues.js: VO-07 18.4 ★subpixel 19.2–21.6 · VO-08 22.4 ★fringes 22.8–25.6 · VO-09 26.3 ★qc
 * 28.1–29.85 (lt 1.2–3.6 · 4.8–7.6 · 10.1–11.85). Every spotlight rectangle is fixed for its whole window.
 *  A · PHASE 3 COREGISTRATION (18–22, camera 1.00 → 1.04)
 *   0.0  the two chips unfold out of the incoming TL node — reference FBS = amber, secondary FBD = blue (act 2's mode
 *        colours). The TL settles on reference window 1 as the 'pixel' correlation window, holding the hand-off size
 *        for one beat. Chip labels 0.25 / 0.5; 0.5 the correlation card (★subpixel) constructs, 0.75 its surface.
 *   1.0  TL hop 1 (1.0 s spring, arc) rides the dashed correlation link to its match on the secondary; offset vectors
 *        grow; 1.25 the correlation peak rises off-centre.  1.5 / 2.5 windows 2 / 3 are matched.
 *   2.0  BAR · the secondary springs into alignment (1.0 s): the blue river lands on the amber ghost, the vectors shrink
 *        to dots and the peak walks to zero offset.  3.0 TL hop 2 (0.6 s, in-chip).
 *   3.75 A contracts into the TL and unmasks while B builds (no blank beat).
 *  B · PHASE 4 INTERFEROGRAMS (22–25.5, camera 1.04 → 1.08)
 *   4.0  BAR · TL pixel → 'pulse' = wave s₁ (0.8 s); its guides construct; 4.1 s₂ (gold) draws on.
 *   4.4  multiply sweep s₁ · s₂* fills the colour strip; 4.5 the raster plate constructs below it.
 *   4.8  the wrapped interferogram extrudes from the strip (4.8–5.6): motion turns to colour. Multilook card.
 *   5.25 zoom call-out from one cell to its 12 × 28 samples + cyclic legend; 5.5 "schematic"; 5.75 the looks line.
 *   6.0  BAR · the s₁ wave opens into a fringe loop and drops onto the bowl (0.9 s); s₂ and the guides unmask.
 *   6.5 / 7.0 the 28 azimuth / 12 range looks merge into one ≈ 90 m pixel; 7.0–7.5 the raster wipes to 90 m pixels.
 *  C · PHASE 4 UNWRAPPING (25.5–27.5, camera → 1.10)
 *   7.5  card, legend and strip unmask; PHASE UNWRAPPING + SNAPHU, reference point, transect A–A′, wrapped profile.
 *   8.0  BAR · SNAPHU: the unwrapping front grows out of the reference point (8.0–8.7); every pixel goes cyclic →
 *        continuous, every 2π segment of the profile drops into one smooth curve. Held to 9.5.
 *  D · PHASE 4.5 REPORT PAGES (27.5–30, camera → 1.125)
 *   9.5  the unwrapped field shrinks into its report page (0.7 s) inside the TL loop; 14 more pages construct around
 *        it; QC card: 1,779 (9.75) → 1,634 (10.0, held to 11.8), formed → inverted · 12 frames, report pages · G1–G23.
 *   10.0 BAR · the gate sweep checks every page (10.0–11.0): passed pages get a tick, two are struck and fold away.
 *   11.5 final beat · pages contract into the TL, text unmasks 11.65–11.95; TL → pure 'fringe' on the page, size 80.
 * Values: 2009-02-08 FBS reference, FBD resampled to the FBS grid, 28 × 12 looks, ≈ 90 m, 1,779 → 1,634 across 12
 * frames, G1–G23 (fact sheet). Chips, offsets, fringes, phases, pages, the rejections and the reference point are schematic.
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp, sp = L.sp, io = L.inout;
  const sine = L.ease.inOutSine;
  const wrap = (x) => x - TAU * Math.floor((x + Math.PI) / TAU); // → (−π, π]
  const outP = (lt, b, d) => (lt >= b ? 0 : clamp(1 - L.spring(lt - (b - d), d * 0.8)));

  // mode colours follow act 2 (FBS = amber, FBD = blue); the two dates' waves are cyan (s₁ = the TL) and gold (s₂)
  const INK = { blueCard: L.ink(C.blue, C.card), amber: L.ink(C.amber), blue: L.ink(C.blue) };
  const END_SIZE = 80; // hand-off size at 30.0 s (screen px) ≈ the loop's in-act size (72 world px × 1.125)
  const HEAD = { kind: 'sans', size: 19, weight: 600 };                    // card header · sentence case
  const NOTE = { kind: 'sans', size: 18, weight: 500, color: C.textDim };  // footnote / caveat
  const DECO = { kind: 'mono', size: 16, weight: 400, color: C.textDim, role: 'deco' }; // tick labels only
  const SPOT = { pad: 18, r: 16 };

  /* ================================================================ layout (world coordinates)
   * Each section keeps its content inside the HUD-safe box at that section's maximum camera zoom. */
  const A = {
    ref: { x: 150, y: 324, s: 460 }, sec: { x: 690, y: 324, s: 460 },
    card: { x: 1230, y: 324, w: 530, h: 460 },
    T: [16, -10], rot: (1.0 * Math.PI) / 180, // illustrative misregistration of the secondary (px, rad)
    patches: [[132, 42], [-134, -128], [-48, 138]], win: 66, grid: 92, ex: 2.5,
    // TL hops [lt, chip (0 ref / 1 sec), patch, spring s, arc px]: one cross-chip hop riding the correlation link,
    // one short in-chip hop. Peak speed ≈ 1,300 px/s.
    hops: [[0.0, 0, 0, 0, 0], [1.0, 1, 0, 1.0, 46], [3.0, 1, 1, 0.6, 24]],
    links: [[1.0, 0, 1.0], [1.5, 1, 0.5], [2.5, 2, 0.5]], // correlation links [lt, patch, draw-on spring]
    alignAt: 2.0, cIn: 3.85, cD: 0.75, out: 4.5, outD: 0.65, tOut: 4.15,
  };
  const B = {
    r: { x: 440, y: 350, s: 480 }, NSL: 520, NML: 40, // the interferogram raster (B, C), then its report-page image (D)
    wave: { x: 680, y1: 226, y2: 286, half: 240, amp: 0.3, cyc: 9 },
    strip: { y: 321, h: 10 },
    leg: { x: 440, y: 848, w: 200, h: 10 },
    card: { x: 1010, y: 350, w: 480, h: 380 },
    blk: { x: 1152, y: 418, s: 196 }, ml: [32, 9], // 12 × 28 sample block; the raster cell it zooms into
    sweep: 4.4, frameAt: 4.5, ext: 4.8, extD: 0.8, cardAt: 4.8, callAt: 5.1, legAt: 5.25, tagAt: 5.5, lblAt: 5.75,
    drop: 6.0, azAt: 6.5, rgAt: 7.0, wipe: 7.0, out: 7.5,
  };
  // right column, top-aligned with the field: headline cap height ≈ the field's top edge
  const U = { in: 7.5, out: 9.5, title: { x: 1010, y: 382 }, tag: { x: 1010, y: 426 }, prof: { x: 1054, y: 476, w: 420, h: 168 } };
  const UW = { t0: 8.0, d: 0.7, ref: [0.1, 0.12] }; // unwrapping front: starts on the bar at the reference point
  const D = {
    cols: 5, rows: 3, pw: 84, ph: 112, g: 22, cx: 680, cy: 560, // report-page grid around the field's column
    keep: 7, bad: { 5: 'decor', 13: 'unwrap' },
    in: 9.5, shrinkD: 0.7, sweep: [10.0, 11.0],
    card: { x: 1000, y: 419, w: 540, h: 282 },
    end: 11.5,
  };
  D.gw = D.cols * D.pw + (D.cols - 1) * D.g; D.gh = D.rows * D.ph + (D.rows - 1) * D.g;
  D.gx = D.cx - D.gw / 2; D.gy = D.cy - D.gh / 2;
  const RING = { B: 82, D: 72 }; // TL loop radius (world px): on the bowl's middle fringe, then around the report page
  // "schematic" tag: under the raster's right edge (B, C), riding up under the page grid with the shrink (D)
  const TAG = { x0: B.r.x + B.r.s, y0: B.leg.y + 12, x1: D.gx + D.gw, y1: D.gy + D.gh + 34 };

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
    // report pages: unwrapped quick-look (velocity scale) + wrapped header band, static
    k.pages = [];
    for (let n = 0; n < D.cols * D.rows; n++) k.pages.push(pageCanvases(k, n, topo, coh));
    // profile along the field's centre row (smooth phase), wrapped + 2π segment index + segment unwrap time
    const NP = 221; k.prof = { U: new Float32Array(NP), W: new Float32Array(NP), n: new Int16Array(NP), tSeg: new Float32Array(NP), NP };
    let mn = 0;
    for (let i = 0; i < NP; i++) {
      const u = i / (NP - 1), Uu = k.base(u, 0.5), Ww = wrap(Uu);
      k.prof.U[i] = Uu; k.prof.W[i] = Ww; k.prof.n[i] = Math.round((Uu - Ww) / TAU); mn = Math.min(mn, Uu);
    }
    let s0 = 0;
    for (let i = 0; i < NP; i++) { if (i && k.prof.n[i] !== k.prof.n[i - 1]) s0 = i / (NP - 1); k.prof.tSeg[i] = uwTime(s0, 0.5); }
    k.prof.min = mn;
    // cyclic legend (−π … +π)
    k.barFr = L.canvas(256, 1);
    { const x = k.barFr.getContext('2d'), im = x.createImageData(256, 1);
      for (let i = 0; i < 256; i++) { const c = L.fringeRGB(-Math.PI + (TAU * i) / 255); im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = 255; }
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

  /** One report page's quick-looks (40 × 40): the unwrapped interferogram on the velocity scale, and its wrapped phase
   *  along one row for the page's header band. Page D.keep is the pair followed through B and C (its image is drawn live). */
  function pageCanvases(k, n, topo, coh) {
    const M = 40, img = L.canvas(M, M), band = L.canvas(M, 1), vl = L.LUT.vel;
    const ix = img.getContext('2d'), id = ix.createImageData(M, M), d32 = new Uint32Array(id.data.buffer);
    const bx = band.getContext('2d'), bd = bx.createImageData(M, 1), b32 = new Uint32Array(bd.data.buffer);
    const hk = (q) => L.hash1(n * 13 + q, 3);
    // each pair spans a different time and season: bowl strength, orbital ramp, atmosphere and noise all differ
    const s = 0.12 + 1.05 * hk(1) * hk(1), ax = (hk(2) - 0.5) * 9, ay = (hk(3) - 0.5) * 6, tk = (hk(4) - 0.5) * 2.4, nk = 0.05 + 0.1 * hk(5);
    const atm = 2.5 + 5 * hk(6), ox = 20 * hk(7), oy = 20 * hk(8);
    const kind = D.bad[n], P = new Float32Array(M * M);
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const u = (i + 0.5) / M, v = (j + 0.5) / M, g = coh(u, v);
      let p;
      if (n === D.keep) p = k.mlU[j * M + i];
      else {
        p = s * bowl(u, v) + ax * (u - 0.5) + ay * (v - 0.5) + (1 + tk) * topo(u, v) + 2 * atm * (L.fbm(u * 2.4 + ox, v * 2.4 + oy, 3, 9) - 0.5)
          + (nk + 0.5 * (1 - g) * (1 - g)) * gauss(i + n * 50, j, 13);
        if (kind === 'decor') p += (11 - 4 * g) * gauss(i, j + n * 50, 17); // decorrelated: noise everywhere
        if (kind === 'unwrap' && u + 0.45 * v > 0.82) p += 2 * TAU;      // unwrapping error: a region off by whole cycles
      }
      P[j * M + i] = p;
      if (j === 20) b32[i] = k.fr32[((p + 64 * TAU) * (256 / TAU)) & 255];
    }
    // quick-looks are stretched per page around the scene's median (the kept pair uses the field's own scale)
    const sorted = Float32Array.from(P).sort(), med = n === D.keep ? 0 : sorted[sorted.length >> 1];
    let dev = 0; for (let i = 0; i < M * M; i++) dev = Math.max(dev, Math.abs(P[i] - med));
    const vmax = n === D.keep ? k.vmax : Math.max(1.3 * dev, 0.35 * k.vmax);
    for (let i = 0; i < M * M; i++) { const iv = (clamp(((P[i] - med) / vmax + 1) / 2) * 255 | 0) * 3; d32[i] = u32(vl[iv], vl[iv + 1], vl[iv + 2]); }
    ix.putImageData(id, 0, 0); bx.putImageData(bd, 0, 0);
    return { img, band };
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
  /** Centre of correlation window `pi` on the reference (chip 0) or its match on the (moving) secondary (chip 1). */
  function winPos(chip, pi, X) {
    const r = A.patches[pi];
    if (!chip) { const c = chipC(A.ref); return [c[0] + r[0], c[1] + r[1]]; }
    const c = chipC(A.sec), q = secPoint(r, X);
    return [c[0] + q[0], c[1] + q[1]];
  }
  /** Point at s ∈ [0, 1] on a shallow arc a → b that bulges upward by `bulge` px. */
  function arcPt(a, b, s, bulge) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
    const h = bulge * Math.sin(Math.PI * clamp(s));
    return [a[0] + dx * s + nx * h, a[1] + dy * s + ny * h];
  }
  function tlPosA(lt) {
    const X = secX(1 - alignK(lt)), H = A.hops;
    let p = winPos(H[0][1], H[0][2], X);
    for (let i = 1; i < H.length; i++) {
      const h = H[i];
      if (lt <= h[0]) break;
      p = arcPt(p, winPos(h[1], h[2], X), sp(lt, h[0], h[3]), h[4]);
    }
    return p;
  }
  /** Correlation-peak offset of the window the TL samples on the secondary (→ 0 once aligned). */
  function peakAt(lt) {
    const X = secX(1 - alignK(lt));
    const off = (pi) => { const r = A.patches[pi], q = secPoint(r, X); return [(q[0] - r[0]) / 30, (q[1] - r[1]) / 30]; };
    const a = off(A.hops[1][2]), b = off(A.hops[2][2]), k = sp(lt, A.hops[2][0], 0.6);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  }

  /* ================================================================ sections B–D geometry */
  const rowAt = (lt) => sine(clamp((lt - B.ext) / B.extD)); // extrusion progress (row being formed)
  function dphiRow(k, q, row) {
    const N = B.NSL, i = Math.min(N - 1, (q * N) | 0), j = Math.min(N - 1, (row * N) | 0);
    return k.slBase[j * N + i];
  }
  const fringeOff = (lt) => (lt > 4 && lt < 8 ? 0.55 * Math.sin((TAU * (lt - 4)) / 4) : 0); // subtle drift, back to 0 at 26 s
  const pageRect = (n) => { const c = n % D.cols, r = (n / D.cols) | 0; return [D.gx + c * (D.pw + D.g), D.gy + r * (D.ph + D.g)]; };
  const pageImg = (n) => { const [x, y] = pageRect(n); return { x: x + 8, y: y + 22, s: D.pw - 16 }; };
  const SW0 = D.gx - 18, SW1 = D.gx + D.gw + 18;
  const sweepX = (lt) => lerp(SW0, SW1, sine(clamp((lt - D.sweep[0]) / (D.sweep[1] - D.sweep[0]))));
  const sweepTimeAt = (x) => D.sweep[0] + ((D.sweep[1] - D.sweep[0]) * Math.acos(1 - 2 * clamp((x - SW0) / (SW1 - SW0)))) / Math.PI;
  const checkTime = (n) => sweepTimeAt(pageRect(n)[0] + D.pw / 2);
  /** World rect of the interferogram: the big raster in B and C, shrinking into its report page's image slot in D. */
  function fieldRect(lt) {
    const e = sp(lt, D.in, D.shrinkD), S = pageImg(D.keep), R = B.r;
    return { x: lerp(R.x, S.x, e), y: lerp(R.y, S.y, e), s: lerp(R.s, S.s, e), e };
  }
  const FC = [B.r.x + B.r.s * BOWL.cx, B.r.y + B.r.s * BOWL.cy]; // bowl centre = field centre = the kept page's centre

  /* ================================================================ the through-line */
  function morph(a, b, k) {
    const kk = clamp(k), ea = a.amp === undefined ? 1 : a.amp, eb = b.amp === undefined ? 1 : b.amp;
    const s = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), size: lerp(a.size, b.size, k), amp: lerp(ea, eb, kk), cycles: a.cycles || b.cycles };
    if (a.form === b.form || kk >= 0.999) return { ...s, form: b.form, to: null, k: 0 };
    if (kk <= 0.001) return { ...s, form: a.form, to: null, k: 0 };
    return { ...s, form: a.form, to: b.form, k: kk };
  }
  /** TL in WORLD coordinates (pure; shared by tl() and draw()). */
  function tlWorld(lt) {
    const ph = phaseAt(lt), a = tlPosA(lt);
    const sA = { x: a[0], y: a[1], size: A.win / 1.24, form: 'pixel' };
    if (lt < 4.0) return { ...sA, phase: ph };
    const W = B.wave, sB = { x: W.x, y: W.y1, size: W.half, form: 'pulse', amp: W.amp, cycles: W.cyc };
    if (lt < B.drop) return { ...morph(sA, sB, sp(lt, 4.0, 0.8)), phase: ph }; // morph starts on the 22 s bar
    // the s₁ wave opens into a fringe loop and drops onto the bowl's middle fringe (on the 24 s bar)
    const sC = { x: FC[0], y: FC[1], size: RING.B, form: 'fringe' };
    if (lt < D.in) return { ...morph(sB, sC, sp(lt, B.drop, 0.9)), phase: ph };
    // the loop stays on the pair while its field shrinks into the report page (page centre = image centre)
    const sD = { x: D.cx, y: D.cy, size: RING.D, form: 'fringe' };
    return { ...morph(sC, sD, sp(lt, D.in, D.shrinkD)), phase: ph };
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

  /** Bright fading trail behind the TL on hop arc a → b, between spring progress s0 (tail) and s1 (head). */
  function hopTrail(ctx, a, b, bulge, s0, s1, alpha) {
    if (s1 - s0 < 0.004 || alpha <= 0) return;
    const n = 20, pts = [];
    for (let i = 0; i <= n; i++) pts.push(arcPt(a, b, lerp(s0, s1, i / n), bulge));
    ctx.save(); ctx.lineCap = 'butt'; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / n;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.strokeStyle = L.rgba(C.cyan, 0.16 * f * alpha); ctx.lineWidth = 12 * f; ctx.stroke();
      ctx.strokeStyle = L.rgba(C.cyan, 0.85 * f * alpha); ctx.lineWidth = 0.6 + 2.6 * f; ctx.stroke();
    }
    ctx.restore();
  }

  function drawA(ctx, env) {
    const lt = env.lt, k = cache(), al = alignK(lt), X = secX(1 - al), S = k.sar;
    const aOut = outP(lt, A.out, A.outD);
    const tOut = (a, d = 0.4) => io(lt, a, A.tOut, d, 0.35); // text: fully revealed until 3.8
    const sc = A.ref.s / S.NR, scn = chipC(A.sec), rcn = chipC(A.ref);
    const tlW = env.tl ? env.cam.toWorld(env.tl.x, env.tl.y) : scn;
    const O = env.handoff ? env.cam.toWorld(env.handoff.x, env.handoff.y) : scn;

    ctx.save();
    // section change: everything contracts into the TL while it unmasks (B constructs from 4.0 on the bar)
    const fc = sp(lt, A.cIn, A.cD);
    if (fc > 0) { const s = lerp(1, 0.18, clamp(fc)); ctx.translate(tlW[0], tlW[1]); ctx.scale(s, s); ctx.translate(-tlW[0], -tlW[1]); }

    // chips: frames unfold out of the incoming TL node, images scan in (reference FBS amber, secondary FBD blue)
    drawChip(ctx, A.ref, O, sp(lt, 0.0, 0.6), io(lt, 0.2, A.out, 0.6, A.outD), aOut, INK.amber, () => { ctx.drawImage(S.ref, A.ref.x, A.ref.y, A.ref.s, A.ref.s); });
    drawChip(ctx, A.sec, O, sp(lt, 0.08, 0.6), io(lt, 0.3, A.out, 0.6, A.outD), aOut, INK.blue, () => {
      ctx.save(); ctx.translate(scn[0] + X.tx, scn[1] + X.ty); ctx.rotate(X.th);
      ctx.drawImage(S.sec, (-S.NS / 2) * sc, (-S.NS / 2) * sc, S.NS * sc, S.NS * sc);
      ctx.restore();
    });
    // chip labels: card-header role in the mode colour (sentence case) over the value line
    const label = (ch, head, col, value, a) => {
      const p = tOut(a);
      L.text(ctx, head, ch.x, ch.y - 56, { ...HEAD, color: col, p, scanColor: col });
      L.text(ctx, value, ch.x, ch.y - 20, { kind: 'sans', size: 24, weight: 600, color: C.text, p: clamp(p * 1.15 - 0.1), scanColor: col });
    };
    label(A.ref, 'Reference', INK.amber, [{ s: '2009-02-08 · ' }, { s: 'FBS', color: INK.amber }], 0.25);
    label(A.sec, 'Secondary', INK.blue, [{ s: 'FBD', color: INK.blue }, { s: ' → resampled to ' }, { s: 'FBS', color: INK.amber }, { s: ' grid' }], 0.5);

    // river centreline: traced on the reference (amber), ghosted on the secondary at the reference position
    // (amber, dashed) next to the secondary's own river (blue) — on the bar the blue line lands on the ghost.
    const riv = k.river;
    const pR = Math.min(sp(lt, 0.75, 0.6), aOut), pS = Math.min(sp(lt, 1.0, 0.6), aOut);
    if (pR > 0 || pS > 0) {
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (pR > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(A.ref.x, A.ref.y, A.ref.s, A.ref.s); ctx.clip();
        ctx.strokeStyle = 'rgba(5,8,15,0.5)'; ctx.lineWidth = 3.6;
        L.polyPartial(ctx, riv.map((r) => [rcn[0] + r[0], rcn[1] + r[1]]), pR); ctx.stroke();
        ctx.strokeStyle = L.rgba(INK.amber, 0.9); ctx.lineWidth = 1.7; ctx.stroke(); ctx.restore();
      }
      if (pS > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(A.sec.x, A.sec.y, A.sec.s, A.sec.s); ctx.clip();
        ctx.strokeStyle = 'rgba(5,8,15,0.55)'; ctx.lineWidth = 4;
        L.polyPartial(ctx, riv.map((r) => { const q = secPoint(r, X); return [scn[0] + q[0], scn[1] + q[1]]; }), pS); ctx.stroke();
        ctx.strokeStyle = L.rgba(INK.blue, 0.95); ctx.lineWidth = 1.9; ctx.stroke();
        ctx.setLineDash([7, 6]); ctx.strokeStyle = L.rgba(INK.amber, 0.95); ctx.lineWidth = 1.6;
        L.polyPartial(ctx, riv.map((r) => [scn[0] + r[0], scn[1] + r[1]]), pS); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.restore();
    }

    // dense offset field on the secondary (exaggerated), shrinking to dots on alignment
    const pV = Math.min(io(lt, 0.3, A.out, 0.6, A.outD), aOut);
    if (pV > 0) {
      ctx.save();
      const dotCol = L.css(L.mix(INK.blue, C.cyan, al));
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
          ctx.strokeStyle = INK.blue; ctx.fillStyle = INK.blue; ctx.lineWidth = 1.7;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + vx * 0.85, y0 + vy * 0.85); ctx.stroke();
          arrowHead(ctx, x0, y0, x0 + vx, y0 + vy, 8);
        }
      }
      ctx.restore();
    }

    // correlation links (dashed arcs) between each reference window and its match on the secondary;
    // the TL's first hop rides link 1, so it draws on with the TL
    ctx.save(); ctx.lineCap = 'round';
    for (const [t0, pi, d] of A.links) {
      const pl = Math.min(sp(lt, t0, d), aOut);
      if (pl <= 0) continue;
      const a = winPos(0, pi, X), b = winPos(1, pi, X), bulge = pi === A.hops[1][2] ? A.hops[1][4] : 30, pts = [];
      for (let i = 0; i <= 24; i++) pts.push(arcPt(a, b, i / 24, bulge));
      ctx.strokeStyle = 'rgba(5,8,15,0.55)'; ctx.lineWidth = 3.5; L.polyPartial(ctx, pts, pl); ctx.stroke();
      ctx.setLineDash([6, 6]); ctx.strokeStyle = L.rgba(C.cyan, 0.6); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();

    // correlation windows: reference (amber) and matched secondary windows (blue, ride the alignment)
    ctx.save(); ctx.lineWidth = 2;
    A.links.forEach(([t0, pi]) => {
      for (const chip of [0, 1]) {
        const ta = chip ? t0 + (pi === A.hops[1][2] ? 0.5 : 0.15) : pi === A.hops[1][2] ? 0.6 : t0;
        const pp = Math.min(sp(lt, ta, 0.35), aOut);
        if (pp <= 0) continue;
        const pos = winPos(chip, pi, X), col = chip ? INK.blue : INK.amber;
        ctx.strokeStyle = 'rgba(5,8,15,0.5)'; ctx.lineWidth = 4; L.polyPartial(ctx, sqPts(pos[0], pos[1], A.win), pp); ctx.stroke();
        ctx.strokeStyle = L.rgba(col, 0.95); ctx.fillStyle = L.rgba(col, 0.1 * clamp(pp)); ctx.lineWidth = 2;
        ctx.fillRect(pos[0] - A.win / 2, pos[1] - A.win / 2, A.win, A.win);
        L.polyPartial(ctx, sqPts(pos[0], pos[1], A.win), pp); ctx.stroke();
      }
    });
    ctx.restore();

    // fading 0.25 s trail behind each TL hop
    for (let i = 1; i < A.hops.length; i++) {
      const h = A.hops[i], hp = A.hops[i - 1];
      if (lt <= h[0] || lt > h[0] + h[3] + 0.4) continue;
      const s1 = sp(lt, h[0], h[3]), s0 = sp(lt - 0.25, h[0], h[3]);
      hopTrail(ctx, winPos(hp[1], hp[2], X), winPos(h[1], h[2], X), h[4], s0, Math.min(1, s1), aOut);
    }

    // correlation card — the ★subpixel widget: the peak sits off-centre, then walks to zero offset on the bar
    const cd = A.card, pc = io(lt, 0.5, A.out, 0.5, A.outD);
    L.card(ctx, cd.x, cd.y, cd.w, cd.h, { p: pc, accent: C.blue });
    L.text(ctx, 'Correlation peak', cd.x + 26, cd.y + 44, { ...HEAD, color: INK.blueCard, p: tOut(0.65), bg: C.card, scanColor: C.blue });
    corrSurface(ctx, env, cd, io(lt, 0.75, A.out, 0.6, A.outD), al);
    L.text(ctx, 'schematic', cd.x + 26, cd.y + cd.h - 26, { ...NOTE, p: tOut(1.0), bg: C.card });
    ctx.restore();
    if (lt >= 0.9 && lt < A.cIn) L.spot.mark(ctx, 'subpixel', cd.x, cd.y, cd.w, cd.h, SPOT); // fixed for VO-07's window

    // crosshair ticks around the TL correlation window (not scaled: they belong to the TL)
    const tl = env.tl;
    if (tl) {
      const wPix = L.TL.weight(tl, 'pixel') * outP(lt, 4.1, 0.4);
      if (wPix > 0.01) {
        const h = (tl.size / env.cam.z) * 0.62;
        ctx.save(); ctx.globalAlpha = wPix; ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(tlW[0] + dx * (h + 6), tlW[1] + dy * (h + 6)); ctx.lineTo(tlW[0] + dx * (h + 20), tlW[1] + dy * (h + 20)); }
        ctx.stroke(); ctx.restore();
      }
    }
  }

  /** Isometric correlation surface over the lag plane, one grid cell = one pixel of shift. The arrow from the zero-lag
   *  pixel (highlighted, "1 px") to the peak's foot is the offset; as the secondary aligns the peak walks into that pixel. */
  function corrSurface(ctx, env, cd, p, al) {
    if (p <= 0) return;
    const lt = env.lt, cx = cd.x + cd.w / 2, cy = cd.y + cd.h / 2 + 30, S = 132, E = 0.9375, c0 = 0.0625;
    const pr = (gx, gy, z) => [cx + (gx - gy) * S * 0.86, cy + (gx + gy) * S * 0.36 - z * 124];
    const pk = peakAt(lt), rise = sp(lt, 1.25, 0.6), br = 0.93 + 0.07 * env.pulse;
    const Z = (gx, gy) => { const dx = gx - pk[0], dy = gy - pk[1]; return rise * br * Math.exp(-(dx * dx + dy * dy) / 0.07) + 0.09 * (L.noise2(gx * 2.6 + 9, gy * 2.6 + 4, 7) - 0.5) * (1 - 0.5 * al) + 0.015; };
    const n = 16, m = 30, lv = 7, paths = []; // lines on half-pixel lags: cells are centred on whole-pixel shifts
    for (let q = 0; q < lv; q++) paths.push(new Path2D());
    for (let dir = 0; dir < 2; dir++) for (let a = 0; a < n; a++) {
      const A0 = -E + (2 * E * a) / (n - 1);
      let prev = null, pz = 0;
      for (let b = 0; b <= m; b++) {
        const B0 = -E + (2 * E * b) / m, gx = dir ? B0 : A0, gy = dir ? A0 : B0, z = Z(gx, gy), pt = pr(gx, gy, z);
        if (prev) { const q = Math.min(lv - 1, Math.max(0, Math.floor(((z + pz) / 2 + 0.02) * lv))); paths[q].moveTo(prev[0], prev[1]); paths[q].lineTo(pt[0], pt[1]); }
        prev = pt; pz = z;
      }
    }
    const top = pr(-E, -E, 0)[1] - 138, bot = pr(E, E, 0)[1] + 4, lx = pr(-E, E, 0)[0] - 6, rx = pr(E, -E, 0)[0] + 6;
    const cell = [pr(-c0, -c0, 0), pr(c0, -c0, 0), pr(c0, c0, 0), pr(-c0, c0, 0)];
    scanDraw(ctx, lx, top, rx - lx, bot - top, p, C.blue, () => {
      ctx.save();
      // the zero-lag pixel on the floor (drawn first: the surface's wireframe passes over it)
      L.poly(ctx, cell, true); ctx.fillStyle = L.rgba(C.cyan, 0.16 + 0.14 * al); ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let q = 0; q < lv; q++) { const t = q / (lv - 1); ctx.strokeStyle = L.css(t < 0.5 ? L.mix(C.blue, C.cyan, t * 2) : L.mix(C.cyan, C.text, (t - 0.5) * 2), 0.45 + 0.5 * t); ctx.stroke(paths[q]); }
      // offset vector (secondary's colour) from the zero-lag pixel to the peak's foot, the drop line and the apex marker
      const o0 = pr(0, 0, 0), ob = pr(pk[0], pk[1], 0), ot = pr(pk[0], pk[1], Z(pk[0], pk[1]));
      ctx.setLineDash([3, 4]); ctx.strokeStyle = L.rgba(C.text, 0.55); ctx.beginPath(); ctx.moveTo(ob[0], ob[1]); ctx.lineTo(ot[0], ot[1]); ctx.stroke(); ctx.setLineDash([]);
      const len = Math.hypot(ob[0] - o0[0], ob[1] - o0[1]);
      if (len > 6) {
        ctx.strokeStyle = 'rgba(5,8,15,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(o0[0], o0[1]); ctx.lineTo(ob[0], ob[1]); ctx.stroke();
        ctx.strokeStyle = INK.blueCard; ctx.fillStyle = INK.blueCard; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(o0[0], o0[1]); ctx.lineTo(ob[0], ob[1]); ctx.stroke(); arrowHead(ctx, o0[0], o0[1], ob[0], ob[1], 9);
      }
      const pc = L.mix(INK.blueCard, C.cyan, al);
      L.glow(ctx, ot[0], ot[1], 26, L.css(pc), 0.8 * rise);
      ctx.fillStyle = L.css(pc); ctx.beginPath(); ctx.arc(ot[0], ot[1], 5 * rise, 0, TAU); ctx.fill();
      // scale: a leader from the zero-lag pixel down past the grid's front corner to "1 px"
      const fy = pr(E, E, 0)[1];
      ctx.strokeStyle = L.rgba(C.cyan, 0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(o0[0], o0[1] + 6); ctx.lineTo(o0[0], fy + 18); ctx.stroke();
      ctx.restore();
    });
    L.text(ctx, '1 px', cx, pr(E, E, 0)[1] + 40, { ...DECO, weight: 600, color: L.ink(C.cyan, C.card), align: 'center', p: clamp(p * 1.4 - 0.4) });
  }

  /* ================================================================ B · interferogram formation + multilook */
  function drawB(ctx, env) {
    const lt = env.lt, k = cache(), W = B.wave, R = B.r, x0 = W.x - W.half;
    const off = fringeOff(lt), ph = phaseAt(lt), row = rowAt(lt);

    // ---- guides: the two wave baselines construct outward from the TL on the bar and retract after the drop
    const pgd = Math.min(sp(lt, 4.0, 0.5), outP(lt, B.drop + 0.4, 0.4));
    if (pgd > 0) {
      const h = W.half * clamp(pgd);
      ctx.save(); ctx.strokeStyle = L.rgba(C.text, 0.14); ctx.lineWidth = 1; ctx.beginPath();
      for (const y of [W.y1, W.y2]) { ctx.moveTo(W.x - h, y); ctx.lineTo(W.x + h, y); }
      ctx.stroke(); ctx.restore();
    }
    // ---- s₂ (gold): the TL's carrier, shifted by the interferometric phase (a fixed row with a damped share of the
    //      along-range variation, so it reads "same wave, phase-shifted"; the strip carries Δφ)
    const pG = io(lt, 4.1, B.drop + 0.4, 0.6, 0.4);
    if (pG > 0) {
      const pts = [], mean = k.row0Mean + off;
      for (let i = 0; i <= 200; i++) {
        const q = i / 200, e = Math.pow(Math.sin(Math.PI * q), 1.15), d = mean + 0.3 * (dphiRow(k, q, 0) + off - mean);
        pts.push([x0 + 2 * W.half * q, W.y2 - W.amp * 0.34 * e * Math.sin(TAU * W.cyc * q - ph - d) * W.half]);
      }
      glowLine(ctx, pts, C.gold, pG, 2.2);
    }
    // ---- colour strip s₁ · s₂*: the multiply sweep (4.4–4.8) fills it; then it shows the row being extruded
    const pS = io(lt, B.sweep, B.out + 0.35, 0.4, 0.35);
    if (pS > 0) {
      const r = L.rasterCanvas('a3-strip', 240, 1);
      if (!r.u32 || r.u32.buffer !== r.img.data.buffer) r.u32 = new Uint32Array(r.img.data.buffer);
      for (let i = 0; i < 240; i++) r.u32[i] = k.fr32[((dphiRow(k, (i + 0.5) / 240, row) + off + 64 * TAU) * (256 / TAU)) & 255];
      r.x.putImageData(r.img, 0, 0);
      const wk = lt < B.sweep + 0.6 ? sine(clamp((lt - B.sweep) / 0.4)) : 1;
      const ww = 2 * W.half * wk, sy = B.strip.y - B.strip.h / 2;
      ctx.save(); ctx.globalAlpha *= clamp(pS);
      ctx.strokeStyle = L.rgba(C.cyan, 0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, sy - 0.5, 2 * W.half, B.strip.h + 1);
      ctx.beginPath(); ctx.rect(x0, sy, ww, B.strip.h); ctx.clip();
      ctx.drawImage(r.c, x0, sy, 2 * W.half, B.strip.h); ctx.restore();
      if (wk > 0 && wk < 1) { // multiply sweep through both waves
        const sx = x0 + ww;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(sx - 18, 0, sx + 2, 0); g.addColorStop(0, 'rgba(230,241,255,0)'); g.addColorStop(1, 'rgba(230,241,255,0.35)');
        ctx.fillStyle = g; ctx.fillRect(sx - 18, W.y1 - 40, 20, B.strip.y - W.y1 + 46);
        ctx.fillStyle = 'rgba(230,241,255,0.9)'; ctx.fillRect(sx - 1, W.y1 - 40, 2, B.strip.y - W.y1 + 46);
        ctx.restore();
      }
    }
    // ---- cyclic legend under the raster (−π … +π, deco ticks)
    const pB = io(lt, B.legAt, B.out + 0.35, 0.5, 0.35);
    if (pB > 0) {
      const G = B.leg;
      ctx.save(); ctx.globalAlpha *= clamp(pB); ctx.beginPath(); ctx.rect(G.x, G.y, G.w * clamp(pB), G.h); ctx.clip(); ctx.drawImage(k.barFr, G.x, G.y, G.w, G.h); ctx.restore();
      const lo = { ...DECO, p: pB };
      L.text(ctx, '−π', G.x, G.y + 32, lo);
      L.text(ctx, '0', G.x + G.w / 2, G.y + 32, { ...lo, align: 'center' });
      L.text(ctx, '+π', G.x + G.w, G.y + 32, { ...lo, align: 'right' });
    }

    // ---- multilook card: one parameter line; its "28 az" / "12 rg" light up gold with each merge
    const cd = B.card, co = (a, d = 0.4) => io(lt, a, B.out + 0.35, d, 0.35);
    L.card(ctx, cd.x, cd.y, cd.w, cd.h, { p: co(B.cardAt, 0.5), accent: C.blue });
    L.text(ctx, 'Multilook', cd.x + 26, cd.y + 42, { ...HEAD, color: INK.blueCard, p: co(B.cardAt + 0.1), bg: C.card, scanColor: C.blue });
    const h1 = io(lt, B.azAt, B.azAt + 0.9, 0.25, 0.3), h2 = io(lt, B.rgAt, B.rgAt + 0.9, 0.25, 0.3);
    const gc = (h) => L.css(L.mix(C.text, C.gold, clamp(h)));
    L.text(ctx, [{ s: '28 az', color: gc(h1) }, { s: ' × ' }, { s: '12 rg', color: gc(h2) }, { s: ' looks → ≈ 90 m × 90 m' }], cd.x + 26, cd.y + cd.h - 28,
      { kind: 'mono', size: 19, weight: 400, color: C.text, p: co(B.lblAt), bg: C.card, scanColor: C.gold, id: 'a3-looks' });
    drawLookBlock(ctx, env, k, off, co(B.callAt, 0.5), h1, h2);
  }

  /** Zoom call-out from one multilooked cell on the raster to the sample block — drawn above the raster. */
  function drawCallout(ctx, env) {
    const lt = env.lt, R = B.r, pz = Math.min(sp(lt, B.callAt, 0.5), outP(lt, B.out + 0.35, 0.35));
    if (pz <= 0) return;
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

  /** 12 range × 28 azimuth single-look samples → one ≈ 90 m pixel: the 28 azimuth looks merge (6.5), then the 12 range
   *  looks (7.0). Colours are complex averages of the sample phases. */
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
    L.text(ctx, '12 rg', cx, bk.y + bk.s + 44, { ...DECO, weight: 600, color: L.css(L.mix(C.textDim, C.gold, clamp(h2))), align: 'center', p: pb });
    L.text(ctx, '28 az', bk.x - 30, cy + 6, { ...DECO, weight: 600, color: L.css(L.mix(C.textDim, C.gold, clamp(h1))), align: 'right', p: pb });
  }

  /** The interferogram itself, one object from 22.5 s to the end: plate (4.5) → extrudes from the strip (4.8–5.6,
   *  single-look) → wipes to 90 m pixels (7.0–7.5) → unwraps as the SNAPHU front passes (8.0–8.7) → shrinks into its
   *  report page (9.5–10.2). p = end-of-act unmask. */
  function drawField(ctx, env, p) {
    const lt = env.lt, k = cache();
    if (lt < B.frameAt || p <= 0) return;
    const fr = fieldRect(lt), fx = fr.x, fy = fr.y, fs = fr.s, off = fringeOff(lt);
    const pf = Math.min(sp(lt, B.frameAt, 0.4), p);
    const body = () => {
      ctx.fillStyle = 'rgba(4,7,13,0.3)'; ctx.fillRect(fx, fy, fs, fs);
      const ext = rowAt(lt), hy = fy + fs * ext;
      if (ext <= 0) return;
      if (lt < UW.t0) {
        const wipe = sine(clamp((lt - B.wipe) / 0.5)), wy = fy + fs * wipe;
        if (wipe > 0) {
          const c = paintPhase('a3-ml', B.NML, k.ml, k.fr32, off);
          ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fs, Math.min(wy, hy) - fy); ctx.clip();
          ctx.imageSmoothingEnabled = false; ctx.drawImage(c, fx, fy, fs, fs); ctx.restore();
        }
        if (wipe < 1) {
          const c = paintPhase('a3-sl', B.NSL, k.sl, k.fr32, off);
          ctx.save(); ctx.beginPath(); ctx.rect(fx, wy, fs, hy - wy); ctx.clip();
          ctx.drawImage(c, fx, fy, fs, fs); ctx.restore();
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (ext < 1) { // extrusion head
          ctx.fillStyle = 'rgba(230,241,255,0.85)'; ctx.fillRect(fx - 6, hy - 1, fs + 12, 2);
          ctx.fillStyle = 'rgba(0,229,255,0.18)'; ctx.fillRect(fx - 6, hy - 6, fs + 12, 12);
        }
        if (wipe > 0 && wipe < 1) {
          ctx.fillStyle = L.rgba(C.cyan, 0.9); ctx.fillRect(fx - 8, wy - 1, fs + 16, 2);
          ctx.fillStyle = L.rgba(C.cyan, 0.2); ctx.fillRect(fx - 8, wy - 6, fs + 16, 12);
        }
        ctx.restore();
      } else { // SNAPHU: every pixel goes from its cyclic fringe colour to the continuous (velocity-scale) colour
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
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(r.c, fx, fy, fs, fs); ctx.restore();
      }
    };
    scanDraw(ctx, fx, fy, fs, fs, pf, C.cyan, body);
    const tc = checkTime(D.keep), pass = lt > tc ? Math.exp(-(lt - tc) * 4) : 0; // the gate's tick accent
    ctx.save(); ctx.globalAlpha *= clamp(pf);
    ctx.strokeStyle = L.rgba(C.cyan, 0.42 + 0.45 * pass); ctx.lineWidth = 1.25 + pass; ctx.strokeRect(fx, fy, fs, fs);
    const cb = Math.min(18, fs * 0.2) * (1 - fr.e); // viewfinder corners while the raster is large (B, C)
    if (cb > 1) {
      ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 3;
      for (const [x, y, sx, sy] of [[fx, fy, 1, 1], [fx + fs, fy, -1, 1], [fx, fy + fs, 1, -1], [fx + fs, fy + fs, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x + sx * cb, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * cb); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ================================================================ C · SNAPHU unwrapping */
  /** On the field: the unwrapping front, the reference point and the transect A–A′ (unmask as the field shrinks). */
  function drawFieldMarks(ctx, env) {
    const lt = env.lt;
    if (lt < U.in || lt >= U.out + 0.4) return;
    const fr = fieldRect(lt), fx = fr.x, fy = fr.y, fs = fr.s, pEnd = outP(lt, U.out + 0.3, 0.3);
    const rpx = fx + fs * UW.ref[0], rpy = fy + fs * UW.ref[1];
    if (lt > UW.t0 && lt < UW.t0 + UW.d + 0.15) { // the front: a ring growing out of the reference point (phase 0 there)
      const rad = DMAX * fs * sine((lt - UW.t0) / UW.d), a = Math.sin(Math.PI * clamp((lt - UW.t0) / (UW.d + 0.15)));
      ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fs, fs); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = L.rgba(C.gold, 0.22 * a); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(rpx, rpy, Math.max(0, rad - 5), 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = L.rgba(C.gold, 0.95 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rpx, rpy, rad, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    const pRef = Math.min(sp(lt, U.in + 0.1, 0.4), pEnd);
    refMark(ctx, rpx, rpy, pRef);
    if (pRef > 0) { // short deco tag on a backplate next to the ⊙ marker
      const lo = { ...DECO, weight: 600, color: C.text, baseline: 'middle', p: pRef };
      const tw = L.measure(ctx, 'reference', lo).w;
      ctx.save(); ctx.globalAlpha *= clamp(pRef); ctx.fillStyle = 'rgba(5,8,15,0.72)'; L.roundRect(ctx, rpx + 15, rpy - 12, tw + 14, 24, 5); ctx.fill(); ctx.restore();
      L.text(ctx, 'reference', rpx + 22, rpy, lo);
    }
    const pT = Math.min(sp(lt, U.in + 0.25, 0.45), pEnd), yT = fy + fs * BOWL.cy;
    if (pT > 0) {
      ctx.save(); ctx.strokeStyle = L.rgba(C.text, 0.85); ctx.lineWidth = 1.5; ctx.setLineDash([7, 5]);
      L.polyPartial(ctx, [[fx, yT], [fx + fs, yT]], pT); ctx.stroke(); ctx.restore();
      const lo = { ...DECO, weight: 600, color: C.text, p: pT, baseline: 'middle' };
      L.text(ctx, 'A', fx - 10, yT, { ...lo, align: 'right' });
      L.text(ctx, 'A′', fx + fs + 10, yT, lo);
    }
  }

  /** Right column: headline + SNAPHU, and the profile A–A′ — wrapped sawtooth → one smooth curve (deco π ticks). */
  function drawUnwrap(ctx, env) {
    const lt = env.lt, k = cache();
    if (lt < U.in || lt >= U.out + 0.4) return;
    const pt = (a, d = 0.4) => io(lt, a, U.out + 0.3, d, 0.3);
    L.text(ctx, L.caps('Phase unwrapping'), U.title.x, U.title.y, { kind: 'display', size: 44, weight: 700, tracking: 0.03, color: C.text, p: pt(U.in + 0.2), role: 'headline', id: 'a3-unwrap' });
    L.text(ctx, 'SNAPHU', U.tag.x, U.tag.y, { kind: 'sans', size: 22, weight: 600, tracking: 0.02, color: INK.blue, p: pt(U.in + 0.35), scanColor: C.blue });

    const PR = U.prof, pP = pt(U.in + 0.3, 0.45);
    if (pP <= 0) return;
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
    ctx.strokeStyle = L.rgba(C.text, 0.35); ctx.lineWidth = 1.2;
    L.polyPartial(ctx, [[PR.x, PR.y], [PR.x, PR.y + PR.h], [PR.x + PR.w, PR.y + PR.h]], clamp(pP * 1.2)); ctx.stroke();
    const yp = Y(Math.PI), ym = Y(-Math.PI);
    ctx.fillStyle = L.rgba(C.cyan, 0.07); ctx.fillRect(PR.x, yp, PR.w * clamp(pP), ym - yp);
    ctx.setLineDash([4, 5]); ctx.strokeStyle = L.rgba(C.cyan, 0.35); ctx.beginPath();
    ctx.moveTo(PR.x, yp); ctx.lineTo(PR.x + PR.w * clamp(pP), yp); ctx.moveTo(PR.x, ym); ctx.lineTo(PR.x + PR.w * clamp(pP), ym); ctx.stroke();
    ctx.strokeStyle = L.rgba(C.text, 0.14 * g); ctx.beginPath();
    for (let j = 1; j <= 4; j++) { const yy = Y(-TAU * j); if (yy < PR.y + PR.h - 2 && yy > PR.y) { ctx.moveTo(PR.x, yy); ctx.lineTo(PR.x + PR.w, yy); } }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    const pts = [];
    for (let i = 0; i < pf.NP; i++) pts.push([PR.x + (i / (pf.NP - 1)) * PR.w, Y(vals[i])]);
    ctx.save(); ctx.beginPath(); ctx.rect(PR.x - 4, PR.y - 30, PR.w + 8, PR.h + 34); ctx.clip();
    glowLine(ctx, pts, C.cyan, Math.min(sp(lt, U.in + 0.3, 0.5), pP), 2.2);
    ctx.restore();
    // deco ticks: ±π while wrapped → 0, 2π, 4π, 6π (downward = range increase) once unwrapped
    const tk = { ...DECO, baseline: 'middle', align: 'right' };
    L.text(ctx, '+π', PR.x - 10, yp, { ...tk, p: pP * (1 - g) });
    L.text(ctx, '−π', PR.x - 10, ym, { ...tk, p: pP * (1 - g) });
    for (let j = 0; j <= 3; j++) {
      const yy = Y(-TAU * j);
      if (yy > PR.y + PR.h + 2 || yy < PR.y - 2) continue;
      L.text(ctx, j ? `${2 * j}π` : '0', PR.x - 10, yy, { ...tk, p: pP * g });
    }
    L.text(ctx, 'A', PR.x, PR.y + PR.h + 20, { ...DECO, p: pP });
    L.text(ctx, 'A′', PR.x + PR.w, PR.y + PR.h + 20, { ...DECO, p: pP, align: 'right' });
  }

  /* ================================================================ D · report pages */
  function pageShape(ctx, x, y, w, h, f = 12) { // portrait page with a folded top-right corner
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w - f, y); ctx.lineTo(x + w, y + f); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  }
  function pageBody(ctx, k, n, x, y) {
    const w = D.pw, h = D.ph, im = pageImg(n), pg = k.pages[n];
    pageShape(ctx, x, y, w, h); ctx.fillStyle = '#1A2538'; ctx.fill();
    ctx.fillStyle = 'rgba(230,241,255,0.14)'; ctx.beginPath(); ctx.moveTo(x + w - 12, y); ctx.lineTo(x + w - 12, y + 12); ctx.lineTo(x + w, y + 12); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(pg.band, im.x, y + 9, im.s - 14, 5); ctx.restore(); // wrapped phase band (header)
    if (n !== D.keep) { // the kept pair's image is the live field (drawField)
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(pg.img, im.x, im.y, im.s, im.s); ctx.restore();
      ctx.strokeStyle = 'rgba(0,229,255,0.28)'; ctx.lineWidth = 1; ctx.strokeRect(im.x, im.y, im.s, im.s);
    }
    ctx.fillStyle = 'rgba(159,176,200,0.5)';
    ctx.fillRect(x + 8, y + h - 15, 44, 3); ctx.fillRect(x + 8, y + h - 9, 28, 3);
  }
  /** The grid: pages construct radially around the kept pair; the gate sweep ticks each page as it passes; two pages
   *  are struck (crimson ×) and fold away to a dashed footprint. p = end-of-act unmask. */
  function drawPages(ctx, env, p) {
    const lt = env.lt, k = cache(), kc = D.keep % D.cols, kr = (D.keep / D.cols) | 0;
    for (let n = 0; n < D.cols * D.rows; n++) {
      const [x, y] = pageRect(n), c = n % D.cols, r = (n / D.cols) | 0, keep = n === D.keep;
      const pin = Math.min(sp(lt, keep ? D.in + 0.3 : D.in + 0.15 + 0.09 * Math.hypot(c - kc, r - kr), 0.45), p);
      if (pin <= 0) continue;
      const tc = checkTime(n), bad = D.bad[n];
      const strike = bad ? sp(lt, tc, 0.22) : 0, fold = bad ? sp(lt, tc + 0.3, 0.45) : 0;
      const s = 1 - clamp(fold);
      if (bad && fold > 0.02) { // removed: faint dashed footprint
        ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = L.rgba(C.crimson, 0.5 * clamp(fold) * clamp(pin)); ctx.lineWidth = 1.2;
        pageShape(ctx, x + 0.5, y + 0.5, D.pw - 1, D.ph - 1); ctx.stroke(); ctx.restore();
      }
      if (s <= 0.01) continue;
      ctx.save();
      if (fold > 0) { ctx.translate(x + D.pw / 2, y + D.ph / 2); ctx.scale(lerp(1, 0.7, clamp(fold)), s); ctx.translate(-(x + D.pw / 2), -(y + D.ph / 2)); ctx.globalAlpha *= clamp(0.35 + 0.65 * s); }
      scanDraw(ctx, x, y, D.pw, D.ph, pin, C.blue, () => pageBody(ctx, k, n, x, y));
      const pass = lt > tc ? Math.exp(-(lt - tc) * 4) : 0;
      ctx.globalAlpha *= clamp(pin);
      ctx.strokeStyle = bad && strike > 0 ? L.rgba(C.crimson, 0.95) : L.rgba(C.cyan, (lt > tc ? 0.45 : 0.2) + 0.5 * pass);
      ctx.lineWidth = bad && strike > 0 ? 2.2 : 1.2;
      pageShape(ctx, x, y, D.pw, D.ph); ctx.stroke();
      if (strike > 0) {
        ctx.fillStyle = `rgba(11,17,30,${0.55 * clamp(strike)})`; pageShape(ctx, x, y, D.pw, D.ph); ctx.fill();
        ctx.fillStyle = L.rgba(C.crimson, 0.16 * clamp(strike)); ctx.fill();
        ctx.lineCap = 'round';
        const x1 = [[x + 14, y + D.ph - 18], [x + D.pw - 14, y + 18]], x2 = [[x + 14, y + 18], [x + D.pw - 14, y + D.ph - 18]];
        for (const [lw, col] of [[8, 'rgba(11,17,30,0.7)'], [4, C.crimson]]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw;
          L.polyPartial(ctx, x1, strike); ctx.stroke();
          L.polyPartial(ctx, x2, clamp(strike * 2 - 1)); ctx.stroke();
        }
      } else if (lt > tc) { // passed: a tick badge in the bottom-right corner
        const tp = clamp(sp(lt, tc, 0.3)), bx = x + D.pw - 13, by = y + D.ph - 12;
        ctx.fillStyle = `rgba(5,8,15,${(0.8 * tp).toFixed(3)})`; ctx.beginPath(); ctx.arc(bx, by, 8 * (0.6 + 0.4 * tp), 0, TAU); ctx.fill();
        ctx.strokeStyle = L.rgba(C.cyan, 0.95); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.arc(bx, by, 8, -Math.PI / 2, -Math.PI / 2 + TAU * tp); ctx.stroke();
        L.polyPartial(ctx, [[bx - 3.6, by + 0.2], [bx - 0.9, by + 3], [bx + 3.8, by - 2.8]], clamp(tp * 1.4 - 0.2)); ctx.stroke();
      }
      ctx.restore();
    }
  }
  /** The gate: a cyan scanline sweeping the grid left → right on the bar. */
  function drawSweep(ctx, env, p) {
    const lt = env.lt, pg = Math.min(sp(lt, D.sweep[0] - 0.15, 0.3), outP(lt, D.sweep[1] + 0.35, 0.3), p);
    if (pg <= 0) return;
    const sx = sweepX(lt), y0 = D.gy - 16, y1 = D.gy + D.gh + 16, yb = lerp(y0, y1, clamp(pg));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(sx - 30, 0, sx + 2, 0);
    gr.addColorStop(0, 'rgba(0,229,255,0)'); gr.addColorStop(1, 'rgba(0,229,255,0.22)');
    ctx.fillStyle = gr; ctx.fillRect(sx - 30, y0, 32, yb - y0);
    ctx.fillStyle = L.rgba(C.cyan, 0.95); ctx.fillRect(sx - 1, y0, 2, yb - y0);
    ctx.restore();
  }
  /** QC card: formed → inverted (12 frames) and what decides it. */
  function drawQCCard(ctx, env) {
    const lt = env.lt, q = D.card, pc = io(lt, D.in + 0.1, 12.0, 0.5, 0.4);
    if (pc <= 0) return;
    L.card(ctx, q.x, q.y, q.w, q.h, { p: pc, accent: C.blue });
    const tx = q.x + 28, t = (a, d = 0.4) => io(lt, a, 11.95, d, 0.3);
    L.text(ctx, 'Interferogram QC', tx, q.y + 44, { ...HEAD, color: INK.blueCard, p: t(9.7), bg: C.card, scanColor: C.blue });
    const hero = { kind: 'display', size: 64, weight: 700, bg: C.card, scanColor: C.blue };
    const w1 = L.measure(ctx, '1,779', hero).w;
    L.text(ctx, '1,779', tx, q.y + 124, { ...hero, color: C.text, p: t(9.75), id: 'a3-formed' });
    L.text(ctx, [{ s: '→ ', color: C.textDim }, { s: '1,634', color: INK.blueCard }], tx + w1 + 20, q.y + 124, { ...hero, color: INK.blueCard, p: t(10.0, 0.35), id: 'a3-inverted' });
    // proportion bar: 1,634 of 1,779 go forward to the inversion
    const bw = q.w - 56, by = q.y + 148, pb = t(9.8, 0.5), pk = clamp(sp(lt, 10.0, 0.7)) * (1634 / 1779);
    if (pb > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(pb);
      ctx.fillStyle = L.rgba(C.crimson, 0.5); ctx.fillRect(tx, by, bw * clamp(pb), 6);
      ctx.fillStyle = INK.blueCard; ctx.fillRect(tx, by, bw * pk, 6);
      ctx.restore();
    }
    L.text(ctx, 'Interferograms formed → inverted · 12 frames', tx, q.y + 196, { kind: 'sans', size: 22, weight: 500, color: C.textDim, p: t(9.85), bg: C.card });
    L.text(ctx, 'Report pages · gates G1–G23', tx, q.y + 244, { ...NOTE, p: t(9.95), bg: C.card });
  }

  /* ================================================================ scene */
  L.scene({
    id: 'act3', t0: 18, t1: 30,
    focus: [960, 540],
    init() { cache(); },
    tl(env) {
      const lt = env.lt, cam = env.cam, w = tlWorld(lt), p = cam.toScreen(w.x, w.y);
      const st = { x: p[0], y: p[1], size: w.size * cam.z, form: w.form, to: w.to, k: w.k, phase: w.phase, amp: w.amp, cycles: w.cycles, rot: 0, alpha: 1, energy: 0.42 + 0.45 * env.pulse };
      const f = sp(lt, D.end, 0.45);
      const wFr = L.TL.weight(st, 'fringe');
      st.lw = 1 + 0.5 * wFr * clamp(1 - f);
      st.energy *= 1 - 0.45 * L.TL.weight(st, 'pulse'); // the wide s₁ packet keeps a tighter glow
      if (lt >= B.drop) st.energy *= 1 - 0.8 * wFr * clamp(1 - f); // no additive hot spot on the field / page; restored for the hand-off
      const tc = checkTime(D.keep);
      if (lt > tc) st.energy += 0.7 * Math.exp(-(lt - tc) * 5) * clamp(1 - f); // its page passes the gate
      if (f > 0) st.size = lerp(st.size, END_SIZE, f); // hand off on the kept page, ≈ the in-act size (no pump)
      if (env.handoff && lt < 2) {
        st.size = lerp(env.handoff.size, st.size, sp(lt, 0.5, 0.6)); // hold the hand-off size for one beat
        return L.TL.blend(env.handoff, st, sp(lt, 0, 0.9));
      }
      return st;
    },
    draw(ctx, env) {
      const lt = env.lt;
      if (lt < A.out) drawA(ctx, env);
      if (lt >= 3.75 && lt < B.out + 0.4) drawB(ctx, env);
      // D's final beat: pages + field contract into the TL while they unmask
      const fc = sp(lt, D.end, 0.45), pEnd = outP(lt, 12.0, 0.45);
      ctx.save();
      if (fc > 0 && env.tl) { const [tw, th] = env.cam.toWorld(env.tl.x, env.tl.y), s = lerp(1, 0.3, clamp(fc)); ctx.translate(tw, th); ctx.scale(s, s); ctx.translate(-tw, -th); }
      if (lt >= D.in) drawPages(ctx, env, pEnd);
      drawField(ctx, env, pEnd);
      drawFieldMarks(ctx, env);
      if (lt >= D.in) drawSweep(ctx, env, pEnd);
      ctx.restore();
      if (lt >= B.callAt && lt < B.out + 0.4) drawCallout(ctx, env);
      drawUnwrap(ctx, env);
      drawQCCard(ctx, env);
      const te = fieldRect(lt).e;
      L.text(ctx, 'schematic', lerp(TAG.x0, TAG.x1, te), lerp(TAG.y0, TAG.y1, te), { ...NOTE, align: 'right', p: io(lt, B.tagAt, 11.95, 0.4, 0.3), id: 'a3-schematic' });
      // spotlight targets (fixed rectangles for each VO window; VO-07's card is marked in drawA)
      if (lt >= 4.6 && lt < 7.75) {
        const y0 = B.strip.y - B.strip.h / 2;
        L.spot.mark(ctx, 'fringes', B.r.x, y0, B.r.s, B.leg.y + 38 - y0, SPOT);
        L.spot.mark(ctx, 'fringes', B.card.x, B.card.y, B.card.w, B.card.h, SPOT);
      }
      if (lt >= 9.9) {
        L.spot.mark(ctx, 'qc', D.gx, D.gy, D.gw, TAG.y1 + 6 - D.gy, SPOT);
        L.spot.mark(ctx, 'qc', D.card.x, D.card.y, D.card.w, D.card.h, SPOT);
      }
    },
  });
})();

/* Act 5 · Geocoded deliverables & discovery (42–52 s) — HUD on.
 *
 * Beat plan (lt = t − 42 s · bars start at lt 0, 2, 4, 6, 8 · beat 0.5 s · 16th 0.125 s)
 *  0.00  BAR 22. The TL (pixel from act 4) docks into a radar-geometry grid (slant range × azimuth: mirrored
 *        north-down, skewed, rotated by the ascending heading, range spacing non-uniform), centred on screen.
 *        The cells are the TL's own 1/1200° neighbourhood (= Cabanatuan, inside the subsidence bowl), coloured
 *        by LOS velocity. Viewport frame, outline and cells construct outward from the TL (one ring per 16th).
 *  0.13  tag "radar geometry · range × azimuth"; range / azimuth axis arrows; compass needle points down.
 *  1.00  lookup table: dashed ghost of the geographic lattice wipes in; two corner pixels get curved leaders
 *        (routed outside the sheet) to their lat/lon cells; "lookup table · lat/lon of every radar pixel".
 *  2.00  BAR 23. Geocoding: ONE spring mirrors the whole sheet about its centre row (a clean card flip with
 *        light perspective; edge-on cells shade darker), a second spring (2.25) de-rotates, de-skews and evens
 *        the range spacing. The TL pixel rides its cell; the compass swings north-up; the stage slides left.
 *  2.75  Deliverables card constructs; 2.88 "16 GIS-ready products · per frame · 12 frames delivered";
 *        3.0 GeoTIFF / KMZ / PNG chips (with format glyphs) + demErr | demErr_ramp headers; one family per
 *        beat (LOS velocity · vertical · horizontal (E–W) · hillshade·KMZ), its 4 tiles on 16ths (3.0 → 4.9).
 *        Every tile is a velocity product; the two tiles of a pair differ by format (badge glyph).
 *  3.00  TL locks onto its 1/1200° lattice cell (ripple on the beat); "geographic grid · 1/1200° ≈ 90 m".
 *  4.00  BAR 24. V_vert = V_LOS / cos θ: the lattice rows "write" on 16ths and deepen LOS → vertical;
 *        27-check verification: segments fill on 16ths, tiles tick, check draws on at 5.5.
 *  6.00  BAR 25 · FINDINGS. Section A unmasks; the deliverables card morphs (height, emerald → crimson) into
 *        the result card. The camera swoops out (log-spring map zoom, 72 000 → 1 150 px/°): the lattice shrinks
 *        into the TL and turns out to be pixels of the 1/1200° velocity map (same values, same grid); the map
 *        unmasks radially; ~5 km crimson bowl around the TL marker; PFZ (schematic) trace slides in + label.
 *  6.50  city tag; 6.63 legend (vertical velocity scale · 5 km bar); 6.75 dashed outer bowl contour;
 *  6.75  result card: VERTICAL RATE / −4.4 to −4.7 / cm/yr vertical / ≈ 18–19 cm · 2007–2011 / caveat (16ths).
 *  7.50  cross-check rows: Path 448 · Path 449 (8ths).
 *  8.00  BAR 26. Swoop in to the bowl (log-spring 1 150 → 5 200 px/°, crisp 1/1200° pixels); PFZ leaves;
 *        CABN GNSS row; 8.25 groundwater footnote; 8.25 the TL morphs pixel → contour = the bowl's half-depth
 *        contour; 8.5 inner contours draw on (16ths).
 *  9.45  Everything except the TL unmasks; the map contracts radially into the contour.
 * 10.00  Pure 'contour' at A (620, 460), size ≈ 126 px, rot 0, alpha 1.
 *
 * All layout lives in pure helpers (nodesAt, ppdAt, tlWorld) used by tl() and draw().
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, G = L.geo, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp, sp = L.sp;

  const T0 = 42, DUR = 10;
  const A = [620, 460];                       // TL anchor (world): its lattice cell = Cabanatuan City = bowl centre
  const FOCUS = [620, 460];                   // camera push pivots on the TL so the hand-off point stays put
  const NX = 10, NY = 8, IC = 4, JC = 2;      // lattice cells; the TL's cell
  const FR = 1200;                            // 1/1200° geocoded grid
  const P_LAT = 72000;                        // px per degree at which a 1/1200° cell is 60 px tall
  const CH = P_LAT / FR, CW = CH * G.K;
  const P_WIDE = 1150, P_FINE = 5200;         // map scales for the wide frame and the bowl
  const BOWL_KM = 2.5, KM_DEG = 111.32;       // TL contour unit (half-depth radius of the ~5 km bowl)
  const PH_C = 9.6, SEED = 7;                 // contour phase/seed (field + TL share them)
  const PHI = -0.2;                           // radar grid rotation (ascending heading, exaggerated)
  const COS_T = Math.cos((38 * Math.PI) / 180);
  const VP = { x: 150, y: 172, w: 968, h: 740 };   // viewport (world)
  const PX = 1162, PW = 564;                        // right-hand panel column
  const CAB = G.places.cabanatuan;
  const EM = C.emerald, CR = C.crimson;
  const INK_EM = L.ink(EM, C.card), INK_CR = L.ink(CR, C.card);
  const INK_CY = L.ink(C.cyan, C.card), INK_GO = L.ink(C.gold, C.card);
  const DIM = C.textDim;

  /* ------------------------------------------------------------------ pure layout */
  const camAt = (lt) => L.cam(T0 + Math.min(lt, DUR - 1e-6), FOCUS); // never the next act's camera
  const lnLAT = Math.log(P_LAT), lnWIDE = Math.log(P_WIDE), lnFINE = Math.log(P_FINE);
  function ppdAt(lt) {
    if (lt < 6) return P_LAT;
    return Math.exp(lnLAT + (lnWIDE - lnLAT) * sp(lt, 6.0, 1.0) + (lnFINE - lnWIDE) * sp(lt, 8.0, 1.2));
  }
  const NN = (NX + 1) * (NY + 1);
  const ix = (i, j) => (j * (NX + 1) + i) * 2;
  const HX = (NX / 2) * CW, HY = (NY / 2) * CH;
  const LC = [A[0] + (NX / 2 - IC - 0.5) * CW, A[1] + (NY / 2 - JC - 0.5) * CH]; // lattice centre (world)
  // GEO: lattice nodes (world). UND: lattice nodes relative to LC. DIS: the radar-distorted sheet relative to LC,
  // BEFORE its north–south mirror (range spacing grows near → far range, foreshortening jitter, azimuth skew).
  const GEO = new Float64Array(NN * 2), UND = new Float64Array(NN * 2), DIS = new Float64Array(NN * 2);
  (function buildNodes() {
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const n = ix(i, j), u = (i - NX / 2) / (NX / 2), v = (j - NY / 2) / (NY / 2);
      GEO[n] = A[0] + (i - IC - 0.5) * CW; GEO[n + 1] = A[1] + (j - JC - 0.5) * CH;
      UND[n] = u * HX; UND[n + 1] = v * HY;
      const ur = u + 0.1 * (u * u - 1) + 0.07 * (L.noise2(i * 0.9 + 3, j * 0.9, 17) - 0.5) - 0.17 * v;
      DIS[n] = ur * HX * 1.04; DIS[n + 1] = v * HY * 0.97;
    }
  })();
  // geocoding = one mirror (k1) + one de-skew/de-rotate/relax (k2); never per-column springs (no bow-tie)
  const flipK = (lt) => sp(lt, 2.0, 0.7);
  const skewK = (lt) => sp(lt, 2.25, 0.9);
  const F_PERSP = 1500;
  // bar 22: the stage sits centred; at bar 23 it slides left (spring) to make room for the deliverables panel
  const SLIDE = 326;
  const offX = (lt) => (lt < 6 ? SLIDE * (1 - sp(lt, 2.0, 0.75)) : 0);
  function warpNodes(k1, k2, ox, out) {
    const m = -Math.cos(Math.PI * k1), s = Math.sin(Math.PI * k1);  // m: −1 mirrored (radar) → +1 upright
    const phi = PHI * (1 - k2), cr = Math.cos(phi), sr = Math.sin(phi);
    const cx = LC[0] + 16 * (1 - k2) + ox, cy = LC[1] - 4 * (1 - k2);
    for (let n = 0; n < NN * 2; n += 2) {
      const lx = lerp(DIS[n], UND[n], k2), ly = lerp(DIS[n + 1], UND[n + 1], k2);
      const ps = F_PERSP / (F_PERSP - ly * s);                       // the sheet tilts toward the viewer mid-flip
      const x = lx * ps, y = ly * m * ps;
      out[n] = cx + x * cr - y * sr; out[n + 1] = cy + x * sr + y * cr;
    }
    return out;
  }
  function nodesAt(lt, out) {
    if (lt < 6) return warpNodes(flipK(lt), skewK(lt), offX(lt), out);
    const zf = ppdAt(lt) / P_LAT;
    for (let n = 0; n < NN * 2; n += 2) { out[n] = A[0] + (GEO[n] - A[0]) * zf; out[n + 1] = A[1] + (GEO[n + 1] - A[1]) * zf; }
    return out;
  }
  const TMP = new Float64Array(NN * 2);
  const S_LAT = (CW / 1.24) * 1.08, S_MARK = 26;
  const phaseAt = (lt) => (lt < 8 ? 0.6 * L.steps(lt, 0.5, 0.3) : PH_C);
  const morphK = (lt) => sp(lt, 8.25, 1.0);
  /** TL in WORLD space. */
  function tlWorld(lt) {
    const phase = phaseAt(lt);
    if (lt < 6) {
      const P = nodesAt(lt, TMP);
      const a = ix(IC, JC), b = ix(IC + 1, JC), c = ix(IC + 1, JC + 1), d = ix(IC, JC + 1);
      const x = (P[a] + P[b] + P[c] + P[d]) / 4, y = (P[a + 1] + P[b + 1] + P[c + 1] + P[d + 1]) / 4;
      const e = (Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1]) + Math.hypot(P[c] - P[d], P[c + 1] - P[d + 1])) / 2;
      return { x, y, size: (e / 1.24) * 1.08, rot: PHI * (1 - skewK(lt)), form: 'pixel', phase };
    }
    let size = lerp(S_LAT, S_MARK, sp(lt, 6.0, 0.9));
    const bowl = (BOWL_KM * ppdAt(lt)) / KM_DEG;
    const k = morphK(lt);
    size = lerp(size, bowl, k);
    const st = { x: A[0], y: A[1], size, rot: 0, form: 'pixel', to: 'contour', k, phase, seed: SEED };
    if (k <= 0) { st.to = null; st.k = 0; }
    if (k >= 0.999) { st.form = 'contour'; st.to = null; st.k = 0; }
    return st;
  }

  /* ------------------------------------------------------------------ the synthetic bowl (shares the TL contour shape) */
  function contourR(th) { // identical to core formPoint('contour') with seed SEED, phase PH_C
    let r = 1;
    for (let k = 2; k <= 5; k++) r += (0.05 + 0.06 * L.hash1(k, SEED)) * Math.sin(k * th + TAU * L.hash1(k + 9, SEED) + 0.15 * PH_C);
    return r;
  }
  const R_LUT = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) R_LUT[i] = contourR(-Math.PI + (TAU * i) / 1024);
  function rhoOf(X, Y) { // X,Y in TL units (screen orientation, y = south)
    const xs = X / 1.08, ys = Y / 0.9;
    const th = Math.atan2(ys, xs);
    return Math.hypot(xs, ys) / R_LUT[Math.round(((th + Math.PI) / TAU) * 1024)];
  }
  function velAt(lon, lat) { // vertical velocity, cm/yr (schematic)
    const X = ((lon - CAB.lon) * KM_DEG * G.K) / BOWL_KM, Y = ((CAB.lat - lat) * KM_DEG) / BOWL_KM;
    const r = rhoOf(X, Y);
    const bowl = -4.6 * Math.exp(-Math.LN2 * r * r);
    const n = (L.fbm(lon * 24, lat * 24, 3, 41) - 0.5) * 0.55 + (L.fbm(lon * 4, lat * 4, 2, 43) - 0.5) * 0.45 + 0.08;
    return bowl + n;
  }
  /** One 1/1200° pixel's vertical velocity (fine-raster pixel index i, j) — shared by the map and the lattice. */
  const cellVel = (i, j, lon, lat) => velAt(lon, lat) + (L.fbm(i * 0.35, j * 0.35, 2, 61) - 0.5) * 1.1 + (L.hash2(i, j, 3) - 0.5) * 0.4;
  const FP = [448, 449].map((p) => G.footprint(p, 14.51, 16.15)); // ALOS-1 ascending paths, frames F0280–F0300
  function inQuad(q, lon, lat) {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const c = (b[0] - a[0]) * (lat - a[1]) - (b[1] - a[1]) * (lon - a[0]);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  }
  // 1/1200° (≈ 90 m) velocity map around Cabanatuan, pixel (FI_I0, FI_J0) centred on the city — so the 90 m
  // lattice of section A is literally a 10 × 8 window of this raster. Covers the whole wide frame.
  const FI_W = 1152, FI_H = 852, FI_I0 = 540, FI_J0 = 320;
  const FI = { lon0: CAB.lon - (FI_I0 + 0.5) / FR, lat1: CAB.lat + (FI_J0 + 0.5) / FR };
  FI.lon1 = FI.lon0 + FI_W / FR; FI.lat0 = FI.lat1 - FI_H / FR;
  let RFI = null, THUMBS = null, CELLS = null;

  function velIdx(v) { return Math.max(0, Math.min(255, Math.round(((v / 5 + 1) / 2) * 255))) * 3; }
  function buildRasters() {
    const lut = L.LUT.vel;
    // schematic DEM at 1/600° (1-node margin) → hillshade, bilinear onto the 1/1200° pixels
    const GR = 600, gnx = FI_W / 2 + 3, gny = FI_H / 2 + 3;
    const glon0 = FI.lon0 - 1 / GR, glat1 = FI.lat1 + 1 / GR;
    const g = G.grid(glon0, glon0 + (gnx - 1) / GR, glat1 - (gny - 1) / GR, glat1, gnx, gny);
    const SH = new Float32Array(gnx * gny);
    for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) SH[j * gnx + i] = G.hillshade(g, i, j, 1.5);
    const bil = (arr, gx, gy) => {
      const i0 = Math.min(gnx - 2, Math.max(0, Math.floor(gx))), j0 = Math.min(gny - 2, Math.max(0, Math.floor(gy)));
      const fx = gx - i0, fy = gy - j0, o = j0 * gnx + i0;
      return lerp(lerp(arr[o], arr[o + 1], fx), lerp(arr[o + gnx], arr[o + gnx + 1], fx), fy);
    };
    const cv = L.canvas(FI_W, FI_H), x = cv.getContext('2d'), im = x.createImageData(FI_W, FI_H), d = im.data;
    const base = L.hex(C.card), lite = L.hex(C.textDim), dark = L.hex(C.bg);
    for (let j = 0; j < FI_H; j++) {
      const lat = FI.lat1 - (j + 0.5) / FR, gy = (glat1 - lat) * GR;
      for (let i = 0; i < FI_W; i++) {
        const lon = FI.lon0 + (i + 0.5) / FR, gx = (lon - glon0) * GR, o = (j * FI_W + i) * 4;
        const land = G.land(lon, lat);
        if (land <= 0) { d[o + 3] = 0; continue; }
        const h = bil(g.h, gx, gy), sh = bil(SH, gx, gy) - 0.707;
        const core = (i - FI_I0) * (i - FI_I0) + (j - FI_J0) * (j - FI_J0) < 1600; // bowl core (incl. the lattice): no dropouts
        // coherence mask (schematic): decorrelated uplands with a dithered (feathered) height threshold,
        // sparse low-coherence dropouts; water is not land
        const ok = land > 0.5 && (inQuad(FP[0], lon, lat) || inQuad(FP[1], lon, lat)) &&
          h <= 150 + 300 * L.hash2(i, j, 5) && (core || L.hash2(i, j, 9) >= 0.006);
        if (ok) { // velocity draped on a faint hillshade (the "hillshade velocity map" look)
          const k = velIdx(cellVel(i, j, lon, lat)), f = clamp(1 + 0.5 * sh, 0.84, 1.1);
          d[o] = lut[k] * f; d[o + 1] = lut[k + 1] * f; d[o + 2] = lut[k + 2] * f; d[o + 3] = 255;
        } else {   // masked: slate hillshade (soft: low z-factor, clamped dark side)
          const rgb = sh >= 0 ? L.mix(base, lite, Math.min(0.34, sh * 1.1 + 0.03)) : L.mix(base, dark, Math.min(0.42, -sh * 1.15));
          d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255 * land;
        }
      }
    }
    x.putImageData(im, 0, 0);
    RFI = { c: cv };
  }
  // lattice cells = the TL's own 1/1200° neighbourhood of the velocity map: LOS = vertical · cos θ, vertical
  function buildCells() {
    CELLS = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const pi = FI_I0 + i - IC, pj = FI_J0 + j - JC;
      const v = cellVel(pi, pj, FI.lon0 + (pi + 0.5) / FR, FI.lat1 - (pj + 0.5) / FR);
      CELLS.push({ v, los: L.velRGB(v * COS_T, 5), ver: L.velRGB(v, 5), ph: L.hash2(i, j, 77) * TAU });
    }
  }
  // 16 deliverable thumbnails: family f (LOS / vertical / horizontal / hillshade·KMZ) × correction × format.
  // Every tile is a velocity product; the two tiles of a pair differ by format (GeoTIFF / hillshade PNG / KMZ).
  const TW = 64, TH = 50, TSW = 80, TSH = 62;
  const FMT = (f, c) => (f < 3 ? (c & 1 ? 'png' : 'tif') : c & 1 ? 'kmz' : 'png');
  function buildThumbs() {
    THUMBS = [];
    const scale = [1, 1.27, 1.62, 1.27];
    const ocean = L.hex('#0E1E33');
    for (let f = 0; f < 4; f++) for (let c = 0; c < 4; c++) {
      const corr = c >> 1, fmt = FMT(f, c);
      const cv = L.canvas(TSW, TSH), x = cv.getContext('2d'), im = x.createImageData(TSW, TSH), d = im.data;
      for (let j = 0; j < TSH; j++) for (let i = 0; i < TSW; i++) {
        const o = (j * TSW + i) * 4;
        let u = i / TSW, v = j / TSH;
        let bg = null;
        if (fmt === 'kmz') { // draped on a globe: curved limb, footprint bent over the sphere
          const r = Math.hypot(i - TSW / 2, j - 72);
          if (r > 68) { d[o + 3] = 0; continue; }
          bg = r > 65.5 ? L.mix(ocean, C.cyan, 0.45) : ocean.map((q) => q * (0.7 + 0.45 * clamp((68 - r) / 40)));
          v = (j - 9) / (TSH - 9); u = 0.5 + (u - 0.5) * (1.3 + 0.25 * (1 - v));
          v += 0.08 * Math.pow((u - 0.5) * 2, 2);
        }
        if (fmt === 'tif') { u = (Math.floor(i / 4) * 4 + 2) / TSW; v = (Math.floor(j / 4) * 4 + 2) / TSH; } // raster cells
        const uu = u - 0.5 + 0.16 * (v - 0.5), vv = v - 0.5;
        if (Math.abs(uu) > 0.3 || Math.abs(vv) > 0.43) {
          if (bg) { d[o] = bg[0]; d[o + 1] = bg[1]; d[o + 2] = bg[2]; d[o + 3] = 255; } else d[o + 3] = 0;
          continue;
        }
        let val = (L.fbm(u * 3.5, v * 3.5, 3, 11) - 0.5) * 3 - 4.2 * Math.exp(-((u - 0.47) ** 2 + (v - 0.58) ** 2) / 0.006);
        if (corr === 0) val += 3.4 * (u - 0.5) + 1.6 * (v - 0.5); // demErr keeps a residual orbital ramp; demErr_ramp removes it
        let rgb = L.velRGB(val * scale[f], 5);
        if (fmt !== 'tif') { // hillshade drape
          const h = L.fbm(u * 5 + f, v * 5, 4, 3);
          const shade = clamp(0.45 + (L.fbm(u * 5 + f + 0.03, v * 5, 4, 3) - h) * 9);
          const k = fmt === 'png' ? 0.55 + 0.75 * shade : 0.7 + 0.45 * shade;
          rgb = rgb.map((q) => Math.min(255, q * k));
        }
        d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      THUMBS.push({ c: cv, fmt });
    }
  }
  function ensure() { if (!RFI) buildRasters(); if (!CELLS) buildCells(); if (!THUMBS) buildThumbs(); }

  /* ------------------------------------------------------------------ small drawing helpers */
  /** polyPartial + stroke, only when something is drawn (polyPartial leaves the old path when p ≤ 0). */
  function strokePartial(ctx, pts, p) { if (p > 0.0005) { L.polyPartial(ctx, pts, p); ctx.stroke(); } }
  function plate(ctx, x, y, w, h, p, o = {}) {
    if (p <= 0) return;
    const k = L.ease.outCubic(clamp(p * 1.25));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 2, y - 2, w + 4, (h + 4) * k); ctx.clip();
    L.roundRect(ctx, x, y, w, h, o.r === undefined ? 7 : o.r);
    ctx.fillStyle = L.rgba(C.card, o.a === undefined ? 0.94 : o.a); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = o.border || C.cardBorder; ctx.stroke();
    ctx.restore();
  }
  /** Text on its own backplate. Returns the plate box. */
  function tag(ctx, str, x, y, o) {
    const m = L.measure(ctx, str, o);
    const px = o.padX === undefined ? 12 : o.padX, py = o.padY === undefined ? 8 : o.padY;
    let x0 = x;
    if (o.align === 'right') x0 = x - m.w; else if (o.align === 'center') x0 = x - m.w / 2;
    const capH = m.capH || m.asc * 0.72;
    const top = y - capH - py, h = capH + py * 2 + 2;
    plate(ctx, x0 - px, top, m.w + px * 2, h, o.p, { a: o.plateA });
    L.text(ctx, str, x, y, { ...o, p: clamp(o.p * 1.15 - 0.1), bg: C.card });
    return { x: x0 - px, y: top, w: m.w + px * 2, h };
  }
  /** Two-line right-aligned label on one backplate. */
  function tag2(ctx, lines, xr, y, o) {
    const lh = o.lh || 26, px = 12, py = 9;
    const w = Math.max(...lines.map((s) => L.measure(ctx, s, o).w)), m = L.measure(ctx, lines[0], o);
    const capH = m.capH || m.asc * 0.72;
    const top = y - capH - py, h = capH + py * 2 + lh * (lines.length - 1) + 4;
    plate(ctx, xr - w - px, top, w + px * 2, h, o.p);
    lines.forEach((s, i) => L.text(ctx, s, xr, y + i * lh, { ...o, align: 'right', p: clamp(o.p * 1.25 - 0.1 - 0.1 * i), bg: C.card, id: o.id + '-' + i }));
    return { x: xr - w - px, y: top, w: w + px * 2, h };
  }
  function arrowHead(ctx, x1, y1, a, head) {
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
    ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
  }
  function arrow(ctx, x0, y0, x1, y1, head = 9) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    arrowHead(ctx, x1, y1, Math.atan2(y1 - y0, x1 - x0), head);
  }
  function check(ctx, x, y, s, p, color, lw = 3) {
    if (p <= 0) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokePartial(ctx, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.42]], p);
    ctx.restore();
  }
  /** Format glyphs: GeoTIFF = raster cells, PNG = hillshade (relief + sun), KMZ = globe. */
  function glyph(ctx, kind, x, y, s, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.3;
    if (kind === 'tif') {
      const q = s / 3;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) ctx.fillRect(x - s / 2 + a * q + 0.7, y - s / 2 + b * q + 0.7, q - 1.4, q - 1.4);
    } else if (kind === 'png') {
      ctx.beginPath(); ctx.moveTo(x - s / 2, y + s / 2); ctx.lineTo(x - s / 8, y - s / 5); ctx.lineTo(x + s / 9, y + s / 8);
      ctx.lineTo(x + s / 4, y - s / 20); ctx.lineTo(x + s / 2, y + s / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s / 3.2, y - s / 2.8, s / 7, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, y, s / 2, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, s / 4.5, s / 2, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - s / 2, y); ctx.lineTo(x + s / 2, y); ctx.stroke();
    }
    ctx.restore();
  }
  function rrPath(x, y, w, h, r) { // rounded-rect perimeter as a polyline, starting top-left, clockwise
    const pts = [], n = 6;
    const arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * (i / n); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    arc(x + r, y + r, Math.PI); arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2);
    pts.push(pts[0].slice());
    return pts;
  }
  const VP_PATH = rrPath(VP.x, VP.y, VP.w, VP.h, 14);

  /* ------------------------------------------------------------------ viewport frame */
  function drawFrame(ctx, lt) {
    const p = L.inout(lt, 0, DUR, 0.9, 0.5);
    if (p <= 0) return;
    const col = L.mix(EM, CR, sp(lt, 6.0, 0.8));
    ctx.save();
    ctx.translate(offX(lt), 0);
    // inner surface hides the background graticule
    ctx.globalAlpha = clamp(p);
    L.roundRect(ctx, VP.x, VP.y, VP.w, VP.h, 14); ctx.fillStyle = 'rgba(8,13,24,0.55)'; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,229,255,0.16)'; ctx.lineWidth = 1.2;
    strokePartial(ctx, VP_PATH, clamp(p));
    // corner brackets
    const bl = 30 * clamp(p);
    ctx.strokeStyle = L.css(col, 0.9); ctx.lineWidth = 2.2; ctx.lineCap = 'square';
    const cs = [[VP.x, VP.y, 1, 1], [VP.x + VP.w, VP.y, -1, 1], [VP.x + VP.w, VP.y + VP.h, -1, -1], [VP.x, VP.y + VP.h, 1, -1]];
    ctx.beginPath();
    for (const [x, y, sx, sy] of cs) { ctx.moveTo(x + sx * bl, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * bl); }
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ section A: radar grid → geographic lattice */
  function drawGrid(ctx, lt, P) {
    if (lt > 7.4) return;
    const zf = ppdAt(lt) / P_LAT;
    const fade = clamp((CH * zf - 2) / 14);              // tiles fade as the swoop shrinks them into the TL
    if (fade <= 0) return;
    const proj = sp(lt, 4.0, 0.6);                        // LOS → vertical (V_vert = V_LOS / cos θ)
    const t = T0 + lt;
    ctx.save();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const ring = Math.max(Math.abs(i - IC), Math.abs(j - JC));
      const rc = sp(lt, 0.05 + 0.125 * ring, 0.45);
      if (rc <= 0.001) continue;
      const a = ix(i, j), b = ix(i + 1, j), c = ix(i + 1, j + 1), d = ix(i, j + 1);
      const cx = (P[a] + P[b] + P[c] + P[d]) / 4, cy = (P[a + 1] + P[b + 1] + P[c + 1] + P[d + 1]) / 4;
      const hs = (Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1]) + Math.hypot(P[c] - P[d], P[c + 1] - P[d + 1])) / 4;
      const k = clamp(rc) * Math.max(0, 1 - 3.0 / Math.max(hs, 3.5)); // gutter between pixels
      const cell = CELLS[j * NX + i];
      // signed area vs the cell's geographic area: ≈ 1 flat-on, → 0 edge-on mid-flip
      const area = ((P[c] - P[a]) * (P[d + 1] - P[b + 1]) - (P[c + 1] - P[a + 1]) * (P[d] - P[b])) / 2;
      const facing = clamp(Math.abs(area) / (CW * CH * zf * zf));
      let rgb = proj > 0 ? L.mix(cell.los, cell.ver, clamp(proj)) : cell.los;
      // shimmer + write sweep (rows on 16ths at bar 24) + radar line read-out (rows on 16ths, 1.0–2.0)
      const sh = 0.06 * Math.sin(TAU * (t / 2) + cell.ph);
      const wr = lt > 4 ? Math.exp(-Math.pow((lt - (4.0 + 0.125 * j)) / 0.09, 2)) : 0;
      const rd = lt > 1 && lt < 2.2 ? Math.exp(-Math.pow((lt - (1.0 + 0.125 * (NY - 1 - j))) / 0.09, 2)) * 0.6 : 0;
      const br = sh + 0.4 * wr + 0.3 * rd;
      rgb = br >= 0 ? L.mix(rgb, '#E6F1FF', br * 0.6) : L.mix(rgb, '#0B111E', -br);
      if (facing < 0.98) rgb = L.mix(rgb, '#0B111E', 0.65 * (1 - Math.sqrt(facing)));
      ctx.globalAlpha = clamp(rc) * fade;
      ctx.fillStyle = L.css(rgb, 1);
      ctx.beginPath();
      ctx.moveTo(cx + (P[a] - cx) * k, cy + (P[a + 1] - cy) * k);
      ctx.lineTo(cx + (P[b] - cx) * k, cy + (P[b + 1] - cy) * k);
      ctx.lineTo(cx + (P[c] - cx) * k, cy + (P[c + 1] - cy) * k);
      ctx.lineTo(cx + (P[d] - cx) * k, cy + (P[d + 1] - cy) * k);
      ctx.closePath(); ctx.fill();
    }
    // outer hairline (blue in radar geometry → emerald on the lattice)
    const wk = clamp(skewK(lt));
    const outline = [];
    for (let i = 0; i <= NX; i++) outline.push([P[ix(i, 0)], P[ix(i, 0) + 1]]);
    for (let j = 1; j <= NY; j++) outline.push([P[ix(NX, j)], P[ix(NX, j) + 1]]);
    for (let i = NX - 1; i >= 0; i--) outline.push([P[ix(i, NY)], P[ix(i, NY) + 1]]);
    for (let j = NY - 1; j >= 0; j--) outline.push([P[ix(0, j)], P[ix(0, j) + 1]]);
    outline.push(outline[0]);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = L.css(L.mix(C.blue, EM, wk), 0.85); ctx.lineWidth = 1.6;
    strokePartial(ctx, outline, clamp(sp(lt, 0.1, 1.0)));
    // TL cell lock highlight + ripples (beat-locked) after landing
    const lock = sp(lt, 3.0, 0.4) * (1 - sp(lt, 6.0, 0.4));
    if (lock > 0.01) {
      const a = ix(IC, JC), c = ix(IC + 1, JC + 1);
      const x0 = P[a], y0 = P[a + 1], x1 = P[c], y1 = P[c + 1];
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.abs(x1 - x0) / 2, hh = Math.abs(y1 - y0) / 2;
      const f = ((lt - 3.0) / 0.5) % 1, big = lt < 3.5 ? 1 : 0.45;
      ctx.globalAlpha = lock * (1 - f) * big;
      ctx.strokeStyle = EM; ctx.lineWidth = 2;
      const g = 1 + f * (lt < 3.5 ? 1.6 : 0.9);
      ctx.strokeRect(cx - hw * g, cy - hh * g, hw * 2 * g, hh * 2 * g);
    }
    ctx.restore();
  }
  /** Gently curved leader (cubic) from a radar pixel to its lat/lon cell, bowed outward by `bow` px (side ±1). */
  function leaderPts(p0, p3, side, bow) {
    const dx = p3[0] - p0[0], dy = p3[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (nx * side < 0) { nx = -nx; ny = -ny; }
    const c1 = [p0[0] + dx / 3 + nx * bow, p0[1] + dy / 3 + ny * bow], c2 = [p0[0] + (2 * dx) / 3 + nx * bow, p0[1] + (2 * dy) / 3 + ny * bow];
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, s = 1 - t;
      pts.push([s * s * s * p0[0] + 3 * s * s * t * c1[0] + 3 * s * t * t * c2[0] + t * t * t * p3[0],
        s * s * s * p0[1] + 3 * s * s * t * c1[1] + 3 * s * t * t * c2[1] + t * t * t * p3[1]]);
    }
    return pts;
  }
  function drawLookup(ctx, lt, P) {
    const e = L.inout(lt, 1.0, 2.9, 0.5, 0.45);
    if (e <= 0) return;
    ctx.save();
    // ghost of the destination lattice (fades as the sheet lands on it)
    const ox = offX(lt);
    const gx0 = GEO[ix(0, 0)] + ox, gy0 = GEO[ix(0, 0) + 1], gx1 = GEO[ix(NX, NY)] + ox, gy1 = GEO[ix(NX, NY) + 1];
    ctx.globalAlpha = clamp(e) * (1 - sp(lt, 2.4, 0.5));
    ctx.save();
    ctx.beginPath(); ctx.rect(gx0 - 4, gy0 - 4, (gx1 - gx0 + 8) * clamp(e * 1.15), gy1 - gy0 + 8); ctx.clip();
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -L.steps(T0 + lt, 0.5, 0.3) * 4;
    ctx.strokeStyle = L.rgba(EM, 0.75); ctx.lineWidth = 1.4;
    ctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    ctx.strokeStyle = L.rgba(EM, 0.22); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < NX; i++) { ctx.moveTo(GEO[ix(i, 0)] + ox, gy0); ctx.lineTo(GEO[ix(i, 0)] + ox, gy1); }
    for (let j = 1; j < NY; j++) { ctx.moveTo(gx0, GEO[ix(0, j) + 1]); ctx.lineTo(gx1, GEO[ix(0, j) + 1]); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // two corner pixels → their lat/lon cells (the ascending sheet is mirrored: bottom-left ↔ top-left); the
    // leaders run along the outer columns, far from the TL cell, and never cross each other
    const pl = clamp(L.inout(lt, 1.0, 2.3, 0.5, 0.3));
    if (pl > 0) {
      const ink = L.ink(EM);
      [[0, 0, -1], [NX - 1, NY - 1, 1]].forEach(([ci, cj, side], q) => {
        const pv = sp(lt, 1.125 + 0.25 * q, 0.7);
        const p = Math.min(pv, pl);
        if (p <= 0.002) return;
        const rc = [ix(ci, cj), ix(ci + 1, cj), ix(ci + 1, cj + 1), ix(ci, cj + 1)];
        const r0 = [rc.reduce((s, n) => s + P[n], 0) / 4, rc.reduce((s, n) => s + P[n + 1], 0) / 4];
        const g0 = [rc.reduce((s, n) => s + GEO[n], 0) / 4 + ox, rc.reduce((s, n) => s + GEO[n + 1], 0) / 4];
        // highlight the radar pixel and (on arrival) its lat/lon cell
        ctx.globalAlpha = clamp(p);
        ctx.strokeStyle = ink; ctx.lineWidth = 2;
        ctx.beginPath(); rc.forEach((n, k) => (k ? ctx.lineTo(P[n], P[n + 1]) : ctx.moveTo(P[n], P[n + 1]))); ctx.closePath(); ctx.stroke();
        const arr = clamp((p - 0.75) / 0.25);
        if (arr > 0) { ctx.globalAlpha = arr; ctx.strokeRect(GEO[rc[0]] + ox + 2, GEO[rc[0] + 1] + 2, CW - 4, CH - 4); }
        // the leader draws on; arrow head rides its tip
        const pts = leaderPts(r0, g0, side, 26);
        ctx.globalAlpha = clamp(p); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(11,17,30,0.85)'; ctx.lineWidth = 6; strokePartial(ctx, pts, p);   // dark under-stroke
        ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 2.2; strokePartial(ctx, pts, p);
        ctx.beginPath(); ctx.arc(r0[0], r0[1], 4, 0, TAU); ctx.fill();
        const k = Math.max(1, Math.min(40, Math.round(40 * clamp(p))));
        const a = Math.atan2(pts[k][1] - pts[k - 1][1], pts[k][0] - pts[k - 1][0]);
        arrowHead(ctx, pts[k][0], pts[k][1], a, 13);
      });
    }
    ctx.restore();
  }
  function drawAxes(ctx, lt, P) {
    const pr = L.inout(lt, 0.25, 2.3, 0.5, 0.35), pg = L.inout(lt, 3.0, 6.2, 0.5, 0.3);
    if (pr <= 0 && pg <= 0) return;
    const cx = (P[ix(0, 0)] + P[ix(NX, NY)]) / 2, cy = (P[ix(0, 0) + 1] + P[ix(NX, NY) + 1]) / 2;
    const out = (x0, y0, x1, y1, d) => { // offset an edge away from the grid centre
      let nx = -(y1 - y0), ny = x1 - x0; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (((x0 + x1) / 2 - cx) * nx + ((y0 + y1) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
      return [x0 + nx * d, y0 + ny * d, x1 + nx * d, y1 + ny * d, nx, ny];
    };
    ctx.save();
    // edge j = NY (south row: top in radar geometry, bottom on the lattice): range → / E →
    const e1 = out(P[ix(0, NY)], P[ix(0, NY) + 1], P[ix(NX, NY)], P[ix(NX, NY) + 1], 22);
    // edge i = 0 from j = NY to j = 0 (azimuth ↓ in radar geometry / N ↑ on the lattice)
    const e2 = out(P[ix(0, NY)], P[ix(0, NY) + 1], P[ix(0, 0)], P[ix(0, 0) + 1], 22);
    const vis = Math.max(pr, pg);
    ctx.globalAlpha = clamp(vis);
    const col = pr > pg ? C.blue : EM;
    ctx.strokeStyle = L.ink(col); ctx.fillStyle = L.ink(col); ctx.lineWidth = 1.6;
    const shorten = (x0, y0, x1, y1, k) => [lerp(x0, x1, 0.06), lerp(y0, y1, 0.06), lerp(x0, x1, 0.06 + 0.88 * k), lerp(y0, y1, 0.06 + 0.88 * k)];
    const s1 = shorten(e1[0], e1[1], e1[2], e1[3], clamp(vis)), s2 = shorten(e2[0], e2[1], e2[2], e2[3], clamp(vis));
    arrow(ctx, s1[0], s1[1], s1[2], s1[3], 9);
    arrow(ctx, s2[0], s2[1], s2[2], s2[3], 9);
    ctx.restore();
    // axis labels (mono 18, on the dark viewport)
    const lab = (s, x, y, p, id, o = {}) => L.text(ctx, s, x, y, { kind: 'mono', size: 18, weight: 600, color: L.ink(col), p, baseline: 'middle', id, ...o });
    if (pr > 0) {
      lab('range', s1[2] + e1[4] * 18, s1[3] + e1[5] * 18, pr, 'a5-ax-rg', { align: 'center' });
      lab('azimuth', s2[2] + e2[4] * 14, s2[3] + e2[5] * 14, pr, 'a5-ax-az', { align: 'right' });
    }
    if (pg > 0) {
      lab('lon', s1[2] + e1[4] * 18, s1[3] + e1[5] * 18, pg, 'a5-ax-lon', { align: 'center' });
      lab('lat', s2[2] + e2[4] * 14, s2[3] + e2[5] * 14 - 10, pg, 'a5-ax-lat', { align: 'center' });
    }
  }
  function drawCompass(ctx, lt) {
    const p = L.inout(lt, 0.25, 6.3, 0.5, 0.4);
    if (p <= 0) return;
    const x = VP.x + VP.w - 54 + offX(lt), y = VP.y + 62, r = 26;
    // ascending, mirrored: north points (almost) down in radar geometry; up after geocoding (follows the flip)
    const ang = lerp(Math.PI - PHI, 0, sp(lt, 2.0, 0.9));
    ctx.save();
    ctx.globalAlpha = clamp(p);
    ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU * clamp(p)); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(clamp(p), clamp(p));
    ctx.fillStyle = L.ink(EM); ctx.beginPath(); ctx.moveTo(0, -r + 3); ctx.lineTo(7, 4); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(159,176,200,0.6)'; ctx.beginPath(); ctx.moveTo(0, r - 6); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    const nx = x + Math.sin(ang) * (r + 14), ny = y - Math.cos(ang) * (r + 14);
    L.text(ctx, 'N', nx, ny, { kind: 'mono', size: 16, weight: 600, color: L.ink(EM), align: 'center', baseline: 'middle', p, role: 'deco' });
  }
  function drawLabelsA(ctx, lt) {
    const x = VP.x + 20 + offX(lt), y = VP.y + 44;
    const o = { kind: 'sans', size: 24, weight: 600, color: C.text };
    const p1 = L.inout(lt, 0.125, 2.75, 0.45, 0.4);
    if (p1 > 0) tag(ctx, 'radar geometry · range × azimuth', x, y, { ...o, p: p1, scanColor: C.blue, id: 'a5-tag-radar' });
    const p2 = L.inout(lt, 3.0, 6.4, 0.45, 0.35);
    if (p2 > 0) tag(ctx, [{ s: 'geographic grid · ', color: C.text }, { s: '1/1200° ≈ 90 m', color: INK_EM }], x, y, { ...o, p: p2, scanColor: EM, id: 'a5-tag-geo' });
    const yb = VP.y + VP.h - 26;
    const p3 = L.inout(lt, 1.0, 3.8, 0.45, 0.35);
    if (p3 > 0) tag(ctx, [{ s: 'lookup table', color: INK_EM }, { s: ' · lat/lon of every radar pixel', color: C.text }], x, yb, { kind: 'mono', size: 18, weight: 400, p: p3, scanColor: EM, id: 'a5-foot' });
    const p4 = L.inout(lt, 4.0, 6.4, 0.45, 0.35);
    if (p4 > 0) formula(ctx, x, yb, p4);
  }
  function formula(ctx, x, y, p) {
    const big = { kind: 'mono', size: 26, weight: 600, color: C.text };
    const sub = { kind: 'mono', size: 18, weight: 600, color: INK_EM };
    const dim = { kind: 'mono', size: 18, weight: 400, color: DIM };
    const parts = [['V', big, 0], ['vert', sub, 7], [' = V', big, 0], ['LOS', sub, 7], [' / cos θ', big, 0], ['   θ ≈ 38°', dim, 0]];
    let w = 0; const ws = parts.map(([s, o]) => { const m = L.measure(ctx, s, o).w + (o === sub ? 2 : 0); w += m; return m; });
    const cap = 19;
    plate(ctx, x - 12, y - cap - 10, w + 24, cap + 24, p);
    let cx = x;
    parts.forEach(([s, o, dy], i) => { L.text(ctx, s, cx, y + dy, { ...o, p: clamp(p * 1.15 - 0.1), bg: C.card, scanColor: EM, id: 'a5-fx' + i }); cx += ws[i]; });
  }

  /* ------------------------------------------------------------------ section A: deliverables panel (shell morphs into the result card) */
  const PY = 196, PH = 612;
  const CARD = { x: PX, y: 236, w: PW, h: 490 };
  const ROWS = ['LOS velocity', 'vertical', 'horizontal (E–W)', 'hillshade · KMZ'];
  const TX0 = PX + PW - 28 - (4 * TW + 3 * 6 + 12);
  const tileX = (c) => TX0 + c * (TW + 6) + (c >= 2 ? 12 : 0);
  const ROW_Y0 = PY + 252, ROW_DY = 66;
  const tileAt = (i) => 3.0 + 0.125 * i;                         // 16 tiles on 16ths, one family per beat
  const tickAt = (i) => Math.max(4.0 + 0.0625 * i, tileAt(i) + 0.375);
  /** The morphing card shell: deliverables (emerald, tall) → result (crimson). `bottom` = its visible lower edge. */
  function shellGeom(lt) {
    const p = L.inout(lt, 2.75, DUR, 0.6, 0.45), km = sp(lt, 6.0, 0.8);
    const y = lerp(PY, CARD.y, km), h = lerp(PH, CARD.h, km);
    return { p, km, y, h, bottom: p >= 1 ? y + h + 2 : y - 2 + (h + 4) * L.ease.outCubic(clamp(p * 1.15)) };
  }
  function drawShell(ctx, lt) {
    const g = shellGeom(lt);
    if (g.p <= 0) return;
    L.card(ctx, PX, g.y, PW, g.h, { p: g.p, accent: g.km > 0 ? L.mix(EM, CR, clamp(g.km)) : EM });
  }
  /** Clip card content to the shell's visible area, so content never hangs outside a collapsing/morphing card. */
  function clipTo(ctx, x, w, top, bottom) { ctx.beginPath(); ctx.rect(x - 24, top, w + 48, Math.max(0, bottom - top)); ctx.clip(); }
  function drawPanel(ctx, lt) {
    if (lt < 2.8 || lt > 6.45) return;
    ctx.save();
    clipTo(ctx, PX, PW, PY - 40, shellGeom(lt).bottom);
    drawPanelContent(ctx, lt);
    ctx.restore();
  }
  function drawPanelContent(ctx, lt) {
    const x0 = PX + 28;
    const tx = (a, b) => L.inout(lt, a, b, 0.45, 0.35);
    // headline
    const ph = tx(2.875, 6.4);
    if (ph > 0) {
      const b = L.text(ctx, '16', x0, PY + 112, { kind: 'display', size: 96, weight: 700, color: INK_EM, p: ph, bg: C.card, scanColor: EM, id: 'a5-16' });
      L.text(ctx, 'GIS-ready products', x0 + b.w + 18, PY + 72, { kind: 'display', size: 34, weight: 700, color: C.text, p: ph, bg: C.card, scanColor: EM, id: 'a5-gis' });
      L.text(ctx, 'per frame · 12 frames delivered', x0 + b.w + 18, PY + 108, { kind: 'sans', size: 22, weight: 500, color: DIM, p: tx(3.0, 6.38), bg: C.card, scanColor: EM, id: 'a5-per' });
    }
    // format chips (each with the glyph that badges its tiles)
    const pch = tx(3.0, 6.36);
    if (pch > 0) {
      let cx = x0;
      [['GeoTIFF', 'tif'], ['KMZ', 'kmz'], ['PNG', 'png']].forEach(([s, g], i) => {
        const pk = clamp(pch * 1.3 - i * 0.15);
        const o = { kind: 'mono', size: 18, weight: 600, color: INK_EM, bg: C.card, p: pk, scanColor: EM, id: 'a5-chip' + i };
        const m = L.measure(ctx, s, o), cw = m.w + 24 + 20;
        ctx.save(); ctx.globalAlpha = clamp(pk);
        L.roundRect(ctx, cx, PY + 140, cw, 32, 16); ctx.strokeStyle = L.rgba(EM, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
        glyph(ctx, g, cx + 19, PY + 156, 12, INK_EM);
        ctx.restore();
        L.text(ctx, s, cx + 32, PY + 162, o);
        cx += cw + 10;
      });
    }
    // separator + column headers
    const pcol = tx(3.0, 6.36);
    if (pcol > 0) {
      ctx.save(); ctx.fillStyle = 'rgba(0,229,255,0.14)'; ctx.fillRect(x0, PY + 196, (PW - 56) * clamp(pcol), 1); ctx.restore();
      const o = { kind: 'mono', size: 18, weight: 600, color: C.text, bg: C.card, p: pcol, align: 'center', scanColor: EM };
      L.text(ctx, 'demErr', (tileX(0) + tileX(1) + TW) / 2, PY + 232, { ...o, id: 'a5-c0' });
      L.text(ctx, 'demErr_ramp', (tileX(2) + tileX(3) + TW) / 2, PY + 232, { ...o, id: 'a5-c1' });
    }
    // rows of tiles (one family per beat, its tiles on 16ths)
    for (let r = 0; r < 4; r++) {
      const ry = ROW_Y0 + r * ROW_DY;
      const pl = tx(3.0 + r * 0.5, 6.38 - r * 0.02);
      if (pl > 0) L.text(ctx, ROWS[r], x0, ry + TH / 2 + 8, { kind: 'sans', size: 22, weight: 500, color: C.text, bg: C.card, p: pl, scanColor: EM, id: 'a5-row' + r });
      for (let c = 0; c < 4; c++) {
        const i = r * 4 + c;
        const pt = L.inout(lt, tileAt(i), 6.42 - i * 0.0125, 0.4, 0.3);
        if (pt <= 0) continue;
        drawTile(ctx, tileX(c), ry, pt, THUMBS[i], lt, i);
      }
    }
    // verification (bar 24): 27 segments fill on 16ths, tiles tick, check mark draws on at 5.5
    const pv = tx(4.0, 6.4);
    if (pv > 0) {
      const vy = PY + PH - 78;
      const steps = clamp(Math.floor((lt - 4.0) / 0.125 + 1) / 8);
      const lit = Math.ceil(27 * steps);
      const segW = (PW - 56 - 26 * 4) / 27;
      ctx.save();
      for (let s = 0; s < 27; s++) {
        const ks = clamp(pv * 1.4 - s * 0.012);
        if (ks <= 0) continue;
        ctx.fillStyle = s < lit && lt >= 4.0 ? L.rgba(EM, 0.95 * ks) : L.rgba(C.cyan, 0.12 * ks);
        ctx.fillRect(x0 + s * (segW + 4), vy, segW, 8);
      }
      ctx.restore();
      const pk = sp(lt, 5.5, 0.45) * clamp(pv);
      ctx.save(); ctx.globalAlpha = clamp(pv);
      ctx.beginPath(); ctx.arc(x0 + 15, vy + 44, 15, 0, TAU); ctx.fillStyle = L.rgba(EM, 0.18 + 0.5 * pk); ctx.fill();
      ctx.restore();
      check(ctx, x0 + 15, vy + 44, 14, pk, C.text, 3);
      L.text(ctx, '27-check verification', x0 + 44, vy + 52, { kind: 'sans', size: 24, weight: 600, color: C.text, bg: C.card, p: pv, scanColor: EM, id: 'a5-ver' });
      const m = L.measure(ctx, '27-check verification', { kind: 'sans', size: 24, weight: 600 });
      L.text(ctx, '· before transfer', x0 + 44 + m.w + 12, vy + 52, { kind: 'sans', size: 22, weight: 500, color: DIM, bg: C.card, p: tx(4.125, 6.4), scanColor: EM, id: 'a5-ver2' });
    }
  }
  function drawTile(ctx, x, y, p, th, lt, i) {
    const k = L.ease.outCubic(clamp(p * 1.1));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 2, y - 2, TW + 4, (TH + 4) * k); ctx.clip();
    ctx.fillStyle = '#0B111E'; ctx.fillRect(x, y, TW, TH);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(th.c, x, y, TW, TH);
    // beat-locked sheen sweeping the tile grid (half-bar period)
    const ph = ((T0 + lt) / 2 + i * 0.045) % 1;
    const sx = x - 30 + ph * (TW + 60);
    const g = ctx.createLinearGradient(sx - 18, 0, sx + 18, 0);
    g.addColorStop(0, 'rgba(230,241,255,0)'); g.addColorStop(0.5, 'rgba(230,241,255,0.10)'); g.addColorStop(1, 'rgba(230,241,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, TW, TH);
    // format badge (glyph on a dark chip, bottom-left)
    ctx.fillStyle = 'rgba(11,17,30,0.88)'; L.roundRect(ctx, x + 3, y + TH - 19, 16, 16, 3); ctx.fill();
    glyph(ctx, th.fmt, x + 11, y + TH - 11, 10, INK_EM);
    ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, TW - 1, TH - 1);
    ctx.restore();
    if (p < 1 && p > 0) { // scan bar at the construction front
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.rgba(EM, 0.8 * Math.sin(Math.PI * clamp(p)));
      ctx.fillRect(x - 3, y + TH * k - 1, TW + 6, 2); ctx.restore();
    }
    // verification tick
    const tk = sp(lt, tickAt(i), 0.35) * clamp(p);
    if (tk > 0.01) {
      ctx.save(); ctx.globalAlpha = clamp(tk);
      ctx.beginPath(); ctx.arc(x + TW - 2, y + 2, 8, 0, TAU); ctx.fillStyle = EM; ctx.fill();
      ctx.restore();
      check(ctx, x + TW - 2, y + 2, 8, tk, '#0B111E', 2);
    }
  }

  /* ------------------------------------------------------------------ section B: map, bowl, legend, result card */
  function viewAt(lt) { return G.view({ lon: CAB.lon, lat: CAB.lat, ppd: ppdAt(lt), cx: A[0], cy: A[1] }); }
  function contourPts(S, rho, n = 120) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const th = Math.PI + (TAU * i) / n, r = contourR(th) * rho;
      pts.push([A[0] + r * Math.cos(th) * 1.08 * S, A[1] + r * Math.sin(th) * 0.9 * S]);
    }
    return pts;
  }
  const PFZ = G.faults.pfz.slice(0, 5);                   // the stretch through the frame (14.95–15.82°N)
  function pfzLonAt(lat) {
    for (let i = 1; i < PFZ.length; i++) {
      const [a, b] = [PFZ[i - 1], PFZ[i]];
      if ((lat - a[1]) * (lat - b[1]) <= 0) return lerp(a[0], b[0], (lat - a[1]) / (b[1] - a[1]));
    }
    return PFZ[PFZ.length - 1][0];
  }
  const pfzK = (lt) => sp(lt, 6.4, 0.8) * (1 - sp(lt, 8.0, 0.4));
  const LEVELS = [[0.45, 8.5], [0.72, 8.625], [1.35, 8.75], [1.75, 6.75]];   // bowl contours (TL = 1.0)
  function drawMap(ctx, lt, camZ) {
    const env = L.inout(lt, 6.0, DUR, 1.0, 0.5);
    if (env <= 0) return;
    const ppd = ppdAt(lt), v = viewAt(lt);
    const R = 1350 * env;
    ctx.save();
    L.roundRect(ctx, VP.x, VP.y, VP.w, VP.h, 14); ctx.clip();
    ctx.beginPath(); ctx.arc(A[0], A[1], Math.max(0.5, R), 0, TAU); ctx.clip();
    G.drawLand(ctx, v, { which: 'luzon', fill: C.card });
    // 1/1200° velocity map (+ masked hillshade): crisp pixels whenever they are magnified
    ctx.imageSmoothingEnabled = (ppd / FR) * camZ < 1.6;
    ctx.drawImage(RFI.c, v.x(FI.lon0), v.y(FI.lat1), (FI_W / FR) * G.K * ppd, (FI_H / FR) * ppd);
    ctx.imageSmoothingEnabled = true;
    // multi-scale lat/lon graticule (1/1200°, 1/120°, 1/12°): the 90 m lattice's coarser siblings
    ctx.lineWidth = 1;
    for (const step of [1 / 1200, 1 / 120, 1 / 12]) {
      const px = step * ppd, a = clamp((px - 8) / 40) * (step < 0.005 ? 0.22 : step < 0.05 ? 0.1 : 0.16);
      if (a <= 0.004) continue;
      const [lonA, latA] = v.inv(VP.x, VP.y + VP.h), [lonB, latB] = v.inv(VP.x + VP.w, VP.y);
      ctx.strokeStyle = `rgba(0,229,255,${a})`;
      ctx.beginPath();
      // 1/1200°: origin on the TL cell's corner so these lines coincide with the lattice / raster pixel edges
      const fine = step < 0.005;
      const lo0 = fine ? CAB.lon - 0.5 / 1200 : 0, la0 = fine ? CAB.lat + 0.5 / 1200 : 0;
      for (let k = Math.ceil((lonA - lo0) / step); lo0 + k * step <= lonB; k++) { const x = Math.round(v.x(lo0 + k * step)) + 0.5; ctx.moveTo(x, VP.y); ctx.lineTo(x, VP.y + VP.h); }
      for (let k = Math.ceil((latA - la0) / step); la0 + k * step <= latB; k++) { const y = Math.round(v.y(la0 + k * step)) + 0.5; ctx.moveTo(VP.x, y); ctx.lineTo(VP.x + VP.w, y); }
      ctx.stroke();
    }
    // coastline
    G.drawLand(ctx, v, { which: 'luzon', stroke: 'rgba(0,229,255,0.45)', lw: 1.3 });
    // Philippine Fault Zone (schematic) — context only, ~30 km east; it leaves before the bowl close-up
    const pz = pfzK(lt);
    if (pz > 0.002) {
      const pts = PFZ.map(([lo, la]) => v.pt(lo, la));
      ctx.save();
      ctx.setLineDash([14, 7]); ctx.lineDashOffset = -L.steps(T0 + lt, 0.5, 0.3) * 6;
      ctx.strokeStyle = 'rgba(230,241,255,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.globalAlpha = clamp(1.4 - 1.4 * sp(lt, 8.0, 0.4));
      strokePartial(ctx, pts, clamp(sp(lt, 6.4, 0.8)));
      ctx.restore();
    }
    // contours of the bowl (TL = half-depth contour); the outer dashed one already marks the bowl in the wide view
    const S = (BOWL_KM * ppd) / KM_DEG;
    LEVELS.forEach(([rho, at]) => {
      const pc = sp(lt, at, 0.6) * (1 - sp(lt, 9.5, 0.4));
      if (pc <= 0.002 || S * rho < 8) return;
      ctx.save();
      ctx.strokeStyle = rho < 1 ? L.rgba(C.text, 0.55) : L.rgba(CR, rho > 1.5 ? 0.9 : 0.75);
      ctx.lineWidth = rho < 1 ? 1.4 : 1.8;
      if (rho > 1) { ctx.setLineDash([7, 5]); ctx.lineDashOffset = -L.steps(T0 + lt, 0.5, 0.3) * 4; }
      strokePartial(ctx, contourPts(S, rho), clamp(pc));
      ctx.restore();
    });
    ctx.restore();
    // reveal / collapse ring
    if (env < 0.995 && R > 4) {
      ctx.save();
      L.roundRect(ctx, VP.x, VP.y, VP.w, VP.h, 14); ctx.clip();
      ctx.strokeStyle = L.css(L.mix(EM, CR, sp(lt, 6.4, 0.9)), 0.55 * (1 - env) + 0.2); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(A[0], A[1], R, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
  /** On-map label for the schematic fault, fixed in the wide frame, with a short leader to the trace. */
  function drawPFZLabel(ctx, lt) {
    const p = L.inout(lt, 6.5, 8.4, 0.45, 0.4);
    if (p <= 0) return;
    const xr = 888, y = 300;
    const b = tag2(ctx, ['Philippine Fault Zone', '(schematic)'], xr, y, { kind: 'mono', size: 18, weight: 500, color: C.text, p, scanColor: C.text, id: 'a5-pfz' });
    const v = viewAt(lt), ly = b.y + b.h / 2;
    const tx = v.x(pfzLonAt(v.inv(0, ly)[1]));
    const x0 = b.x + b.w + 2, x1 = Math.min(tx - 4, VP.x + VP.w - 4);
    if (x1 - x0 > 2) {
      ctx.save(); ctx.globalAlpha = clamp(p) * clamp(pfzK(lt) * 1.5); ctx.strokeStyle = L.rgba(C.text, 0.7); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(lerp(x0, x1, clamp(p)), ly); ctx.stroke(); ctx.restore();
    }
  }
  /** Left edge (world x) of the TL outline at height A.y + dy, following the pixel → contour morph. */
  function tlLeftAt(lt, dy) {
    const w = tlWorld(lt), k = w.form === 'contour' ? 1 : w.to ? w.k : 0;
    const hp = 0.62 * w.size, xPix = A[0] - hp;
    if (k <= 0) return xPix;
    const pts = contourPts(w.size, 1, 96);
    let xc = A[0] - 1.08 * w.size;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (a[0] > A[0] || b[0] > A[0]) continue;
      const ya = a[1] - A[1], yb = b[1] - A[1];
      if ((ya - dy) * (yb - dy) <= 0 && ya !== yb) { xc = lerp(a[0], b[0], (dy - ya) / (yb - ya)); break; }
    }
    return lerp(xPix, xc, k);
  }
  function drawCityTag(ctx, lt) {
    const p = L.inout(lt, 6.5, 9.8, 0.5, 0.4);
    if (p <= 0) return;
    const w = tlWorld(lt);
    const dy = -0.55 * w.size * (w.form === 'contour' ? 0.9 : lerp(0.62, 0.9, w.to ? w.k : 0));
    const edge = Math.min(tlLeftAt(lt, dy), A[0] - 1.25 * (BOWL_KM * ppdAt(lt)) / KM_DEG); // clear of the bowl core
    const x = edge - 40, y = A[1] + dy + 9;
    const b = tag(ctx, 'Cabanatuan City', x, y, { kind: 'sans', size: 24, weight: 600, color: C.text, align: 'right', p, scanColor: CR, id: 'a5-city' });
    // short leader from the tag to the TL outline
    const tip = tlLeftAt(lt, dy) - 6;
    const ly = b.y + b.h / 2, lx0 = b.x + b.w + 3, lx1 = Math.max(lx0 + 4, tip);
    ctx.save(); ctx.globalAlpha = clamp(p); ctx.strokeStyle = L.rgba(C.text, 0.75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lerp(lx0, lx1, clamp(p)), ly); ctx.stroke();
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(lerp(lx0, lx1, clamp(p)), ly, 2.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const LG = { x: VP.x + 18, y: VP.y + VP.h - 18 - 124, w: 380, h: 124 };
  function drawLegend(ctx, lt) {
    const p = L.inout(lt, 6.625, 9.85, 0.55, 0.4);
    if (p <= 0) return;
    L.card(ctx, LG.x, LG.y, LG.w, LG.h, { p, accent: CR });
    ctx.save();
    clipTo(ctx, LG.x, LG.w, LG.y - 30, p >= 1 ? LG.y + LG.h + 2 : LG.y - 2 + (LG.h + 4) * L.ease.outCubic(clamp(p * 1.15)));
    drawLegendContent(ctx, lt);
    ctx.restore();
  }
  function drawLegendContent(ctx, lt) {
    const tx = (a, b = 9.78) => clamp(L.inout(lt, a, b, 0.45, 0.35));
    const x0 = LG.x + 20, bw = 340;
    // colour bar
    const pb = tx(6.75);
    L.text(ctx, 'vertical velocity · cm/yr', x0, LG.y + 30, { kind: 'mono', size: 18, weight: 400, color: DIM, bg: C.card, p: pb, scanColor: CR, id: 'a5-lg0' });
    if (pb > 0) {
      const by = LG.y + 42;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, by, bw * clamp(pb * 1.2), 12); ctx.clip();
      for (let i = 0; i < bw; i += 2) { const c = L.velRGB(((i / bw) * 2 - 1) * 5, 5); ctx.fillStyle = L.css(c, 1); ctx.fillRect(x0 + i, by, 2.5, 12); }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = clamp(pb); ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.strokeRect(x0 + 0.5, by + 0.5, bw - 1, 11); ctx.restore();
      const pl = tx(6.875);
      L.text(ctx, '−5 subsidence', x0, LG.y + 78, { kind: 'mono', size: 18, weight: 600, color: INK_CR, bg: C.card, p: pl, scanColor: CR, id: 'a5-lg-sub' });
      L.text(ctx, '0', x0 + bw / 2, LG.y + 78, { kind: 'mono', size: 16, weight: 400, color: DIM, align: 'center', p: pl, role: 'deco' });
      L.text(ctx, 'uplift +5', x0 + bw, LG.y + 78, { kind: 'mono', size: 18, weight: 600, color: INK_CY, align: 'right', bg: C.card, p: pl, scanColor: CR, id: 'a5-lg-up' });
    }
    // scale bar (grows with the zoom)
    const ps = tx(7.0);
    if (ps > 0) {
      const sy = LG.y + 108, km5 = (5 * ppdAt(lt)) / KM_DEG, sw = Math.min(260, km5) * clamp(ps * 1.3);
      ctx.save(); ctx.fillStyle = C.text; ctx.globalAlpha = clamp(ps);
      ctx.fillRect(x0, sy - 4, sw, 3); ctx.fillRect(x0, sy - 10, 2, 9); ctx.fillRect(x0 + sw - 2, sy - 10, 2, 9);
      ctx.restore();
      L.text(ctx, '5 km', x0 + sw + 12, sy + 1, { kind: 'mono', size: 18, weight: 600, color: C.text, bg: C.card, p: ps, scanColor: CR, id: 'a5-lg2' });
    }
  }
  function drawCard(ctx, lt) {
    if (lt < 6.45) return;
    ctx.save();
    clipTo(ctx, CARD.x, CARD.w, CARD.y - 40, shellGeom(lt).bottom);
    drawCardContent(ctx, lt);
    ctx.restore();
  }
  function drawCardContent(ctx, lt) {
    const x0 = CARD.x + 30, y = CARD.y;
    // two beats of information: bar 25 = the claim (+ its caveat) and the two tracks; bar 26 = GNSS + cause
    const ln = (a, i) => L.inout(lt, a, 9.97 - i * 0.012, 0.45, 0.33);
    L.text(ctx, 'VERTICAL RATE', x0, y + 46, { kind: 'mono', size: 18, weight: 600, color: INK_CR, tracking: 0.08, bg: C.card, p: ln(6.5, 0), scanColor: CR, id: 'a5-r0' });
    L.text(ctx, '−4.4 to −4.7', x0 - 2, y + 122, { kind: 'display', size: 68, weight: 700, color: INK_CR, bg: C.card, p: ln(6.625, 1), scanColor: CR, id: 'a5-r1' });
    L.text(ctx, 'cm/yr vertical', x0, y + 172, { kind: 'sans', size: 26, weight: 600, color: C.text, bg: C.card, p: ln(6.75, 2), scanColor: CR, id: 'a5-r2' });
    L.text(ctx, '≈ 18–19 cm · 2007–2011', x0, y + 210, { kind: 'sans', size: 26, weight: 500, color: C.text, bg: C.card, p: ln(6.875, 3), scanColor: CR, id: 'a5-r3' });
    L.text(ctx, 'vertical assumes purely vertical motion', x0, y + 244, { kind: 'mono', size: 18, weight: 400, color: DIM, bg: C.card, p: ln(7.0, 4), scanColor: CR, id: 'a5-f0' });
    const sep = (yy, p) => { if (p <= 0) return; ctx.save(); ctx.fillStyle = 'rgba(0,229,255,0.16)'; ctx.fillRect(x0, yy, (CARD.w - 60) * clamp(p), 1); ctx.restore(); };
    sep(y + 270, ln(7.5, 5));
    const rows = [
      [7.5, C.cyan, [{ s: 'Path 448', color: INK_CY }, { s: ' · −4.7 ± 0.5 cm/yr', color: C.text }], 'trk'],
      [7.625, C.gold, [{ s: 'Path 449', color: INK_GO }, { s: ' · −4.4 ± 0.5 cm/yr', color: C.text }], 'trk'],
      [8.0, C.text, [{ s: 'CABN GNSS', color: C.text }, { s: ' · −4.7 ± 0.4 cm/yr', color: C.text }], 'tri'],
    ];
    rows.forEach(([at, col, segs, glyphK], i) => {
      const p = ln(at, 5 + i), yy = y + 312 + i * 40;
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(p); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
      if (glyphK === 'trk') { // ascending ground-track arrow
        const k = clamp(p), x1 = x0 + 6, y1 = yy + 2, x2 = x0 + 11, y2 = yy - 18;
        ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, k), lerp(y1, y2, k)); ctx.stroke(); ctx.setLineDash([]);
        arrowHead(ctx, lerp(x1, x2, k), lerp(y1, y2, k), Math.atan2(y2 - y1, x2 - x1), 8);
      } else { ctx.beginPath(); ctx.moveTo(x0 + 9, yy - 17); ctx.lineTo(x0 + 18, yy); ctx.lineTo(x0, yy); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      L.text(ctx, segs, x0 + 32, yy, { kind: 'mono', size: 21, weight: 600, bg: C.card, p, scanColor: CR, id: 'a5-p' + i });
    });
    sep(y + 422, ln(8.25, 8));
    L.text(ctx, 'likely groundwater-related (under study)', x0, y + 458, { kind: 'mono', size: 18, weight: 400, color: DIM, bg: C.card, p: ln(8.25, 8), scanColor: CR, id: 'a5-f1' });
    // beat-locked marker on the headline (quarter notes) keeps the card alive
    const pp = clamp(ln(6.625, 1));
    if (pp > 0.5) { ctx.save(); ctx.globalAlpha = pp * (0.35 + 0.65 * L.pulse(T0 + lt, 4)); ctx.fillStyle = CR; ctx.fillRect(CARD.x + CARD.w - 34, y + 34, 8, 8); ctx.restore(); }
  }

  /* ------------------------------------------------------------------ scene */
  L.scene({
    id: 'act5', t0: T0, t1: T0 + DUR,
    focus: FOCUS,
    init() { ensure(); },
    tl(env) {
      const lt = Math.min(env.lt, DUR), cam = camAt(lt), w = tlWorld(lt);
      const [x, y] = cam.toScreen(w.x, w.y);
      const pulse = L.pulse(T0 + Math.min(lt, DUR - 1e-6));
      const target = { ...w, x, y, size: w.size * cam.z, energy: 0.35 + 0.5 * pulse, alpha: 1, amp: 1 };
      if (env.handoff && lt < 2) return L.TL.blend(env.handoff, target, sp(lt, 0, 1.0));
      return target;
    },
    draw(ctx, env) {
      ensure();
      const lt = env.lt;
      drawFrame(ctx, lt);
      drawMap(ctx, lt, env.cam ? env.cam.z : 1);
      const P = lt < 7.4 ? nodesAt(lt, new Float64Array(NN * 2)) : null;
      if (P) { drawGrid(ctx, lt, P); if (lt < 2.9) drawLookup(ctx, lt, P); if (lt < 6.2) drawAxes(ctx, lt, P); }
      if (lt < 6.75) { drawCompass(ctx, lt); drawLabelsA(ctx, lt); }
      drawShell(ctx, lt);
      drawPanel(ctx, lt);
      if (lt > 6.4) { drawPFZLabel(ctx, lt); drawLegend(ctx, lt); drawCityTag(ctx, lt); drawCard(ctx, lt); }
    },
  });
})();

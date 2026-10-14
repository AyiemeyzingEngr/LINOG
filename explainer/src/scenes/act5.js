/* Act 5 · Geocoding → delivery → reading the products (42–52 s) — HUD on. Scene guide v2 (NatGeo pivot).
 *
 * Phases (HUD): 42–44.5 Phase 5 (geocoding is part of the MintPy phase) · 44.5–48 Phase 6 Delivery, Verification,
 * Transfer · 48–52 Phase 7 Reading the Products. VO-12 42.4 "Every pixel is placed on the map." · VO-13 45.0 "Each
 * frame is delivered as sixteen products." (★ products 45.3–47.9) · VO-14 48.3 "Around Cabanatuan, satellite data show
 * subsidence." (★ cabanatuan 48.3–52.0).
 *
 * Beat plan (lt = t − 42 s · bars at lt 0, 2, 4, 6, 8 · beat 0.5 s · 16th 0.125 s)
 *  A · GEOCODING (42–44.5)
 *  0.00  BAR 22. The act-4 pixel (Tarlac plains, cell NW corner 120.620°E 15.470°N) keeps its size and glides into its
 *        cell of the radar-geometry sheet (range × azimuth: mirrored north-down, skewed, rotated by the ascending
 *        heading, uneven range spacing). The sheet's pixels (radar amplitude) construct outward from it on 32nds.
 *  0.25  tag "Radar geometry → map grid"; compass (north points down in radar geometry).
 *  0.50  the destination map grid (emerald, dashed) wipes in.
 *  1.00  geocoding: one spring mirrors the sheet (card flip), 1.25 a second de-rotates, de-skews and evens the range
 *        spacing; the compass swings north-up. The TL rides its cell.
 *  1.75  dimension bracket on the TL's cell: "1/1200° ≈ 90 m" (holds to the swoop).
 *  B · DELIVERY (44.5–48)
 *  2.00  BAR 23. TL cell lock ripple. The map grid extends east and by two rows north and south (16ths) and dims to a
 *        backdrop; the three columns west of the TL clear for the card.
 *  2.50  Phase 6. The products card constructs (left column). The count runs 1 → 16 as the tiles build: 2.75
 *        "6 GeoTIFF · m/yr", 3.0 "4 KMZ · velocity, time series", 3.25 "6 hillshade PNG · cm/yr colour bar" (tiles on
 *        32nds, in demErr | demErr_ramp pairs); 3.5 "Pairs: demErr · demErr_ramp".
 *  4.00  BAR 24. "27-check verification · checksum manifests": the 27 segments fill on 16ths, each tile ticks; 5.0 ✓.
 *  5.00  47.0 beat. SWOOP: zoom out of the grid (its cells are 1/1200° pixels at Tarlac), fly east to Cabanatuan over
 *        the real regional mosaic, zoom in on the REAL P448 F0290 product. The map opens as an iris around the TL; the
 *        TL shrinks to a marker and rides the flight; lands on the 48.0 bar (springs settled ≈ 48.2).
 *  5.85  the products card unmasks (★ products ends 47.9).
 *  C · READING THE PRODUCTS (48–52)
 *  6.00  BAR 25. The TL morphs pixel → crimson contour hugging the bowl (seed/phase fitted to the real −3 cm/yr
 *        isoline: it stays just outside it all the way round). Headline "SUBSIDENCE SIGNAL · CABANATUAN"; the regional
 *        mosaic dims to context.
 *  6.25  value card right of the bowl (leader to the contour), lines on 16ths: 6.3125 "4.4–4.7" · 6.375 "cm/yr ·
 *        2007–2011" · 6.4375 "Relative to nearby ground · assumes vertical motion" · 6.5 caveat chip "Seen by the
 *        satellite · needs ground validation" · 6.5625 its legend "Vertical velocity (cm/yr)" −5 … +5 (down/up, the
 *        product's own colouring) · 6.625 "No data" · 6.6875 "LInOG product P448 F0290 · ramp removed".
 *  9.25  everything but the map and the TL collapses (reverse scans, cards retract); the HUD scrims fade with the HUD.
 * 10.00  map = L.geo.view(L.CABANATUAN_VIEW) (world) under the act's final camera (×1.0816 about 960, 540): land #0E1522
 *        + no-data hatch, the ascending mosaic at 0.42 outside P448 F0290's footprint, P448 F0290 (vmax 5, lift 0.3; 2×
 *        nearest copy drawn smoothed), dotted footprint hairline, vignette 0.42 — act 6 starts on exactly this picture.
 *        TL = pure contour on the bowl ≈ (674, 458), ≈ 62 px, rot 0, alpha 1.
 *
 * All layout lives in pure helpers (anchorAt, ppdAt, viewAt, warpNodes, tlWorld) shared by tl() and draw().
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, G = L.geo, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp, sp = L.sp;
  const ga = (ctx, a) => { ctx.globalAlpha = clamp(a); }; // springs overshoot: an alpha outside 0..1 would be ignored

  const T0 = 42, DUR = 10;
  const FOCUS = [960, 540];                    // camera push pivot = the anchor of the shared Cabanatuan view
  const EM = C.emerald, CR = C.crimson, GOLD = C.gold, DIM = C.textDim;
  const INK_EM = L.ink(EM, C.card), INK_CR = L.ink(CR, C.card), INK_GO = L.ink(GOLD, C.card);
  const CHIP_BG = '#2B2E33';                   // caveat chip: C.card + 10 % gold
  const RD = { vmax: 5, lift: 0.3 };           // real-data colouring (act 6 starts on this picture with the same)
  const LAND = '#0E1522';                      // land base under the real products (= no data where a product is masked)
  const CTX_A = 0.42;                          // the regional mosaic ends dimmed to context (act 6 picks it up)

  /* ------------------------------------------------------------------ geography */
  const FR = 1200;                             // 1/1200° geocoded grid
  const TPW = 120.620, TPN = 15.470;           // NW corner of the act-4 hand-off pixel's cell (Tarlac plains)
  const TPC = { lon: TPW + 0.5 / FR, lat: TPN - 0.5 / FR };
  const VIEW_END = L.CABANATUAN_VIEW, BOWL = L.CABANATUAN_BOWL;
  const VE = G.view(VIEW_END);                 // the map at 52.0 s (world), shared with act 6
  const BW = VE.pt(BOWL.lon, BOWL.lat);        // bowl centre at the end (world ≈ 696, 464)

  /* ------------------------------------------------------------------ the grid (world) */
  const P_LAT = 60000, CH = P_LAT / FR, CW = CH * G.K;   // a 1/1200° cell is 50 px tall → TL pixel ≈ 42 px (act-4 size)
  const NX = 14, NY = 9, IC = 3, JC = 4;       // radar sheet; the TL's cell (4th column from near range, middle row)
  const TA = [718, 540];                       // TL cell centre on the geocoded grid
  const GX0 = TA[0] - (IC + 0.5) * CW, GY0 = TA[1] - (JC + 0.5) * CH;   // grid NW corner
  const EXT = { i1: 25, j0: -2, j1: 11 };      // section B: the map grid extends east (to column 25) and ±2 rows
  const V0 = G.view({ lon: TPC.lon, lat: TPC.lat, ppd: P_LAT, cx: TA[0], cy: TA[1] }); // grid view (A/B)
  const S_LAT = (CW / 1.24) * 1.08, S_MARK = 28, S_END = 57.5;   // TL sizes: pixel · flight marker · bowl contour (world)
  const SEED = 195, PH_C = 17.5;               // contour shape fitted to the −3 cm/yr isoline of P448 F0290

  /* ------------------------------------------------------------------ pure layout */
  const camAt = (lt) => L.cam(T0 + Math.min(lt, DUR - 1e-6), FOCUS); // never the next act's camera
  // swoop (47.0 → 48.0): zoom out of the grid → fly east (Tarlac → Cabanatuan) → zoom in on the bowl
  const outK = (lt) => sp(lt, 5.0, 0.8), panK = (lt) => sp(lt, 5.15, 0.8), inK = (lt) => sp(lt, 5.4, 0.75);
  const LANDED = 7.5;                          // every swoop spring is settled to < 1e-5 here: the map IS VIEW_END
  const lnLAT = Math.log(P_LAT), lnMID = Math.log(1000), lnEND = Math.log(VIEW_END.ppd);
  const ppdAt = (lt) => (lt <= 5 ? P_LAT : lt >= LANDED ? VIEW_END.ppd : Math.exp(lnLAT + (lnMID - lnLAT) * outK(lt) + (lnEND - lnMID) * inK(lt)));
  /** The geographic point the flight tracks and where it sits (world): the TL rides it. */
  function anchorAt(lt) {
    const u = lt <= 5 ? 0 : lt >= LANDED ? 1 : panK(lt);
    return { lon: lerp(TPC.lon, BOWL.lon, u), lat: lerp(TPC.lat, BOWL.lat, u), x: lerp(TA[0], BW[0], u), y: lerp(TA[1], BW[1], u) };
  }
  function viewAt(lt) {
    if (lt <= 5) return V0;
    if (lt >= LANDED) return VE;
    const a = anchorAt(lt);
    return G.view({ lon: a.lon, lat: a.lat, ppd: ppdAt(lt), cx: a.x, cy: a.y });
  }
  // radar sheet (node offsets from the sheet centre): UND = geocoded, DIS = radar geometry before its mirror
  const NN = (NX + 1) * (NY + 1);
  const ix = (i, j) => (j * (NX + 1) + i) * 2;
  const HX = (NX / 2) * CW, HY = (NY / 2) * CH, LC = [GX0 + HX, GY0 + HY];
  const UND = new Float64Array(NN * 2), DIS = new Float64Array(NN * 2);
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const n = ix(i, j), u = (i - NX / 2) / (NX / 2), v = (j - NY / 2) / (NY / 2);
    UND[n] = u * HX; UND[n + 1] = v * HY;
    const ur = u + 0.1 * (u * u - 1) + 0.07 * (L.noise2(i * 0.9 + 3, j * 0.9, 17) - 0.5) - 0.17 * v;
    DIS[n] = ur * HX * 1.04; DIS[n + 1] = v * HY * 0.97;
  }
  const PHI = -0.2, F_PERSP = 1500;            // ascending heading (exaggerated) · flip perspective
  const flipK = (lt) => sp(lt, 1.0, 0.7), skewK = (lt) => sp(lt, 1.25, 0.8);
  /** Sheet nodes (world): one mirror (k1, a card flip) + one de-skew/de-rotate/relax (k2); never per-column springs. */
  function warpNodes(k1, k2, out) {
    const m = -Math.cos(Math.PI * k1), s = Math.sin(Math.PI * k1);
    const phi = PHI * (1 - k2), cr = Math.cos(phi), sr = Math.sin(phi);
    const cx = LC[0] + 16 * (1 - k2), cy = LC[1] - 4 * (1 - k2);
    for (let n = 0; n < NN * 2; n += 2) {
      const lx = lerp(DIS[n], UND[n], k2), ly = lerp(DIS[n + 1], UND[n + 1], k2);
      const ps = F_PERSP / (F_PERSP - ly * s);
      const x = lx * ps, y = ly * m * ps;
      out[n] = cx + x * cr - y * sr; out[n + 1] = cy + x * sr + y * cr;
    }
    return out;
  }
  const TMP = new Float64Array(NN * 2), NODES = new Float64Array(NN * 2);
  // TL phase: beat-stepped phasor through A/B, arriving at PH_C on the 48.0 bar; then a slow breath (zero rate at 52.0)
  const phaseAt = (lt) => (lt < 6 ? PH_C - 7.2 + 0.6 * L.steps(lt, 0.5, 0.3) : PH_C + 0.4 * (1 - Math.cos(Math.PI * (lt - 6))));
  const morphK = (lt) => sp(lt, 6.0, 0.9);
  /** TL in WORLD space. */
  function tlWorld(lt) {
    const phase = phaseAt(lt);
    if (lt < 5) {
      const P = warpNodes(flipK(lt), skewK(lt), TMP);
      const a = ix(IC, JC), b = ix(IC + 1, JC), c = ix(IC + 1, JC + 1), d = ix(IC, JC + 1);
      return { x: (P[a] + P[b] + P[c] + P[d]) / 4, y: (P[a + 1] + P[b + 1] + P[c + 1] + P[d + 1]) / 4, size: S_LAT, rot: PHI * (1 - skewK(lt)), form: 'pixel', phase };
    }
    const an = anchorAt(lt), k = morphK(lt);
    const size = lerp(lerp(S_LAT, S_MARK, sp(lt, 5.0, 0.5)), S_END, k);
    const st = { x: an.x, y: an.y, size, rot: 0, form: 'pixel', to: 'contour', k, phase, seed: SEED };
    if (k <= 0) { st.to = null; st.k = 0; }
    if (k >= 0.999) { st.form = 'contour'; st.to = null; st.k = 0; }
    return st;
  }
  /** Radius of the TL contour (core formPoint 'contour', seed SEED) at angle th (screen orientation). */
  function contourR(th, ph) {
    let r = 1;
    for (let k = 2; k <= 5; k++) r += (0.05 + 0.06 * L.hash1(k, SEED)) * Math.sin(k * th + TAU * L.hash1(k + 9, SEED) + 0.15 * ph);
    return r;
  }

  /* ------------------------------------------------------------------ caches (pure) */
  const AI0 = -2, AJ0 = -4, AW = 30, AH = 18;  // amplitude table window (cells)
  let AMP = null, HATCH = null, FOCUS2X = null;
  function ensure() {
    if (!AMP) { // radar amplitude of each 1/1200° cell: smooth "land cover" field + speckle + a few bright scatterers
      AMP = [];
      const dark = L.hex('#0F1B2C'), lite = L.hex('#9DB2C9');
      for (let j = 0; j < AH; j++) for (let i = 0; i < AW; i++) {
        const gi = i + AI0, gj = j + AJ0;
        let a = 0.18 + 0.5 * L.fbm(gi * 0.16 + 3.1, gj * 0.16 + 1.7, 3, 23) + 0.22 * (L.hash2(gi, gj, 5) - 0.5);
        if (L.hash2(gi, gj, 9) > 0.965) a += 0.32;
        a = clamp(a, 0.04, 1);
        AMP.push(L.mix(dark, lite, Math.pow(a, 1.15)));
      }
    }
    if (!HATCH) { // "no data" hatch tile
      const t = L.canvas(9, 9), x = t.getContext('2d');
      x.strokeStyle = 'rgba(159,176,200,0.16)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(-1, 10); x.lineTo(10, -1); x.moveTo(-1, 1); x.lineTo(1, -1); x.moveTo(8, 10); x.lineTo(10, 8); x.stroke();
      HATCH = t;
    }
    if (!FOCUS2X && L.real && L.real.focus) { // 2× nearest copy: crisp 90 m pixels when drawn smoothed at ≈ 1.7×
      const c = L.real.canvas('focus', RD);
      const up = L.canvas(c.width * 2, c.height * 2), x = up.getContext('2d');
      x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, up.width, up.height);
      FOCUS2X = up;
    }
    if (L.real && L.real.asc) L.real.canvas('asc', RD); // warm the colourised mosaic
  }
  const ampAt = (gi, gj) => AMP[clamp(gj - AJ0, 0, AH - 1) * AW + clamp(gi - AI0, 0, AW - 1)];
  /** The same colouring the real canvases use (L.velRGB + lift toward slate), for the legend's colour bar. */
  const LIFT_RGB = L.hex('#5F7FA6');
  function realRGB(v) {
    const c = L.velRGB(v, RD.vmax), near = (1 - Math.min(1, Math.abs(v) / (RD.vmax * 0.5))) * RD.lift;
    return [c[0] + (LIFT_RGB[0] - c[0]) * near, c[1] + (LIFT_RGB[1] - c[1]) * near, c[2] + (LIFT_RGB[2] - c[2]) * near];
  }

  /* ------------------------------------------------------------------ small drawing helpers */
  function strokePartial(ctx, pts, p) { if (p > 0.0005) { L.polyPartial(ctx, pts, p); ctx.stroke(); } }
  /** Backplate that constructs top → down. */
  function plate(ctx, x, y, w, h, p, o = {}) {
    if (p <= 0) return;
    const k = L.ease.outCubic(clamp(p * 1.25));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 2, y - 2, w + 4, (h + 4) * k); ctx.clip();
    L.roundRect(ctx, x, y, w, h, o.r === undefined ? 8 : o.r);
    ctx.fillStyle = L.rgba(C.card, o.a === undefined ? 0.94 : o.a); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = C.cardBorder; ctx.stroke();
    ctx.restore();
  }
  /** Text on its own backplate. Returns the plate box. */
  function tag(ctx, str, x, y, o) {
    const m = L.measure(ctx, str, o);
    const px = 12, py = 9, capH = m.capH || m.asc * 0.72, top = y - capH - py, h = capH + py * 2 + 2;
    plate(ctx, x - px, top, m.w + px * 2, h, o.p);
    L.text(ctx, str, x, y, { ...o, p: clamp(o.p * 1.15 - 0.1), bg: C.card });
    return { x: x - px, y: top, w: m.w + px * 2, h };
  }
  function check(ctx, x, y, s, p, color, lw = 3) {
    if (p <= 0) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokePartial(ctx, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.42]], p);
    ctx.restore();
  }
  const VEL_CELLS = [-3.6, 0.2, -0.4, 0.6, -4.4, 0.1, 1.2, -0.8, 0.3];   // a GeoTIFF's raster cells (glyph only)
  /** Format glyphs: GeoTIFF = raster cells, KMZ = globe (velocity) / chart (time series), PNG = hillshade relief. */
  function glyph(ctx, kind, x, y, s, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'tif') {
      const q = s / 3;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        ctx.fillStyle = L.css(realRGB(VEL_CELLS[b * 3 + a]), 1);
        ctx.fillRect(x - s / 2 + a * q + 0.7, y - s / 2 + b * q + 0.7, q - 1.4, q - 1.4);
      }
      ctx.strokeStyle = L.rgba(col, 0.6); ctx.lineWidth = 1; ctx.strokeRect(x - s / 2 - 0.5, y - s / 2 - 0.5, s + 1, s + 1);
    } else if (kind === 'png') {
      ctx.beginPath(); ctx.moveTo(x - s / 2, y + s / 2.4); ctx.lineTo(x - s / 8, y - s / 4); ctx.lineTo(x + s / 9, y + s / 10);
      ctx.lineTo(x + s / 4, y - s / 14); ctx.lineTo(x + s / 2, y + s / 2.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s / 3.2, y - s / 2.6, s / 7.5, 0, TAU); ctx.fill();
    } else if (kind === 'kmz') {
      ctx.beginPath(); ctx.arc(x, y, s / 2, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, s / 4.5, s / 2, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - s / 2, y); ctx.lineTo(x + s / 2, y); ctx.stroke();
    } else { // time series
      ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.stroke();
      const pts = [[-0.32, -0.3], [-0.12, -0.16], [0.06, -0.02], [0.24, 0.12], [0.42, 0.26]].map(([a, b]) => [x + a * s, y + b * s]);
      L.poly(ctx, pts); ctx.stroke();
      for (const [a, b] of pts) { ctx.beginPath(); ctx.arc(a, b, 1.7, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  /** Component cue on a GeoTIFF / PNG tile (no text): LOS = slanted toward the satellite (ascending, right-looking: up
   *  and west, ≈ 38° off vertical), vertical = ↕, horizontal = ↔. */
  function compArrow(ctx, x, y, s, comp, col) {
    const a = comp === 0 ? -0.66 : comp === 1 ? 0 : Math.PI / 2, dx = Math.sin(a) * s / 2, dy = -Math.cos(a) * s / 2;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    const head = (hx, hy, ang) => { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 3.6 * Math.cos(ang - 0.5), hy - 3.6 * Math.sin(ang - 0.5)); ctx.lineTo(hx - 3.6 * Math.cos(ang + 0.5), hy - 3.6 * Math.sin(ang + 0.5)); ctx.closePath(); ctx.fill(); };
    const ang = Math.atan2(dy, dx);
    head(x + dx, y + dy, ang);
    if (comp !== 0) head(x - dx, y - dy, ang + Math.PI);
    ctx.restore();
  }
  /** Small satellite (body + two solar panels) for the caveat chip. */
  function satellite(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.3;
    ctx.fillRect(-s * 0.16, -s * 0.2, s * 0.32, s * 0.4);
    ctx.strokeRect(-s * 0.62, -s * 0.13, s * 0.36, s * 0.26); ctx.strokeRect(s * 0.26, -s * 0.13, s * 0.36, s * 0.26);
    ctx.beginPath(); ctx.moveTo(-s * 0.26, 0); ctx.lineTo(-s * 0.16, 0); ctx.moveTo(s * 0.16, 0); ctx.lineTo(s * 0.26, 0);
    ctx.moveTo(0, s * 0.2); ctx.lineTo(0, s * 0.36); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, s * 0.42, s * 0.08, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ A · the radar sheet → the map grid */
  function cellQuad(ctx, P, a, b, c, d, k) { // quad (node indices) shrunk about its centre by k (gutter)
    const cx = (P[a] + P[b] + P[c] + P[d]) / 4, cy = (P[a + 1] + P[b + 1] + P[c + 1] + P[d + 1]) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + (P[a] - cx) * k, cy + (P[a + 1] - cy) * k);
    ctx.lineTo(cx + (P[b] - cx) * k, cy + (P[b + 1] - cy) * k);
    ctx.lineTo(cx + (P[c] - cx) * k, cy + (P[c + 1] - cy) * k);
    ctx.lineTo(cx + (P[d] - cx) * k, cy + (P[d + 1] - cy) * k);
    ctx.closePath();
  }
  function cellRGB(rgb, gi, gj, lt, geo) {
    const t = T0 + lt;
    const sh = 0.07 * Math.sin(TAU * (t / 2) + 6.3 * L.hash2(gi, gj, 77));                       // half-bar shimmer
    const wr = lt > 4 && lt < 5.2 ? Math.exp(-Math.pow((lt - (4.0 + 0.0625 * (gj - EXT.j0))) / 0.08, 2)) : 0; // write sweep (bar 24)
    const br = sh + 0.35 * wr;
    let c = br >= 0 ? L.mix(rgb, '#E6F1FF', br * 0.55) : L.mix(rgb, '#0B111E', -br);
    if (geo < 1) c = L.mix(c, L.mix(c, C.blue, 0.25), 1 - geo); // radar geometry: a faint blue cast
    return c;
  }
  function drawGrid(ctx, lt) {
    if (lt > 6.4) return;
    const zf = ppdAt(lt) / P_LAT, cellPx = CH * zf;
    const fade = clamp(clamp((cellPx - 2.5) / 12) * (lt > 5 ? 1 - sp(lt, 5.55, 0.5) : 1));
    if (fade <= 0.003) return;
    const geo = clamp(skewK(lt)), gut = Math.max(0, 1 - 2.6 / Math.max(cellPx / 2, 3));
    const back = lerp(1, 0.5, clamp(sp(lt, 2.5, 0.8)));                 // section B: the grid becomes a backdrop
    const west = 1 - clamp(sp(lt, 2.1, 0.5));                           // the columns west of the TL clear for the card
    ctx.save();
    ctx.lineWidth = 1;
    if (lt < 5) { // core sheet: warped quads
      const P = warpNodes(flipK(lt), skewK(lt), NODES);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const ring = Math.max(Math.abs(i - IC), Math.abs(j - JC));
        const rc = clamp(sp(lt, 0.125 + 0.0625 * ring, 0.45)) * (i < IC ? west : 1);
        if (rc <= 0.002) continue;
        const a = ix(i, j), b = ix(i + 1, j), c = ix(i + 1, j + 1), d = ix(i, j + 1);
        // flat-on vs edge-on (mid-flip): signed area against the cell's geographic area
        const area = ((P[c] - P[a]) * (P[d + 1] - P[b + 1]) - (P[c + 1] - P[a + 1]) * (P[d] - P[b])) / 2;
        const facing = clamp(Math.abs(area) / (CW * CH));
        let rgb = cellRGB(ampAt(i, j), i, j, lt, geo);
        if (facing < 0.98) rgb = L.mix(rgb, '#0B111E', 0.6 * (1 - Math.sqrt(facing)));
        ga(ctx, rc * fade * back);
        ctx.fillStyle = L.css(rgb, 1);
        cellQuad(ctx, P, a, b, c, d, rc * gut); ctx.fill();
        ctx.strokeStyle = 'rgba(0,229,255,0.12)'; ctx.stroke();
      }
      // sheet outline: blue (radar geometry) → emerald (map grid); it hands over to the extended grid in bar 23
      const ol = fade * (1 - sp(lt, 2.0, 0.6));
      if (ol > 0.004) {
        const out = [];
        for (let i = 0; i <= NX; i++) out.push([P[ix(i, 0)], P[ix(i, 0) + 1]]);
        for (let j = 1; j <= NY; j++) out.push([P[ix(NX, j)], P[ix(NX, j) + 1]]);
        for (let i = NX - 1; i >= 0; i--) out.push([P[ix(i, NY)], P[ix(i, NY) + 1]]);
        for (let j = NY - 1; j >= 0; j--) out.push([P[ix(0, j)], P[ix(0, j) + 1]]);
        out.push(out[0]);
        ga(ctx, ol);
        ctx.strokeStyle = L.css(L.mix(C.blue, EM, geo), 0.85); ctx.lineWidth = 1.6;
        strokePartial(ctx, out, clamp(sp(lt, 0.125, 1.0)));
        ctx.lineWidth = 1;
      }
    }
    // geographic cells from the map view: the extension (B) and, during the swoop, the whole grid
    if (lt >= 2) {
      const v = viewAt(lt);
      for (let j = EXT.j0; j < EXT.j1; j++) for (let i = IC; i < EXT.i1; i++) {
        const core = i < NX && j >= 0 && j < NY;
        if (core && lt < 5) continue;
        const d = core ? 0 : Math.max(i - (NX - 1), j < 0 ? -j : j - (NY - 1), 0);
        const rc = core ? 1 : clamp(sp(lt, 2.0 + 0.0625 * d, 0.45));
        if (rc <= 0.002) continue;
        const x0 = v.x(TPW + (i - IC) / FR), y0 = v.y(TPN - (j - JC) / FR);
        const w = CW * zf, h = CH * zf, k = rc * gut;
        ga(ctx, rc * fade * back * (1 - 0.06 * d));
        ctx.fillStyle = L.css(cellRGB(ampAt(i, j), i, j, lt, 1), 1);
        ctx.beginPath(); ctx.rect(x0 + (w * (1 - k)) / 2, y0 + (h * (1 - k)) / 2, w * k, h * k); ctx.fill();
        if (cellPx > 8) { ctx.strokeStyle = 'rgba(0,229,255,0.12)'; ctx.stroke(); }
      }
    }
    // TL cell lock: emerald ripple on the 44.0 bar (the pixel has landed on the map grid), then on every beat
    const lock = clamp(sp(lt, 2.0, 0.4)) * (1 - clamp(sp(lt, 4.9, 0.3)));
    if (lock > 0.01 && lt < 5) {
      const f = ((lt - 2.0) / 0.5) % 1, big = lt < 2.5 ? 1 : 0.4;
      const g = 1 + f * (lt < 2.5 ? 1.5 : 0.8);
      ga(ctx, lock * (1 - f) * big);
      ctx.strokeStyle = EM; ctx.lineWidth = 2;
      ctx.strokeRect(TA[0] - (CW / 2) * g, TA[1] - (CH / 2) * g, CW * g, CH * g);
    }
    ctx.restore();
  }
  /** The destination map grid (dashed emerald) the sheet lands on. */
  function drawGhost(ctx, lt) {
    const e = clamp(L.inout(lt, 0.5, 2.3, 0.5, 0.4));
    if (e <= 0) return;
    const x0 = GX0, y0 = GY0, x1 = GX0 + NX * CW, y1 = GY0 + NY * CH;
    ctx.save();
    ga(ctx, e * (1 - 0.7 * clamp(sp(lt, 1.7, 0.4))));
    ctx.beginPath(); ctx.rect(x0 - 4, y0 - 4, (x1 - x0 + 8) * clamp(e * 1.15), y1 - y0 + 8); ctx.clip();
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -L.steps(T0 + lt, 0.5, 0.3) * 4;
    ctx.strokeStyle = L.rgba(EM, 0.75); ctx.lineWidth = 1.4;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = L.rgba(EM, 0.2); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < NX; i++) { ctx.moveTo(x0 + i * CW, y0); ctx.lineTo(x0 + i * CW, y1); }
    for (let j = 1; j < NY; j++) { ctx.moveTo(x0, y0 + j * CH); ctx.lineTo(x1, y0 + j * CH); }
    ctx.stroke();
    ctx.restore();
  }
  function drawCompass(ctx, lt) {
    const p = clamp(L.inout(lt, 0.25, 2.6, 0.5, 0.4));
    if (p <= 0) return;
    const x = GX0 + NX * CW + 70, y = GY0 + 4, r = 26;
    const ang = lerp(Math.PI - PHI, 0, sp(lt, 1.0, 0.9)); // north (almost) down in the mirrored radar sheet → up
    ctx.save();
    ga(ctx, p);
    ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(p, p);
    ctx.fillStyle = L.ink(EM); ctx.beginPath(); ctx.moveTo(0, -r + 3); ctx.lineTo(7, 4); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(159,176,200,0.6)'; ctx.beginPath(); ctx.moveTo(0, r - 6); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    L.text(ctx, 'N', x + Math.sin(ang) * (r + 14), y - Math.cos(ang) * (r + 14), { kind: 'mono', size: 16, weight: 600, color: L.ink(EM), align: 'center', baseline: 'middle', p, role: 'deco' });
  }
  function drawLabelsA(ctx, lt) {
    const p1 = L.inout(lt, 0.25, 2.45, 0.45, 0.35);
    if (p1 > 0) tag(ctx, [{ s: 'Radar geometry', color: C.text }, { s: ' → ', color: INK_EM }, { s: 'map grid', color: C.text }], GX0 + 12, GY0 - 34,
      { kind: 'sans', size: 24, weight: 500, color: C.text, p: p1, scanColor: C.blue, id: 'a5-geo' });
    // dimension bracket on the TL's own cell + its size
    const p2 = clamp(L.inout(lt, 1.75, 5.2, 0.45, 0.3));
    if (p2 > 0) {
      const x0 = TA[0] - CW / 2, x1 = TA[0] + CW / 2, yb = TA[1] - CH / 2 - 12;
      ctx.save(); ga(ctx, p2); ctx.strokeStyle = L.ink(EM); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x0, yb + 6); ctx.lineTo(x0, yb); ctx.lineTo(lerp(x0, x1, p2), yb); if (p2 > 0.98) ctx.lineTo(x1, yb + 6); ctx.stroke();
      ctx.restore();
      tag(ctx, '1/1200° ≈ 90 m', x0 + 2, yb - 16, { kind: 'mono', size: 19, weight: 600, color: INK_EM, p: p2, scanColor: EM, id: 'a5-px' });
    }
  }

  /* ------------------------------------------------------------------ B · the products card (left column) */
  const PC = { x: 172, y: 236, w: 496, h: 552 };
  const PIX = PC.x + 26;
  const TW = 62, TH = 46, PAIR = 6, GRP = 27;
  const tileX = (k) => PIX + Math.floor(k / 2) * (2 * TW + PAIR + GRP) + (k % 2) * (TW + PAIR);
  const ROWS = [ // the v1.2 manifest: 16 files per frame
    { label: [{ s: '6 GeoTIFF', color: C.text }, { s: ' · m/yr', color: DIM }], kinds: ['tif', 'tif', 'tif', 'tif', 'tif', 'tif'] },
    { label: [{ s: '4 KMZ', color: C.text }, { s: ' · velocity, time series', color: DIM }], kinds: ['kmz', 'kmz', 'ts', 'ts'] },
    { label: [{ s: '6 hillshade PNG', color: C.text }, { s: ' · cm/yr colour bar', color: DIM }], kinds: ['png', 'png', 'png', 'png', 'png', 'png'] },
  ];
  const rowY = (r) => PC.y + 154 + r * 98;     // label baseline; tiles 14 px below
  const rowAt = (r) => 2.75 + 0.25 * r;
  const TILES = [];
  ROWS.forEach((row, r) => row.kinds.forEach((kind, k) => TILES.push({ r, k, kind, at: rowAt(r) + 0.03125 * (k + 1) })));
  const tickAt = (n) => 4.0 + 0.0625 * n;
  const outB = 6.15;                           // card content gone by 48.15 (★ products ends 47.9)
  function drawProducts(ctx, lt) {
    const pc = L.inout(lt, 2.5, 6.2, 0.6, 0.35);
    if (pc <= 0) return;
    L.card(ctx, PC.x, PC.y, PC.w, PC.h, { p: pc, accent: EM });
    const bottom = PC.y - 2 + (PC.h + 4) * L.ease.outCubic(clamp(pc * 1.15));
    ctx.save();
    ctx.beginPath(); ctx.rect(PC.x - 4, PC.y - 4, PC.w + 8, Math.max(0, bottom - PC.y + 4)); ctx.clip();
    const tx = (a, b = outB) => L.inout(lt, a, b, 0.45, 0.3);
    // the count runs with the tiles: 1 → 16
    const built = TILES.filter((q) => lt >= q.at + 0.06).length;
    const ph = tx(2.625);
    if (ph > 0) {
      L.text(ctx, String(Math.max(1, built)), PIX - 3, PC.y + 96, { kind: 'display', size: 96, weight: 700, color: INK_EM, p: ph, bg: C.card, scanColor: EM, id: 'a5-16' });
      const w16 = L.measure(ctx, '16', { kind: 'display', size: 96, weight: 700 }).w;
      L.text(ctx, 'products per frame', PIX - 3 + w16 + 18, PC.y + 96, { kind: 'sans', size: 26, weight: 600, color: C.text, p: tx(2.6875), bg: C.card, scanColor: EM, id: 'a5-ppf' });
    }
    const sep = (y, p) => { if (p > 0) { ctx.fillStyle = 'rgba(0,229,255,0.14)'; ctx.fillRect(PIX, y, (PC.w - 52) * clamp(p), 1); } };
    sep(PC.y + 122, tx(2.75));
    ROWS.forEach((row, r) => {
      const pl = tx(rowAt(r), outB - 0.02 * r);
      if (pl > 0) L.text(ctx, row.label, PIX, rowY(r), { kind: 'sans', size: 21, weight: 600, color: C.text, p: pl, bg: C.card, scanColor: EM, id: 'a5-row' + r });
    });
    TILES.forEach((q, n) => {
      const pt = L.inout(lt, q.at, outB - 0.04 - 0.008 * n, 0.4, 0.3);
      if (pt > 0) drawTile(ctx, tileX(q.k), rowY(q.r) + 14, pt, q, lt, n);
    });
    const pn = tx(3.5);
    if (pn > 0) L.text(ctx, [{ s: 'Pairs: ', color: DIM }, { s: 'demErr', color: C.text }, { s: ' · ', color: DIM }, { s: 'demErr_ramp', color: C.text }], PIX, PC.y + 444,
      { kind: 'mono', size: 18, weight: 400, color: DIM, p: pn, bg: C.card, scanColor: EM, id: 'a5-pairs' });
    sep(PC.y + 466, tx(3.5));
    // verification (bar 24): 27 segments fill on 16ths, the check mark draws on at 5.0
    const pv = tx(4.0);
    if (pv > 0) {
      const vy = PC.y + 486, segW = (PC.w - 52 - 26 * 4) / 27;
      const lit = Math.ceil(27 * clamp(Math.floor((lt - 4.0) / 0.125 + 1) / 8));
      for (let s = 0; s < 27; s++) {
        const ks = clamp(pv * 1.4 - s * 0.012);
        if (ks <= 0) continue;
        ctx.fillStyle = s < lit && lt >= 4.0 ? L.rgba(EM, 0.95 * ks) : L.rgba(C.cyan, 0.12 * ks);
        ctx.fillRect(PIX + s * (segW + 4), vy, segW, 7);
      }
      const pk = clamp(sp(lt, 5.0, 0.45)) * clamp(pv);
      ctx.save(); ga(ctx, pv);
      ctx.beginPath(); ctx.arc(PIX + 14, vy + 39, 14, 0, TAU); ctx.fillStyle = L.rgba(EM, 0.2 + 0.55 * pk); ctx.fill();
      ctx.restore();
      check(ctx, PIX + 14, vy + 39, 13, pk, C.text, 2.6);
      L.text(ctx, [{ s: '27-check verification', color: C.text, weight: 600 }, { s: ' · checksum manifests', color: DIM }], PIX + 38, vy + 46,
        { kind: 'sans', size: 19, weight: 500, color: C.text, p: pv, bg: C.card, scanColor: EM, id: 'a5-ver' });
    }
    ctx.restore();
  }
  function drawTile(ctx, x, y, p, q, lt, n) {
    const k = L.ease.outCubic(clamp(p * 1.1));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 2, y - 2, TW + 4, (TH + 4) * k); ctx.clip();
    L.roundRect(ctx, x, y, TW, TH, 6); ctx.fillStyle = '#0F1828'; ctx.fill();
    if (q.k % 2 === 0) { // demErr keeps a residual orbital ramp; its demErr_ramp twin (right) is flat
      const g = ctx.createLinearGradient(x, y + TH, x + TW, y);
      g.addColorStop(0, 'rgba(59,130,246,0)'); g.addColorStop(1, 'rgba(59,130,246,0.22)');
      ctx.fillStyle = g; ctx.fill();
    }
    const gy = q.kind === 'png' ? y + TH / 2 - 4 : y + TH / 2;
    glyph(ctx, q.kind, x + TW / 2, gy, 20, INK_EM);
    if (q.kind === 'tif' || q.kind === 'png') compArrow(ctx, x + 10, y + 11, 11, q.k >> 1, 'rgba(230,241,255,0.7)');
    if (q.kind === 'png') { // the colour bar burnt into the hillshade PNGs
      for (let i = 0; i < 40; i++) { ctx.fillStyle = L.css(realRGB(((i / 39) * 2 - 1) * 5), 1); ctx.fillRect(x + 11 + i, y + TH - 9, 1.2, 4); }
    }
    // beat-locked sheen sweeping the grid (half-bar period)
    const ph = ((T0 + lt) / 2 + n * 0.045) % 1, sx = x - 30 + ph * (TW + 60);
    const g2 = ctx.createLinearGradient(sx - 16, 0, sx + 16, 0);
    g2.addColorStop(0, 'rgba(230,241,255,0)'); g2.addColorStop(0.5, 'rgba(230,241,255,0.07)'); g2.addColorStop(1, 'rgba(230,241,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(x, y, TW, TH);
    L.roundRect(ctx, x + 0.5, y + 0.5, TW - 1, TH - 1, 6); ctx.strokeStyle = 'rgba(16,185,129,0.38)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    if (p < 1 && p > 0) { // scan bar at the construction front
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.rgba(EM, 0.8 * Math.sin(Math.PI * clamp(p)));
      ctx.fillRect(x - 3, y + TH * k - 1, TW + 6, 2); ctx.restore();
    }
    const tk = clamp(sp(lt, tickAt(n), 0.35)) * clamp(p);
    if (tk > 0.01) {
      ctx.save(); ga(ctx, tk);
      ctx.beginPath(); ctx.arc(x + TW - 3, y + 3, 7.5, 0, TAU); ctx.fillStyle = EM; ctx.fill();
      ctx.restore();
      check(ctx, x + TW - 3, y + 3, 7.5, tk, '#0B111E', 2);
    }
  }

  /* ------------------------------------------------------------------ swoop + C · the real map */
  const mapOpen = (lt) => (lt < 5.05 ? 0 : clamp(sp(lt, 5.05, 0.9)));
  const mosaicA = (lt) => lerp(0.95, CTX_A, clamp(sp(lt, 5.7, 0.8)));   // the regional mosaic dims to context on landing
  function drawMap(ctx, lt) {
    const open = mapOpen(lt);
    if (open <= 0.002 || !L.real || !L.real.focus) return;
    const v = viewAt(lt), tw = tlWorld(lt), R = 1750 * open;
    ctx.save();
    if (open < 0.999) { ctx.beginPath(); ctx.arc(tw.x, tw.y, Math.max(0.5, R), 0, TAU); ctx.clip(); }
    // land base + "no data" hatch (anchored to the map)
    G.drawLand(ctx, v, { which: 'luzon', fill: LAND });
    ctx.save();
    G.clipLand(ctx, v, 'luzon');
    const pat = ctx.createPattern(HATCH, 'repeat');
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, v.x(121) % 9, v.y(15.5) % 9]));
    ctx.fillStyle = pat; ctx.fillRect(-20, -20, L.W + 40, L.H + 40);
    ctx.restore();
    // regional mosaic (12 ascending frames, 1/400°) as context, outside P448 F0290's footprint
    const fp = L.real.footprint(v, 'P448F0290');
    ctx.save();
    ctx.beginPath(); ctx.rect(-40, -40, L.W + 80, L.H + 80);
    if (fp) { ctx.moveTo(fp[0][0], fp[0][1]); for (let i = 1; i < fp.length; i++) ctx.lineTo(fp[i][0], fp[i][1]); ctx.closePath(); }
    ctx.clip('evenodd');
    L.real.draw(ctx, v, 'asc', { ...RD, opacity: mosaicA(lt), smooth: false });
    ctx.restore();
    // the product: P448 F0290, vertical velocity, ramp removed (1/1200°)
    const b = L.real.bounds('focus');
    if (FOCUS2X) {
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(FOCUS2X, v.x(b.lon0), v.y(b.lat0), v.x(b.lon1) - v.x(b.lon0), v.y(b.lat1) - v.y(b.lat0));
      ctx.restore();
    }
    // frame footprint hairline
    if (fp) {
      ctx.save(); ga(ctx, sp(lt, 5.5, 0.6));
      ctx.strokeStyle = 'rgba(230,241,255,0.32)'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 5]);
      L.poly(ctx, fp, true); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    // iris edge while the map opens
    if (open < 0.995 && R > 4) {
      ctx.save(); ctx.strokeStyle = L.rgba(EM, 0.5 * (1 - open) + 0.15); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tw.x, tw.y, R, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  /** Screen-space finish over the map: scrims under the HUD bands (they fade out with the HUD) + a soft vignette (0.42,
   *  kept through the cut: act 6 starts with it). */
  function drawScrims(ctx, lt) {
    const open = mapOpen(lt);
    if (open <= 0.002) return;
    const hv = L.hud.vis(T0 + Math.min(lt, DUR - 1e-6)) * open;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (hv > 0.002) {
      let g = ctx.createLinearGradient(0, 0, 0, 176);
      g.addColorStop(0, L.rgba(C.bg, 0.9 * hv)); g.addColorStop(0.68, L.rgba(C.bg, 0.82 * hv)); g.addColorStop(1, L.rgba(C.bg, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, 176);
      g = ctx.createLinearGradient(0, 918, 0, L.H);
      g.addColorStop(0, L.rgba(C.bg, 0)); g.addColorStop(0.3, L.rgba(C.bg, 0.82 * hv)); g.addColorStop(1, L.rgba(C.bg, 0.9 * hv));
      ctx.fillStyle = g; ctx.fillRect(0, 918, L.W, L.H - 918);
    }
    const vg = ctx.createRadialGradient(L.W / 2, L.H / 2, L.H * 0.42, L.W / 2, L.H / 2, L.H * 1.08);
    vg.addColorStop(0, 'rgba(3,6,12,0)'); vg.addColorStop(1, `rgba(3,6,12,${(0.42 * open).toFixed(3)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, L.W, L.H);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ C · headline, value card (+ its legend) */
  const HL = { x: 172, y: 166, w: 801, h: 68 };          // headline plate
  const VC = { x: 830, y: 330, w: 548, h: 406 };          // value card + legend (right of the bowl)
  const BOX = { hw: 1.08 * S_END * 1.24, hh: 0.9 * S_END * 1.24 };   // ★ bowl box half-size (world)
  const outC = 9.9;
  function drawHeadline(ctx, lt) {
    const p = clamp(L.inout(lt, 6.0, outC, 0.5, 0.45));
    if (p <= 0) return;
    plate(ctx, HL.x, HL.y, HL.w, HL.h, p, { a: 0.9, r: 10 });
    ctx.save(); ga(ctx, p);
    ctx.fillStyle = L.rgba(CR, 0.95); ctx.fillRect(HL.x, HL.y + 14, 4, (HL.h - 28) * clamp(p * 1.2)); // crimson rail
    ctx.restore();
    L.text(ctx, [{ s: 'SUBSIDENCE SIGNAL', color: INK_CR }, { s: ' · CABANATUAN', color: C.text }], HL.x + 22, HL.y + 49,
      { kind: 'display', size: 44, weight: 700, tracking: 0.02, color: C.text, p: clamp(p * 1.15 - 0.1), bg: C.card, role: 'headline', scanColor: CR, id: 'a5-hl' });
  }
  function drawValueCard(ctx, lt) {
    const pc = L.inout(lt, 6.25, outC, 0.5, 0.45);
    if (pc <= 0) return;
    L.card(ctx, VC.x, VC.y, VC.w, VC.h, { p: pc, accent: CR });
    const bottom = VC.y - 2 + (VC.h + 4) * L.ease.outCubic(clamp(pc * 1.15));
    ctx.save();
    ctx.beginPath(); ctx.rect(VC.x - 4, VC.y - 4, VC.w + 8, Math.max(0, bottom - VC.y + 4)); ctx.clip();
    const tx = (a, b) => L.inout(lt, a, b, 0.45, 0.3);
    const x0 = VC.x + 26, iw = VC.w - 52, y = VC.y;
    const rule = (yy, p) => { if (p > 0) { ctx.fillStyle = 'rgba(0,229,255,0.14)'; ctx.fillRect(x0, yy, iw * clamp(p), 1); } };
    // the value: subsidence rate (vertical, 2007–2011) reported for Paths 449 (4.4) and 448 (4.7)
    L.text(ctx, '4.4–4.7', x0 - 3, y + 90, { kind: 'display', size: 84, weight: 700, color: INK_CR, p: tx(6.3125, 9.72), bg: C.card, scanColor: CR, id: 'a5-val' });
    L.text(ctx, [{ s: 'cm/yr', color: C.text }, { s: ' · 2007–2011', color: DIM }], x0, y + 142, { kind: 'sans', size: 24, weight: 600, color: C.text, p: tx(6.375, 9.66), bg: C.card, scanColor: CR, id: 'a5-unit' });
    rule(y + 164, tx(6.4375, 9.66));
    L.text(ctx, 'Relative to nearby ground · assumes vertical motion', x0, y + 194, { kind: 'sans', size: 18, weight: 500, color: DIM, p: tx(6.4375, 9.6), bg: C.card, scanColor: CR, id: 'a5-rel' });
    // caveat chip: the signal is seen from orbit and still needs validation on the ground
    const pk = clamp(tx(6.5, 9.55));
    if (pk > 0) {
      const o = { kind: 'sans', size: 19, weight: 600 };
      const w = L.measure(ctx, 'Seen by the satellite · needs ground validation', o).w + 62, cy = y + 236, h = 38;
      const k = L.ease.outCubic(clamp(pk * 1.2));
      ctx.save();
      ctx.beginPath(); ctx.rect(x0 - 2, cy - h / 2 - 2, (w + 4) * k, h + 4); ctx.clip();
      L.roundRect(ctx, x0, cy - h / 2, w, h, h / 2); ctx.fillStyle = CHIP_BG; ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = L.rgba(GOLD, 0.75); ctx.stroke();
      satellite(ctx, x0 + 24, cy - 1, 22, INK_GO);
      ctx.restore();
      L.text(ctx, 'Seen by the satellite · needs ground validation', x0 + 44, cy + 7, { ...o, color: INK_GO, p: clamp(pk * 1.15 - 0.1), bg: CHIP_BG, scanColor: GOLD, id: 'a5-chip' });
    }
    // legend: the map's colour scale (same colouring as the product), the no-data key and the source
    rule(y + 276, tx(6.5625, 9.62));
    L.text(ctx, 'Vertical velocity (cm/yr)', x0, y + 306, { kind: 'sans', size: 19, weight: 600, color: C.text, p: tx(6.5625, 9.62), bg: C.card, scanColor: CR, id: 'a5-lg' });
    const pn = clamp(tx(6.625, 9.62));
    if (pn > 0) {
      const ow = L.measure(ctx, 'No data', { kind: 'sans', size: 18, weight: 500 }).w, sx = x0 + iw - ow - 28, sy = y + 290;
      ctx.save(); ga(ctx, pn);
      ctx.fillStyle = LAND; ctx.fillRect(sx, sy, 18, 18);
      ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, 18, 18); ctx.clip();
      ctx.strokeStyle = 'rgba(159,176,200,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let d = -18; d <= 18; d += 5) { ctx.moveTo(sx + d, sy + 18); ctx.lineTo(sx + d + 18, sy); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(159,176,200,0.5)'; ctx.strokeRect(sx + 0.5, sy + 0.5, 17, 17);
      ctx.restore();
      L.text(ctx, 'No data', sx + 28, y + 306, { kind: 'sans', size: 18, weight: 500, color: DIM, p: pn, bg: C.card, scanColor: CR, id: 'a5-nd' });
    }
    const pb = clamp(tx(6.625, 9.62));
    if (pb > 0) {
      const by = y + 320, bw = iw;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, by, bw * clamp(pb * 1.2), 14); ctx.clip();
      for (let i = 0; i < bw; i += 2) { ctx.fillStyle = L.css(realRGB(((i / bw) * 2 - 1) * 5), 1); ctx.fillRect(x0 + i, by, 2.5, 14); }
      ctx.restore();
      ctx.save(); ga(ctx, pb); ctx.strokeStyle = 'rgba(230,241,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, by + 0.5, bw - 1, 13);
      ctx.fillStyle = 'rgba(230,241,255,0.6)'; ctx.fillRect(x0 + bw / 2 - 0.5, by - 3, 1, 20); ctx.restore();
      const tk = { kind: 'mono', size: 16, weight: 500, color: DIM, p: pb, role: 'deco' };
      L.text(ctx, '−5 down', x0, y + 354, { ...tk, color: INK_CR });
      L.text(ctx, '0', x0 + bw / 2, y + 354, { ...tk, align: 'center' });
      L.text(ctx, 'up +5', x0 + bw, y + 354, { ...tk, align: 'right', color: L.ink(C.cyan, C.card) });
    }
    L.text(ctx, 'LInOG product P448 F0290 · ramp removed', x0, y + 386, { kind: 'sans', size: 18, weight: 500, color: DIM, p: tx(6.6875, 9.62), bg: C.card, scanColor: CR, id: 'a5-src' });
    ctx.restore();
  }
  /** Leader from the value card to the TL contour (its right edge at the TL's height). */
  function drawLeader(ctx, lt) {
    const p = clamp(L.inout(lt, 6.5, 9.6, 0.5, 0.3));
    if (p <= 0) return;
    const w = tlWorld(lt), xr = w.x + 1.08 * w.size * contourR(0, w.phase) + 8, y = w.y;
    const x1 = VC.x - 2, xa = lerp(x1, xr, p);
    ctx.save(); ga(ctx, p);
    ctx.strokeStyle = L.rgba(C.text, 0.75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(xa, y); ctx.stroke();
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(xa, y, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ spotlight targets */
  /** A card's spotlight box follows the part of it that is on screen (it constructs / retracts top → down), so no
   *  undimmed "ghost" of it is left behind while the spotlight is still easing out. */
  function markShown(ctx, id, B, k, pad, r) {
    const h = (B.h + 4) * L.ease.outCubic(clamp(k)) - 4;
    if (h < 1) return;
    L.spot.mark(ctx, id, B.x, B.y, B.w, h, { pad: pad * clamp(h / 40), r });
  }
  function marks(ctx, lt) {
    if (lt >= 3.2 && lt < 6.0) L.spot.mark(ctx, 'products', PC.x, PC.y, PC.w, PC.h, { pad: 18, r: 18 });
    if (lt >= 6.2) {
      L.spot.mark(ctx, 'cabanatuan', BW[0] - BOX.hw, BW[1] - BOX.hh, 2 * BOX.hw, 2 * BOX.hh, { pad: 20, r: 64 });
      markShown(ctx, 'cabanatuan', VC, L.inout(lt, 6.25, outC, 0.5, 0.45) * 1.15, 16, 18);
      markShown(ctx, 'cabanatuan', HL, L.inout(lt, 6.0, outC, 0.5, 0.45) * 1.25, 12, 14);
    }
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
      const cont = L.TL.weight(w, 'contour');
      const target = { ...w, x, y, size: w.size * cam.z, energy: lerp(0.35, 0.45, cont) + lerp(0.5, 0.4, cont) * pulse, alpha: 1, amp: 1 };
      if (env.handoff && lt < 2) {
        const st = L.TL.blend(env.handoff, target, sp(lt, 0, 1.0));
        st.size = lerp(env.handoff.size, target.size, sp(lt, 0.5, 0.8)); // hold the hand-off size for one beat
        return st;
      }
      return target;
    },
    draw(ctx, env) {
      ensure();
      const lt = env.lt;
      drawMap(ctx, lt);
      drawScrims(ctx, lt);
      drawGrid(ctx, lt);
      drawGhost(ctx, lt);
      drawCompass(ctx, lt);
      drawLabelsA(ctx, lt);
      drawProducts(ctx, lt);
      if (lt > 5.9) { drawHeadline(ctx, lt); drawLeader(ctx, lt); drawValueCard(ctx, lt); }
      marks(ctx, lt);
    },
  });
})();

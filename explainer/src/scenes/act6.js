/* Act 6 · Where LInOG stands today + end card (52–60 s) — bars 27–30, HUD gone: the whole title-safe frame.
 * VO-15 52.3 "This signal still needs validation on the ground." · VO-16 55.4 "Project LInOG. The work continues."
 *
 * Beat plan (lt = t − 52 s · 1 beat = 0.5 s · bars start at lt 0, 2, 4, 6). The runtime adds the cut flare + shock
 * ring at 52.0 and fades the picture to black over 57–60 s (L.FADE); this act adds neither.
 *  A · WHERE LInOG STANDS TODAY (52–55) — REAL data (L.real)
 *   0.00  BAR 27 hit on act 5's last picture, reproduced exactly (handView): the real P448 F0290 product at
 *         L.CABANATUAN_VIEW under act 5's final camera, act 5's dimmed regional mosaic, land base, "no data" hatch,
 *         dotted footprint and vignette. The cut is carried by the TL flare and the music, not by the background.
 *         Pull-back (log-zoom spring, 1.5 s) to all processed data (lon 120.0–122.1, lat 14.45–17.2 at 335 px/°, map
 *         left of centre); the hatch gives way to a coastline. The TL contour holds its hand-off size for one beat,
 *         then shrinks with the map (never below 34 px), still marking the Cabanatuan bowl.
 *   0.25  the ascending passes sweep south → north (Path 448, then 449 and 447 a 32nd apart): each frame brightens
 *         from act 5's dimmed context behind its acquisition front and gets its dotted footprint. 0.875 Path 84
 *         (descending, gold) sweeps north → south.
 *   0.50  AS OF OCTOBER 2026 · 0.625 16 frames processed · 0.75 12 ascending · 0.875 4 descending (swatches = the
 *         footprint colours) · 1.0 legend · 1.125 source. Each readable ≥ 1.6 s.
 *  B · END CARD (54–60)
 *   2.00  BAR 28: the TL leaves the bowl — contour → ring, crimson → white-hot → cyan — on an arc (≈ 360 px, peak
 *         ≈ 800 px/s) to the orbital swoosh of the white EGG lockup (ring size, aspect and tilt measured from the PNG).
 *   2.25  the map dissolves while receding; 2.5 → 2.81 the overview text unscans, top to bottom, on 32nds.
 *   2.50  PROJECT (kicker) + the official LInOG logo, wiped in left → right with a feathered edge (≈ 55.0) ·
 *         2.75 full name · 2.875 tagline.
 *   2.75  the EGG globe unmasks radially around the ring and the ring's arcs slip behind it (the TL is clipped by the
 *         growing globe disc): the ring takes the artwork's white and becomes the logo's orbit; a cyan satellite
 *         bead + streak carries the through-line. 2.875 the lab wordmark wipes in.
 *   2.875 a white hairline draws out from the centre and opens into the partner band on the 55.0 beat; 3.125 → 3.56
 *         logos (+ captions) fade + rise left → right on 32nds; 3.625 JAXA/METI credit; 3.75 footer (read by ≈ 55.9).
 *   4.00  BAR 29 (56.0 hit): orbital ripple + ring flare. Then the card holds with gentle motion: the satellite keeps
 *         orbiting (one orbit per two bars, behind the globe and out again), the kicker's tracking breathes open, the
 *         ring glow breathes on the beat, the camera pushes ×1.04 per section. 57–60: the runtime fade to black.
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, G = L.geo, TAU = Math.PI * 2;
  const clamp = L.clamp, lerp = L.lerp, sp = L.sp;
  const T0 = 52, FOCUS = [960, 540];
  const BOWL = L.CABANATUAN_BOWL;

  /* ------------------------------------------------------------ timing (lt) */
  const PB = 1.5;          // pull-back spring (starts on the 52.0 bar)
  const T_GO = 2.0;        // 54.0 bar: the TL leaves the bowl for the EGG mark
  const T_OUT = 2.25;      // the map dissolves
  const T_HERO = 2.5;      // end card: kicker + logo wipe (the logo's right edge clears the column as it unscans)
  const T_BAND = 3.0;      // 55.0: partner band

  /* ------------------------------------------------------------ overview: all processed data (world px) */
  const OV = { lon: 121.05, lat: 15.825, ppd: 335, cx: 600, cy: 540 };   // mosaic → x 261–939, y 79–1001
  const OVB = G.view(OV).pt(BOWL.lon, BOWL.lat);                          // the bowl in the overview
  const S_MIN = 34;                                                       // TL contour in the overview (px)
  const ASC = C.text, DESC = C.gold;                                      // footprint hairlines: ascending · descending
  const RD = { vmax: 5, lift: 0.3 };                                      // real-data colouring = act 5's
  const LAND = '#0E1522';                                                 // act 5's land base (= no data under a product)
  const CTX_A = 0.42;                                                     // act 5 ends with the mosaic dimmed to context
  const HAND = 'P448F0290';
  const LAT_S = 14.45, LAT_N = 17.2;
  const FRONT = { 448: 0.25, 449: 0.3125, 447: 0.375, 84: 0.875 };       // pass start (lt)
  const SWEEP = 1.15;                                                     // pass duration (spring)
  const FRAMES = (L.real.frames || []).map((f) => {
    const [tl, bl, br, tr] = f.corners;
    return { id: f.id, path: f.path, asc: f.dir !== 'descending', c: f.corners, s: (bl[1] + br[1]) / 2, n: (tl[1] + tr[1]) / 2 };
  });
  const passDone = (path) => FRONT[path] + SWEEP;
  const ASC_DONE = Math.max(passDone(447), passDone(448), passDone(449)), DESC_DONE = passDone(84);

  /** The hand-off picture: act 5's map (L.CABANATUAN_VIEW in its world) under act 5's final camera, expressed in this
   *  act's world at lt = 0 → {ppd, x, y (the bowl), zr (act 5's camera zoom / ours: world hairlines and dashes are
   *  scaled by it so they land on screen exactly as act 5 drew them)}. Pure: act 5's focus is constant or pure. */
  let HV = null;
  function handView() {
    if (HV) return HV;
    const s5 = L.scenes.find((s) => s.id === 'act5');
    const t = T0 - 1e-6;
    const f5 = s5 ? (typeof s5.focus === 'function' ? s5.focus(t - s5.t0) : s5.focus) : null;
    const c5 = L.cam(t, f5), c6 = L.cam(T0, FOCUS);
    const v5 = G.view(L.CABANATUAN_VIEW);
    const [sx, sy] = c5.toScreen(...v5.pt(BOWL.lon, BOWL.lat));
    const [wx, wy] = c6.toWorld(sx, sy);
    HV = { ppd: (L.CABANATUAN_VIEW.ppd * c5.z) / c6.z, x: wx, y: wy, zr: c5.z / c6.z, c5 };
    return HV;
  }
  const pullK = (lt) => sp(lt, 0, PB);
  const mapAlpha = (lt) => 1 - sp(lt, T_OUT, 0.7);
  /** Map view at lt (world): log-zoom + bowl glide from the hand-off to the overview; recedes 7 % as it dissolves. */
  function mapAt(lt) {
    const h = handView(), u = pullK(lt), rec = sp(lt, T_OUT, 0.9);
    const ppd = Math.exp(lerp(Math.log(h.ppd), Math.log(OV.ppd), u)) * (1 - 0.07 * rec);
    const x = lerp(h.x, OVB[0], u), y = lerp(h.y, OVB[1], u);
    return { ppd, x, y, v: G.view({ lon: BOWL.lon, lat: BOWL.lat, ppd, cx: x, cy: y }) };
  }
  function frontLat(path, lt) {
    const k = sp(lt, FRONT[path], SWEEP);
    return path === 84 ? lerp(16.75, LAT_S, k) : lerp(LAT_S, LAT_N, k);
  }
  /** 0..1: how far a frame has been acquired by its pass. */
  function revealP(f, lt) {
    const phi = frontLat(f.path, lt);
    return f.asc ? clamp((phi - f.s) / (f.n - f.s)) : clamp((f.n - phi) / (f.n - f.s));
  }
  const mixP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  /** Acquired part of a frame's footprint (view px): behind the front, in the pass direction (front = pts[2] → pts[3]). */
  function revealPoly(f, p, v) {
    const [tl, bl, br, tr] = f.c.map(([lo, la]) => v.pt(lo, la));
    return f.asc ? [bl, br, mixP(br, tr, p), mixP(bl, tl, p)] : [tl, tr, mixP(tr, br, p), mixP(tl, bl, p)];
  }
  function addPoly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  /** Clip to everything but P448 F0290's footprint (as act 5: that frame shows its full-resolution product). */
  function clipOutsideHand(ctx, v) {
    const fp = L.real.footprint(v, HAND);
    ctx.beginPath(); ctx.rect(-4000, -4000, 9920, 9080);
    if (fp) addPoly(ctx, fp);
    ctx.clip('evenodd');
  }
  /** A data layer at full strength, acquired pass by pass (clip = union of the acquired footprints). Once its passes are
   *  complete the unclipped layer fades in underneath, so cells just outside the 4-corner footprints arrive gently. */
  function drawPassLayer(ctx, lt, v, layer, asc, done, smooth) {
    const full = clamp(sp(lt, done, 0.4));
    ctx.save();
    if (asc) clipOutsideHand(ctx, v);
    if (full > 0.002) L.real.draw(ctx, v, layer, { ...RD, opacity: full, smooth });
    if (full < 0.998) {
      ctx.beginPath();
      let n = 0;
      for (const f of FRAMES) {
        if (f.asc !== asc || f.id === HAND) continue;
        const p = revealP(f, lt);
        if (p > 0.001) { addPoly(ctx, revealPoly(f, p, v)); n++; }
      }
      if (n) { ctx.clip(); L.real.draw(ctx, v, layer, { ...RD, smooth }); }
    }
    ctx.restore();
  }
  // act 5's caches, rebuilt identically (pure): the focus product as a 2× nearest copy (crisp 90 m pixels when drawn
  // smoothed) and the "no data" hatch tile
  let FOCUS2X = null, HATCH = null;
  function ensure() {
    if (!FOCUS2X && L.real.focus) {
      const c = L.real.canvas('focus', RD);
      const up = L.canvas(c.width * 2, c.height * 2), x = up.getContext('2d');
      x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, up.width, up.height);
      FOCUS2X = up;
    }
    if (!HATCH) {
      const t = L.canvas(9, 9), x = t.getContext('2d');
      x.strokeStyle = 'rgba(159,176,200,0.16)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(-1, 10); x.lineTo(10, -1); x.moveTo(-1, 1); x.lineTo(1, -1); x.moveTo(8, 10); x.lineTo(10, 8); x.stroke();
      HATCH = t;
    }
  }

  function drawMap(ctx, lt, M, cam) {
    const a = mapAlpha(lt);
    if (a <= 0.002) return;
    ensure();
    const z = cam.z, v = M.v, H5 = handView(), zr = H5.zr, u = pullK(lt);
    const smooth = (M.ppd * z) / 400 < 2;        // mosaic cells under 2 px: resample smoothly (act 5: crisp cells)
    ctx.save();
    ctx.globalAlpha *= a;
    // land base + "no data" hatch (anchored to the map, as act 5); the hatch gives way to a coastline as we pull back
    G.drawLand(ctx, v, { which: 'ph', fill: LAND });
    const hk = 1 - sp(lt, 0.25, 0.9);
    if (hk > 0.002) {
      // clipped exactly as act 5 clips it: G.clipLand under act 5's final camera, with the view that puts our current
      // map in the same place on screen → identical at the cut (with or without the clipLand transform fix), then it
      // moves with the map as it pulls back
      ctx.save();
      const c5 = H5.c5, Tm = ctx.getTransform();
      const vp = G.view({ lon: BOWL.lon, lat: BOWL.lat, ppd: (M.ppd * z) / c5.z, cx: (M.x * z + cam.e - c5.e) / c5.z, cy: (M.y * z + cam.f - c5.f) / c5.z });
      ctx.setTransform(c5.z, 0, 0, c5.z, c5.e, c5.f);
      G.clipLand(ctx, vp, 'luzon');
      ctx.setTransform(Tm);
      // tile = 9 px of act 5's world, anchored on 121°E 15.5°N like act 5's → the same lattice on screen at the cut
      const pat = ctx.createPattern(HATCH, 'repeat'), T = 9 * zr;
      pat.setTransform(new DOMMatrix([zr, 0, 0, zr, v.x(121) % T, v.y(15.5) % T]));
      ctx.globalAlpha *= hk; ctx.fillStyle = pat; ctx.fillRect(-20, -20, L.W + 40, L.H + 40);
      ctx.restore();
    }
    // ascending mosaic: act 5's dimmed context everywhere but P448 F0290, brightened as the passes re-acquire it
    if (full(lt) < 0.998) {
      ctx.save(); clipOutsideHand(ctx, v);
      L.real.draw(ctx, v, 'asc', { ...RD, opacity: CTX_A, smooth });
      ctx.restore();
    }
    drawPassLayer(ctx, lt, v, 'asc', true, ASC_DONE, smooth);
    // P448 F0290 at full resolution, from the hand-off to the end
    const b = L.real.bounds('focus');
    if (FOCUS2X && b) {
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(FOCUS2X, v.x(b.lon0), v.y(b.lat0), v.x(b.lon1) - v.x(b.lon0), v.y(b.lat1) - v.y(b.lat0));
      ctx.restore();
    }
    // the descending frames join (Path 84, north → south)
    if (lt > FRONT[84]) drawPassLayer(ctx, lt, v, 'desc', false, DESC_DONE, smooth);
    // coastline, once we are wide enough to need it
    const ck = sp(lt, 0.3, 0.8);
    if (ck > 0.002) G.drawLand(ctx, v, { which: 'ph', stroke: L.rgba(C.cyan, 0.4 * clamp(ck)), lw: 1.2 });
    // footprints: act 5's dotted hairline, one per frame as its pass acquires it (descending: gold, a little bolder)
    ctx.lineJoin = 'round';
    const lw = 1.2 * zr, dash = [2 * zr, 5 * zr], dashD = [3.5 * zr, 3.5 * zr];
    for (const f of FRAMES) {
      const hand = f.id === HAND, p = hand ? 1 : revealP(f, lt);
      if (p <= 0.001) continue;
      const pts = hand ? L.real.footprint(v, HAND) : revealPoly(f, p, v), col = f.asc ? ASC : DESC;
      ctx.save();
      ctx.strokeStyle = L.rgba(col, f.asc ? 0.32 + 0.12 * u : 0.9); ctx.lineWidth = f.asc ? lw : 1.5 * zr; ctx.setLineDash(f.asc ? dash : dashD);
      ctx.beginPath(); addPoly(ctx, pts); ctx.stroke();
      ctx.restore();
      if (p < 1) { // the acquisition front glows
        const k = Math.sin(Math.PI * p), fc = f.asc ? C.cyan : C.gold;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = L.rgba(fc, 0.25 * k); ctx.lineWidth = 7 / z;
        ctx.beginPath(); ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.stroke();
        ctx.strokeStyle = L.rgba(fc, 0.85 * k); ctx.lineWidth = 1.6 / z;
        ctx.beginPath(); ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  const full = (lt) => clamp(sp(lt, ASC_DONE, 0.4));
  /** act 5's screen vignette (it ends the act at 0.42); it lifts with the map so the end card's white band stays white. */
  function drawVignette(ctx, lt) {
    const a = 0.42 * mapAlpha(lt);
    if (a <= 0.002) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(L.W / 2, L.H / 2, L.H * 0.42, L.W / 2, L.H / 2, L.H * 1.08);
    vg.addColorStop(0, 'rgba(3,6,12,0)'); vg.addColorStop(1, `rgba(3,6,12,${a.toFixed(3)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, L.W, L.H);
    ctx.restore();
  }

  /* ------------------------------------------------------------ overview text column (world px, right of the map) */
  const COL = 1110;
  const OUT = (i) => 2.5 + 0.0625 * i;                     // unscan, top to bottom
  const colP = (lt, a, i, dur = 0.38) => Math.min(sp(lt, a, dur), 1 - sp(lt, OUT(i), 0.3));
  const VBAR = { x: COL, y: 606, w: 320, h: 10 };
  let VBAR_C = null;
  function vbarCanvas() {
    if (VBAR_C) return VBAR_C;
    const c = L.canvas(VBAR.w * 2, 1), x = c.getContext('2d'), id = x.createImageData(VBAR.w * 2, 1);
    for (let i = 0; i < VBAR.w * 2; i++) { const rgb = L.velRGB(((i + 0.5) / (VBAR.w * 2)) * 10 - 5, 5); id.data.set([rgb[0], rgb[1], rgb[2], 255], i * 4); }
    x.putImageData(id, 0, 0);
    return (VBAR_C = c);
  }
  // footprint-shaped swatch (a parallelogram leaning like an ALOS frame)
  function swatch(ctx, x, y, col, p, asc) {
    if (p <= 0.01) return;
    const w = 26, h = 18, sk = asc ? -5 : 5;
    ctx.save(); ctx.globalAlpha *= clamp(p);
    ctx.beginPath(); ctx.moveTo(x + sk, y - h); ctx.lineTo(x + w + sk, y - h); ctx.lineTo(x + w - sk, y); ctx.lineTo(x - sk, y); ctx.closePath();
    ctx.fillStyle = L.rgba(col, 0.16); ctx.fill();
    ctx.strokeStyle = L.rgba(col, 0.9); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  function drawColumn(ctx, lt) {
    if (lt < 0.45 || lt > 3.1) return;
    // headline + rule
    const p0 = colP(lt, 0.5, 0);
    L.text(ctx, L.caps('As of October 2026'), COL, 318, { kind: 'display', size: 46, weight: 700, tracking: 0.03, color: C.text, p: p0, role: 'headline', id: 'a6-asof' });
    const pr = Math.min(sp(lt, 0.5625, 0.5), 1 - sp(lt, OUT(0), 0.3));
    if (pr > 0.002) { ctx.fillStyle = L.rgba(C.cyan, 0.9); ctx.fillRect(COL, 338, 72 * clamp(pr), 3); }
    // 16 frames processed
    L.text(ctx, [{ s: '16', color: L.ink(C.cyan), weight: 700 }, { s: ' frames processed', color: C.text }], COL, 402,
      { kind: 'display', size: 40, weight: 500, p: colP(lt, 0.625, 1), id: 'a6-n16' });
    // ascending · descending
    const pa = colP(lt, 0.75, 2), pd = colP(lt, 0.875, 3);
    swatch(ctx, COL + 4, 466, ASC, pa, true);
    L.text(ctx, '12 ascending · Paths 447–449', COL + 46, 466, { kind: 'sans', size: 26, weight: 500, color: C.text, p: pa, id: 'a6-asc' });
    swatch(ctx, COL + 4, 510, DESC, pd, false);
    L.text(ctx, '4 descending · Path 84', COL + 46, 510, { kind: 'sans', size: 26, weight: 500, color: C.text, p: pd, id: 'a6-desc' });
    // legend
    const pl = colP(lt, 1.0, 4), ps = colP(lt, 1.125, 5);
    L.text(ctx, 'Vertical velocity (cm/yr)', COL, 590, { kind: 'sans', size: 20, weight: 500, color: C.textDim, p: pl, id: 'a6-lg' });
    if (pl > 0.002) {
      ctx.save();
      ctx.beginPath(); ctx.rect(VBAR.x, VBAR.y, VBAR.w * clamp(pl * 1.2), VBAR.h); ctx.clip();
      ctx.imageSmoothingEnabled = true; ctx.drawImage(vbarCanvas(), VBAR.x, VBAR.y, VBAR.w, VBAR.h);
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(pl); ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 1;
      ctx.strokeRect(VBAR.x + 0.5, VBAR.y + 0.5, VBAR.w - 1, VBAR.h - 1);
      ctx.fillStyle = 'rgba(230,241,255,0.55)'; ctx.fillRect(VBAR.x + VBAR.w / 2 - 0.5, VBAR.y - 3, 1, VBAR.h + 6);
      ctx.restore();
      const tk = { kind: 'mono', size: 16, weight: 500, p: pl, role: 'deco' };           // act 5's legend ticks
      L.text(ctx, '−5 down', VBAR.x, VBAR.y + 34, { ...tk, color: L.ink(C.crimson) });
      L.text(ctx, '0', VBAR.x + VBAR.w / 2, VBAR.y + 34, { ...tk, color: C.textDim, align: 'center' });
      L.text(ctx, 'up +5', VBAR.x + VBAR.w, VBAR.y + 34, { ...tk, color: L.ink(C.cyan), align: 'right' });
    }
    L.text(ctx, 'LInOG products · real data', COL, 692, { kind: 'sans', size: 18, weight: 500, color: C.textDim, p: ps, id: 'a6-src' });
  }

  /* ------------------------------------------------------------ end card layout (world px) */
  // kicker · the official LInOG logo (hero) · full name · tagline · EGG lockup (+ TL ring) · partner band; footer = screen
  const KICK_Y = 166, LOGO = { top: 188, h: 236 }, NAME_Y = 482, TAG_Y = 520;
  const LOCK = { h: 92, top: 562 };
  const BAND = { y: 694, h: 216 };
  /* The white EGG lockup (assets/logos/egg_lockup_white.png, 632 × 260), measured from the PNG in its own pixels:
   * the orbital swoosh is the centre line of an ellipse (two-arc least-squares fit), the globe its outer circle; the
   * swoosh arcs stop where they would enter the globe (r ≈ 88.5); the lab wordmark starts at x = 179. */
  const EGG = { h: 260, orbit: { x: 78.5, y: 130.1, a: 131.3, b: 30.8, rot: (-67.52 * Math.PI) / 180 }, globe: { x: 83.1, y: 133.0, cut: 88.5 }, word: 179, aspect: 632 / 260 };
  const ASPECT_RING = EGG.orbit.b / EGG.orbit.a;
  function lockGeom() {
    const im = L.img('logo:egg_lockup_white');
    const s = LOCK.h / EGG.h, w = LOCK.h * (im ? im.width / im.height : EGG.aspect);
    const x = 960 - w / 2, y = LOCK.top;
    return { im, s, x, y, w, h: LOCK.h, ox: x + EGG.orbit.x * s, oy: y + EGG.orbit.y * s, gx: x + EGG.globe.x * s, gy: y + EGG.globe.y * s };
  }

  /* ------------------------------------------------------------ the through-line */
  const W_ORB = Math.PI / 2;  // the satellite: one orbit per two bars (rad/s of the ring parameter; L.TL: th = phase / 2)
  const PH_C = 0.5;           // the contour's shape drift (rad/s)
  /** Phase: continuous value AND rate from the hand-off (the runtime carries no phase for a contour), contour drift,
   *  then ramps (smoothstep, integrated) to the ring's orbit rate across the morph. */
  function phaseAt(lt, h) {
    const p0 = h ? h.phase || 0 : 0, r0 = h && isFinite(h.phaseRate) ? h.phaseRate : PH_C;
    const a = 0.5, xa = clamp(lt / a);
    const carry = (r0 - PH_C) * (lt >= a ? a / 2 : a * (xa - xa * xa * xa + 0.5 * xa * xa * xa * xa));
    const d = 1.0, x = (lt - T_GO) / d;
    const ramp = x <= 0 ? 0 : x >= 1 ? d / 2 + (lt - T_GO - d) : d * (x * x * x - 0.5 * x * x * x * x);
    return p0 + PH_C * lt + carry + (2 * W_ORB - PH_C) * ramp;
  }
  const softMax = (a, b) => Math.pow(Math.pow(a, 4) + Math.pow(b, 4), 0.25);
  const settle = (lt) => sp(lt, T_GO + 0.8, 0.6);                        // ring has arrived
  const globeK = (lt) => sp(lt, 2.75, 0.55);                             // globe unmask (radial)
  const flash56 = (lt) => L.inout(lt, 4.0, 5.3, 0.18, 1.0);

  function tlAt(lt, h, cam, pulse) {
    const M = mapAt(lt);
    const [bx, by] = cam.toScreen(M.x, M.y);
    const hs = h ? h.size : 60;
    const r = (M.ppd * cam.z) / handView().ppd;                            // map scale vs the hand-off (z = 1 at lt 0)
    const cSize = lerp(hs, softMax(S_MIN, hs * r), sp(lt, 0.5, 0.7));      // held one beat, then shrinks with the map
    const phase = phaseAt(lt, h), seed = h && h.seed ? h.seed : 7, lw0 = h && h.lw !== undefined ? h.lw : 1;
    const cont = { x: bx, y: by, size: cSize, rot: 0, form: 'contour', phase, seed, energy: 0.42 + 0.22 * pulse, alpha: 1, lw: lw0 };
    if (lt < T_GO) {
      if (!h) return cont;
      const st = L.TL.blend(h, cont, sp(lt, 0, 0.5));
      st.size = cSize;
      return st;
    }
    // BAR 28: contour → ring on an arc to the EGG orbit
    const E = lockGeom();
    const [rx, ry] = cam.toScreen(E.ox, E.oy);
    const rSize = EGG.orbit.a * E.s * cam.z;
    const k = clamp(sp(lt, T_GO, 0.8)), u = sp(lt, T_GO, 1.05), us = clamp(u);
    const dx = rx - bx, dy = ry - by, len = Math.hypot(dx, dy) || 1;
    const bulge = -70 * Math.sin(Math.PI * us);                            // arcs up and over (normal to the chord)
    const x = lerp(bx, rx, u) + (-dy / len) * bulge, y = lerp(by, ry, u) + (dx / len) * bulge;
    const kc = sp(lt, T_GO, 0.5), kw = sp(lt, T_GO + 0.45, 0.6), kf = settle(lt);
    // colour: crimson → white-hot (mid-flight) → cyan; as the globe unmasks the ring takes the artwork's white (it IS
    // the swoosh now) and a cyan satellite glint carries the through-line (drawRingTL)
    let tint = L.mix(L.mix(C.crimson, '#FFFFFF', clamp(kc)), C.cyan, clamp(kw));
    tint = L.mix(tint, '#FFFFFF', clamp(globeK(lt)));
    const st = L.TL.state({
      x, y, size: lerp(cSize, rSize, sp(lt, T_GO + 0.125, 0.9)), rot: lerp(0, EGG.orbit.rot, sp(lt, T_GO, 0.9)),
      form: 'contour', to: 'ring', k, aspect: ASPECT_RING, phase, seed, alpha: 1, lw: lerp(lw0, 1.25, k),
      energy: lerp(0.42 + 0.22 * pulse, 0.3 + 0.12 * pulse, clamp(kf)) + 0.35 * L.inout(lt, T_GO, T_GO + 1.2, 0.3, 0.6) + 0.55 * flash56(lt),
      tint: tint.map(Math.round),
    });
    if (k >= 0.9995) { st.form = 'ring'; st.to = null; st.k = 0; }
    return st;
  }

  /* ------------------------------------------------------------ end card drawing */
  const kickTracking = (lt) => 0.3 + 0.06 * L.ease.inOutSine((lt - 3.0) / 5.0);   // breathes open through the hold
  const logoK = (lt) => sp(lt, T_HERO, 0.6);
  let SCR = null;                                                                  // scratch canvas (fully redrawn on use)
  /** The official LInOG logo (hero): a feathered wipe left → right, the way the satellite's beam reads the letters,
   *  rising 10 px into place. Drawn at screen resolution from the 983 × 462 source; never stretched or recoloured. */
  function drawLogo(ctx, lt, im, cam) {
    const k = logoK(lt);
    if (k <= 0.001) return;
    const h = LOGO.h, w = (h * im.width) / im.height, x = 960 - w / 2, y = LOGO.top + 10 * (1 - clamp(k));
    if (k >= 0.999) { L.drawImg(ctx, im, x, y, w, h, { id: 'a6-linog' }); return; }
    const [sx, sy] = cam.toScreen(x, y), sw = w * cam.z, sh = h * cam.z;
    const cw = Math.ceil(sw) + 2, ch = Math.ceil(sh) + 2;
    if (!SCR || SCR.width < cw || SCR.height < ch) SCR = L.canvas(Math.max(cw, 1200), Math.max(ch, 600));
    const s = SCR.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    s.clearRect(0, 0, cw, ch);
    s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high';
    s.drawImage(im, 0, 0, sw, sh);
    const F = 0.16 * sw, edge = -F + (sw + 2 * F) * clamp(k);                     // feathered edge, F px wide
    const g = s.createLinearGradient(edge - F, 0, edge, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    s.globalCompositeOperation = 'destination-in'; s.fillStyle = g; s.fillRect(0, 0, cw, ch);
    s.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(SCR, 0, 0, cw, ch, sx, sy, cw, ch);
    ctx.restore();
  }
  function drawHero(ctx, lt, cam) {
    const p = sp(lt, T_HERO, 0.35);
    if (p <= 0.001) return;
    const logo = L.img('logo:linog');
    if (logo) {
      L.text(ctx, L.caps('Project'), 960, KICK_Y, { kind: 'display', size: 32, weight: 700, tracking: kickTracking(lt), color: C.text, align: 'center', p, role: 'headline', id: 'a6-kick' });
      drawLogo(ctx, lt, logo, cam);
      return;
    }
    // fallback while assets/logos/linog.png is missing: the wordmark, centred on the logo's slot
    L.text(ctx, [{ s: L.caps('Project '), color: C.text }, { s: 'LInOG', color: C.cyan }], 960, LOGO.top + LOGO.h / 2 + 34,
      { kind: 'display', size: 96, weight: 700, tracking: 0.02 + 0.012 * L.ease.inOutSine((lt - 3.0) / 5.0), align: 'center', p, role: 'headline', id: 'a6-title' });
  }
  function drawNames(ctx, lt) {
    L.text(ctx, 'Leveraging InSAR for Observation and Modeling of Earthquake Generators', 960, NAME_Y,
      { kind: 'sans', size: 30, weight: 500, color: C.text, align: 'center', p: sp(lt, 2.75, 0.4), id: 'a6-name' });
    L.text(ctx, 'Measuring mm-scale crustal movements from space', 960, TAG_Y,
      { kind: 'sans', size: 25, weight: 500, color: C.textDim, align: 'center', p: sp(lt, 2.875, 0.4), id: 'a6-tag' });
  }
  /** The white EGG lockup: the globe unmasks radially around the ring, then the lab wordmark wipes in. */
  function drawLockup(ctx, lt, E) {
    if (!E.im) return;
    const g = globeK(lt), pw = sp(lt, 2.875, 0.5);
    if (g > 0.002) {
      const R = 140 * E.s * clamp(g, 0, 1.02);
      ctx.save();
      ctx.beginPath(); ctx.rect(E.x - 4, E.y - 4, EGG.word * E.s + 2, E.h + 8); ctx.clip();
      ctx.beginPath(); ctx.arc(E.gx, E.gy, Math.max(0.5, R), 0, TAU); ctx.clip();
      L.drawImg(ctx, E.im, E.x, E.y, E.w, E.h, { alpha: clamp(g * 1.6) });
      ctx.restore();
      if (g < 0.995) { // the unmask front: a faint cyan ring
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = L.rgba(C.cyan, 0.5 * Math.sin(Math.PI * clamp(g))); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(E.gx, E.gy, R, 0, TAU); ctx.stroke(); ctx.restore();
      }
    }
    if (pw > 0.002) {
      const x0 = E.x + EGG.word * E.s - 2, ww = (E.x + E.w + 2 - x0) * clamp(pw);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, E.y - 4, ww, E.h + 8); ctx.clip();
      L.drawImg(ctx, E.im, E.x, E.y, E.w, E.h, { alpha: 1 });
      ctx.restore();
      if (pw < 0.995) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.rgba(C.cyan, 0.85 * Math.sin(Math.PI * clamp(pw)));
        ctx.fillRect(x0 + ww, E.y + E.h * 0.3, 2, E.h * 0.4); ctx.restore();
      }
    }
    if (g >= 0.98 && pw >= 0.98) L.LAYOUT.panels.push({ ...L.screenBox(ctx, E.x, E.y, E.w, E.h), fill: null, img: 'a6-egg' });
  }
  /** Point of the TL ring ellipse at parameter th (screen). */
  function ringPt(tl, th) {
    const asp = tl.aspect === undefined ? 0.34 : tl.aspect, cr = Math.cos(tl.rot), sr = Math.sin(tl.rot);
    const ax = Math.cos(th) * tl.size, ay = asp * Math.sin(th) * tl.size;
    return [tl.x + ax * cr - ay * sr, tl.y + ax * sr + ay * cr];
  }
  /** The TL, clipped by the globe disc as it unmasks (its arcs pass behind the globe, exactly like the swoosh in the
   *  logo), plus the satellite glint (cyan comet tail + glow + white core) and the 56.0 orbital ripple. */
  function drawRingTL(ctx, env, E) {
    const tl = env.tl, cam = env.cam, lt = env.lt;
    const [gx, gy] = cam.toScreen(E.gx, E.gy);
    const rc = Math.min(140 * clamp(globeK(lt), 0, 1.02), EGG.globe.cut) * E.s * cam.z;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (rc > 0.5) { ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.arc(gx, gy, rc, 0, TAU); ctx.clip('evenodd'); }
    env.drawTL();
    const wr = L.TL.weight(tl, 'ring');
    if (wr > 0.01) {
      const th = (tl.phase || 0) * 0.5, gk = clamp(globeK(lt) * 1.4) * wr;
      if (gk > 0.01) {
        // a cyan streak painted over the white swoosh (source-over, so it reads on white), fading behind the bead
        ctx.save(); ctx.lineCap = 'round';
        const n = 18, span = 1.0, sc = clamp(tl.size / 48, 0.8, 1.3);
        let prev = ringPt(tl, th);
        for (let i = 1; i <= n; i++) {
          const q = ringPt(tl, th - (span * i) / n), f = 1 - (i - 1) / n;
          ctx.strokeStyle = L.rgba(C.cyan, 0.9 * gk * f * f); ctx.lineWidth = 3.4 * sc * (0.3 + 0.7 * f);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
          prev = q;
        }
        const [dx, dy] = ringPt(tl, th);
        ctx.fillStyle = L.rgba(C.cyan, gk); ctx.beginPath(); ctx.arc(dx, dy, 4.2 * sc, 0, TAU); ctx.fill();
        ctx.fillStyle = L.rgba('#FFFFFF', gk); ctx.beginPath(); ctx.arc(dx, dy, 1.9 * sc, 0, TAU); ctx.fill();
        ctx.restore();
        L.glow(ctx, dx, dy, (20 + 6 * env.pulse) * sc, C.cyan, 0.7 * gk * (0.75 + 0.25 * env.pulse));
      }
      const age = lt - 4.0; // 56.0: one orbital ripple
      if (age > 0 && age < 1.5) {
        const asp = tl.aspect === undefined ? 0.34 : tl.aspect;
        const s = 1 + 0.9 * L.sp(age, 0, 1.3), a = 0.42 * Math.pow(1 - age / 1.5, 1.4);
        ctx.translate(tl.x, tl.y); ctx.rotate(tl.rot);
        ctx.strokeStyle = L.rgba(C.cyan, a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, tl.size * s, asp * tl.size * s, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ partner band */
  const SLATE = '#334155', SLATE2 = '#475569';
  const CAP = { kind: 'sans', size: 17, weight: 600, color: SLATE, bg: '#FFFFFF', align: 'center', tracking: 0.01 };
  const NOTE = { kind: 'sans', size: 15, weight: 500, color: SLATE2, bg: '#FFFFFF', align: 'center' };
  // optical heights (px): round seals 100, the square DOST marks 92, wide marks 58–80
  const GROUPS = [
    { cap: 'Implementing agency', logos: [['logo:up_seal', 100], ['logo:nigs', 100]] },
    { cap: 'Funded by', logos: [['logo:dost_pcieerd', 92]] },
    { cap: 'Supporting agencies', logos: [['logo:dost_phivolcs', 92], ['logo:philsa', 58]] },
    { cap: 'Partners', logos: [['logo:up_csrc', 100], ['logo:up_isc', 80]] },
    { cap: 'Satellite data', logos: [['logo:jaxa', 62]], note: 'ALOS PALSAR data © JAXA/METI' },
  ];
  let BANDL = null;
  function bandLayout(ctx) {
    if (BANDL) return BANDL;
    const pad = 44, gapL = 26, gapG = 66;
    let complete = true, j = 0;
    const groups = GROUPS.map((g) => {
      const logos = g.logos.map(([name, hh]) => {
        const im = L.img(name); if (!im) complete = false;
        return { name, im, w: im ? (hh * im.width) / im.height : hh, h: hh, j: j++ };
      });
      const lw = logos.reduce((s, q) => s + q.w, 0) + gapL * (logos.length - 1);
      const w = Math.max(lw, L.measure(ctx, g.cap, CAP).w, g.note ? L.measure(ctx, g.note, NOTE).w : 0);
      return { ...g, logos, lw, w };
    });
    const bw = groups.reduce((s, g) => s + g.w, 0) + gapG * (groups.length - 1) + 2 * pad;
    const out = { x: 960 - bw / 2, y: BAND.y, w: bw, h: BAND.h, groups, divs: [] };
    let x = out.x + pad;
    groups.forEach((g, i) => {
      g.cx = x + g.w / 2;
      let lx = g.cx - g.lw / 2;
      for (const q of g.logos) { q.x = lx; lx += q.w + gapL; }
      if (i) out.divs.push(x - gapG / 2);
      x += g.w + gapG;
    });
    if (complete && document.fonts.status === 'loaded') BANDL = out;
    return out;
  }
  const logoAt = (j) => T_BAND + 0.125 + 0.0625 * j;      // 8 logos on 32nds, left → right
  /** Band captions arrive like the logos: fade + rise (scanlines read as noise on white). */
  function riseText(ctx, str, x, y, o, k, id) {
    if (k <= 0.002) return;
    ctx.save(); ctx.translate(0, (1 - k) * 10);
    L.text(ctx, str, x, y, { ...o, p: k, mode: 'fade', id });
    ctx.restore();
  }
  function drawBand(ctx, lt) {
    const pw = sp(lt, T_BAND - 0.125, 0.45);                  // a hairline draws out from the centre…
    if (pw <= 0.002) return;
    const B = bandLayout(ctx), ph = sp(lt, T_BAND, 0.5);       // …and opens into the band on the 55.0 beat
    const cy = B.y + B.h / 2, w = B.w * clamp(pw, 0, 1.004), h = Math.max(2, B.h * clamp(ph, 0, 1.004));
    const x = 960 - w / 2, y = cy - h / 2;
    ctx.save();
    L.roundRect(ctx, x, y, w, h, Math.min(16, h / 2)); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.clip();
    // dividers grow from the middle
    ctx.fillStyle = '#D5DDE7';
    const dh = (B.h - 60) * clamp(sp(lt, T_BAND + 0.3, 0.5));
    for (const dx of B.divs) ctx.fillRect(dx - 0.5, cy - dh / 2, 1, dh);
    const rowC = B.y + 124;
    for (const g of B.groups) {
      const a = logoAt(g.logos[0].j);
      riseText(ctx, g.cap, g.cx, B.y + 42, CAP, clamp(sp(lt, a, 0.45)), 'a6-cap-' + g.logos[0].j);
      for (const q of g.logos) {
        const k = clamp(sp(lt, logoAt(q.j), 0.45));
        if (k <= 0.002 || !q.im) continue;
        L.drawImg(ctx, q.im, q.x, rowC - q.h / 2 + (1 - k) * 16, q.w, q.h, { alpha: k, id: 'a6-' + q.name, bg: '#FFFFFF' });
      }
      if (g.note) riseText(ctx, g.note, g.cx, B.y + 194, NOTE, clamp(sp(lt, T_BAND + 0.625, 0.45)), 'a6-jaxa');
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ scene */
  L.scene({
    id: 'act6', t0: T0, t1: T0 + 8,
    focus: FOCUS,
    init() {
      handView(); vbarCanvas(); ensure();
      for (const layer of ['asc', 'desc']) L.real.canvas(layer, RD);
    },
    tl(env) { return tlAt(env.lt, env.handoff, env.cam, env.pulse); },
    draw(ctx, env) {
      const lt = env.lt, cam = env.cam;
      if (lt < 3.0) { drawMap(ctx, lt, mapAt(lt), cam); drawVignette(ctx, lt); }
      drawColumn(ctx, lt);
      const E = lockGeom();
      if (lt >= T_HERO - 0.05) { drawHero(ctx, lt, cam); drawNames(ctx, lt); }
      if (lt >= 2.7) drawLockup(ctx, lt, E);
      drawRingTL(ctx, env, E);
      if (lt >= T_BAND - 0.125) drawBand(ctx, lt);
    },
    overlay(ctx, env) {
      const lt = env.lt;
      if (lt < 3.7) return;
      L.text(ctx, 'Values: LInOG Year-2 report (2026) · velocity maps: LInOG products · other graphics schematic', 960, 1000,
        { kind: 'sans', size: 18, weight: 500, color: C.textDim, align: 'center', p: sp(lt, 3.75, 0.45), id: 'a6-foot' });
    },
  });
})();

/* Act 1 · The hook & mission (0–10 s, bars 1–5). No HUD. Camera sections [0,4] and [4,10].
 *
 * Beat plan (local = global time; 1 beat = 0.5 s, 1 bar = 2 s):
 *  A · bars 1–2 · kinetic type "THE EARTH NEVER / STOPS MOVING." (Space Grotesk 700, 136 px)
 *   0.00  TL (cyan L-band pulse) enters from off-screen left (x ≈ −130, already moving: pre-rolled
 *         spring) on the line-2 cut height, trailing a faint flat trace; on screen within the first beat.
 *   0.50  "THE" scans in; the λ bracket draws on under the pulse, trough → trough (= one wavelength).
 *   1.00  "EARTH" + mono callout "L-BAND · λ = 23.6 cm" · 1.50 "NEVER".
 *   2.00  bar 2: "STOPS" lands and the pulse launches (velocity spring 2.0, brake on beat 3.5). From
 *         here its carrier is phase-locked to a world-fixed sine, so the cut it leaves behind IS its own
 *         wave: line 2 splits along that sine (upper half lifts 3 px / shears left, lower half drops /
 *         shears right, continuous affine ramp — no strips), thin cyan seam in the 6 px gap.
 *         The callout stays parked: its bracket now spans one wavelength of the seam left behind.
 *   2.50  "MOVING." lands (0.3 s); the packet's leading edge only reaches it at ~2.95 s.
 *   3.50  callout unmasks; the pulse brakes just past the type (the cut is complete) at ~3.8 s.
 *  B · bars 3–5 · pull out to low Earth orbit (one shared zoom curve)
 *   4.00  bar 3: the camera leaves the surface — the type shrinks into central Luzon while the globe
 *         unmasks from that point (iris 0.5 s) and its radius springs 5× → 1× (log, 1.5 s); line 1
 *         unmasks at 4.0, line 2 at 4.25 (gone by ~4.6). Oblique view from the SSE, north ≈ up.
 *         Same downbeat: the TL lifts off (spring 1.4 s, peak ≈ 0.9 kpx/s) and arcs over the receding
 *         type into the antenna's beam, shrinking to its in-act size (~55 px) and starting to scroll.
 *   4.50  ALOS-1 builds on its projected great-circle orbit. Geometry is physical: sub-satellite point
 *         4.36° WSW of the footprint (right-looking, ascending), altitude 0.1086 R (691.65 km), PALSAR
 *         face square to the beam; satellite and footprint advance north together.
 *   4.5–5.5 one contiguous, flat, translucent cloud deck condenses over central/northern Luzon and the
 *         sea off Ilocos (C.text 0.15–0.33, three posterised tiers, cached fbm texture; drifts west).
 *   5.00  map label "LUZON · PHILIPPINES" (backplate + leader to the east coast).
 *   5.50  beam reaches down from the antenna; one bright wavefront leaves on every quarter note and lands
 *         on the next (ground ripple). The lower beam runs UNDER the cloud deck; its wavefronts glow
 *         through it. Satellite tag "ALOS-1 PALSAR · ASCENDING PASS" rides beside the satellite
 *         (+ 6.0 "L-band radar sees through cloud").
 *   6.00  bar 4: first wavefront lands — footprint + imaged path-448 strip start: the SAR texture shows
 *         through a soft hole the beam punches in the deck (pulses on the beat) and a window that grows
 *         north with the strip. "Project LInOG" scans in (top-left, in space); 6.5 expansion (2 lines);
 *         7.0 lab eyebrow above the title.
 *   7.0–8.5 acronym decode on quarter notes: L · In · O · G turn cyan in the expansion, with ticks.
 *   7.00  plain-language mission (sans 26): "Mapping ground motion in Central Luzon" /
 *         "from satellite radar · 2007–2011".
 *   9.00  labels, captions, title, orbit unmask; satellite un-builds; the TL travels down the beam (the
 *         beam drains completely behind it), rotating to horizontal and growing slightly.
 *   9.50  an iris contracts onto the footprint (globe, clouds, strip) — closed by ~9.85.
 *  10.00  only the TL remains: pure 'pulse', rot 0, size ≈ 62 (its in-act size), centre ≈ (1200, 608).
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, G = L.geo, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const DUR = 10;
  const clamp = L.clamp, lerp = L.lerp;

  /* ================================================================ shared helpers */
  let _mctx = null;
  const mctx = () => _mctx || (_mctx = L.canvas(8, 8).getContext('2d'));
  /** Our own camera (identical to the runtime's for t < 10) so the hand-off measured at lt = dur
   *  uses this act's camera, not act 2's. */
  const camAt = (t) => L.cam(Math.min(t, DUR - 1e-6));
  /** Interlaced scanline clip (same look as core text reveals). */
  function scanClip(ctx, x, y, w, h, p, rowH = 3) {
    const rows = Math.max(1, Math.ceil(h / rowH));
    const f1 = clamp(p * 2), f2 = clamp(p * 2 - 1);
    ctx.beginPath();
    for (let i = 0; i < rows; i++) {
      const fr = (i + 0.5) / rows;
      if (fr <= (i % 2 === 0 ? f1 : f2)) ctx.rect(x, y + i * rowH, w, rowH + 0.6);
    }
    ctx.clip();
  }
  function scanBar(ctx, x, y, w, h, p, color = C.cyan) {
    if (p <= 0 || p >= 1) return;
    const f = p < 0.5 ? p * 2 : p * 2 - 1, yy = y + h * f, a = 0.8 * Math.sin(Math.PI * p);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = L.rgba(color, a); ctx.fillRect(x, yy - 1, w, 2);
    ctx.fillStyle = L.rgba(color, a * 0.22); ctx.fillRect(x, yy - 6, w, 12);
    ctx.restore();
  }
  /** Smooth beat-locked kick: 0 on the beat, rises in ~1/16 note, decays by the next beat (no jump). */
  function kick(t) {
    const f = (((t / 0.5) % 1) + 1) % 1;
    return (1 - Math.exp(-f * 16)) * Math.exp(-f * 4.2) * 1.62;
  }

  /* ================================================================ A · kinetic type */
  const TYPE = { kind: 'display', size: 136, weight: 700, tracking: -0.01 };
  const WORDS = [
    { s: 'THE', line: 0, at: 0.5 }, { s: 'EARTH', line: 0, at: 1.0 }, { s: 'NEVER', line: 0, at: 1.5 },
    { s: 'STOPS', line: 1, at: 2.0 }, { s: 'MOVING.', line: 1, at: 2.5 },
  ];
  const BASE = [474, 640]; // baselines (world px)
  let TYPE_LAY = null;
  function typeLayout() {
    if (TYPE_LAY) return TYPE_LAY;
    const c = mctx(), out = { words: [] };
    for (let ln = 0; ln < 2; ln++) {
      const ws = WORDS.filter((w) => w.line === ln);
      const full = L.measure(c, ws.map((w) => w.s).join(' '), TYPE);
      const x0 = 960 - full.w / 2;
      ws.forEach((w, i) => {
        const pre = i ? L.measure(c, ws.slice(0, i).map((v) => v.s).join(' ') + ' ', TYPE).w + TYPE.tracking * TYPE.size : 0;
        out.words.push({ ...w, i: WORDS.indexOf(w), x: x0 + pre, w: L.measure(c, w.s, TYPE).w, y: BASE[ln] });
      });
      Object.assign(out, { capH: full.capH, asc: full.asc, desc: full.desc });
    }
    out.cutY = BASE[1] - out.capH * 0.5;
    out.l2x0 = out.words[3].x; out.l2x1 = out.words[4].x + out.words[4].w;
    if (document.fonts && document.fonts.status === 'loaded') TYPE_LAY = out;
    return out;
  }
  const wordIn = (lt, w) => L.sp(lt, w.at, 0.3);
  const wordRise = (lt, w) => 14 * (1 - L.sp(lt, w.at, 0.5));
  const LINE_OUT = [[4.0, 0.4], [4.25, 0.35]];
  const lineOut = (lt, ln) => 1 - L.sp(lt, LINE_OUT[ln][0], LINE_OUT[ln][1]);

  /* sweep progress 0..1: velocity springs up on bar 2 (2.0 s, slow start) and brakes on the beat at 3.5 s.
   * Leading edge reaches STOPS at ~2.5 s (after it landed) and MOVING. at ~2.97 s (after it landed). */
  const SW_N = 400;
  let SWLUT = null;
  const sweepV = (t) => Math.max(0, Math.pow(L.sp(t, 2.0, 1.3), 2) - L.sp(t, 3.5, 0.5));
  function sweepS(lt) {
    if (lt <= 2.0) return 0;
    if (lt >= 4.0) return 1;
    if (!SWLUT) {
      SWLUT = new Float32Array(SW_N + 1);
      let acc = 0; const dt = 2.0 / SW_N;
      for (let i = 1; i <= SW_N; i++) { const ta = 2.0 + (i - 1) * dt; acc += 0.5 * (sweepV(ta) + sweepV(ta + dt)) * dt; SWLUT[i] = acc; }
      for (let i = 0; i <= SW_N; i++) SWLUT[i] /= acc;
    }
    const f = ((lt - 2.0) / 2.0) * SW_N, i = Math.floor(f);
    return lerp(SWLUT[i], SWLUT[Math.min(SW_N, i + 1)], f - i);
  }
  /* x0 −210 with the spring pre-rolled by 0.2 s → x ≈ −130 at frame 0 (off-screen, already moving at
   * ~650 px/s), x ≈ 170 on the first beat. end: just far enough that the cut clears "MOVING." (~1447 + R). */
  const PA = { size: 110, x0: -210, hold: 270, end: 1550 };
  const LAM = (2 * PA.size) / 3.5;                       // pulse wavelength on screen (cycles 3.5)
  const glideAt = (lt) => lerp(PA.x0, PA.hold, L.sp(lt, -0.2, 1.6));
  const X0 = glideAt(2.0);                               // where the sweep starts; seam phase origin
  const SEAM_A = 0.088 * PA.size;                        // = packet amplitude 0.8·size behind its centre
  const envQ = (q) => (q > 0 && q < 1 ? Math.pow(Math.sin(Math.PI * q), 1.15) : 0);
  /** The pulse in section A (world coordinates). From 2.0 s its phase keeps the carrier world-fixed:
   *  y = y0 − A·cos(2π(x − X0)/λ), exactly the seam it cuts. Before that it glides rigidly (phase π). */
  function pulseA(lt, t) {
    const lay = typeLayout();
    const s = sweepS(lt);
    const x = lt < 2.0 ? glideAt(lt) : X0 + (PA.end - X0) * s;
    const speed = Math.min(1, sweepV(lt));
    return {
      x, y: lay.cutY, size: PA.size, s, speed,
      amp: 1 + 0.08 * kick(t) + 0.08 * speed,
      phase: lt < 2.0 ? Math.PI : Math.PI - (TAU * (x - X0)) / LAM,
      energy: 0.55 + 0.35 * L.pulse(t) + 0.4 * speed,
    };
  }

  /* the cut that the pulse leaves in line 2 */
  const SPLIT = { gap: 6, shear: 3, R: 0.8 * PA.size, OV: 0.9, NR: 6 };
  function splitState(lt, pa) {
    if (lt < 2.0) return null;
    return { front: pa.x, R: SPLIT.R, y0: pa.y, xStart: X0 - PA.size, breath: 1 + 0.25 * kick(lt) };
  }
  const cutY = (sp, x) => sp.y0 - SEAM_A * Math.cos((TAU * (x - X0)) / LAM);
  const openAt = (sp, x) => L.ease.inOutSine(clamp((sp.front - x) / sp.R));

  function drawWordIn(ctx, w, lt, pMax = 1) {
    const p = Math.min(wordIn(lt, w), pMax);
    if (p <= 0.001) return;
    L.text(ctx, w.s, w.x, w.y + wordRise(lt, w), { ...TYPE, color: C.text, p, id: 'a1-w' + w.i });
  }
  /** One half of line 2 over source range [a, b]: the displacement is linear in x inside the range,
   *  so it is one affine map (shear + scale) — adjacent ranges agree at their shared edge → continuous. */
  function drawHalf(ctx, lt, ws, sp, a, b, upper) {
    const sgn = upper ? -1 : 1, br = sp.breath, OV = SPLIT.OV;
    const oa = openAt(sp, a), ob = openAt(sp, b);
    const dxa = sgn * 0.5 * SPLIT.shear * oa * br, dxb = sgn * 0.5 * SPLIT.shear * ob * br;
    const dya = sgn * 0.5 * SPLIT.gap * oa * br, dyb = sgn * 0.5 * SPLIT.gap * ob * br;
    const kx = (dxb - dxa) / (b - a), ky = (dyb - dya) / (b - a);
    ctx.save();
    ctx.transform(1 + kx, ky, 0, 1, dxa - kx * a, dya - ky * a);
    const yE = upper ? sp.y0 - 240 : sp.y0 + 240, xa = a - OV, xb = b + OV;
    ctx.beginPath(); ctx.moveTo(xa, yE); ctx.lineTo(xb, yE);
    const n = Math.max(2, Math.ceil((xb - xa) / 3));
    for (let i = n; i >= 0; i--) { const x = xa + ((xb - xa) * i) / n; ctx.lineTo(x, cutY(sp, x)); }
    ctx.closePath(); ctx.clip();
    for (const w of ws) if (w.x - 6 < xb && w.x + w.w + 6 > xa) L.text(ctx, w.s, w.x, w.y + wordRise(lt, w), { ...TYPE, color: C.text, role: 'deco' });
    ctx.restore();
  }
  /** QA registry for split words: register the word's true (unsplit) box once, drawing nothing. */
  function registerWords(ctx, lt, ws) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 0, 0); ctx.clip();
    for (const w of ws) L.text(ctx, w.s, w.x, w.y + wordRise(lt, w), { ...TYPE, color: C.text, id: 'a1-w' + w.i });
    ctx.restore();
  }
  function drawLine2(ctx, lt, lay, sp) {
    const ws = lay.words.filter((w) => w.line === 1);
    const pOut = lineOut(lt, 1);
    if (pOut <= 0.001) return;
    const bx = lay.l2x0 - 18, bw = lay.l2x1 - lay.l2x0 + 36, by = BASE[1] - lay.asc - 14, bh = lay.asc + lay.desc + 28;
    ctx.save();
    if (pOut < 1) scanClip(ctx, bx, by, bw, bh, pOut);
    if (!sp) { for (const w of ws) drawWordIn(ctx, w, lt); }
    else {
      // intact, ahead of the cut (words still scanning in keep their own reveal)
      ctx.save(); ctx.beginPath(); ctx.rect(sp.front - SPLIT.OV, by - 60, 4000, bh + 120); ctx.clip();
      for (const w of ws) if (w.x + w.w > sp.front - SPLIT.OV) drawWordIn(ctx, w, lt);
      ctx.restore();
      // split, behind the cut: fully revealed halves, no scan bars inside them
      const x0 = lay.l2x0 - 12, xr = sp.front - sp.R, segs = [];
      if (xr > x0) segs.push([x0 - 8, xr]);
      for (let i = 0; i < SPLIT.NR; i++) {
        const a = xr + (sp.R * i) / SPLIT.NR, b = xr + (sp.R * (i + 1)) / SPLIT.NR;
        if (b > x0) segs.push([Math.max(a, x0 - 8), b]);
      }
      for (const [a, b] of segs) if (b - a > 0.5) { drawHalf(ctx, lt, ws, sp, a, b, true); drawHalf(ctx, lt, ws, sp, a, b, false); }
      if (pOut >= 0.6) registerWords(ctx, lt, ws.filter((w) => w.x < sp.front - SPLIT.OV));
    }
    ctx.restore();
    if (pOut < 1) scanBar(ctx, bx, by, bw, bh, pOut);
  }
  function drawSeam(ctx, lt, sp, pa, aOut) {
    const x1 = pa.x - 0.8 * PA.size;               // the packet's own carrier takes over from here
    const x0 = lerp(sp.xStart, x1, 1 - aOut);       // exit: retracts toward the packet
    if (x1 - x0 < 2 || aOut <= 0.002) return;
    const pts = [];
    for (let x = x0; x < x1; x += 2.5) pts.push([x, cutY(sp, x)]);
    pts.push([x1, cutY(sp, x1)]);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    L.poly(ctx, pts); ctx.strokeStyle = L.rgba(C.cyan, 0.16 * aOut); ctx.lineWidth = 4.5; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    L.poly(ctx, pts); ctx.strokeStyle = L.rgba(C.cyan, 0.92 * aOut); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  /* the flat trace the packet has travelled along (left edge → packet tail); the seam continues it */
  function drawTrail(ctx, lt, pa, aOut) {
    if (aOut <= 0.002) return;
    const xEnd = lt < 2.0 ? pa.x - pa.size : X0 - PA.size;
    const x0 = lerp(-80, xEnd, 1 - aOut);
    if (xEnd - x0 < 2) return;
    const g = ctx.createLinearGradient(x0, 0, xEnd, 0);
    g.addColorStop(0, L.rgba(C.cyan, 0)); g.addColorStop(1, L.rgba(C.cyan, 0.42 * aOut));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x0, pa.y - 0.75, xEnd - x0, 1.5); ctx.restore();
  }
  /* λ bracket + callout, parked where the pulse rests in bar 1 (it rides the slow glide, never the sweep) */
  const CALL = { yB: 682, yT: 728 };
  function drawCallout(ctx, lt, pa) {
    const pOut = 1 - L.sp(lt, 3.5, 0.4);
    const pb = Math.min(L.sp(lt, 0.5, 0.5), pOut);
    if (pb <= 0.001) return;
    const bx = lt < 2.0 ? pa.x : X0;
    const xa = bx - LAM / 2, xb = bx + LAM / 2;
    // trough depth below the cut height: the packet's own envelope (its carrier is phase-locked), or the seam left behind
    const depth = (x) => {
      let d = PA.size * pa.amp * 0.34 * envQ((x - pa.x + PA.size) / (2 * PA.size));
      if (lt >= 2.0 && x <= pa.x - 0.8 * PA.size) d = Math.max(d, SEAM_A);
      return d;
    };
    ctx.save();
    ctx.strokeStyle = L.rgba(C.cyan, 0.9); ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
    ctx.setLineDash([2, 3]);
    for (const x of [xa, xb]) {
      const yTr = pa.y + depth(x) + 5;
      ctx.globalAlpha = pb;
      ctx.beginPath(); ctx.moveTo(x, yTr); ctx.lineTo(x, lerp(yTr, CALL.yB, pb)); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const half = (LAM / 2) * pb;
    L.poly(ctx, [[bx - half, CALL.yB - 7 * pb], [bx - half, CALL.yB], [bx + half, CALL.yB], [bx + half, CALL.yB - 7 * pb]]);
    ctx.stroke();
    const pl = Math.min(L.sp(lt, 1.0, 0.4), pOut);
    if (pl > 0.001) { ctx.beginPath(); ctx.moveTo(bx, CALL.yB); ctx.lineTo(bx, lerp(CALL.yB, CALL.yT - 26, pl)); ctx.strokeStyle = L.rgba(C.cyan, 0.55); ctx.stroke(); }
    ctx.restore();
    const pt = Math.min(L.sp(lt, 1.0, 0.45), pOut);
    if (pt > 0.001) { // parameter annotation (mono 20)
      L.text(ctx, [{ s: 'L-BAND', color: C.cyan, weight: 600 }, { s: ' · λ = 23.6 cm', color: C.text }], bx, CALL.yT, { kind: 'mono', size: 20, weight: 400, align: 'center', p: pt, tracking: 0.02, id: 'a1-lband' });
    }
  }

  /* ================================================================ B · low Earth orbit */
  /* Oblique orthographic view from the SSE (north ≈ up). Central Luzon sits at ρ ≈ 0.87 of the disc, so
   * the limb and a thin atmosphere arc across the top-left (space for the title) — the classic LEO look.
   * The view orientation never changes (Earth does not spin in this shot); only the radius zooms. */
  const VIEW = { lon0: 134.5, lat0: -43.25, R: 3000, Z0: 5, aLat: 16.2, ax: 1189, ay: 635 };
  const S0 = Math.sin(VIEW.lat0 * DEG), C0 = Math.cos(VIEW.lat0 * DEG);
  /** Unit orthographic coordinates (x east-ish, y up, z toward the viewer). */
  function o3(lon, lat) {
    const l = (lon - VIEW.lon0) * DEG, p = lat * DEG, cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
    return [cp * Math.sin(l), C0 * sp - S0 * cp * cl, S0 * sp + C0 * cp * cl];
  }
  const pathLon = (lat) => G.PATH_C0[448] - 0.22 * (lat - 15.5);
  const A_UNIT = o3(pathLon(VIEW.aLat), VIEW.aLat);
  /** Globe state: one zoom curve (log-spring 5× → 1×, 4.0–5.5) anchored on central Luzon. */
  function globeAt(lt) {
    const k = L.sp(lt, 4.0, 1.5);
    const r = VIEW.R * Math.pow(VIEW.Z0, 1 - k);
    return { cx: VIEW.ax - A_UNIT[0] * r, cy: VIEW.ay + A_UNIT[1] * r, r, zoom: r / VIEW.R };
  }
  /** Project lon/lat at altitude h (Earth radii) with the globe state g. */
  const P = (g, lon, lat, h = 0) => { const v = o3(lon, lat), m = g.r * (1 + h); return [g.cx + v[0] * m, g.cy - v[1] * m, v[2]]; };
  const unitToScreen = (ctx, g) => ctx.transform(g.r, 0, 0, -g.r, g.cx, g.cy);
  /** Ground basis at a point: screen px per degree of arc toward east (e) and north (n). */
  function basis(g, lon, lat) {
    const d = 0.05, cl = Math.cos(lat * DEG);
    const o = P(g, lon, lat), e = P(g, lon + d / cl, lat), n = P(g, lon, lat + d);
    return { o, e: [(e[0] - o[0]) / d, (e[1] - o[1]) / d], n: [(n[0] - o[0]) / d, (n[1] - o[1]) / d] };
  }
  /** Path of a ground circle of radius rDeg (an ellipse on screen); caller strokes/fills. */
  function groundCircle(ctx, b, rDeg) {
    ctx.save(); ctx.transform(b.e[0], b.e[1], b.n[0], b.n[1], b.o[0], b.o[1]);
    ctx.beginPath(); ctx.arc(0, 0, rDeg, 0, TAU); ctx.restore();
  }

  /* --- Earth for the LEO shot. Custom rather than G.drawGlobe: its atmosphere rim is proportional
   *     (0.96–1.12 R), which becomes a 480 px band at R = 3000. Land paths are cached in unit
   *     coordinates (the view never rotates) and placed with one affine per frame. */
  let EARTH = null;
  function earthPaths() {
    if (EARTH) return EARTH;
    const bbox = (r) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < r.length; i += 2) { a = Math.min(a, r[i]); b = Math.max(b, r[i]); c = Math.min(c, r[i + 1]); d = Math.max(d, r[i + 1]); } return [a, b, c, d]; };
    const reg = G.rings.region.map(bbox), PH = [116.5, 127, 4.4, 21.2];
    const world = G.rings.world.filter((r) => {
      const b = bbox(r);
      if (b[0] >= PH[0] && b[1] <= PH[1] && b[2] >= PH[2] && b[3] <= PH[3]) return false; // Philippines: 10 m set below
      return !reg.some((q) => q.every((v, i) => Math.abs(v - b[i]) < 0.8));                // finer regional ring exists
    });
    const ringsPath = (rings) => {
      const p = new Path2D();
      for (const ring of rings) {
        let vis = false;
        for (let i = 0; i < ring.length; i += 2) if (o3(ring[i], ring[i + 1])[2] > 0) { vis = true; break; }
        if (!vis) continue;
        for (let i = 0; i < ring.length; i += 2) {
          const v = o3(ring[i], ring[i + 1]); let x = v[0], y = v[1];
          if (v[2] < 0) { const n = Math.hypot(x, y) || 1; x /= n; y /= n; } // hidden points ride the limb
          i ? p.lineTo(x, y) : p.moveTo(x, y);
        }
        p.closePath();
      }
      return p;
    };
    const grat = new Path2D();
    for (let lon = 90; lon <= 180; lon += 10) { let st = false; for (let lat = -60; lat <= 60; lat += 1) { const v = o3(lon, lat); if (v[2] > 0) { st ? grat.lineTo(v[0], v[1]) : grat.moveTo(v[0], v[1]); st = true; } else st = false; } }
    for (let lat = -50; lat <= 50; lat += 10) { let st = false; for (let lon = 80; lon <= 190; lon += 1) { const v = o3(lon, lat); if (v[2] > 0) { st ? grat.lineTo(v[0], v[1]) : grat.moveTo(v[0], v[1]); st = true; } else st = false; } }
    return (EARTH = { land: ringsPath(world.concat(G.rings.region)), ph: ringsPath(G.rings.ph), luzon: ringsPath(G.rings.luzon), grat });
  }
  /* Line widths and the absolute haze/atmosphere bands scale with min(r/R, EC.smax): below that the
   * live drawing is exactly the r = R drawing scaled uniformly about the anchor, which is what lets the
   * cached bitmap below take over seamlessly. */
  const EC = { x0: -70, y0: -70, x1: 1990, y1: 1150, rs: 1.36, smax: 1.25, smin: 0.97 };
  function drawEarthLive(ctx, g) {
    const E = earthPaths(), { cx, cy, r } = g, ws = Math.min(r / VIEW.R, EC.smax);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
    const og = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
    og.addColorStop(0, '#0A1627'); og.addColorStop(0.75, '#0E1F35'); og.addColorStop(1, '#16344F');
    ctx.fillStyle = og; ctx.fill();
    ctx.clip();
    const m = ctx.getTransform();
    unitToScreen(ctx, g);
    ctx.lineWidth = ws / r;
    ctx.strokeStyle = 'rgba(0,229,255,0.07)'; ctx.stroke(E.grat);
    ctx.fillStyle = '#19314D'; ctx.fill(E.land);
    ctx.strokeStyle = 'rgba(0,229,255,0.3)'; ctx.stroke(E.land);
    ctx.fillStyle = 'rgba(0,229,255,0.22)'; ctx.fill(E.ph);
    ctx.lineWidth = (1.3 * ws) / r; ctx.strokeStyle = 'rgba(0,229,255,0.9)'; ctx.stroke(E.ph);
    ctx.setTransform(m);
    // horizon haze inside the limb (thin at any radius; shaded on the band only)
    const hw = 220 * ws, hz = ctx.createRadialGradient(cx, cy, r - hw, cx, cy, r);
    hz.addColorStop(0, 'rgba(0,229,255,0)'); hz.addColorStop(0.75, 'rgba(0,229,255,0.03)'); hz.addColorStop(1, 'rgba(0,229,255,0.13)');
    ctx.fillStyle = hz; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.arc(cx, cy, r - hw, 0, TAU, true); ctx.fill();
    ctx.restore();
    // thin atmosphere outside the limb + crisp limb line
    const aw = 110 * ws, ag = ctx.createRadialGradient(cx, cy, r, cx, cy, r + aw);
    ag.addColorStop(0, 'rgba(0,229,255,0.36)'); ag.addColorStop(0.1, 'rgba(0,229,255,0.16)'); ag.addColorStop(0.4, 'rgba(0,229,255,0.04)'); ag.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.save();
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, r + aw, 0, TAU); ctx.arc(cx, cy, r, 0, TAU, true); ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,255,0.5)'; ctx.lineWidth = 1.4 * ws; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  /* The Earth is static in world space up to the zoom, and P is linear in r about the anchor (ax, ay), so
   * for r ≤ smax·R (from ~4.76 s) it is drawn from one bitmap rendered at r = R and 1.36× resolution
   * (≥ on-screen size at scale 1.25 under the ×1.08 camera push). Saves ~12 ms of gradient/path
   * rasterisation per frame. Pure: the cache depends on nothing but constants. */
  let EARTH_BMP = null;
  function earthBitmap() {
    if (EARTH_BMP) return EARTH_BMP;
    const c = L.canvas(Math.ceil((EC.x1 - EC.x0) * EC.rs), Math.ceil((EC.y1 - EC.y0) * EC.rs)), x = c.getContext('2d');
    x.setTransform(EC.rs, 0, 0, EC.rs, -EC.x0 * EC.rs, -EC.y0 * EC.rs);
    const r = VIEW.R;
    drawEarthLive(x, { cx: VIEW.ax - A_UNIT[0] * r, cy: VIEW.ay + A_UNIT[1] * r, r });
    return (EARTH_BMP = c);
  }
  function drawEarth(ctx, g) {
    const k = g.r / VIEW.R;
    if (k > EC.smax || k < EC.smin) { drawEarthLive(ctx, g); return; }
    ctx.save();
    ctx.transform(k, 0, 0, k, VIEW.ax * (1 - k), VIEW.ay * (1 - k));
    ctx.drawImage(earthBitmap(), EC.x0, EC.y0, EC.x1 - EC.x0, EC.y1 - EC.y0);
    ctx.restore();
  }

  /* ALOS-1 ascending pass over path 448: footprint centre on the path's centre line, moving north. */
  const PASS = { lat4: 12.6, v: 0.9, gam: 4.36, h: 0.1086 }; // γ: ground offset at 34.3° off-nadir; h: 691.65 km / R⊕
  function footLat(lt) {
    if (lt <= 9.0) return PASS.lat4 + PASS.v * (lt - 4.0);
    return PASS.lat4 + PASS.v * 5.0 + PASS.v * 0.6 * (1 - Math.exp(-(lt - 9.0) / 0.6)); // eases to rest (C¹)
  }
  function dest(lon, lat, brgDeg, dDeg) {
    const p1 = lat * DEG, l1 = lon * DEG, b = brgDeg * DEG, d = dDeg * DEG;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [l2 / DEG, p2 / DEG];
  }
  const headingDeg = (lat) => Math.atan2(-0.22 * Math.cos(lat * DEG), 1) / DEG; // ≈ −12° (NNW)
  /** Sub-satellite point: right-looking radar on an ascending pass → the satellite is WSW of its footprint. */
  const subPoint = (lon, lat) => dest(lon, lat, headingDeg(lat) + 270, PASS.gam);
  /* ALOS-1 vector icon, mirrored so PALSAR faces the footprint; the beam leaves square to the panel. */
  const SAT_S = 0.3, ANT_LOCAL = [87.9, 71.8], ROT0 = Math.PI - (0.32 + Math.PI / 2);
  function antennaPt(S, rot) {
    const [vx, vy] = ANT_LOCAL, c = Math.cos(rot), s = Math.sin(rot);
    return [S[0] - SAT_S * (vx * c - vy * s), S[1] + SAT_S * (vx * s + vy * c)];
  }
  function passGeom(lt, g) {
    const lat = footLat(lt), lon = pathLon(lat);
    const F = P(g, lon, lat), [sl, sa] = subPoint(lon, lat), S = P(g, sl, sa, PASS.h);
    let ang = Math.atan2(F[1] - S[1], F[0] - S[0]), rot = ROT0 - ang, ant = S;
    for (let i = 0; i < 3; i++) { ant = antennaPt(S, rot); ang = Math.atan2(F[1] - ant[1], F[0] - ant[0]); rot = ROT0 - ang; }
    return { lat, lon, F, S, ant, ang, rot, len: Math.hypot(F[0] - ant[0], F[1] - ant[1]) };
  }
  const beamPt = (pg, f) => [lerp(pg.ant[0], pg.F[0], f), lerp(pg.ant[1], pg.F[1], f)];
  /* orbit: the great circle through the sub-satellite track, at satellite altitude (unit coords, cached) */
  const ORBIT = (function () {
    const ecef = (lon, lat) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (a) => { const n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; };
    const la = footLat(4.5), lb = footLat(9.0);
    const u = ecef(...subPoint(pathLon(la), la)), v2 = ecef(...subPoint(pathLon(lb), lb));
    const n = norm(cross(u, v2)), w = norm(cross(n, u)), m = 1 + PASS.h, pts = [];
    for (let d = -24; d <= 9; d += 0.5) {
      const th = d * DEG, c = Math.cos(th), s = Math.sin(th);
      const q = [c * u[0] + s * w[0], c * u[1] + s * w[1], c * u[2] + s * w[2]];
      const v = o3(Math.atan2(q[1], q[0]) / DEG, Math.asin(q[2]) / DEG);
      const hidden = v[2] < 0 && Math.hypot(v[0], v[1]) * m < 1;
      pts.push({ x: v[0] * m, y: v[1] * m, hidden, d });
    }
    return pts;
  })();

  /* path-448 imaged strip: SAR amplitude texture seen through a window in the cloud deck */
  const STRIP = { hw: 0.4, t0: 6.0, tEnd: 9.75 }; // imaging starts as the first wavefront lands on the bar-4 downbeat
  /** Strip outline in lon/lat (west edge north-bound, east edge back south). */
  function stripLL(latA, latB) {
    const n = 12, pts = [];
    for (let i = 0; i <= n; i++) { const lat = lerp(latA, latB, i / n); pts.push([pathLon(lat) - STRIP.hw, lat]); }
    for (let i = n; i >= 0; i--) { const lat = lerp(latA, latB, i / n); pts.push([pathLon(lat) + STRIP.hw, lat]); }
    return pts;
  }
  const stripPoly = (g, ll) => ll.map(([lon, lat]) => P(g, lon, lat));
  let SAR_TEX = null;
  const sarTex = () => SAR_TEX || (SAR_TEX = L.sarImage(80, 300, { seed: 448, scale: 20, looks: 3 }));
  function drawStrip(ctx, lt, g, poly, a) {
    if (!poly || a <= 0.002) return;
    const la = footLat(STRIP.t0), lb = footLat(STRIP.tEnd), latC = 0.5 * (la + lb), b = basis(g, pathLon(latC), latC);
    const cl = Math.cos(latC * DEG), ev = [b.n[0] - 0.22 * cl * b.e[0], b.n[1] - 0.22 * cl * b.e[1]]; // along-track axis
    const span = (lb - la) / 2 + 0.2, wd = STRIP.hw * cl + 0.1;
    ctx.save();
    ctx.globalAlpha *= a;
    L.poly(ctx, poly, true); ctx.clip();
    ctx.fillStyle = '#04080F'; ctx.fill();                 // water: radar-dark
    const m = ctx.getTransform();
    unitToScreen(ctx, g); ctx.clip(earthPaths().luzon); ctx.setTransform(m);
    ctx.transform(b.e[0], b.e[1], ev[0], ev[1], b.o[0], b.o[1]);
    ctx.drawImage(sarTex(), -wd, -span, 2 * wd, 2 * span);
    ctx.restore();
    ctx.save();
    L.poly(ctx, poly, true);
    ctx.strokeStyle = L.rgba(C.cyan, 0.9 * a); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }

  /* cloud deck: ONE contiguous, flat, translucent wisp layer (C.text, three posterised alpha tiers
   * 0.16 / 0.25 / 0.33) over central + northern Luzon and the sea off Ilocos — the ground under the
   * beam's last third — plus a few faint wisps further out. The fbm texture is generated once (cached,
   * pure) in lon/lat space; per frame it is shifted west (drift), the imaged strip and a soft hole at the
   * footprint (pulsing on the beat) are cut out of it in that same space, and the result is placed on the
   * globe with one affine (the local tangent map at the deck centre; < 8 px curvature error at the edge). */
  const DECK = { lon0: 113.5, lon1: 127.5, lat0: 10.0, lat1: 22.0, sx: 60, sy: 30, drift: 0.05, margin: 24, A: [120.6, 16.0] };
  DECK.W = Math.round((DECK.lon1 - DECK.lon0) * DECK.sx); DECK.H = Math.round((DECK.lat1 - DECK.lat0) * DECK.sy);
  const DECK_LOBES = [ // [lon, lat, rLon, rLat, weight]
    [120.55, 16.3, 2.7, 3.5, 1.35],                                     // central/northern Luzon + off Ilocos
    [116.4, 19.0, 1.4, 1.0, 0.55], [125.2, 18.2, 1.5, 0.95, 0.5], [117.0, 13.4, 1.3, 0.9, 0.5], [124.8, 12.6, 1.4, 0.95, 0.45],
  ];
  const deckX = (lon) => (lon - DECK.lon0) * DECK.sx, deckY = (lat) => (DECK.lat1 - lat) * DECK.sy;
  let DECK_TEX = null, DECK_CMP = null;
  function deckTex() {
    if (DECK_TEX) return DECK_TEX;
    const W = DECK.W + DECK.margin, H = DECK.H, c = L.canvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    const tier = (q, th) => L.smooth((q - th) / 0.024 + 0.5);
    for (let j = 0; j < H; j++) {
      const lat = DECK.lat1 - (j + 0.5) / DECK.sy;
      for (let i = 0; i < W; i++) {
        const lon = DECK.lon0 + (i + 0.5) / DECK.sx, o = (j * W + i) * 4;
        d[o] = 230; d[o + 1] = 241; d[o + 2] = 255; d[o + 3] = 0;
        let env = -1;                                   // > 0 inside a lobe, falls off to −1 far outside
        for (const [lo, la, rx, ry, wt] of DECK_LOBES) {
          const dd = ((lon - lo) / rx) ** 2 + ((lat - la) / ry) ** 2;
          if (dd < 2.4) env = Math.max(env, wt * (1 - dd / 1.25));
        }
        if (env <= -0.45) continue;                     // q < 0.2 there: always clear (skip the noise)
        // NE–SW cloud streets (Amihan): long along u, tight across v; a slow warp keeps the outline organic
        const u = (lon + lat) * 0.7071, v = (lat - lon) * 0.7071;
        const warp = L.fbm(lon * 0.55 + 5.3, lat * 0.55 - 2.1, 3, 845) - 0.5;
        const n1 = L.fbm(u * 0.6 + 3.1 + 1.2 * warp, v * 1.7 - 1.7, 4, 811), n2 = L.fbm(u * 1.5 - 7.7, v * 4.4 + 2.2, 2, 823);
        const q = 0.85 * n1 + 0.15 * n2 + 0.45 * Math.min(0, env - 0.8) + 0.6 * warp * (1 - L.smooth(env));
        const a = 0.17 * tier(q, 0.4) + 0.09 * tier(q, 0.5) + 0.08 * tier(q, 0.585);
        d[o + 3] = Math.round(255 * a);
      }
    }
    x.putImageData(img, 0, 0);
    return (DECK_TEX = c);
  }
  /** Composite this frame's deck (drift, condensation, strip window, footprint hole) in deck space. */
  function deckFrame(lt, pg, strip, holeA) {
    if (!DECK_CMP) DECK_CMP = L.canvas(DECK.W, DECK.H);
    const x = DECK_CMP.getContext('2d'), W = DECK.W, H = DECK.H;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, W, H);
    x.drawImage(deckTex(), -DECK.drift * DECK.sx * Math.max(0, lt - 4.0), 0);
    // condensation: a soft-edged disc unmasks the deck outward from central Luzon (4.5–5.5)
    const kC = L.sp(lt, 4.5, 1.0);
    if (kC < 0.999) {
      const cx = deckX(DECK.A[0]), cy = deckY(DECK.A[1]), R = 7.5 * kC;
      x.save(); x.globalCompositeOperation = 'destination-in';
      x.translate(cx, cy); x.scale(DECK.sx, DECK.sy);
      const gr = x.createRadialGradient(0, 0, 0, 0, 0, Math.max(0.01, R));
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(-8, -8, 16, 16);
      x.restore();
    }
    x.globalCompositeOperation = 'destination-out';
    if (strip && strip.a > 0.002) { // the imaged strip: a soft-edged window that grows north with it
      x.beginPath();
      strip.pts.forEach(([lo, la], i) => (i ? x.lineTo(deckX(lo), deckY(la)) : x.moveTo(deckX(lo), deckY(la))));
      x.closePath();
      x.fillStyle = `rgba(0,0,0,${0.92 * strip.a})`; x.fill();
      x.lineJoin = 'round'; x.lineWidth = 7; x.strokeStyle = `rgba(0,0,0,${0.45 * strip.a})`; x.stroke();
    }
    if (holeA > 0.002) { // where the beam hits: a soft hole, breathing on the beat
      const r = 0.62 + 0.16 * kick(lt);
      x.save(); x.translate(deckX(pg.lon), deckY(pg.lat)); x.scale(DECK.sx / Math.cos(pg.lat * DEG), DECK.sy);
      const gr = x.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(0,0,0,${holeA})`); gr.addColorStop(0.55, `rgba(0,0,0,${0.9 * holeA})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(-r, -r, 2 * r, 2 * r);
      x.restore();
    }
    x.globalCompositeOperation = 'source-over';
    return DECK_CMP;
  }
  /** Place the deck on the globe (one affine: the tangent map at DECK.A). */
  function drawDeck(ctx, lt, g, pg, strip, holeA, a) {
    if (a <= 0.002) return;
    const [la0, fa0] = [DECK.A[0], DECK.A[1]], d = 0.5;
    const O = P(g, la0, fa0), e1 = P(g, la0 + d, fa0), e0 = P(g, la0 - d, fa0), n1 = P(g, la0, fa0 + d), n0 = P(g, la0, fa0 - d);
    const E = [(e1[0] - e0[0]) / (2 * d), (e1[1] - e0[1]) / (2 * d)], N = [(n1[0] - n0[0]) / (2 * d), (n1[1] - n0[1]) / (2 * d)];
    const dl = DECK.lon0 - la0, dp = DECK.lat1 - fa0;
    const cmp = deckFrame(lt, pg, strip, holeA);
    ctx.save();
    ctx.transform(E[0] / DECK.sx, E[1] / DECK.sx, -N[0] / DECK.sy, -N[1] / DECK.sy, O[0] + dl * E[0] + dp * N[0], O[1] + dl * E[1] + dp * N[1]);
    ctx.globalAlpha *= a;
    ctx.drawImage(cmp, 0, 0);
    ctx.restore();
  }

  /* radar beam: cone + one bright wavefront per quarter note (launched on the beat, lands on the next) */
  const BEAM = { hw0: 2.5, hwF: 24, fCloud: 0.66, band: 0.07 };
  function beamFrame(ctx, pg) { ctx.translate(pg.ant[0], pg.ant[1]); ctx.rotate(pg.ang); }
  const beamW = (pg, r) => BEAM.hw0 + ((BEAM.hwF - BEAM.hw0) * r) / pg.len;
  /** Beam cone between f0..f1. part 'lower' (under the cloud deck) / 'upper' (above it) carry complementary
   *  linear ramps across fCloud ± band; drawn additively, they sum exactly to the full cone (no seam). */
  function drawBeamBody(ctx, pg, lt, f0, f1, a, part) {
    const fa = BEAM.fCloud - BEAM.band, fb = BEAM.fCloud + BEAM.band;
    if (part === 'lower') f0 = Math.max(f0, fa); else f1 = Math.min(f1, fb);
    if (f1 - f0 < 0.002 || a <= 0.002) return;
    const r0 = pg.len * f0, r1 = pg.len * f1, pk = 0.8 + 0.2 * L.pulse(lt);
    const mask = (f) => { const k = clamp((f - fa) / (fb - fa)); return part === 'lower' ? k : 1 - k; };
    const grad = (amax, amin) => {
      const gr = ctx.createLinearGradient(r0, 0, r1, 0);
      for (const f of [f0, fa, fb, f1]) if (f >= f0 && f <= f1) gr.addColorStop((f - f0) / (f1 - f0), L.rgba(C.cyan, a * lerp(amax, amin, f) * mask(f)));
      return gr;
    };
    ctx.save(); beamFrame(ctx, pg);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad(0.26 * pk, 0.08 * pk);
    ctx.beginPath(); ctx.moveTo(r0, -beamW(pg, r0)); ctx.lineTo(r1, -beamW(pg, r1)); ctx.lineTo(r1, beamW(pg, r1)); ctx.lineTo(r0, beamW(pg, r0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = grad(0.5, 0.42); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r0, -beamW(pg, r0)); ctx.lineTo(r1, -beamW(pg, r1)); ctx.moveTo(r0, beamW(pg, r0)); ctx.lineTo(r1, beamW(pg, r1)); ctx.stroke();
    ctx.restore();
  }
  function drawBeamWaves(ctx, pg, lt, f0, f1, a) {
    if (f1 - f0 < 0.002 || a <= 0.002) return;
    const ph = (((lt / 0.5) % 1) + 1) % 1;
    ctx.save(); beamFrame(ctx, pg);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [off, k, lw] of [[0, 1, 2.4], [0.5, 0.35, 1.4]]) {
      const f = (ph + off) % 1;
      if (f < f0 || f > f1) continue;
      const r = f * pg.len;
      if (r < 5) continue;
      const half = Math.atan2(beamW(pg, r) * 0.95, r);
      ctx.strokeStyle = L.rgba(C.cyan, a * k * (0.95 - 0.3 * f) * clamp(f * 10));
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(0, 0, r, -half, half); ctx.stroke();
    }
    ctx.restore();
  }
  /* footprint on the ground: core ellipse + one ripple per beat (each lands with its wavefront) */
  function drawFootprint(ctx, lt, g, pg, a, layer) {
    if (a <= 0.002) return;
    const b = basis(g, pg.lon, pg.lat), ph = (((lt / 0.5) % 1) + 1) % 1, over = layer !== 'ground';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) {
      const f = (ph + k) / 2; // two ripples alive, a new one born on every beat
      groundCircle(ctx, b, 0.45 + 1.25 * f);
      ctx.strokeStyle = L.rgba(C.cyan, (over ? 0.3 : 0.6) * a * (1 - f)); ctx.lineWidth = over ? 1.2 : 1.6; ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    groundCircle(ctx, b, 0.45);
    if (over) { ctx.strokeStyle = L.rgba(C.cyan, 0.95 * a); ctx.lineWidth = 1.6; ctx.stroke(); }
    else { ctx.fillStyle = L.rgba(C.cyan, 0.2 * a); ctx.fill(); }
    ctx.restore();
    if (over) L.glow(ctx, pg.F[0], pg.F[1], 36, C.cyan, 0.5 * a * (0.55 + 0.45 * L.pulse(lt)));
  }
  function drawOrbit(ctx, lt, g, p, fade) {
    if (p <= 0.002 || fade <= 0.002) return;
    const pts = [];
    for (const q of ORBIT) { if (q.hidden) { if (pts.length) break; continue; } pts.push([g.cx + q.x * g.r, g.cy - q.y * g.r]); }
    if (pts.length < 2) return;
    ctx.save();
    const a = pts[0], b = pts[pts.length - 1], gr = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
    gr.addColorStop(0, L.rgba(C.cyan, 0)); gr.addColorStop(0.35, L.rgba(C.cyan, 0.45 * fade)); gr.addColorStop(0.8, L.rgba(C.cyan, 0.45 * fade)); gr.addColorStop(1, L.rgba(C.cyan, 0));
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = -lt * 16;
    L.polyPartial(ctx, pts, p);
    ctx.strokeStyle = gr; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  /* captions, labels + title */
  /** Backplate for labels over the globe: C.card, hairline border, optional cyan accent bar; constructs
   *  along scanlines with the label (pass bg: C.card to the text). */
  function plate(ctx, x, y, w, h, p, accent) {
    if (p <= 0.001) return;
    ctx.save();
    if (p < 1) scanClip(ctx, x - 1, y - 1, w + 2, h + 2, p, 2);
    L.roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = L.rgba(C.card, 0.92); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = C.cardBorder; ctx.stroke();
    if (accent) { ctx.fillStyle = L.rgba(C.cyan, 0.85); ctx.fillRect(x, y + 5, 2, h - 10); }
    ctx.restore();
    if (p < 1) scanBar(ctx, x, y, w, h, p);
  }
  /* satellite tag: rides beside ALOS-1 (right of the body, clear of the paddle and above the beam) */
  const SAT_TAG = { dx: 86, dy: -10 };
  const SAT_O1 = { kind: 'mono', size: 20, weight: 400, tracking: 0.04 }, SAT_O2 = { kind: 'mono', size: 18, weight: 400, tracking: 0.02 };
  const SAT_L1 = [{ s: 'ALOS-1 PALSAR', color: C.text, weight: 600 }, { s: ' · ASCENDING PASS', color: C.textDim }];
  const SAT_L2 = () => [{ s: 'L-band', color: L.ink(C.cyan, C.card) }, { s: ' radar sees through cloud', color: C.textDim }];
  function drawSatTag(ctx, lt, pg) {
    const p1 = L.inout(lt, 5.5, 9.4, 0.5, 0.4), p2 = L.inout(lt, 6.0, 9.4, 0.5, 0.4);
    if (p1 <= 0.001) return;
    const c = mctx(), m1 = L.measure(c, SAT_L1, SAT_O1), w = Math.max(m1.w, L.measure(c, SAT_L2(), SAT_O2).w);
    const x = pg.S[0] + SAT_TAG.dx, y = pg.S[1] + SAT_TAG.dy;
    plate(ctx, x - 16, y - m1.asc - 8, w + 32, lerp(36, 66, clamp(L.sp(lt, 6.0, 0.45))), p1, true); // grows for line 2
    L.text(ctx, SAT_L1, x, y, { ...SAT_O1, p: p1, bg: C.card, id: 'a1-sat' });
    if (p2 > 0.001) L.text(ctx, SAT_L2(), x, y + 28, { ...SAT_O2, p: p2, bg: C.card, id: 'a1-cloud' });
  }
  /* map label: east of Luzon on a backplate, leader to the coast (Isabela) */
  const MAP_LBL = { anchor: [122.05, 16.4], dx: 46, str: 'LUZON · PHILIPPINES', o: { kind: 'mono', size: 19, weight: 400, tracking: 0.08 } };
  function drawMapLabel(ctx, lt, g) {
    const p = L.inout(lt, 5.0, 9.1, 0.5, 0.4);
    if (p <= 0.001) return;
    const A = P(g, MAP_LBL.anchor[0], MAP_LBL.anchor[1]), m = L.measure(mctx(), MAP_LBL.str, MAP_LBL.o);
    const x = A[0] + MAP_LBL.dx, y = A[1] + m.capH / 2;
    ctx.save();
    ctx.strokeStyle = L.rgba(C.cyan, 0.75); ctx.lineWidth = 1.2;
    L.polyPartial(ctx, [[A[0] + 4, A[1]], [x - 12, A[1]]], clamp(p * 1.5)); ctx.stroke();
    ctx.globalAlpha = clamp(p * 2); ctx.fillStyle = C.cyan;
    ctx.beginPath(); ctx.arc(A[0], A[1], 2.8, 0, TAU); ctx.fill();
    ctx.restore();
    const pp = clamp(p * 1.25 - 0.25);
    plate(ctx, x - 12, y - m.asc - 4, m.w + 24, m.asc + m.desc + 8, pp, false);
    if (pp > 0.001) L.text(ctx, MAP_LBL.str, x, y, { ...MAP_LBL.o, color: C.text, p: pp, bg: C.card, id: 'a1-luzon' });
  }
  const TITLE = { x: 172, y: 232 };
  const ACR = [0, 1, 2, 3].map((i) => 7.0 + 0.5 * i); // acronym decode on quarter notes
  const acrK = (lt, i) => L.sp(lt, ACR[i], 0.35);
  const hi = (lt, i) => L.css(L.mix(C.text, C.cyan, clamp(acrK(lt, i))));
  const SUB = [
    [['L', 0], ['everaging '], ['In', 1], ['SAR for '], ['O', 2], ['bservation']],
    [['and Modeling of Earthquake '], ['G', 3], ['enerators']],
  ];
  /* plain-language mission under the expansion (caption role: sans 500, 26 px) */
  const MISSION = [
    [{ s: 'Mapping ground motion in Central Luzon', color: C.text }],
    [{ s: 'from satellite radar · 2007–2011', color: C.textDim }],
  ];
  function drawTitle(ctx, lt) {
    const pT = L.inout(lt, 6.0, 9.5, 0.55, 0.45);
    const pS = L.inout(lt, 6.5, 9.5, 0.6, 0.45);
    const pM = L.inout(lt, 7.0, 9.5, 0.5, 0.4);
    const pX = L.inout(lt, 7.0, 9.6, 0.45, 0.45); // from the 7.0 beat so line 2 holds ≥ 1.5 s
    if (pM > 0.001) {
      L.text(ctx, 'UPD NIGS · Earthquake Geodesy and Geology (EGG) Laboratory', TITLE.x + 2, TITLE.y - 106, { kind: 'mono', size: 18, weight: 400, color: C.textDim, p: pM, id: 'a1-lab' });
      ctx.save(); ctx.fillStyle = L.rgba(C.cyan, 0.7); ctx.fillRect(TITLE.x + 2, TITLE.y - 96, 56 * clamp(pM), 2); ctx.restore();
    }
    if (pT > 0.001) {
      L.text(ctx, [{ s: 'Project ', color: C.text }, { s: 'L', color: C.cyan }, { s: 'In', color: C.cyan }, { s: 'O', color: C.cyan }, { s: 'G', color: C.cyan }],
        TITLE.x, TITLE.y, { kind: 'display', size: 100, weight: 700, p: pT, tracking: -0.01, id: 'a1-title' });
    }
    if (pS > 0.001) {
      const o = { kind: 'sans', size: 32, weight: 500 }, stag = 0.25;
      SUB.forEach((ln, li) => { // one id per line (QA tracks each line's readable span)
        const segs = ln.map(([s, i]) => ({ s, color: i === undefined ? C.text : hi(lt, i) }));
        L.text(ctx, segs, TITLE.x + 2, TITLE.y + 58 + li * 42, { ...o, p: clamp(pS * (1 + stag) - stag * li), id: 'a1-sub' + li });
      });
      const c = mctx();
      ctx.save();
      SUB.forEach((ln, li) => {
        let x = TITLE.x + 2;
        for (const [s, i] of ln) {
          const w = L.measure(c, s, o).w;
          if (i !== undefined) {
            const k = clamp(acrK(lt, i)) * clamp(pS);
            if (k > 0.002) { ctx.fillStyle = L.rgba(C.cyan, 0.95 * k); ctx.fillRect(x + (w * (1 - k)) / 2, TITLE.y + 58 + li * 42 + 8, w * k, 2.5); }
          }
          x += w;
        }
      });
      ctx.restore();
    }
    if (pX > 0.001) {
      MISSION.forEach((ln, i) => {
        const lp = clamp(pX * 1.15 - 0.15 * i);
        if (lp > 0.001) L.text(ctx, ln, TITLE.x + 2, TITLE.y + 156 + i * 36, { kind: 'sans', size: 26, weight: 500, p: lp, id: 'a1-mission' + i });
      });
    }
  }

  /* ================================================================ layout (single source of truth) */
  const B = { fHold: 0.3, sizeHold: 52, sizeEnd: 62, tAim: 5.2 };
  /** Where the TL rides on the beam (screen). During the lift it aims at the beam's settled position
   *  (frozen at tAim), handing over smoothly to the live beam 4.6–5.2 — no chase of the zooming globe. */
  function beamTarget(lt, pg, f, cam) {
    const live = cam.toScreen(...beamPt(pg, f));
    if (lt >= B.tAim) return live;
    const pgA = passGeom(B.tAim, globeAt(B.tAim)), aim = cam.toScreen(...beamPt(pgA, f));
    const w = L.smoother((lt - 4.6) / (B.tAim - 4.6));
    return [lerp(aim[0], live[0], w), lerp(aim[1], live[1], w)];
  }
  let memoT = NaN, memo = null;
  function layout(t) {
    if (t === memoT) return memo;
    const lt = t, cam = camAt(t), z = cam.z;
    const out = { lt, cam };
    const pa = pulseA(lt, t);
    out.pa = pa;
    const [ax, ay] = cam.toScreen(pa.x, pa.y);
    const tlA = { x: ax, y: ay, size: pa.size * z, rot: 0, amp: pa.amp, phase: pa.phase, energy: pa.energy };
    if (lt >= 3.9) {
      const g = globeAt(lt), pg = passGeom(lt, g);
      Object.assign(out, { g, pg });
      const kLift = L.sp(lt, 4.0, 1.4);                  // bar 3 downbeat: park → beam (arc over the receding type)
      const kGo = L.sp(lt, 9.0, 0.75);                   // final beats: down the beam to the ground
      const f = lerp(B.fHold + 0.025 * kick(t), 1, kGo);
      const [sx, sy] = beamTarget(lt, pg, f, cam);
      const qx = Math.max(tlA.x, sx) - 120, qy = Math.min(tlA.y, sy) - 220;
      const u = clamp(kLift, 0, 1.02), iu = 1 - u;
      const px = iu * iu * tlA.x + 2 * iu * u * qx + u * u * sx;
      const py = iu * iu * tlA.y + 2 * iu * u * qy + u * u * sy;
      const size = lerp(lerp(tlA.size, B.sizeHold * z, clamp(kLift)), B.sizeEnd, kGo);
      let rot = pg.ang * clamp(kLift) * (1 - clamp(kGo));
      if (lt >= DUR - 0.1) rot = 0;
      const phase = tlA.phase + TAU * 2.4 * Math.max(0, lt - 4.0) * L.sp(lt, 4.0, 0.6);
      out.tl = {
        x: px, y: py, size, rot, form: 'pulse', alpha: 1, phase,
        amp: lerp(tlA.amp, 1 + 0.1 * kick(t), clamp(kLift)),
        energy: lerp(tlA.energy, 0.6 + 0.35 * L.pulse(t) + 0.4 * Math.sin(Math.PI * clamp(kGo)), clamp(kLift)),
      };
      out.f = f; out.kGo = kGo;
    } else {
      out.tl = { ...tlA, form: 'pulse', alpha: 1 };
    }
    memoT = t; memo = out;
    return out;
  }

  /* ================================================================ scene */
  L.scene({
    id: 'act1', t0: 0, t1: DUR,
    init() {
      typeLayout(); sweepS(2.5); sarTex(); earthPaths(); earthBitmap();
      deckTex();
      for (const t of [0, 3, 6, 9.99]) layout(t);
    },
    tl(env) {
      return { ...layout(env.lt).tl };
    },
    draw(ctx, env) {
      const lt = env.lt, t = env.t, lay = typeLayout(), Lo = layout(lt);
      /* ---------------- B · low Earth orbit (drawn first: the type recedes over it) */
      if (lt >= 3.98) {
        const { g, pg } = Lo;
        const RF = 1500;                                                     // ≥ farthest frame corner from Luzon
        const unmask = RF * L.sp(lt, 4.0, 0.5);                            // Earth opens from the Luzon point
        const iris = RF * Math.max(0, 1 - 1.03 * L.sp(lt, 9.5, 0.45));     // closes onto the footprint (no overshoot)
        const rClip = Math.min(unmask, iris), opening = unmask < iris;
        const beamP = L.sp(lt, 5.5, 0.45);                                  // the beam reaches down from the antenna
        // final beats: the beam drains completely behind the TL (tail → 1), then is gone
        const tailF = Lo.kGo > 0.001 ? clamp(Lo.f - 0.06 * (1 - L.sp(lt, 9.5, 0.3))) : 0;
        const beamA = (1 - L.sp(lt, 9.5, 0.3)) * (1 - tailF > 0.01 ? 1 : 0);
        const fpA = Math.min(L.sp(lt, 6.0, 0.4), 1 - L.sp(lt, 9.5, 0.35));
        const latA = footLat(STRIP.t0), latB = footLat(Math.min(lt, STRIP.tEnd));
        const sLL = lt > STRIP.t0 && latB - latA > 0.005 ? stripLL(latA, latB) : null;
        const stripA = L.sp(lt, STRIP.t0, 0.3), deckA = L.sp(lt, 4.5, 0.8);
        if (rClip > 0.5) {
          const cxC = opening ? VIEW.ax : pg.F[0], cyC = opening ? VIEW.ay : pg.F[1];
          ctx.save();
          if (rClip < RF - 1) { ctx.beginPath(); ctx.arc(cxC, cyC, rClip, 0, TAU); ctx.clip(); }
          drawEarth(ctx, g);
          ctx.save(); // ground layers sit around Luzon, far inside the limb: no disc clip needed
          drawStrip(ctx, lt, g, sLL && stripPoly(g, sLL), stripA);
          drawFootprint(ctx, lt, g, pg, fpA, 'ground');
          // lower beam: under the cloud deck
          const fLo = Math.max(tailF, BEAM.fCloud);
          if (beamP > BEAM.fCloud - BEAM.band && beamA > 0) {
            drawBeamBody(ctx, pg, lt, tailF, beamP, beamA, 'lower');
            drawBeamWaves(ctx, pg, lt, fLo, beamP, 0.45 * beamA);
          }
          drawDeck(ctx, lt, g, pg, sLL && { pts: sLL, a: stripA }, fpA, deckA);
          // radar penetrates the cloud: wavefronts and ripples continue through the deck (additive, fainter)
          if (beamP > BEAM.fCloud && beamA > 0) drawBeamWaves(ctx, pg, lt, fLo, beamP, 0.55 * beamA);
          drawFootprint(ctx, lt, g, pg, fpA, 'cloud');
          ctx.restore();
          ctx.restore();
          if (rClip < RF - 1) { // iris rim
            ctx.save(); ctx.strokeStyle = L.rgba(C.cyan, 0.75 * clamp(rClip / 120) * clamp((RF - rClip) / 200)); ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(cxC, cyC, rClip, 0, TAU); ctx.stroke(); ctx.restore();
          }
        }
        // upper beam: above the clouds (drains behind the TL; outside the iris, so nothing pops)
        if (beamA > 0 && beamP > 0.001) {
          drawBeamBody(ctx, pg, lt, tailF, beamP, beamA, 'upper');
          drawBeamWaves(ctx, pg, lt, tailF, Math.min(beamP, BEAM.fCloud), beamA);
        }
        // orbit + satellite
        drawOrbit(ctx, lt, g, L.sp(lt, 4.5, 1.0), 1 - L.sp(lt, 9.0, 0.5));
        const satP = L.inout(lt, 4.5, 9.5, 1.0, 0.5);
        if (satP > 0.001) {
          ctx.save(); ctx.translate(pg.S[0], pg.S[1]); ctx.scale(-1, 1);
          L.drawALOS(ctx, { x: 0, y: 0, s: SAT_S, rot: pg.rot, p: satP, t });
          ctx.restore();
        }
        drawMapLabel(ctx, lt, g);
        drawSatTag(ctx, lt, pg);
        drawTitle(ctx, lt);
      }
      /* ---------------- A · type, seam, callout (shrinks into central Luzon on the shared zoom curve) */
      if (lt < 4.7) {
        const zk = lt >= 4.0 ? globeAt(lt).zoom / VIEW.Z0 : 1;
        ctx.save();
        if (zk < 1) { ctx.translate(VIEW.ax, VIEW.ay); ctx.scale(zk, zk); ctx.translate(-VIEW.ax, -VIEW.ay); }
        for (const w of lay.words) if (w.line === 0) drawWordIn(ctx, w, lt, lineOut(lt, 0));
        const sp = splitState(lt, Lo.pa), aOut = 1 - L.sp(lt, 4.0, 0.45);
        drawTrail(ctx, lt, Lo.pa, aOut);
        drawLine2(ctx, lt, lay, sp);
        if (sp) drawSeam(ctx, lt, sp, Lo.pa, aOut);
        ctx.restore();
        drawCallout(ctx, lt, Lo.pa);
      }
    },
  });
})();

/* LInOG explainer — procedural assets: ALOS-1 satellite vector, SAR amplitude textures,
 * raster painting helpers and simple 3D perspective. (The EGG Laboratory now appears as its real logo, assets/logos.)
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, TAU = Math.PI * 2;

  /* --------------------------------------------------------------- ALOS-1 (Daichi), vector */
  /** Draws ALOS-1 centred at (x,y). o: {x, y, s (scale, 1 ≈ 360 px wide), rot, p (build 0..1), t, beam: {x,y,p} } .
   *  Parts: bus with gold MLI, single long solar paddle, PALSAR L-band phased-array antenna (8.9 × 3.1 m),
   *  PRISM triple optics, AVNIR-2, data-relay dish. Construction reveals part by part with p. */
  L.drawALOS = (ctx, o) => {
    const s = o.s || 1, p = o.p === undefined ? 1 : o.p, t = o.t || 0;
    const part = (i, n = 5) => L.ease.outCubic(L.clamp(p * n - i));
    ctx.save();
    ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    ctx.lineJoin = 'round';
    // solar paddle (boom + 2×7 panels), extends to the left
    const sp = part(0);
    if (sp > 0) {
      ctx.save();
      ctx.strokeStyle = '#8FA3BF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-34, -4); ctx.lineTo(-34 - 26 * sp, -4); ctx.stroke();
      const n = 7, pw = 26, ph = 54, x0 = -62;
      for (let i = 0; i < n; i++) {
        const k = L.clamp(sp * n - i);
        if (k <= 0) continue;
        const px = x0 - (i + 1) * (pw + 1.5) * 1;
        ctx.save(); ctx.translate(px + pw, -4); ctx.scale(k, 1);
        ctx.fillStyle = '#132A5C'; ctx.fillRect(-pw, -ph / 2, pw, ph);
        ctx.strokeStyle = 'rgba(0,229,255,0.55)'; ctx.lineWidth = 0.8; ctx.strokeRect(-pw, -ph / 2, pw, ph);
        ctx.strokeStyle = 'rgba(0,229,255,0.22)'; ctx.beginPath();
        for (let r = 1; r < 6; r++) { ctx.moveTo(-pw, -ph / 2 + (ph * r) / 6); ctx.lineTo(0, -ph / 2 + (ph * r) / 6); }
        ctx.moveTo(-pw / 2, -ph / 2); ctx.lineTo(-pw / 2, ph / 2); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    // bus (gold foil box, 3 faces)
    const bp = part(1);
    if (bp > 0) {
      ctx.save(); ctx.globalAlpha *= bp; ctx.translate(0, (1 - bp) * 8);
      const g = ctx.createLinearGradient(-34, -30, 34, 30);
      g.addColorStop(0, '#E9C46A'); g.addColorStop(0.5, '#C8963E'); g.addColorStop(1, '#8A6424');
      ctx.fillStyle = '#F2D58A'; ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(-20, -42); ctx.lineTo(48, -42); ctx.lineTo(34, -30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7A5520'; ctx.beginPath(); ctx.moveTo(34, -30); ctx.lineTo(48, -42); ctx.lineTo(48, 18); ctx.lineTo(34, 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = g; ctx.fillRect(-34, -30, 68, 60);
      ctx.strokeStyle = 'rgba(255,240,200,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let i = 0; i < 5; i++) { ctx.moveTo(-34 + 6 + i * 13, -30); ctx.lineTo(-34 + 2 + i * 14, 30); }
      ctx.stroke();
      ctx.restore();
    }
    // PALSAR antenna: large flat panel slung below/right, tilted (off-nadir look)
    const ap = part(2);
    if (ap > 0) {
      ctx.save(); ctx.translate(30, 40); ctx.rotate(0.32); ctx.scale(1, ap);
      ctx.fillStyle = '#D9E2EC'; ctx.fillRect(-10, -6, 150, 30);
      ctx.fillStyle = '#AFC0D3'; ctx.fillRect(-10, 24, 150, 6);
      ctx.strokeStyle = 'rgba(11,17,30,0.45)'; ctx.lineWidth = 0.7; ctx.beginPath();
      for (let i = 1; i < 16; i++) { ctx.moveTo(-10 + i * 9.4, -6); ctx.lineTo(-10 + i * 9.4, 24); }
      for (let j = 1; j < 4; j++) { ctx.moveTo(-10, -6 + j * 7.5); ctx.lineTo(140, -6 + j * 7.5); }
      ctx.stroke();
      ctx.strokeStyle = '#8FA3BF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-22, -26); ctx.stroke();
      ctx.restore();
    }
    // PRISM triple optics + AVNIR-2 on the front-top
    const op = part(3);
    if (op > 0) {
      ctx.save(); ctx.globalAlpha *= op;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#2B3A52'; ctx.fillRect(-26 + i * 15, -54 - (1 - op) * 10, 11, 14);
        ctx.fillStyle = '#9FB0C8'; ctx.beginPath(); ctx.ellipse(-20.5 + i * 15, -54 - (1 - op) * 10, 5.5, 2.2, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#3A4A63'; ctx.fillRect(18, -50, 16, 9);
      ctx.restore();
    }
    // data-relay (DRTS) dish on a mast, to the right
    const dp = part(4);
    if (dp > 0) {
      ctx.save(); ctx.globalAlpha *= dp;
      ctx.strokeStyle = '#8FA3BF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(44, -30); ctx.lineTo(44 + 24 * dp, -56 * dp); ctx.stroke();
      ctx.translate(44 + 24 * dp, -56 * dp); ctx.rotate(-0.6);
      ctx.fillStyle = '#E6F1FF'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    // status light ticking on quarter notes
    if (p > 0.8) { const pl = L.pulse(t, 7); L.glow(ctx, 0, 0, 22, C.cyan, 0.5 * pl); }
    ctx.restore();
  };
  /** Local antenna-centre offset (unscaled, unrotated) for aiming beams. */
  L.ALOS_ANTENNA = [95, 58];

  /** Radar beam from (x0,y0) to a ground footprint centred at (x1,y1) with half-width hw.
   *  Wavefront arcs travel down the beam locked to the beat. o: {p, t, color, waves} */
  L.drawBeam = (ctx, x0, y0, x1, y1, hw, o = {}) => {
    const p = o.p === undefined ? 1 : o.p, t = o.t || 0, col = o.color || C.cyan;
    if (p <= 0) return;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(x0, y0); ctx.rotate(ang);
    const reach = len * L.clamp(p);
    const g = ctx.createLinearGradient(0, 0, reach, 0);
    g.addColorStop(0, L.rgba(col, 0.32)); g.addColorStop(1, L.rgba(col, 0.06));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(reach, -hw * (reach / len)); ctx.lineTo(reach, hw * (reach / len)); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = L.rgba(col, 0.4); ctx.lineWidth = 1; ctx.stroke();
    // wavefronts: 4 per beat travelling outward
    const waves = o.waves || 6;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < waves; i++) {
      const f = ((t / 0.5) + i / waves) % 1;
      const r = f * reach;
      if (r < 6) continue;
      const a = Math.sin(Math.PI * f) * 0.8;
      const half = Math.atan2(hw, len);
      ctx.strokeStyle = L.rgba(col, a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r, -half, half); ctx.stroke();
    }
    ctx.restore();
  };

  /* --------------------------------------------------------------- SAR amplitude textures */
  const sarCache = new Map();
  /** Speckled SAR amplitude image (cached canvas). o: {seed, scale (feature size px), bright (urban pts), water (0..1 fraction of dark)}
   *  Fully-developed speckle: amplitude = sqrt(σ · E), E ~ Exp(1). Deterministic. */
  L.sarImage = (w, h, o = {}) => {
    const seed = o.seed || 1, sc = o.scale || 90, key = `${w}x${h}:${seed}:${sc}:${o.water || 0}:${o.looks || 1}`;
    let c = sarCache.get(key);
    if (c) return c;
    c = L.canvas(w, h);
    const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    const looks = o.looks || 1;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const u = i / sc, v = j / sc;
        const hgt = L.fbm(u, v, 5, seed);
        const gx = (L.fbm(u + 0.03, v, 5, seed) - hgt) / 0.03; // terrain slope toward the radar (looking from the left)
        let sigma = 0.55 + 0.6 * Math.tanh(gx * 1.6) + 0.9 * (hgt - 0.5); // foreslopes bright, backslopes dim
        sigma = Math.max(0.12, sigma);
        if (o.water && hgt < o.water) sigma *= 0.1;
        if (L.hash2(i, j, seed + 5) > 0.9985) sigma *= 6; // sparse bright point scatterers
        let e = 0;
        for (let k = 0; k < looks; k++) e += -Math.log(1 - L.hash2(i, j, seed * 31 + k) * 0.999);
        e /= looks;
        const a = Math.sqrt(Math.max(0, sigma) * e);
        const vv = Math.min(255, Math.pow(a / 1.25, 0.75) * 150);
        const o4 = (j * w + i) * 4;
        d[o4] = vv * 0.82; d[o4 + 1] = vv * 0.95; d[o4 + 2] = vv; d[o4 + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    sarCache.set(key, c);
    return c;
  };

  /* --------------------------------------------------------------- raster painting */
  const imgPool = new Map();
  /** Reusable ImageData-backed canvas of size w×h (one per key). Paint via `fn(data, w, h)` then draw. */
  L.rasterCanvas = (key, w, h) => {
    let r = imgPool.get(key);
    if (!r || r.w !== w || r.h !== h) {
      const c = L.canvas(w, h), x = c.getContext('2d');
      r = { c, x, img: x.createImageData(w, h), w, h };
      imgPool.set(key, r);
    }
    return r;
  };
  /** Paint a scalar field through a LUT into a pooled canvas and return the canvas.
   *  field: Float32Array (w*h) of values; map(v) -> 0..255 index; alpha: Float32Array|null (0..1) or a number. */
  L.paintField = (key, w, h, field, lutArr, map, alpha) => {
    const r = L.rasterCanvas(key, w, h), d = r.img.data;
    for (let i = 0, n = w * h; i < n; i++) {
      const v = field[i];
      const o = i * 4;
      if (v !== v) { d[o + 3] = 0; continue; } // NaN = masked
      const idx = Math.max(0, Math.min(255, map(v) | 0)) * 3;
      d[o] = lutArr[idx]; d[o + 1] = lutArr[idx + 1]; d[o + 2] = lutArr[idx + 2];
      d[o + 3] = alpha == null ? 255 : typeof alpha === 'number' ? alpha * 255 : alpha[i] * 255;
    }
    r.x.putImageData(r.img, 0, 0);
    return r.c;
  };

  /* --------------------------------------------------------------- 3D perspective */
  /** Simple camera: yaw/pitch about the origin, then perspective. Returns project(x,y,z) -> [sx, sy, depth, scale]. */
  L.persp = (o) => {
    const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), spp = Math.sin(o.pitch || 0);
    const dist = o.dist || 1200, f = o.f || 1000, cx0 = o.cx === undefined ? L.W / 2 : o.cx, cy0 = o.cy === undefined ? L.H / 2 : o.cy;
    return (x, y, z) => {
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy; // yaw about vertical (z up), y = depth axis on the ground
      const y2 = y1 * cp - z * spp, z2 = y1 * spp + z * cp; // pitch
      const d = dist + y2, k = f / d;
      return [cx0 + x1 * k, cy0 - z2 * k, d, k];
    };
  };
})();

/* LInOG explainer — real LInOG products (not schematic).
 * Vertical velocity, ramp removed (cm/yr), from the delivered products:
 *   focus  P448 F0290 at full resolution (1/1200° ≈ 90 m) — the frame containing Cabanatuan City
 *   asc    mosaic of the 12 ascending frames (Paths 447–449, v1.2 delivery, 24 Sep 2026) on a 1/400° grid
 *   desc   mosaic of the 4 descending frames (Path 84, F3290–F3320, Oct 2026) on the same grid
 * plus each frame's valid-data footprint (4 corners, lon/lat). Source images: assets/data/ (tools/prepare_assets.py).
 * Values are decoded once in init() (pure); colourised canvases are cached by (layer, options).
 */
(function () {
  'use strict';
  const L = window.LINOG;
  const M = L.REAL_MANIFEST;
  const R = (L.real = { manifest: M, frames: M ? M.frames : [], focus: null, asc: null, desc: null });

  function decode(img, w, h) {
    const c = L.canvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h).data, v = new Float32Array(w * h);
    const k = (M.vmax - M.vmin) / 254;
    for (let i = 0; i < w * h; i++) { const q = d[i * 4]; v[i] = q === 0 ? NaN : (q - 1) * k + M.vmin; }
    return v;
  }
  /** Decode the data images (called by main.js once the images are loaded). */
  R.init = () => {
    if (!M || R.focus) return;
    const f = M.focus, m = M.mosaic;
    if (L.img('data:focus')) R.focus = { lon0: f.lon0, lat0: f.lat0, d: f.d, w: f.w, h: f.h, v: decode(L.img('data:focus'), f.w, f.h) };
    if (L.img('data:asc')) R.asc = { lon0: m.lon0, lat0: m.lat0, d: m.d, w: m.w, h: m.h, v: decode(L.img('data:asc'), m.w, m.h) };
    if (L.img('data:desc')) R.desc = { lon0: m.lon0, lat0: m.lat0, d: m.d, w: m.w, h: m.h, v: decode(L.img('data:desc'), m.w, m.h) };
  };
  /** Value (cm/yr, NaN = no data) of a layer at lon/lat (nearest cell). */
  R.value = (layer, lon, lat) => {
    const g = R[layer]; if (!g) return NaN;
    const i = Math.floor((lon - g.lon0) / g.d), j = Math.floor((g.lat0 - lat) / g.d);
    return i < 0 || j < 0 || i >= g.w || j >= g.h ? NaN : g.v[j * g.w + i];
  };
  /** Geographic bounds of a layer: {lon0, lon1, lat0 (north), lat1 (south)}. */
  R.bounds = (layer) => { const g = R[layer]; return g && { lon0: g.lon0, lon1: g.lon0 + g.w * g.d, lat0: g.lat0, lat1: g.lat0 - g.h * g.d }; };

  const cache = new Map();
  /** Colourised canvas of a layer (cached). o: {vmax (cm/yr, default 5), lift (0..1: brightens near-zero cells so valid
   *  ground reads against masked land), alpha (0..1 for valid cells), ref (cm/yr subtracted first), color(v) → [r,g,b]} */
  R.canvas = (layer, o = {}) => {
    const g = R[layer]; if (!g) return null;
    const vmax = o.vmax || 5, lift = o.lift === undefined ? 0.22 : o.lift, al = Math.round(255 * (o.alpha === undefined ? 1 : o.alpha)), ref = o.ref || 0;
    const key = [layer, vmax, lift, al, ref, o.key || ''].join('|');
    let c = cache.get(key);
    if (c) return c;
    c = L.canvas(g.w, g.h);
    const x = c.getContext('2d'), id = x.createImageData(g.w, g.h), d = id.data;
    const LIFT = L.hex('#5F7FA6');
    for (let i = 0; i < g.w * g.h; i++) {
      const v = g.v[i];
      if (v !== v) continue; // NaN → transparent
      let rgb = o.color ? o.color(v - ref) : L.velRGB(v - ref, vmax);
      const near = 1 - Math.min(1, Math.abs(v - ref) / (vmax * 0.5));
      if (lift > 0) rgb = [rgb[0] + (LIFT[0] - rgb[0]) * lift * near, rgb[1] + (LIFT[1] - rgb[1]) * lift * near, rgb[2] + (LIFT[2] - rgb[2]) * lift * near];
      d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = al;
    }
    x.putImageData(id, 0, 0);
    cache.set(key, c);
    return c;
  };
  /** Draw a layer into a map view (L.geo.view) in the current transform. Returns the screen rect it covers. */
  R.draw = (ctx, view, layer, o = {}) => {
    const c = R.canvas(layer, o); if (!c) return null;
    const b = R.bounds(layer);
    const x0 = view.x(b.lon0), y0 = view.y(b.lat0), x1 = view.x(b.lon1), y1 = view.y(b.lat1);
    ctx.save();
    if (o.opacity !== undefined) ctx.globalAlpha *= o.opacity;
    ctx.imageSmoothingEnabled = o.smooth !== false; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  /** Footprint polygon (screen points) of a frame id such as 'P448F0290' in a view. */
  R.footprint = (view, id) => { const f = R.frames.find((q) => q.id === id); return f ? f.corners.map(([lon, lat]) => view.pt(lon, lat)) : null; };
})();

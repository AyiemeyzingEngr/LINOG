/* LInOG explainer — geography: Natural Earth coastlines, Luzon projection, orthographic globe,
 * places, schematic fault traces, ALOS-1 path footprints, land mask and a procedural DEM.
 * Coastlines are real (Natural Earth 10 m via world-atlas, public domain). The DEM, fault traces
 * and footprints are schematic illustrations, not survey data.
 */
(function () {
  'use strict';
  const L = window.LINOG, D = window.GEO_DATA, TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const K = Math.cos(15.5 * DEG); // x compression for a Luzon-centred equirectangular view
  const G = (L.geo = { K });

  function ringsToPath(rings, kx = K) {
    const p = new Path2D();
    for (const r of rings) {
      p.moveTo(r[0] * kx, -r[1]);
      for (let i = 2; i < r.length; i += 2) p.lineTo(r[i] * kx, -r[i + 1]);
      p.closePath();
    }
    return p;
  }
  G.rings = { ph: D.ph, luzon: [D.ph[0]], region: D.region, world: D.world };
  const PATHS = { ph: ringsToPath(D.ph), luzon: ringsToPath([D.ph[0]]), region: ringsToPath(D.region) };
  G.paths = PATHS;

  /** A map view. lon/lat = centre, ppd = pixels per degree of latitude, cx/cy = screen anchor of the centre. */
  G.view = (v) => {
    const s = v.ppd, cx = v.cx === undefined ? L.W / 2 : v.cx, cy = v.cy === undefined ? L.H / 2 : v.cy;
    const lon0 = v.lon, lat0 = v.lat;
    return {
      lon: lon0, lat: lat0, ppd: s, cx, cy,
      x: (lon) => cx + (lon - lon0) * K * s,
      y: (lat) => cy - (lat - lat0) * s,
      pt: (lon, lat) => [cx + (lon - lon0) * K * s, cy - (lat - lat0) * s],
      inv: (x, y) => [lon0 + (x - cx) / (K * s), lat0 - (y - cy) / s],
      /** km → px at this scale (1° lat ≈ 111.32 km) */
      km: (km) => (km / 111.32) * s,
      /** Apply to ctx so Path2D geo paths (X = lon·K, Y = −lat) land in screen space. */
      apply(ctx) { ctx.transform(s, 0, 0, s, cx - lon0 * K * s, cy + lat0 * s); },
      unit: 1 / s,
    };
  };
  /** Fill/stroke land. o: {which:'ph'|'luzon'|'region', fill, stroke, lw (px), alpha} */
  G.drawLand = (ctx, view, o = {}) => {
    const path = PATHS[o.which || 'ph'];
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    view.apply(ctx);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = (o.lw || 1.5) * view.unit; ctx.strokeStyle = o.stroke; ctx.stroke(path); }
    ctx.restore();
  };
  /** Clip subsequent drawing to land (call inside ctx.save()/restore()). */
  G.clipLand = (ctx, view, which = 'ph') => {
    ctx.save(); view.apply(ctx);
    const m = ctx.getTransform(); ctx.restore();
    const p = new Path2D(); p.addPath(PATHS[which], m);
    ctx.clip(p);
  };
  /** Lon/lat graticule lines for a view (every `step` degrees). */
  G.graticule = (ctx, view, step = 1, color = 'rgba(0,229,255,0.08)', lw = 1) => {
    const [lonA, latA] = view.inv(0, L.H), [lonB, latB] = view.inv(L.W, 0);
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
    for (let lon = Math.ceil(lonA / step) * step; lon <= lonB; lon += step) { const x = view.x(lon); ctx.moveTo(x, 0); ctx.lineTo(x, L.H); }
    for (let lat = Math.ceil(latA / step) * step; lat <= latB; lat += step) { const y = view.y(lat); ctx.moveTo(0, y); ctx.lineTo(L.W, y); }
    ctx.stroke(); ctx.restore();
  };

  /* --------------------------------------------------------------- places, faults, footprints */
  G.places = {
    cabanatuan: { lon: 120.967, lat: 15.486, name: 'Cabanatuan City' },
    manila: { lon: 120.984, lat: 14.599, name: 'Manila' },
    baguio: { lon: 120.593, lat: 16.402, name: 'Baguio' },
    laTrinidad: { lon: 120.59, lat: 16.46, name: 'La Trinidad' },
    dagupan: { lon: 120.333, lat: 16.043, name: 'Dagupan City' },
    sanJose: { lon: 120.99, lat: 15.79, name: 'San Jose City' },
    gabaldon: { lon: 121.34, lat: 15.45, name: 'Gabaldon' },
    tarlac: { lon: 120.59, lat: 15.49, name: 'Tarlac City' },
    baler: { lon: 121.56, lat: 15.76, name: 'Baler' },
    dingalan: { lon: 121.39, lat: 15.39, name: 'Dingalan' },
  };
  /** Schematic trace of the Philippine Fault Zone through central Luzon (illustrative, not surveyed). */
  G.faults = {
    pfz: [[121.62, 14.95], [121.45, 15.25], [121.36, 15.42], [121.24, 15.6], [121.12, 15.82], [121.02, 16.02], [120.93, 16.22], [120.9, 16.4], [120.97, 16.65], [121.1, 16.95], [121.27, 17.35], [121.45, 17.85]],
  };
  G.CENTRAL_LUZON = { lon: 120.85, lat: 15.6 };
  /** ALOS-1 ascending paths over central Luzon: centre longitude at 15.5°N, drift −0.22° lon per +1° lat. */
  G.PATH_C0 = { 447: 121.62, 448: 121.1, 449: 120.58 };
  G.footprint = (path, lat0 = 14.5, lat1 = 17.15, hw = 0.4) => {
    const c = (lat) => G.PATH_C0[path] - 0.22 * (lat - 15.5);
    return [[c(lat0) - hw, lat0], [c(lat0) + hw, lat0], [c(lat1) + hw, lat1], [c(lat1) - hw, lat1]];
  };
  G.frameLats = { 280: [14.51, 15.16], 290: [15.01, 15.65], 300: [15.51, 16.15], 310: [16.01, 16.65], 320: [16.5, 17.14] };

  /* --------------------------------------------------------------- orthographic globe */
  function ortho(lon, lat, lon0, lat0) {
    const l = (lon - lon0) * DEG, p = lat * DEG, p0 = lat0 * DEG;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    return [Math.cos(p) * Math.sin(l), Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l), cosc];
  }
  G.ortho = (lon, lat, g) => { const [x, y, z] = ortho(lon, lat, g.lon0, g.lat0); return [g.cx + x * g.r, g.cy - y * g.r, z]; };
  function globeRingPath(ctx, ring, g) {
    let started = false;
    for (let i = 0; i < ring.length; i += 2) {
      let [x, y, z] = ortho(ring[i], ring[i + 1], g.lon0, g.lat0);
      if (z < 0) { const n = Math.hypot(x, y) || 1; x /= n; y /= n; } // clamp hidden points to the limb
      const sx = g.cx + x * g.r, sy = g.cy - y * g.r;
      if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }
  function ringVisible(ring, g) { for (let i = 0; i < ring.length; i += 6) if (ortho(ring[i], ring[i + 1], g.lon0, g.lat0)[2] > 0) return true; return false; }
  /** g: {cx, cy, r, lon0, lat0, p (reveal 0..1), highlight: true, graticule: true, landFill, landStroke} */
  G.drawGlobe = (ctx, g) => {
    const p = g.p === undefined ? 1 : g.p;
    ctx.save();
    // ocean sphere
    const sg = ctx.createRadialGradient(g.cx - g.r * 0.35, g.cy - g.r * 0.4, g.r * 0.1, g.cx, g.cy, g.r);
    sg.addColorStop(0, '#16304A'); sg.addColorStop(0.7, '#0E1E33'); sg.addColorStop(1, '#0A1424');
    ctx.globalAlpha *= p;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r, 0, TAU); ctx.fillStyle = sg; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r, 0, TAU); ctx.clip();
    if (g.graticule !== false) {
      ctx.strokeStyle = 'rgba(0,229,255,0.10)'; ctx.lineWidth = 1;
      for (let lon = -180; lon < 180; lon += 15) { ctx.beginPath(); let st = false; for (let lat = -90; lat <= 90; lat += 3) { const [x, y, z] = G.ortho(lon, lat, g); if (z > 0) { st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; } else st = false; } ctx.stroke(); }
      for (let lat = -75; lat <= 75; lat += 15) { ctx.beginPath(); let st = false; for (let lon = -180; lon <= 180; lon += 3) { const [x, y, z] = G.ortho(lon, lat, g); if (z > 0) { st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; } else st = false; } ctx.stroke(); }
    }
    ctx.beginPath();
    for (const r of D.world) if (ringVisible(r, g)) globeRingPath(ctx, r, g);
    ctx.fillStyle = g.landFill || '#1C3550'; ctx.fill();
    ctx.strokeStyle = g.landStroke || 'rgba(0,229,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    if (g.highlight !== false) {
      ctx.beginPath();
      for (const r of D.ph) if (ringVisible(r, g)) globeRingPath(ctx, r, g);
      ctx.fillStyle = g.phFill || 'rgba(0,229,255,0.30)'; ctx.fill();
      ctx.strokeStyle = g.phStroke || 'rgba(0,229,255,0.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    // terminator-ish shading
    const sh = ctx.createLinearGradient(g.cx - g.r, g.cy - g.r, g.cx + g.r, g.cy + g.r);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.6, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = sh; ctx.fillRect(g.cx - g.r, g.cy - g.r, g.r * 2, g.r * 2);
    ctx.restore();
    // atmosphere rim
    const rg = ctx.createRadialGradient(g.cx, g.cy, g.r * 0.96, g.cx, g.cy, g.r * 1.12);
    rg.addColorStop(0, 'rgba(0,229,255,0.35)'); rg.addColorStop(0.4, 'rgba(0,229,255,0.10)'); rg.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r * 1.12, 0, TAU); ctx.arc(g.cx, g.cy, g.r * 0.96, 0, TAU, true); ctx.fill();
    ctx.restore();
  };

  /* --------------------------------------------------------------- land mask (Luzon window) */
  const MASK = { lon0: 119.4, lon1: 122.8, lat0: 12.4, lat1: 18.8, res: 0.005 };
  let maskData = null, maskW = 0, maskH = 0;
  function buildMask() {
    maskW = Math.round((MASK.lon1 - MASK.lon0) / MASK.res); maskH = Math.round((MASK.lat1 - MASK.lat0) / MASK.res);
    const c = L.canvas(maskW, maskH), x = c.getContext('2d', { willReadFrequently: true });
    // geo path uses X = lon·K, so undo K on x; Y = −lat → row = (lat1 − lat)/res
    x.setTransform(1 / (MASK.res * K), 0, 0, 1 / MASK.res, -MASK.lon0 / MASK.res, MASK.lat1 / MASK.res);
    x.fillStyle = '#fff'; x.fill(PATHS.ph);
    const d = x.getImageData(0, 0, maskW, maskH).data;
    maskData = new Uint8Array(maskW * maskH);
    for (let i = 0; i < maskW * maskH; i++) maskData[i] = d[i * 4 + 3];
  }
  /** 0..1 land fraction (anti-aliased coastline) inside the Luzon window; 0 outside it. */
  G.land = (lon, lat) => {
    if (!maskData) buildMask();
    const i = Math.floor((lon - MASK.lon0) / MASK.res), j = Math.floor((MASK.lat1 - lat) / MASK.res);
    if (i < 0 || j < 0 || i >= maskW || j >= maskH) return 0;
    return maskData[j * maskW + i] / 255;
  };

  /* --------------------------------------------------------------- procedural DEM (schematic) */
  const RANGES = [
    { name: 'Cordillera Central', h: 2300, w: 0.22, pts: [[120.66, 16.28], [120.78, 16.5], [120.88, 16.95], [120.95, 17.55], [121.02, 18.15]] }, // southern tip near Baguio, not on the Pangasinan plain
    { name: 'Sierra Madre', h: 1450, w: 0.2, pts: [[121.42, 14.6], [121.5, 15.15], [121.42, 15.65], [121.5, 16.2], [121.75, 16.8], [122.0, 17.4], [122.15, 18.0]] },
    { name: 'Zambales Mts', h: 1500, w: 0.15, pts: [[120.05, 14.85], [120.12, 15.2], [120.15, 15.6], [120.07, 16.0]] },
    { name: 'Caraballo Mts', h: 1250, w: 0.13, pts: [[120.86, 16.05], [121.1, 16.15], [121.38, 16.22]] },
    { name: 'Mt Arayat', h: 950, w: 0.05, pts: [[120.742, 15.2], [120.744, 15.202]] },
    { name: 'Bataan', h: 1100, w: 0.1, pts: [[120.45, 14.55], [120.42, 14.75]] },
  ];
  G.RANGES = RANGES;
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-12;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  /** Schematic elevation (m) at lon/lat. Smooth, deterministic. Sea = 0. */
  G.height = (lon, lat) => {
    const land = G.land(lon, lat);
    if (land <= 0) return 0;
    let h = 25 + 60 * L.fbm(lon * 6, lat * 6, 3, 11);
    for (const r of RANGES) {
      let d = Infinity;
      for (let i = 1; i < r.pts.length; i++) d = Math.min(d, segDist(lon, lat, r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1]));
      const ridge = Math.exp(-(d / r.w) * (d / r.w));
      if (ridge > 0.002) h += r.h * ridge * (0.55 + 0.9 * L.fbm(lon * 9 + 3, lat * 9 - 2, 5, 5));
    }
    return h * land;
  };
  const gridCache = new Map();
  /** Height grid over a bbox, cached. Returns {nx, ny, lon0, lon1, lat0, lat1, h: Float32Array (row 0 = north)}. */
  G.grid = (lon0, lon1, lat0, lat1, nx, ny) => {
    const key = [lon0, lon1, lat0, lat1, nx, ny].join(',');
    let g = gridCache.get(key);
    if (g) return g;
    const h = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = G.height(lon0 + ((lon1 - lon0) * i) / (nx - 1), lat1 - ((lat1 - lat0) * j) / (ny - 1));
    g = { nx, ny, lon0, lon1, lat0, lat1, h };
    gridCache.set(key, g);
    return g;
  };
  /** Hillshade (0..1) for a grid cell (sun from NW). */
  G.hillshade = (g, i, j, zf = 1) => {
    const ii = Math.max(1, Math.min(g.nx - 2, i)), jj = Math.max(1, Math.min(g.ny - 2, j));
    const cell = ((g.lon1 - g.lon0) / (g.nx - 1)) * 111320 * K;
    const dzdx = (g.h[jj * g.nx + ii + 1] - g.h[jj * g.nx + ii - 1]) / (2 * cell) * zf;
    const dzdy = (g.h[(jj - 1) * g.nx + ii] - g.h[(jj + 1) * g.nx + ii]) / (2 * cell) * zf;
    const slope = Math.atan(Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
    const zen = 45 * (Math.PI / 180), az = 315 * (Math.PI / 180);
    return Math.max(0, Math.cos(zen) * Math.cos(slope) + Math.sin(zen) * Math.sin(slope) * Math.cos(az - aspect));
  };
})();

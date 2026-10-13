/* LInOG explainer — core engine.
 * Timing (120 BPM grid), damped springs, palette + colormaps, deterministic RNG/noise,
 * text system with scanline reveals + layout registry (for QA), cards, camera,
 * the through-line "Radar Phase Wave" (TL), background and HUD.
 * Everything here is a pure function of its inputs: no Date, no Math.random, no frame state.
 */
(function () {
  'use strict';
  const L = (window.LINOG = window.LINOG || {});
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  Object.assign(L, { W, H, TAU, BPM: 120, BEAT: 0.5, BAR: 2, DURATION: 60, FPS: 60 });

  /* ------------------------------------------------------------------ palette */
  const C = (L.C = {
    bg: '#0B111E', card: '#161F30', cardBorder: 'rgba(0,229,255,0.15)',
    cyan: '#00E5FF', gold: '#FFD166', magenta: '#FF4081',
    amber: '#F59E0B', blue: '#3B82F6', purple: '#8B5CF6', emerald: '#10B981', crimson: '#EF4444',
    text: '#E6F1FF', textDim: '#9FB0C8', textMute: '#5B6B84', line: 'rgba(0,229,255,0.15)',
  });

  /* ------------------------------------------------------------------ scene registry */
  L.scenes = [];
  /** Register a scene: {id, t0, t1, tl(env), draw(ctx, env), focus?, overlay?, init?}. See SCENE_GUIDE.md. */
  L.scene = (def) => { L.scenes.push(def); L.scenes.sort((a, b) => a.t0 - b.t0); };

  /* ------------------------------------------------------------------ timeline */
  L.ACTS = [
    { id: 'act1', t0: 0, t1: 10 }, { id: 'act2', t0: 10, t1: 18 }, { id: 'act3', t0: 18, t1: 30 },
    { id: 'act4', t0: 30, t1: 42 }, { id: 'act5', t0: 42, t1: 52 }, { id: 'act6', t0: 52, t1: 60 },
  ];
  // Sub-sections from the storyboard. Camera pushes 1.00 -> 1.04 across each one.
  L.SECTIONS = [[0, 4], [4, 10], [10, 14], [14, 18], [18, 22], [22, 26], [26, 30], [30, 36], [36, 42], [42, 48], [48, 52], [52, 56], [56, 60]];
  L.PHASES = [
    { n: 1, key: 'ingest', label: 'INGESTION & FBS+FBD UNIFICATION', short: 'INGEST · FBS+FBD', color: C.amber, t0: 10, t1: 14 },
    { n: 2, key: 'dem', label: 'DEM & NETWORK', short: 'DEM · NETWORK', color: C.blue, t0: 14, t1: 18 },
    { n: 3, key: 'coreg', label: 'COREGISTRATION', short: 'COREGISTRATION', color: C.blue, t0: 18, t1: 22 },
    { n: 4, key: 'ifg', label: 'INTERFEROGRAMS', short: 'INTERFEROGRAMS', color: C.blue, t0: 22, t1: 30 },
    { n: 5, key: 'sbas', label: 'MINTPY SBAS TIME SERIES', short: 'MINTPY SBAS', color: C.purple, t0: 30, t1: 42 },
    { n: 6, key: 'geo', label: 'GEOCODING & DELIVERABLES', short: 'GEOCODING · DELIVERABLES', color: C.emerald, t0: 42, t1: 52 },
  ];
  // Safe areas. During the HUD window (10..52 s) scenes must keep content inside SAFE_HUD.
  L.SAFE = { x0: 96, y0: 54, x1: 1824, y1: 1026 };
  L.SAFE_HUD = { x0: 96, y0: 132, x1: 1824, y1: 958 };
  L.HUD_WINDOW = [10, 52];

  /* ------------------------------------------------------------------ math */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const invLerp = (a, b, v) => clamp((v - a) / (b - a));
  const remap = (v, a, b, c, d) => lerp(c, d, invLerp(a, b, v));
  const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const smoother = (k) => { k = clamp(k); return k * k * k * (k * (k * 6 - 15) + 10); };
  Object.assign(L, { clamp, lerp, invLerp, remap, smooth, smoother });
  L.ease = {
    inOutSine: (k) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(k)),
    outCubic: (k) => 1 - Math.pow(1 - clamp(k), 3),
    inCubic: (k) => Math.pow(clamp(k), 3),
    inOutCubic: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k))),
  };

  /** Critically-damped-ish spring step response. zeta = 0.82 (≈1.1% overshoot, no bounce).
   *  `dur` = time to settle within ~1%. Returns 0 for t <= 0. */
  function spring(t, dur = 0.5, zeta = 0.82) {
    if (t <= 0) return 0;
    if (zeta >= 0.999) { const wc = 6.6 / dur; return 1 - (1 + wc * t) * Math.exp(-wc * t); } // critically damped
    const w = 4.6 / (zeta * dur);
    const wd = w * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-zeta * w * t);
    return 1 - e * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  }
  L.spring = spring;
  /** Spring that starts at local time `at` and settles in `dur`. */
  L.sp = (lt, at, dur = 0.5) => spring(lt - at, dur);
  /** 0..1 envelope: springs in at `a` (over inDur), springs out ending exactly at `b`. 0 outside [a,b]. */
  L.inout = (lt, a, b, inDur = 0.5, outDur = 0.5) => {
    if (lt <= a || lt >= b) return 0;
    const i = spring(lt - a, inDur);
    const o = 1 - spring(lt - (b - outDur), outDur * 0.8);
    const v = Math.min(i, o);
    return v < 0.002 ? 0 : clamp(v, 0, 1.02);
  };
  /** Staircase motion locked to the beat grid: integer steps every `step` s, each step springing in `dur`. */
  L.steps = (lt, step = 0.5, dur = 0.3) => {
    if (lt <= 0) return 0;
    const i = Math.floor(lt / step);
    return i + spring(lt - i * step, dur);
  };
  /** Beat/bar info for global time t. */
  L.beat = (t) => {
    const b = t / 0.5, i = Math.floor(b);
    return { i, f: b - i, bar: Math.floor(t / 2), inBar: ((i % 4) + 4) % 4, barF: t / 2 - Math.floor(t / 2) };
  };
  /** Quarter-note pulse (1 on the beat, decaying). */
  L.pulse = (t, k = 5) => { const f = (((t / 0.5) % 1) + 1) % 1; return Math.exp(-k * f); };
  /** Snap a time to the beat grid. */
  L.q = (t, step = 0.5) => Math.round(t / step) * step;

  /* ------------------------------------------------------------------ deterministic RNG / noise */
  L.rng = function (seed) {
    let a = seed >>> 0 || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function hash2(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  L.hash2 = hash2;
  L.hash1 = (i, s = 0) => hash2(i, 7919, s);
  function noise2(x, y, s = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  L.noise2 = noise2;
  L.fbm = (x, y, oct = 4, s = 0) => {
    let v = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { v += amp * noise2(x * f, y * f, s + i * 31); n += amp; amp *= 0.5; f *= 2.03; }
    return v / n;
  };

  /* ------------------------------------------------------------------ color */
  const hexCache = new Map();
  function hex(h) {
    if (Array.isArray(h)) return h;
    let v = hexCache.get(h);
    if (v) return v;
    let s = h.replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s.slice(0, 6), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(h, v);
    return v;
  }
  L.hex = hex;
  L.rgba = (h, a = 1) => { const c = hex(h); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  L.mix = (a, b, k) => { a = hex(a); b = hex(b); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; };
  L.css = (rgb, a = 1) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
  function stopsAt(stops, x) {
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const k = (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        const a = stops[i - 1][1], b = stops[i][1];
        return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
      }
    }
    return stops[stops.length - 1][1];
  }
  L.stopsAt = stopsAt;
  const FRINGE_STOPS = [[0, hex(C.cyan)], [1 / 3, hex(C.gold)], [2 / 3, hex(C.magenta)], [1, hex(C.cyan)]];
  const VEL_STOPS = [[-1, hex('#FF9A9A')], [-0.75, hex(C.crimson)], [-0.35, hex('#7A2333')], [0, hex('#1B2B40')], [0.35, hex('#1D4E8F')], [0.75, hex(C.blue)], [1, hex(C.cyan)]];
  const COH_STOPS = [[0, hex('#0B111E')], [0.4, hex('#123049')], [0.7, hex('#1E6E8C')], [1, hex('#C8F8FF')]];
  const DEM_STOPS = [[0, hex('#0F2236')], [150, hex('#12384A')], [600, hex('#1D5A63')], [1200, hex('#3C8A84')], [1900, hex('#8CC9B8')], [2800, hex('#E6F6F0')]];
  /** Brand-cyclic interferometric fringe colour for a phase in radians (wraps every 2π). */
  L.fringeRGB = (phase) => stopsAt(FRINGE_STOPS, (((phase / TAU) % 1) + 1) % 1);
  /** Diverging LOS-velocity colour: v/vmax in [-1,1]. Negative (away from satellite / subsidence) = crimson. */
  L.velRGB = (v, vmax = 5) => stopsAt(VEL_STOPS, clamp(v / vmax, -1, 1));
  L.cohRGB = (c) => stopsAt(COH_STOPS, clamp(c));
  L.demRGB = (h) => stopsAt(DEM_STOPS, h);
  /** 256-entry RGB lookup tables (Uint8ClampedArray, 3 bytes per entry) for fast raster painting. */
  function lut(fn) { const a = new Uint8ClampedArray(256 * 3); for (let i = 0; i < 256; i++) { const c = fn(i / 255); a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } return a; }
  L.LUT = {
    fringe: lut((x) => stopsAt(FRINGE_STOPS, x)), // index = wrapped phase fraction
    vel: lut((x) => stopsAt(VEL_STOPS, x * 2 - 1)), // index = (v/vmax+1)/2
    coh: lut((x) => stopsAt(COH_STOPS, x)),
    dem: lut((x) => stopsAt(DEM_STOPS, x * 2800)),
  };
  L.luminance = (c) => {
    c = hex(c);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  L.contrast = (a, b) => { const la = L.luminance(a), lb = L.luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  /** Text-safe version of an accent: lightens toward white until it reaches `min` contrast on `bg` (default 4.6:1). */
  L.ink = (color, bg = C.bg, min = 4.6) => {
    let c = hex(color);
    for (let k = 0; k <= 1.0001 && L.contrast(c, bg) < min; k += 0.05) c = L.mix(color, '#FFFFFF', k).map(Math.round);
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  /* ------------------------------------------------------------------ canvas helpers */
  L.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  /** Additive radial glow (vector gradient; no shadowBlur). */
  L.glow = (ctx, x, y, r, color, a = 1) => {
    if (a <= 0 || r <= 0) return;
    const c = hex(color);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.55 * a})`);
    g.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${0.18 * a})`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = op;
  };
  L.roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  /** Polyline helper. pts = [[x,y],...] */
  L.poly = (ctx, pts, close = false) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  };
  /** Draw only the first fraction `p` (0..1) of a polyline's length — for lines that "draw on". */
  L.polyPartial = (ctx, pts, p) => {
    if (p <= 0 || pts.length < 2) return;
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let rem = total * clamp(p);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (rem >= seg[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); rem -= seg[i - 1]; }
      else { const k = rem / seg[i - 1]; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); break; }
    }
  };

  /* ------------------------------------------------------------------ layout registry (for QA) */
  const LAYOUT = (L.LAYOUT = { text: [], panels: [] });
  L.resetLayout = () => { LAYOUT.text.length = 0; LAYOUT.panels.length = 0; };
  function screenBox(ctx, x, y, w, h) {
    const m = ctx.getTransform();
    const xs = [], ys = [];
    for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { xs.push(m.a * px + m.c * py + m.e); ys.push(m.b * px + m.d * py + m.f); }
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
  }
  L.screenBox = screenBox;

  /* ------------------------------------------------------------------ fonts + text */
  L.FONT = {
    // Display (Space Grotesk) has Latin only: Greek/maths glyphs fall back to the embedded Inter subset.
    display: '"LInOG Display", "LInOG Sans", "LInOG Mono", sans-serif',
    sans: '"LInOG Sans", "LInOG Mono", sans-serif',
    mono: '"LInOG Mono", "LInOG Sans", monospace',
  };
  L.font = (kind = 'sans', size = 24, weight = 500) => `${weight} ${size}px ${L.FONT[kind] || kind}`;
  const metricsCache = new Map();
  function fontMetrics(ctx, font) {
    let m = metricsCache.get(font);
    if (!m) {
      ctx.save(); ctx.font = font; ctx.letterSpacing = '0px';
      const t = ctx.measureText('HÁgjpq|');
      m = { asc: t.fontBoundingBoxAscent, desc: t.fontBoundingBoxDescent, capH: ctx.measureText('H').actualBoundingBoxAscent };
      ctx.restore();
      if (document.fonts && document.fonts.status === 'loaded') metricsCache.set(font, m);
    }
    return m;
  }
  function segsOf(str, color) { return Array.isArray(str) ? str : [{ s: String(str), color }]; }
  /** Measure (without drawing). Returns {w, asc, desc, capH}. */
  L.measure = (ctx, str, o = {}) => {
    const size = o.size || 28, weight = o.weight || 500, kind = o.kind || 'sans';
    ctx.save();
    const base = L.font(kind, size, weight);
    ctx.letterSpacing = `${(o.tracking || 0) * size}px`;
    let w = 0;
    for (const sg of segsOf(str)) { ctx.font = sg.weight || sg.kind ? L.font(sg.kind || kind, size, sg.weight || weight) : base; w += ctx.measureText(sg.s).width; }
    ctx.restore();
    w -= (o.tracking || 0) * size; // no trailing tracking
    const fm = fontMetrics(ctx, base);
    return { w, asc: fm.asc, desc: fm.desc, capH: fm.capH, h: fm.asc + fm.desc };
  };

  function scanClip(ctx, x, y, w, h, p) {
    const rowH = 3, rows = Math.max(1, Math.ceil(h / rowH));
    const f1 = clamp(p * 2), f2 = clamp(p * 2 - 1);
    ctx.beginPath();
    for (let i = 0; i < rows; i++) {
      const fr = (i + 0.5) / rows;
      if (fr <= (i % 2 === 0 ? f1 : f2)) ctx.rect(x - 4, y + i * rowH, w + 8, rowH + 0.6);
    }
    ctx.clip();
  }
  function scanBar(ctx, x, y, w, h, p, color) {
    if (p <= 0 || p >= 1) return;
    const f = p < 0.5 ? p * 2 : p * 2 - 1;
    const yy = y + h * f;
    const a = 0.85 * Math.sin(Math.PI * p);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = L.rgba(color, a);
    ctx.fillRect(x - 10, yy - 1, w + 20, 2);
    ctx.fillStyle = L.rgba(color, a * 0.25);
    ctx.fillRect(x - 10, yy - 5, w + 20, 10);
    ctx.restore();
  }

  /**
   * Draw text with a reveal. str may be a string or [{s, color, weight}] segments.
   * o: {kind:'display'|'sans'|'mono', size, weight, color, align:'left'|'center'|'right',
   *     baseline:'alphabetic'|'top'|'middle', tracking (em), p (reveal 0..1), mode:'scan'|'wipe'|'type'|'fade',
   *     alpha, bg (background colour behind the text, for contrast QA), role, id, scanColor}
   * Registers the screen-space bbox in LINOG.LAYOUT when visible. Returns the local bbox {x,y,w,h,asc,desc}.
   */
  L.text = (ctx, str, x, y, o = {}) => {
    const p = o.p === undefined ? 1 : o.p;
    const size = o.size || 28, weight = o.weight || 500, kind = o.kind || 'sans';
    const color = o.color || C.text, alpha = o.alpha === undefined ? 1 : o.alpha;
    const tracking = o.tracking || 0, mode = o.mode || 'scan';
    const m = L.measure(ctx, str, o);
    let x0 = x;
    if (o.align === 'center') x0 = x - m.w / 2; else if (o.align === 'right') x0 = x - m.w;
    let yA = y;
    if (o.baseline === 'top') yA = y + m.asc; else if (o.baseline === 'middle') yA = y + (m.capH || m.asc * 0.7) / 2;
    const box = { x: x0, y: yA - m.asc, w: m.w, h: m.asc + m.desc, asc: m.asc, desc: m.desc, base: yA };
    if (p <= 0 || alpha <= 0) return box;
    const segs = segsOf(str, color);
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.letterSpacing = `${tracking * size}px`;
    const base = L.font(kind, size, weight);
    let nChars = Infinity;
    if (p < 1) {
      if (mode === 'scan') scanClip(ctx, box.x, box.y, box.w, box.h, p);
      else if (mode === 'wipe') { ctx.beginPath(); ctx.rect(box.x - 4, box.y - 4, (box.w + 8) * clamp(p), box.h + 8); ctx.clip(); }
      else if (mode === 'type') nChars = Math.floor(segs.reduce((n, sg) => n + sg.s.length, 0) * clamp(p));
      else if (mode === 'fade') ctx.globalAlpha *= clamp(p);
    }
    let cx = box.x, drawn = 0;
    for (const sg of segs) {
      ctx.font = sg.weight || sg.kind ? L.font(sg.kind || kind, size, sg.weight || weight) : base;
      let s = sg.s;
      if (drawn + s.length > nChars) s = s.slice(0, Math.max(0, nChars - drawn));
      ctx.fillStyle = sg.color || color;
      if (s.length) ctx.fillText(s, cx, yA);
      cx += ctx.measureText(sg.s).width;
      drawn += sg.s.length;
      if (drawn >= nChars) break;
    }
    if (mode === 'type' && p < 1) {
      ctx.font = base;
      const typed = segs.map((sg) => sg.s).join('').slice(0, nChars);
      const tw = ctx.measureText(typed).width;
      ctx.fillStyle = L.rgba(o.scanColor || C.cyan, 0.9);
      ctx.fillRect(box.x + tw + 2, yA - m.capH, size * 0.55, m.capH);
    }
    ctx.restore();
    if (p < 1 && mode === 'scan') scanBar(ctx, box.x, box.y, box.w, box.h, p, o.scanColor || C.cyan);
    if (p < 1 && mode === 'wipe') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = L.rgba(o.scanColor || C.cyan, 0.9 * Math.sin(Math.PI * p));
      ctx.fillRect(box.x + box.w * p, box.y - 6, 2, box.h + 12); ctx.restore();
    }
    if (p >= 0.6 && alpha >= 0.5 && o.role !== 'deco') {
      const sb = screenBox(ctx, box.x, box.y, box.w, box.h);
      LAYOUT.text.push({ ...sb, str: segs.map((s) => s.s).join(''), color: Array.isArray(str) ? (o.color || C.text) : color, colors: segs.map((s) => s.color || color), bg: o.bg || C.bg, size: size * Math.abs(ctx.getTransform().a), role: o.role || 'text', id: o.id || null, scene: L._sceneId || null });
    }
    return box;
  };
  /** Multi-line text. lines: array of strings/segment-arrays. o.lh = line height (px). Reveal staggers per line. */
  L.textLines = (ctx, lines, x, y, o = {}) => {
    const lh = o.lh || (o.size || 28) * 1.25, p = o.p === undefined ? 1 : o.p, n = lines.length;
    const stag = o.stagger === undefined ? 0.18 : o.stagger;
    const boxes = [];
    lines.forEach((ln, i) => {
      const lp = n === 1 ? p : clamp((p * (1 + stag * (n - 1)) - stag * i));
      boxes.push(L.text(ctx, ln, x, y + i * lh, { ...o, p: lp }));
    });
    return boxes;
  };

  /** UI card (surface #161F30, cyan hairline border) that constructs along scanlines top→bottom. */
  L.card = (ctx, x, y, w, h, o = {}) => {
    const p = o.p === undefined ? 1 : o.p;
    if (p <= 0) return;
    const r = o.r === undefined ? 12 : o.r, accent = o.accent || C.cyan;
    const k = L.ease.outCubic(clamp(p * 1.15));
    ctx.save();
    ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    if (p < 1) { ctx.beginPath(); ctx.rect(x - 2, y - 2, w + 4, (h + 4) * k); ctx.clip(); }
    L.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = o.fill || C.card; ctx.fill();
    ctx.lineWidth = 1.25; ctx.strokeStyle = o.border || C.cardBorder; ctx.stroke();
    // accent rail grows from the left
    ctx.fillStyle = L.rgba(accent, 0.95);
    ctx.fillRect(x + r, y, Math.max(0, (w - 2 * r) * clamp(p * 1.4 - 0.15) * (o.rail === undefined ? 0.22 : o.rail)), 2);
    ctx.restore();
    if (p < 1) scanBar(ctx, x, y, w, h, Math.min(0.999, 0.5 + k * 0.5), accent);
    if (p >= 0.6) LAYOUT.panels.push({ ...screenBox(ctx, x, y, w, h), fill: o.fill || C.card });
  };

  /* ------------------------------------------------------------------ camera */
  /** Global camera: within an act the zoom is continuous and pushes ×1.04 across every section
   *  (1.00 → 1.04 → 1.0816 ...). It re-enters at 1.00 on each act boundary (match-cut on the TL). */
  L.cam = (t, focus) => {
    let act = L.ACTS.find((a) => t >= a.t0 && t < a.t1) || L.ACTS[L.ACTS.length - 1];
    const secs = L.SECTIONS.filter((s) => s[0] >= act.t0 && s[1] <= act.t1);
    let k = 0;
    for (let i = 0; i < secs.length; i++) {
      const [s0, s1] = secs[i];
      if (t >= s1) k += 1; else if (t >= s0) k += (t - s0) / (s1 - s0);
    }
    const z = Math.pow(1.04, k);
    const fx = focus ? focus[0] : W / 2, fy = focus ? focus[1] : H / 2;
    const dx = 2.5 * Math.sin((TAU * t) / 8), dy = 1.6 * Math.sin((TAU * t) / 11 + 1);
    const e = fx - fx * z + dx, f = fy - fy * z + dy;
    return {
      z, fx, fy, dx, dy, e, f,
      apply(ctx) { ctx.transform(z, 0, 0, z, e, f); },
      toScreen(x, y) { return [x * z + e, y * z + f]; },
      toWorld(x, y) { return [(x - e) / z, (y - f) / z]; },
    };
  };

  /* ------------------------------------------------------------------ the through-line (TL) */
  /* The "Radar Phase Wave". Every form is a closed loop of N points parameterised by u ∈ [0,1):
   * u = 0 is the leftmost point, u ∈ [0,.5] runs over the top to the rightmost point, u ∈ [.5,1) returns along the bottom.
   * Open forms (pulse) run out and back along the same curve, so morphing pulse → loop "opens" the wave into a ring. */
  const N = 192;
  const FORMS = ['pulse', 'pixel', 'node', 'fringe', 'contour', 'ring'];
  function formPoint(form, u, s, out) {
    const ph = s.phase || 0;
    switch (form) {
      case 'pulse': {
        const q = u < 0.5 ? u * 2 : 2 - u * 2; // 0..1..0
        const env = Math.pow(Math.sin(Math.PI * q), 1.15);
        out[0] = -1 + 2 * q;
        out[1] = -(s.amp === undefined ? 1 : s.amp) * 0.34 * env * Math.sin(TAU * (s.cycles || 3.5) * q - ph);
        return;
      }
      case 'pixel': { // square, half side 0.62, perimeter param from left-mid, over the top
        const a = 0.62, per = u * 8; // 8 half-edges
        const seq = [[-a, 0], [-a, -a], [0, -a], [a, -a], [a, 0], [a, a], [0, a], [-a, a], [-a, 0]];
        const i = Math.min(7, Math.floor(per)), k = per - i;
        out[0] = lerp(seq[i][0], seq[i + 1][0], k); out[1] = lerp(seq[i][1], seq[i + 1][1], k);
        return;
      }
      case 'node': { const th = Math.PI + TAU * u; out[0] = 0.4 * Math.cos(th); out[1] = 0.4 * Math.sin(th); return; }
      case 'fringe': {
        const th = Math.PI + TAU * u;
        const r = 1 + 0.022 * (s.amp === undefined ? 1 : s.amp) * Math.sin(9 * th - ph * 2);
        out[0] = r * Math.cos(th); out[1] = r * Math.sin(th); return;
      }
      case 'contour': {
        const th = Math.PI + TAU * u, sd = s.seed || 7;
        let r = 1;
        for (let k = 2; k <= 5; k++) r += (0.05 + 0.06 * L.hash1(k, sd)) * Math.sin(k * th + TAU * L.hash1(k + 9, sd) + 0.15 * ph);
        out[0] = r * Math.cos(th) * 1.08; out[1] = r * Math.sin(th) * 0.9; return;
      }
      case 'ring': {
        const th = Math.PI + TAU * u;
        out[0] = Math.cos(th); out[1] = (s.aspect === undefined ? 0.34 : s.aspect) * Math.sin(th); return;
      }
      default: out[0] = 0; out[1] = 0;
    }
  }
  const CYAN = hex(C.cyan), CRIMSON = hex(C.crimson);
  function formColor(form, u, s) {
    if (s.tint && form !== 'fringe') return hex(s.tint);
    if (form === 'fringe') return L.fringeRGB(TAU * u + (s.phase || 0));
    if (form === 'contour') return CRIMSON;
    return CYAN;
  }
  const _pt = [0, 0], _pt2 = [0, 0];
  L.TL = {
    N, FORMS,
    /** Normalise a TL state. */
    state(s) {
      return Object.assign({ x: W / 2, y: H / 2, size: 100, rot: 0, form: 'pulse', to: null, k: 0, phase: 0, amp: 1, energy: 0.5, alpha: 1, lw: 1 }, s);
    },
    /** Points (screen space) + colours for a state. */
    points(st) {
      const s = this.state(st);
      const P = new Float32Array(N * 2), Cc = new Float32Array(N * 3);
      const k = s.to ? clamp(s.k) : 0;
      const cr = Math.cos(s.rot), sr = Math.sin(s.rot);
      for (let i = 0; i < N; i++) {
        const u = i / N;
        formPoint(s.form, u, s, _pt);
        let x = _pt[0], y = _pt[1];
        let col = formColor(s.form, u, s);
        if (s.to && k > 0) {
          formPoint(s.to, u, s, _pt2);
          x = lerp(x, _pt2[0], k); y = lerp(y, _pt2[1], k);
          const c2 = formColor(s.to, u, s);
          col = [lerp(col[0], c2[0], k), lerp(col[1], c2[1], k), lerp(col[2], c2[2], k)];
        }
        x *= s.size; y *= s.size;
        P[i * 2] = s.x + x * cr - y * sr; P[i * 2 + 1] = s.y + x * sr + y * cr;
        Cc[i * 3] = col[0]; Cc[i * 3 + 1] = col[1]; Cc[i * 3 + 2] = col[2];
      }
      return { P, C: Cc, s };
    },
    /** Weight of a form in a (possibly morphing) state. */
    weight(s, form) { if (!s.to) return s.form === form ? 1 : 0; const k = clamp(s.k); return (s.form === form ? 1 - k : 0) + (s.to === form ? k : 0); },
    /** Draw in SCREEN space (resets the transform). */
    draw(ctx, st) {
      const { P, C: Cc, s } = this.points(st);
      if (s.alpha <= 0) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = clamp(s.alpha);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const sc = clamp(s.size / 110, 0.55, 1.35) * s.lw;
      const e = clamp(s.energy, 0, 1.5);
      const layers = [[15 * sc, 0.07 + 0.06 * e, 'lighter'], [6.5 * sc, 0.16 + 0.12 * e, 'lighter'], [2.6 * sc, 1, 'source-over']];
      const CH = 48, per = N / CH;
      for (const [lw, a, op] of layers) {
        ctx.globalCompositeOperation = op; ctx.lineWidth = lw;
        ctx.lineCap = op === 'lighter' ? 'butt' : 'round'; // butt caps: additive chunks must not overlap (no beading)
        for (let c = 0; c < CH; c++) {
          const i0 = Math.floor(c * per), i1 = Math.floor((c + 1) * per);
          const im = Math.min(N - 1, (i0 + i1) >> 1);
          ctx.strokeStyle = `rgba(${Cc[im * 3] | 0},${Cc[im * 3 + 1] | 0},${Cc[im * 3 + 2] | 0},${a})`;
          ctx.beginPath(); ctx.moveTo(P[i0 * 2], P[i0 * 2 + 1]);
          for (let i = i0 + 1; i <= i1; i++) { const j = i % N; ctx.lineTo(P[j * 2], P[j * 2 + 1]); }
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // form-specific accents, weighted by morph
      const wPix = this.weight(s, 'pixel'), wNode = this.weight(s, 'node'), wRing = this.weight(s, 'ring'), wFr = this.weight(s, 'fringe');
      const base = s.tint ? hex(s.tint) : CYAN;
      if (wPix > 0.01) { // complex phasor inside the SLC pixel
        const r = s.size * 0.5, a = (s.phase || 0) * 0.5 - 0.6;
        ctx.globalAlpha = clamp(s.alpha) * wPix;
        ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 2.2 * sc;
        const ex = s.x + Math.cos(a) * r * 0.82, ey = s.y + Math.sin(a) * r * 0.82;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, 3.5 * sc, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.5 * sc, 0, TAU); ctx.fill();
      }
      if (wNode > 0.01) {
        ctx.globalAlpha = clamp(s.alpha) * wNode;
        ctx.fillStyle = L.css(base, 1);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 0.16, 0, TAU); ctx.fill();
        const ring = ((s.phase || 0) / TAU) % 1;
        ctx.strokeStyle = L.css(base, 0.5 * (1 - ring)); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.45 + 0.5 * ring), 0, TAU); ctx.stroke();
      }
      if (wRing > 0.01) {
        ctx.globalAlpha = clamp(s.alpha) * wRing;
        ctx.fillStyle = L.css(base, 1);
        const th = (s.phase || 0) * 0.5;
        const ax = Math.cos(th) * s.size, ay = (s.aspect === undefined ? 0.34 : s.aspect) * Math.sin(th) * s.size;
        ctx.beginPath(); ctx.arc(s.x + ax * Math.cos(s.rot) - ay * Math.sin(s.rot), s.y + ax * Math.sin(s.rot) + ay * Math.cos(s.rot), 5 * sc, 0, TAU); ctx.fill();
      }
      if (wFr > 0.01) {
        ctx.globalAlpha = clamp(s.alpha) * wFr * 0.5;
        ctx.lineWidth = 1;
        for (let k = 1; k <= 2; k++) {
          ctx.strokeStyle = L.css(L.fringeRGB((s.phase || 0) + k * 2), 0.6);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (1 - 0.22 * k), 0, TAU); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      L.glow(ctx, s.x, s.y, s.size * (0.9 + 0.5 * e), this.dominant(s) === 'contour' ? C.crimson : C.cyan, 0.25 * e * clamp(s.alpha)); // still in screen space
      ctx.restore();
    },
    /** The form a (possibly morphing) state mostly looks like. */
    dominant(s) { return s.to && clamp(s.k) >= 0.5 ? s.to : s.form; },
    /** Blend a handoff state (from the previous act, pure form) into a target layout state (pure form).
     *  k: 0 → exactly the handoff, 1 → exactly the target. Form morphs handoff.form → target.form. */
    blend(handoff, target, k) {
      const h = this.state(handoff), t = this.state(target);
      k = clamp(k, 0, 1.05); // allow the spring's tiny overshoot on position/size
      const kk = clamp(k);
      const from = h.to && clamp(h.k) >= 0.5 ? h.to : h.form; // handoffs should be pure forms
      return this.state({
        ...t,
        x: lerp(h.x, t.x, k), y: lerp(h.y, t.y, k), size: lerp(h.size, t.size, k), rot: lerp(h.rot, t.rot, kk),
        energy: lerp(h.energy, t.energy, kk), amp: lerp(h.amp, t.amp, kk), alpha: lerp(h.alpha, t.alpha, kk), lw: lerp(h.lw, t.lw, kk),
        form: from, to: from === t.form ? null : t.form, k: from === t.form ? 0 : kk,
        tint: kk < 0.5 ? h.tint : t.tint, phase: t.phase, cycles: t.cycles || h.cycles, seed: t.seed || h.seed, aspect: t.aspect || h.aspect,
      });
    },
  };

  /* ------------------------------------------------------------------ background */
  let scanlineTile = null;
  L.bg = {
    draw(ctx, t) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      // faint geodetic graticule, drifting slowly (screen space, continuous across cuts)
      const sp = 120, ox = (t * 6) % sp, oy = (t * 3.5) % sp;
      ctx.strokeStyle = 'rgba(0,229,255,0.035)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -sp + ox; x < W + sp; x += sp) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
      for (let y = -sp + oy; y < H + sp; y += sp) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
      ctx.stroke();
      // tick crosses on intersections every other cell
      ctx.fillStyle = 'rgba(0,229,255,0.07)';
      for (let x = -sp + ox; x < W + sp; x += sp * 2) for (let y = -sp + oy; y < H + sp; y += sp * 2) { ctx.fillRect(Math.round(x) - 4, Math.round(y), 9, 1); ctx.fillRect(Math.round(x), Math.round(y) - 4, 1, 9); }
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 1.05);
      g.addColorStop(0, 'rgba(22,31,48,0.35)'); g.addColorStop(1, 'rgba(3,6,12,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
    post(ctx) {
      if (!scanlineTile) {
        scanlineTile = L.canvas(W, H);
        const c = scanlineTile.getContext('2d');
        c.fillStyle = 'rgba(0,0,0,0.06)';
        for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(scanlineTile, 0, 0); ctx.restore();
    },
  };

  /* ------------------------------------------------------------------ HUD (global, screen space) */
  const fmtT = (t) => { const s = Math.max(0, t); const m = Math.floor(s / 60); const r = s - m * 60; return `${String(m).padStart(2, '0')}:${r.toFixed(2).padStart(5, '0')}`; };
  L.hud = {
    /** HUD visibility 0..1 */
    vis(t) { return L.inout(t, L.HUD_WINDOW[0], L.HUD_WINDOW[1], 1.0, 0.75); },
    phaseAt(t) { return L.PHASES.find((p) => t >= p.t0 && t < p.t1) || null; },
    draw(ctx, t) {
      const v = this.vis(t);
      if (v <= 0) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const ph = this.phaseAt(t);
      const findings = t >= 48 && t < 52;
      // --- top-left: phase header (re-reveals on every phase change)
      if (ph || findings) {
        const t0 = findings ? 48 : ph.t0, t1 = findings ? 52 : ph.t1;
        const pin = Math.min(v, L.inout(t, t0, t1 + (t1 >= 52 ? 0 : 0.0001), 0.6, t1 >= 52 ? 0.75 : 0.3));
        const col = findings ? C.crimson : ph.color;
        const label = findings ? 'RESULT · CABANATUAN CITY SUBSIDENCE' : ph.label;
        const tag = findings ? 'FINDINGS' : `PHASE ${String(ph.n).padStart(2, '0')}/06`;
        ctx.fillStyle = L.rgba(col, 0.95 * pin);
        ctx.fillRect(96, 62, 10 * clamp(pin * 2), 26);
        const b = L.text(ctx, tag, 118, 82, { kind: 'mono', size: 17, weight: 600, color: L.ink(col), p: pin, tracking: 0.08, role: 'hud', id: 'hud-tag', scanColor: col });
        L.text(ctx, label, 118 + b.w + 18, 83, { kind: 'display', size: 26, weight: 600, color: C.text, p: clamp(pin * 1.1 - 0.05), tracking: 0.02, role: 'hud', id: 'hud-phase', scanColor: col });
      }
      // --- top-right: wordmark + radar readout
      L.text(ctx, [{ s: 'L', color: C.cyan }, { s: 'In', color: C.text }, { s: 'O', color: C.cyan }, { s: 'G', color: C.cyan }], 1824, 86, { kind: 'display', size: 28, weight: 700, align: 'right', p: v, role: 'hud', id: 'hud-logo' });
      L.text(ctx, `ALOS-1 PALSAR · L-BAND λ 23.6 cm · T+${fmtT(t)}`, 1824, 112, { kind: 'mono', size: 14, weight: 400, color: C.textDim, align: 'right', p: v, role: 'hud', id: 'hud-readout' });
      // --- bottom: 6-phase pipeline tracker
      const x0 = 96, x1 = 1824, gap = 14, y = 1004, n = L.PHASES.length;
      const segW = (x1 - x0 - gap * (n - 1)) / n;
      L.PHASES.forEach((p, i) => {
        const sx = x0 + i * (segW + gap);
        const reveal = clamp(v * 1.6 - i * 0.1);
        if (reveal <= 0) return;
        const done = t >= p.t1, active = t >= p.t0 && t < p.t1;
        const prog = done ? 1 : active ? (t - p.t0) / (p.t1 - p.t0) : 0;
        ctx.fillStyle = L.rgba(p.color, 0.18 * reveal);
        ctx.fillRect(sx, y + 14, segW * reveal, 3);
        if (prog > 0) { ctx.fillStyle = L.rgba(p.color, (active ? 1 : 0.55) * reveal); ctx.fillRect(sx, y + 14, segW * prog * reveal, 3); }
        if (active) L.glow(ctx, sx + segW * prog, y + 15.5, 16, p.color, 0.8 * reveal * (0.6 + 0.4 * L.pulse(t)));
        const col = active ? L.ink(p.color) : done ? '#C3D0E2' : C.textDim;
        L.text(ctx, `${String(p.n).padStart(2, '0')}  ${p.short}`, sx, y, { kind: 'mono', size: 14, weight: active ? 600 : 400, color: col, p: reveal, tracking: 0.06, alpha: active ? 1 : done ? 0.85 : 0.75, role: 'hud', id: `hud-ph${p.n}` });
      });
      ctx.restore();
    },
  };
})();

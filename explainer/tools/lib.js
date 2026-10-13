/* Shared Playwright helpers for snap.js, qa and render.js. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function resolvePlaywright() {
  try { return require('playwright'); } catch (_) { /* fall through */ }
  try {
    const g = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return require(path.join(g, 'playwright'));
  } catch (_) { /* fall through */ }
  throw new Error('playwright not found: run `npm install` in explainer/ (browsers: npx playwright install chromium)');
}

/** Static file server for the dev page (fonts need http://, not file://). */
function serve(root = ROOT) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(root, u === '/' ? 'index.dev.html' : u);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/index.dev.html` }));
  });
}

const LAUNCH_ARGS = ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu-vsync', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'];

/** Launch Chromium and open the page. mode: 'dev' (src/ over http) or a path to a built html file. */
async function open(mode = 'dev', { workers = 1 } = {}) {
  const pw = resolvePlaywright();
  const browser = await pw.chromium.launch({ args: LAUNCH_ARGS });
  let server = null, url;
  if (mode === 'dev') { server = await serve(); url = server.url; }
  else url = 'file://' + path.resolve(mode);
  const pages = [];
  for (let i = 0; i < workers; i++) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const logs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    await page.goto(url + '?render=1');
    const info = await page.evaluate(() => window.ready);
    const cdp = await page.context().newCDPSession(page);
    pages.push({ page, cdp, logs, info });
  }
  return {
    browser, pages, info: pages[0].info,
    async close() { await browser.close(); if (server) server.srv.close(); },
  };
}

/** Seek and capture the stage as a PNG buffer. */
async function capture(p, t, opts = {}) {
  const info = await p.page.evaluate(([tt, o]) => window.seek(tt, o), [t, opts]);
  const shot = await p.cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, optimizeForSpeed: true, captureBeyondViewport: false });
  return { png: Buffer.from(shot.data, 'base64'), info };
}

/* ------------------------------------------------------------------ QA */
function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
function parseColor(s) {
  if (!s) return [230, 241, 255];
  if (Array.isArray(s)) return s;
  if (s[0] === '#') { let h = s.slice(1); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = s.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(',').slice(0, 3).map(Number);
  return [230, 241, 255];
}
function contrast(a, b) { const la = lum(parseColor(a)), lb = lum(parseColor(b)); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
const SAFE = { x0: 96, y0: 54, x1: 1824, y1: 1026 }, SAFE_HUD = { x0: 96, y0: 132, x1: 1824, y1: 958 };

/** Static layout checks on one frame's registry. Returns [{t, kind, msg}] */
function checkLayout(info) {
  const out = [], t = info.t, tx = info.layout.text, panels = info.layout.panels;
  const hudOn = t >= 10.6 && t <= 51.4;
  for (const b of tx) {
    const s = b.role === 'hud' || !hudOn ? SAFE : SAFE_HUD;
    if (b.x < s.x0 - 2 || b.y < s.y0 - 2 || b.x + b.w > s.x1 + 2 || b.y + b.h > s.y1 + 2)
      out.push({ t, kind: 'safe-area', msg: `"${b.str.slice(0, 40)}" (${b.scene}) box ${b.x | 0},${b.y | 0} ${b.w | 0}×${b.h | 0} outside ${b.role === 'hud' || !hudOn ? 'title-safe' : 'HUD-safe'} area` });
    let bg = b.bg;
    if (!bg || bg.toUpperCase() === '#0B111E') {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const pn = panels.find((p) => cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h);
      if (pn) bg = pn.fill;
    }
    const need = b.size >= 24 ? 3.0 : 4.5;
    for (const c of b.colors || [b.color]) {
      const cr = contrast(c, bg || '#0B111E');
      if (cr < need) out.push({ t, kind: 'contrast', msg: `"${b.str.slice(0, 40)}" (${b.scene}) ${c} on ${bg} = ${cr.toFixed(2)} < ${need}` });
    }
  }
  for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) {
    const a = tx[i], b = tx[j];
    if (a.id && a.id === b.id) continue;
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const inter = ix * iy, mn = Math.min(a.w * a.h, b.w * b.h);
    if (mn > 16 && inter / mn > 0.08) out.push({ t, kind: 'overlap', msg: `"${a.str.slice(0, 30)}" ⨯ "${b.str.slice(0, 30)}" (${a.scene}/${b.scene}) overlap ${(100 * inter / mn).toFixed(0)}%` });
  }
  return out;
}
function thumbDiff(a, b, skipBands = true) {
  let s = 0, n = 0;
  for (let y = 0; y < 108; y++) {
    if (skipBands && (y < 13 || y > 95)) continue;
    for (let x = 0; x < 192; x++) { const o = (y * 192 + x) * 4; s += Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]); n += 3; }
  }
  return s / n;
}
function thumbEnergy(a) { // mean deviation from the slate background
  let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - 11) + Math.abs(a[i + 1] - 17) + Math.abs(a[i + 2] - 30);
  return s / (a.length * 0.75);
}

/** Full QA sweep. Returns {issues, stats}. */
async function runQA(p, { from = 0, to = 60, step = 0.25, boundaries = [10, 18, 30, 42, 52], log = () => {} } = {}) {
  const issues = [], frames = [];
  let prevThumb = null, stillRun = 0, stillStart = 0;
  const seen = new Map(); // text key → {first, last, scene} for the ≥ 1.5 s readability rule
  for (let t = from; t <= Math.min(to, 59.99) + 1e-9; t = Math.round((t + step) * 1000) / 1000) {
    const info = await p.page.evaluate((tt) => window.seek(tt), t);
    const th = await p.page.evaluate(() => window.__thumb());
    issues.push(...checkLayout(info));
    for (const b of info.layout.text) {
      if (b.role === 'hud') continue;
      const k = b.id ? 'id:' + b.id : b.str.replace(/[0-9]/g, '#'); // rolling counters keep one key
      const e = seen.get(k);
      if (e && t - e.last <= step + 1e-6) e.last = t; else { if (e) finishRead(k, e); seen.set(k, { first: t, last: t, scene: b.scene, str: b.str }); }
    }
    if (!info.tl || info.tl.alpha < 0.5 || info.tl.size < 24) issues.push({ t, kind: 'tl-visibility', msg: info.tl ? `through-line too faint/small (alpha ${info.tl.alpha.toFixed(2)}, size ${info.tl.size.toFixed(0)})` : 'through-line missing' });
    const en = thumbEnergy(th);
    if (en < 1.2) issues.push({ t, kind: 'blank', msg: `frame looks empty (energy ${en.toFixed(2)})` });
    if (info.ms > 250) issues.push({ t, kind: 'perf', msg: `frame took ${info.ms.toFixed(0)} ms` });
    if (prevThumb) {
      const d = thumbDiff(prevThumb, th);
      if (d < 0.35) { if (!stillRun) stillStart = t - step; stillRun += step; }
      else { if (stillRun > 1.0 + 1e-6) issues.push({ t: stillStart, kind: 'static-hold', msg: `little motion for ${stillRun.toFixed(2)} s (${stillStart.toFixed(2)}–${(stillStart + stillRun).toFixed(2)})` }); stillRun = 0; }
    }
    prevThumb = th;
    frames.push({ t, ms: info.ms, scene: info.scene });
    if (frames.length % 40 === 0) log(`qa ${t.toFixed(2)} s`);
  }
  if (stillRun > 1.0 + 1e-6) issues.push({ t: stillStart, kind: 'static-hold', msg: `little motion for ${stillRun.toFixed(2)} s` });
  for (const [k, e] of seen) finishRead(k, e);
  function finishRead(k, e) {
    // visible span ≈ (last − first + step); strings whose digits change every frame (counters, timecodes) are skipped
    const span = e.last - e.first + step;
    if (span < 1.5 - 1e-6 && e.first > from + 1e-6 && e.last < Math.min(to, 59.99) - step + 1e-6)
      issues.push({ t: e.first, kind: 'readability', msg: `"${e.str.slice(0, 50)}" (${e.scene}) readable for only ~${span.toFixed(2)} s (< 1.5 s)` });
  }
  // through-line continuity across act boundaries (match cuts)
  for (const T of boundaries) {
    if (T < from || T > to) continue;
    const a = await p.page.evaluate((tt) => window.seek(tt), T - 1 / 60);
    const b = await p.page.evaluate((tt) => window.seek(tt), T);
    if (!a.tl || !b.tl) { issues.push({ t: T, kind: 'tl-continuity', msg: `through-line missing at the ${T}s cut (before: ${!!a.tl}, after: ${!!b.tl})` }); continue; }
    const dom = (s) => (s.to && s.k >= 0.5 ? s.to : s.form);
    const dp = Math.hypot(a.tl.x - b.tl.x, a.tl.y - b.tl.y), rs = b.tl.size / a.tl.size;
    if (dp > 30 || rs < 0.85 || rs > 1.18 || dom(a.tl) !== dom(b.tl))
      issues.push({ t: T, kind: 'tl-continuity', msg: `cut at ${T}s: Δpos ${dp.toFixed(1)} px, size ×${rs.toFixed(2)}, form ${dom(a.tl)} → ${dom(b.tl)}` });
    const end = await p.page.evaluate((tt) => window.seek(tt), T - 1e-4);
    if (end.tl) {
      const pure = !end.tl.to || end.tl.k <= 0.02 || end.tl.k >= 0.98;
      const inWin = end.tl.x >= 560 && end.tl.x <= 1360 && end.tl.y >= 380 && end.tl.y <= 720;
      if (!pure || !inWin || end.tl.alpha < 0.9) issues.push({ t: T, kind: 'tl-continuity', msg: `hand-off state at ${T}s must be a pure form inside x 560–1360, y 380–720 with alpha ≥ 0.9 (got ${dom(end.tl)}${pure ? '' : ' mid-morph'}, (${end.tl.x.toFixed(0)}, ${end.tl.y.toFixed(0)}), alpha ${end.tl.alpha.toFixed(2)})` });
    }
  }
  const errs = await p.page.evaluate(() => window.LINOG.errors.slice());
  for (const e of errs) issues.push({ t: null, kind: 'error', msg: e });
  const ms = frames.map((f) => f.ms);
  return { issues, stats: { frames: frames.length, msAvg: ms.reduce((a, b) => a + b, 0) / ms.length, msMax: Math.max(...ms) } };
}

function summarize(issues) {
  const by = {};
  for (const i of issues) (by[i.kind] = by[i.kind] || []).push(i);
  const lines = [];
  for (const k of Object.keys(by)) {
    lines.push(`${k}: ${by[k].length}`);
    const seen = new Set();
    for (const i of by[k]) { const key = i.msg.replace(/\d+(\.\d+)?/g, '#'); if (seen.has(key) && k !== 'tl-continuity') continue; seen.add(key); lines.push(`  ${i.t === null ? '' : i.t.toFixed(2) + 's '}${i.msg}`); if (seen.size >= 12) { lines.push('  …'); break; } }
  }
  return lines.join('\n');
}

module.exports = { ROOT, resolvePlaywright, serve, open, capture, runQA, checkLayout, summarize, contrast };

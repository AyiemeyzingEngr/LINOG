#!/usr/bin/env node
/* Determinism check: render frames in timeline order on one page, then in a scrambled order on a fresh
 * page, and compare pixel hashes. Any mismatch means a frame depends on state other than t.
 *   node tools/determinism.js [--n 48] [--dist]
 */
const crypto = require('crypto');
const lib = require('./lib');
const DUR = require('../src/timing.js').DURATION;

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

async function hashes(mode, times) {
  const app = await lib.open(mode);
  const p = app.pages[0], out = new Map();
  for (const t of times) {
    await p.page.evaluate((tt) => window.seek(tt), t);
    const px = await p.page.evaluate(() => {
      const c = document.getElementById('stage'), x = c.getContext('2d');
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let h1 = 2166136261 >>> 0, h2 = 0;
      for (let i = 0; i < d.length; i += 1) { h1 = Math.imul(h1 ^ d[i], 16777619) >>> 0; h2 = (h2 + d[i] * ((i % 251) + 1)) >>> 0; }
      return `${h1.toString(16)}:${h2.toString(16)}`;
    });
    out.set(t, px);
  }
  await app.close();
  return out;
}

(async () => {
  const n = +opt('n', 48);
  const mode = args.includes('--dist') ? require('../build').build() : 'dev';
  const times = Array.from({ length: n }, (_, i) => Math.round(((i + 0.37) * DUR / n) * 1000) / 1000);
  const rng = (() => { let a = 12345; return () => ((a = (Math.imul(a, 1103515245) + 12345) >>> 0) / 4294967296); })();
  const shuffled = times.slice().sort(() => rng() - 0.5).sort((a, b) => crypto.createHash('md5').update(String(a)).digest()[0] - crypto.createHash('md5').update(String(b)).digest()[0]);
  const A = await hashes(mode, times);
  const B = await hashes(mode, shuffled);
  const bad = times.filter((t) => A.get(t) !== B.get(t));
  console.log(`determinism: ${times.length - bad.length}/${times.length} frames identical across order + fresh page`);
  if (bad.length) { console.log('mismatch at t =', bad.join(', ')); process.exitCode = 1; }
})().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/* Dump every on-screen string with its visible time span, scene, size and colour (for fact-checking).
 *   node tools/strings.js [--from 0 --to 60 --step 0.1] [--out file.md]
 */
const fs = require('fs');
const lib = require('./lib');
const DUR = require('../src/timing.js').DURATION;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

(async () => {
  const from = +opt('from', 0), to = Math.min(+opt('to', DUR), DUR - 0.01), step = +opt('step', 0.1);
  const app = await lib.open('dev');
  const p = app.pages[0], rows = [], cur = new Map(); // cur: key → the open span for that key
  for (let t = from; t <= to + 1e-9; t = Math.round((t + step) * 1000) / 1000) {
    const info = await p.page.evaluate((tt) => window.seek(tt), t);
    for (const b of info.layout.text) {
      if (b.role === 'hud' && !/PHASE|FINDINGS|RESULT/.test(b.str) && b.id !== 'hud-phase') continue;
      const key = b.scene + '|' + (b.id ? 'id:' + b.id : b.str.replace(/[0-9]/g, '#')); // counters keep one row (as QA does)
      const e = cur.get(key);
      if (e && t - e.last <= step + 1e-6) { e.last = t; e.final = b.str; }
      else { const n = { scene: b.scene, first: t, last: t, str: b.str, final: b.str, size: Math.round(b.size), color: b.color }; cur.set(key, n); rows.push(n); }
    }
  }
  await app.close();
  rows.sort((a, b) => a.first - b.first);
  const md = ['| scene | from | to | secs | px | text |', '|---|---|---|---|---|---|']
    .concat(rows.map((r) => `| ${r.scene} | ${r.first.toFixed(1)} | ${r.last.toFixed(1)} | ${(r.last - r.first + step).toFixed(1)} | ${r.size} | ${(r.str === r.final ? r.str : r.str + ' → ' + r.final).replace(/\|/g, '\\|')} |`))
    .join('\n');
  if (opt('out')) fs.writeFileSync(opt('out'), md + '\n'); else console.log(md);
  console.error(`${rows.length} strings`);
})().catch((e) => { console.error(e); process.exit(1); });

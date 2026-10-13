#!/usr/bin/env node
/* Render frames at chosen times to PNGs (+ optional contact sheet and QA) for self-testing.
 *
 *   node tools/snap.js --from 10 --to 18 --step 0.5 --out /tmp/x [--sheet] [--qa] [--dist]
 *   node tools/snap.js --times 9.98,10,10.02 --out /tmp/x
 *
 * Uses the dev page (src/ files, served over http) unless --dist is given.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const lib = require('./lib');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);

(async () => {
  const out = path.resolve(opt('out', path.join(lib.ROOT, 'out', 'snap')));
  fs.mkdirSync(out, { recursive: true });
  let times;
  if (opt('times')) times = opt('times').split(',').map(Number);
  else {
    const from = +opt('from', 0), to = +opt('to', 59.99), step = +opt('step', 1);
    times = []; for (let t = from; t <= to + 1e-9; t = Math.round((t + step) * 1000) / 1000) times.push(Math.min(t, 59.99));
  }
  let mode = 'dev';
  if (flag('dist')) { mode = require('../build').build(); }
  const app = await lib.open(mode);
  const p = app.pages[0];
  if (app.info.fontsMissing.length) console.log('FONTS MISSING:', app.info.fontsMissing.join(', '));
  const files = [];
  for (const t of times) {
    const { png, info } = await lib.capture(p, t);
    const f = path.join(out, `t_${t.toFixed(2).padStart(5, '0')}.png`);
    fs.writeFileSync(f, png); files.push(f);
    const lay = lib.checkLayout(info);
    console.log(`${t.toFixed(2)}s ${info.scene} ${info.ms.toFixed(0)}ms tl=${info.tl ? `${info.tl.form}${info.tl.to ? '→' + info.tl.to + '@' + info.tl.k.toFixed(2) : ''} (${info.tl.x.toFixed(0)},${info.tl.y.toFixed(0)}) s${info.tl.size.toFixed(0)}` : '-'}${lay.length ? '  ⚠ ' + lay.map((i) => i.kind + ': ' + i.msg).join(' | ') : ''}`);
  }
  if (flag('sheet') && files.length > 1) {
    const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols);
    const list = path.join(out, 'sheet_inputs.txt');
    fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
    const sheet = path.join(out, 'sheet.png');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=480:270,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:text='%{eif\\:n\\:d}':x=6:y=6:fontsize=14:fontcolor=white@0.6,tile=${cols}x${rows}:padding=4:color=0x05080F`, '-frames:v', '1', sheet]);
    fs.unlinkSync(list);
    console.log('sheet:', sheet, `(frames in order: ${times.map((t) => t.toFixed(2)).join(', ')})`);
  }
  if (flag('qa')) {
    const from = +opt('from', times[0]), to = +opt('to', times[times.length - 1]);
    const r = await lib.runQA(p, { from, to, step: +opt('qastep', 0.25) });
    console.log(`QA ${from}–${to}s: ${r.issues.length} issues; ms avg ${r.stats.msAvg.toFixed(1)} max ${r.stats.msMax.toFixed(0)}`);
    if (r.issues.length) console.log(lib.summarize(r.issues));
  }
  for (const l of p.logs.slice(0, 20)) console.log(l);
  const errs = await p.page.evaluate(() => window.LINOG.errors);
  if (errs.length) console.log('SCENE ERRORS:\n' + errs.join('\n'));
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });

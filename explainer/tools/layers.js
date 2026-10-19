#!/usr/bin/env node
/* Project LInOG explainer — the film as editable layers, for a video editor (invideo, Premiere, Resolve, …).
 *
 *   node tools/layers.js                          build → the three picture layers → out/layers/
 *   node tools/layers.js --layers text,hud        only those layers
 *   node tools/layers.js --check 0.5,12,24.5,40,49     stills of each layer and of the layers restacked, measured against
 *                                                      the film frame (PSNR / SSIM) → out/layers/check/
 *   node tools/layers.js --verify                 restack the encoded layers (+ the fade) and measure them against
 *                                                 out/linog_explainer.mp4
 *   node tools/layers.js --stems                  the score as 6 stems (strings, ostinato, brass, percussion, keys &
 *                                                 textures, hits & FX) + the whole score, unducked → out/layers/stems/;
 *                                                 checks that the stems sum to the score
 * Options: --workers N, --subframes N (default 4, as the film), --from S --to S, --out-dir DIR
 *
 * Layers (src/main.js, seek(t, {layer})):
 *   LInOG_L1_graphics.mp4  everything but the scene text, the HUD and the fade to black (H.264, opaque)
 *   LInOG_L2_text.webm     the scene text, spotlit like the picture (VP9 with alpha)
 *   LInOG_L3_hud.webm      the phase header, tracker and logo (VP9 with alpha)
 * Stacked L1 → L2 → L3 under a fade to black over FADE (src/timing.js, inOutSine), they rebuild the film. Differences from the
 * film: the scan-line texture sits on L1 only, and the spotlight defocuses text and picture separately.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { build } = require('../build');
const lib = require('./lib');
const TIMING = require('../src/timing.js'); // the film's length and fade

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(opt('out-dir', path.join(ROOT, 'out', 'layers')));
const FPS = TIMING.FPS, DUR = TIMING.DURATION, [F0, F1] = TIMING.FADE;
const FILES = { base: 'LInOG_L1_graphics.mp4', text: 'LInOG_L2_text.webm', hud: 'LInOG_L3_hud.webm' };
const log = (...m) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
const rel = (f) => path.relative(process.cwd(), f) || f;

/** One frame of one layer as PNG bytes: the stage for 'base' (opaque), the layer canvas for 'text' / 'hud' (RGBA). */
async function grab(p, t, layer, subframes) {
  const o = { subframes, shutter: 0.5, fps: FPS, layer };
  if (!layer || layer === 'base') return (await lib.capture(p, t, o)).png;
  const url = await p.page.evaluate(([tt, oo]) => { window.seek(tt, oo); return window.__layerCanvas.toDataURL('image/png'); }, [t, o]);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

function encoder(layer, file) {
  const enc = layer === 'base'
    ? ['-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high',
      '-pix_fmt', 'yuv420p', '-b:v', '10M', '-maxrate', '14M', '-bufsize', '20M', '-colorspace', 'bt709', '-color_primaries', 'bt709',
      '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart']
    : ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '22', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
      '-auto-alt-ref', '0', '-g', '120', '-threads', String(Math.max(2, os.cpus().length))];
  return spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...enc, '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
}

/** Renders frames [f0, f1) of one layer with every page in parallel, in order into the encoder. */
async function renderLayer(app, layer, f0, f1, subframes) {
  const file = path.join(OUT, FILES[layer]), part = file.replace(/(\.\w+)$/, '.part$1');
  const ff = encoder(layer, part);
  let ffErr = null;
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg (${layer}) exited ${c}`)))));
  done.catch((e) => { ffErr = e; });
  ff.stdin.on('error', (e) => { ffErr = ffErr || e; });
  const write = (buf) => new Promise((res, rej) => {
    if (ffErr) return rej(ffErr);
    if (ff.stdin.write(buf)) return res();
    ff.stdin.once('drain', res);
  });
  const pending = new Map(), total = f1 - f0, t0 = Date.now();
  let next = f0, written = 0, flushing = Promise.resolve();
  const flush = async () => {
    while (pending.has(next)) {
      const png = pending.get(next); pending.delete(next);
      await write(png); next++; written++;
      if (written % 300 === 0 || written === total) log(`${layer}: ${written}/${total} frames (${(written / ((Date.now() - t0) / 1000)).toFixed(1)} fps)`);
    }
  };
  await Promise.all(app.pages.map(async (p, w) => {
    for (let i = f0 + w; i < f1; i += app.pages.length) {
      while (pending.size > 24 * app.pages.length && i !== next && !ffErr) await new Promise((r) => setTimeout(r, 5));
      if (ffErr) throw ffErr;
      pending.set(i, await grab(p, i / FPS, layer, subframes));
      flushing = flushing.then(flush);
    }
  }));
  await flushing;
  ff.stdin.end();
  await done;
  const n = +execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', part], { encoding: 'utf8' }).trim();
  if (n !== total) throw new Error(`${rel(part)}: ${n} frames, expected ${total}`);
  fs.renameSync(part, file);
  log(`→ ${rel(file)} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  return file;
}

/** The ffmpeg filter that restacks the layers (inputs: L1, L2, L3) under the film's fade to black. */
const RESTACK = '[1:v]format=yuva420p[t];[2:v]format=yuva420p[h];[0:v][t]overlay=format=auto[a];[a][h]overlay=format=auto,'
  + `fade=t=out:st=${F0}:d=${F1 - F0}:color=black[v]`;

function measure(a, b) { // → {psnr, ssim} of two inputs (files), compared as RGB
  const run = (f) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', a, '-i', b, '-lavfi', f, '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const ps = run('[0:v]format=rgb24[x];[1:v]format=rgb24[y];[x][y]psnr').match(/average:([\d.inf]+)/);
  const ss = run('[0:v]format=yuv444p[x];[1:v]format=yuv444p[y];[x][y]ssim').match(/All:([\d.]+)/);
  return { psnr: ps ? ps[1] : '?', ssim: ss ? ss[1] : '?' };
}

async function check(app, times) {
  const dir = path.join(OUT, 'check');
  fs.mkdirSync(dir, { recursive: true });
  const p = app.pages[0];
  for (const t of times) {
    const tag = t.toFixed(2).padStart(5, '0'), f = (k) => path.join(dir, `${tag}_${k}.png`);
    fs.writeFileSync(f('film'), (await lib.capture(p, t, { subframes: 1 })).png);
    for (const k of ['base', 'text', 'hud']) fs.writeFileSync(f(k), await grab(p, t, k, 1));
    // restack the stills (the fade, when t is inside it, as a black layer at the film's opacity)
    const a = t > F0 ? 0.5 - 0.5 * Math.cos(Math.PI * (t - F0) / (F1 - F0)) : 0;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f('base'), '-i', f('text'), '-i', f('hud'),
      '-filter_complex', `[0][1]overlay=format=auto[a];[a][2]overlay=format=auto,drawbox=c=black@${a.toFixed(4)}:t=fill`, f('restack')]);
    const m = measure(f('restack'), f('film'));
    log(`check ${t.toFixed(2)} s: restack vs film PSNR ${m.psnr} dB, SSIM ${m.ssim}`);
  }
  log(`stills in ${rel(dir)}`);
}

function verify() {
  const film = path.join(ROOT, 'out', 'linog_explainer.mp4'), out = path.join(OUT, 'restack.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(OUT, FILES.base), '-c:v', 'libvpx-vp9', '-i', path.join(OUT, FILES.text),
    '-c:v', 'libvpx-vp9', '-i', path.join(OUT, FILES.hud), '-filter_complex', RESTACK, '-map', '[v]', '-c:v', 'libx264', '-crf', '12',
    '-preset', 'fast', '-pix_fmt', 'yuv420p', out]);
  const m = measure(out, film);
  log(`restacked layers vs the film: PSNR ${m.psnr} dB, SSIM ${m.ssim} (→ ${rel(out)})`);
}

/** Writes the score stems and the whole unducked score; reports how far the stems' sum is from the score. */
async function stems(app) {
  const dir = path.join(OUT, 'stems'), page = app.pages[0].page;
  fs.mkdirSync(dir, { recursive: true });
  const names = await page.evaluate(() => window.LINOG.audio.STEMS);
  const read = (b64) => { const b = Buffer.from(b64, 'base64'); return new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) / 2); };
  const whole = await page.evaluate(() => window.LINOG.audio.wavBase64({ stem: 'music', duck: false }));
  fs.writeFileSync(path.join(dir, 'LInOG_score_unducked.wav'), Buffer.from(whole, 'base64'));
  const ref = read(whole), sum = new Float64Array(ref.length);
  for (const [k, n] of names.entries()) {
    const b64 = await page.evaluate((nm) => window.LINOG.audio.stemBase64(nm), n);
    const f = path.join(dir, `LInOG_stem${k + 1}_${n}.wav`);
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    const x = read(b64); for (let i = 0; i < x.length; i++) sum[i] += x[i];
    log(`→ ${rel(f)}`);
  }
  let e = 0, r = 0, mx = 0;
  for (let i = 0; i < ref.length; i++) { const d = sum[i] - ref[i]; e += d * d; r += ref[i] * ref[i]; mx = Math.max(mx, Math.abs(d)); }
  log(`stems' sum vs the score: residual ${(10 * Math.log10(e / r)).toFixed(1)} dB below the score, worst sample ${mx} LSB`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (flag('verify')) { verify(); return; }
  const html = build();
  const workers = Math.max(1, Math.min(4, +opt('workers', Math.max(1, Math.floor(os.cpus().length / 2)))));
  const app = await lib.open(html, { workers: opt('check') || flag('stems') ? 1 : workers });
  try {
    if (opt('check')) { await check(app, opt('check').split(',').map(Number)); return; }
    if (flag('stems')) { await stems(app); return; }
    const subframes = Math.max(1, +opt('subframes', 4));
    const f0 = Math.round(+opt('from', 0) * FPS), f1 = Math.round(+opt('to', DUR) * FPS);
    for (const layer of opt('layers', 'base,text,hud').split(',')) {
      if (!FILES[layer]) throw new Error(`unknown layer ${layer} (base, text, hud)`);
      await renderLayer(app, layer, f0, f1, subframes);
    }
    const errs = await app.pages[0].page.evaluate(() => window.LINOG.errors);
    if (errs.length) { log('scene errors:\n' + errs.join('\n')); process.exitCode = 3; }
  } finally { await app.close(); }
})().catch((e) => { console.error(e.message || e); process.exit(1); });

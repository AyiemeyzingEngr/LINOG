#!/usr/bin/env node
/* Project LInOG explainer — renderer.
 *
 *   node render.js                 build → soundtrack WAV → self-test (QA) → 3,600 frames → MP4
 *   node render.js --selftest      build → WAV → beat frames every 1.0 s + contact sheet + QA report, then stop
 *   node render.js --from 10 --to 18 --out out/act2.mp4     partial render
 *
 * Options: --out FILE (default out/linog_explainer.mp4) --fps 60 --workers N (default: CPUs/2, max 4)
 *          --subframes N (motion blur: N samples per frame across a 180° shutter) --skip-selftest --force
 *
 * Every frame is drawn by window.seek(t) in the standalone dist/linog_explainer.html, captured
 * losslessly (PNG) and streamed into FFmpeg in order; the 16-bit WAV from the page's
 * OfflineAudioContext is muxed in: libx264 yuv420p 12 Mb/s + AAC 320 kb/s.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { build } = require('./build');
const lib = require('./tools/lib');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const OUT_DIR = path.join(__dirname, 'out');
const HARD = new Set(['error', 'blank', 'tl-continuity', 'tl-visibility', 'safe-area', 'overlap', 'contrast', 'static-hold', 'fonts']);

function log(...m) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m); }

async function writeSoundtrack(p, file) {
  const b64 = await p.page.evaluate(() => window.LINOG.audio.wavBase64());
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(file, buf);
  const frames = (buf.length - 44) / 4;
  log(`soundtrack: ${path.relative(process.cwd(), file)} — ${frames} frames @ 44.1 kHz = ${(frames / 44100).toFixed(3)} s, 16-bit stereo`);
  if (frames !== 44100 * 60) throw new Error('soundtrack is not exactly 60.000 s');
}

async function selftest(app) {
  const dir = path.join(OUT_DIR, 'selftest');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const p = app.pages[0];
  const times = [];
  for (let s = 0; s < 60; s++) times.push(s);
  times.push(59.99);
  const files = [];
  for (const t of times) {
    const { png } = await lib.capture(p, t);
    const f = path.join(dir, `beat_${t.toFixed(2).padStart(5, '0')}.png`);
    fs.writeFileSync(f, png); files.push(f);
  }
  const list = path.join(dir, 'inputs.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'scale=384:216,tile=8x8:padding=4:color=0x05080F', '-frames:v', '1', path.join(dir, 'contact_sheet.png')]);
  fs.unlinkSync(list);
  log(`self-test: ${files.length} beat frames + contact sheet in ${path.relative(process.cwd(), dir)}`);
  const qa = await lib.runQA(p, { from: 0, to: 60, step: 0.25, log: (m) => log(m) });
  if (app.info.fontsMissing.length) qa.issues.push({ t: null, kind: 'fonts', msg: 'missing: ' + app.info.fontsMissing.join(', ') });
  const report = `LInOG explainer self-test\nframes checked: ${qa.stats.frames} (every 0.25 s) + 5 match-cut pairs\nframe draw time: avg ${qa.stats.msAvg.toFixed(1)} ms, max ${qa.stats.msMax.toFixed(0)} ms\nissues: ${qa.issues.length}\n\n${lib.summarize(qa.issues)}\n`;
  fs.writeFileSync(path.join(dir, 'qa_report.txt'), report);
  fs.writeFileSync(path.join(dir, 'qa_issues.json'), JSON.stringify(qa.issues, null, 1));
  const hard = qa.issues.filter((i) => HARD.has(i.kind));
  log(`self-test QA: ${qa.issues.length} issues (${hard.length} blocking) — avg ${qa.stats.msAvg.toFixed(1)} ms/frame`);
  if (qa.issues.length) console.log(lib.summarize(qa.issues));
  return hard;
}

async function renderVideo(app, wav, out) {
  const fps = +opt('fps', 60), from = +opt('from', 0), to = +opt('to', 60);
  const subframes = Math.max(1, +opt('subframes', 1));
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps), total = f1 - f0;
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-stats_period', '5',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', wav,
    '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-b:v', '12M', '-maxrate', '16M', '-bufsize', '24M',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '44100',
    '-r', String(fps), '-t', String(to - from), '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  const pending = new Map();
  let next = f0, written = 0;
  const t0 = Date.now();
  const flush = async () => {
    while (pending.has(next)) {
      const png = pending.get(next); pending.delete(next);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      next++; written++;
      if (written % 120 === 0 || written === total) {
        const el = (Date.now() - t0) / 1000, eta = (el / written) * (total - written);
        log(`frames ${written}/${total} (${((100 * written) / total).toFixed(0)}%) — ${(written / el).toFixed(1)} fps, ETA ${eta.toFixed(0)} s`);
      }
    }
  };
  let flushing = Promise.resolve();
  await Promise.all(app.pages.map(async (p, w) => {
    for (let i = f0 + w; i < f1; i += app.pages.length) {
      while (pending.size > 24 * app.pages.length) await new Promise((r) => setTimeout(r, 5)); // bound memory
      const { png } = await lib.capture(p, i / fps, { subframes, shutter: 0.5 });
      pending.set(i, png);
      flushing = flushing.then(flush);
    }
  }));
  await flushing;
  ff.stdin.end();
  await done;
  log(`encoded ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(process.cwd(), out)}`);
}

function probe(out) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt,sample_rate,channels,bit_rate', '-of', 'json', out], { encoding: 'utf8' }));
  log('ffprobe:', JSON.stringify(j));
  return j;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const html = build();
  log(`built ${path.relative(process.cwd(), html)}`);
  const workers = Math.max(1, Math.min(4, +opt('workers', Math.max(1, Math.floor(os.cpus().length / 2)))));
  const app = await lib.open(html, { workers });
  try {
    const wav = path.join(OUT_DIR, 'soundtrack.wav');
    await writeSoundtrack(app.pages[0], wav);
    if (!flag('skip-selftest')) {
      const hard = await selftest(app);
      if (flag('selftest')) { process.exitCode = hard.length ? 2 : 0; return; }
      if (hard.length && !flag('force')) { log('self-test failed — fix the issues above or pass --force'); process.exitCode = 2; return; }
    }
    const out = path.resolve(opt('out', path.join(OUT_DIR, 'linog_explainer.mp4')));
    await renderVideo(app, wav, out);
    probe(out);
    const errs = await app.pages[0].page.evaluate(() => window.LINOG.errors);
    if (errs.length) { log('scene errors during render:\n' + errs.join('\n')); process.exitCode = 3; }
  } finally {
    await app.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

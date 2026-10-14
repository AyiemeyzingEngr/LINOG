#!/usr/bin/env node
/* Project LInOG explainer — renderer.
 *
 *   node render.js                 build → soundtrack WAV → self-test (QA) → 3,600 frames → MP4
 *   node render.js --selftest      build → WAV → beat frames every 1.0 s + contact sheet + QA report, then stop
 *   node render.js --from 10 --to 18 --out out/act2.mp4     partial render
 *
 * Options: --out FILE (default out/linog_explainer.mp4) --fps 60 --workers N (default: CPUs/2, max 4)
 *          --subframes N (motion blur: N samples per frame across a 180° shutter; default 4 for the final render)
 *          --preset P (x264 preset, default medium) --skip-selftest --force --fresh-audio
 * Exit codes: 0 ok · 1 crash · 2 self-test failed (or fonts missing) · 3 scene errors during the render · 4 output check failed
 *
 * Every frame is drawn by window.seek(t) in the standalone dist/linog_explainer.html, captured losslessly
 * (PNG via CDP) by parallel pages, streamed into FFmpeg in order, and muxed with the 16-bit WAV rendered by
 * the page's OfflineAudioContext: libx264 yuv420p 12 Mb/s + AAC 320 kb/s, BT.709 tagged.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { build } = require('./build');
const lib = require('./tools/lib');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const OUT_DIR = path.join(__dirname, 'out');
const HARD = new Set(['error', 'blank', 'tl-continuity', 'tl-visibility', 'safe-area', 'overlap', 'contrast', 'static-hold', 'fonts', 'assets', 'typography', 'spot']);

function log(...m) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m); }

function checkFfmpeg() {
  let v = '';
  try { v = execFileSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' }); } catch (_) { throw new Error('ffmpeg not found on PATH (need FFmpeg ≥ 4 with libx264 and the native AAC encoder)'); }
  const enc = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (!/libx264/.test(enc) || !/\baac\b/.test(enc)) throw new Error('ffmpeg lacks libx264 or aac');
  return v.split('\n')[0];
}

/** The soundtrack depends only on src/audio.js (+ the RNG in core.js): cache it by their hash. */
async function soundtrack(p) {
  const h = crypto.createHash('sha1');
  for (const f of ['src/audio.js', 'src/core.js']) h.update(fs.readFileSync(path.join(__dirname, f)));
  const key = h.digest('hex').slice(0, 12);
  const file = path.join(OUT_DIR, 'soundtrack.wav'), stamp = file + '.key';
  if (!flag('fresh-audio') && fs.existsSync(file) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === key) {
    log(`soundtrack: reusing ${path.relative(process.cwd(), file)} (sources unchanged)`);
    return file;
  }
  const b64 = await p.page.evaluate(() => window.LINOG.audio.wavBase64());
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(file, buf); fs.writeFileSync(stamp, key);
  const frames = (buf.length - 44) / 4;
  log(`soundtrack: ${path.relative(process.cwd(), file)} — ${frames} frames @ 44.1 kHz = ${(frames / 44100).toFixed(3)} s, 16-bit stereo`);
  if (frames !== 44100 * 60) throw new Error('soundtrack is not exactly 60.000 s');
  return file;
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
  if ((app.info.assetsMissing || []).length) qa.issues.push({ t: null, kind: 'assets', msg: 'images failed to load: ' + app.info.assetsMissing.join(', ') });
  const report = `LInOG explainer self-test\nframes checked: ${qa.stats.frames} (every 0.25 s) + 5 match-cut pairs\nframe draw + raster time: avg ${qa.stats.msAvg.toFixed(1)} ms, max ${qa.stats.msMax.toFixed(0)} ms\nissues: ${qa.issues.length}\n\n${lib.summarize(qa.issues)}\n`;
  fs.writeFileSync(path.join(dir, 'qa_report.txt'), report);
  fs.writeFileSync(path.join(dir, 'qa_issues.json'), JSON.stringify(qa.issues, null, 1));
  const hard = qa.issues.filter((i) => HARD.has(i.kind));
  log(`self-test QA: ${qa.issues.length} issues (${hard.length} blocking) — avg ${qa.stats.msAvg.toFixed(1)} ms/frame draw + raster`);
  if (qa.issues.length) console.log(lib.summarize(qa.issues));
  return hard;
}

async function renderVideo(app, wav, out) {
  const fps = +opt('fps', 60), from = +opt('from', 0), to = +opt('to', 60);
  const subframes = Math.max(1, +opt('subframes', 4));
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps), total = f1 - f0;
  const a0 = f0 / fps, adur = total / fps; // audio trimmed to exactly the rendered frames
  const part = out + '.part.mp4';
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-ss', a0.toFixed(6), '-t', adur.toFixed(6), '-i', wav,
    '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-b:v', '12M', '-maxrate', '16M', '-bufsize', '24M',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '44100',
    '-r', String(fps), '-t', adur.toFixed(6), '-movflags', '+faststart', part,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  let ffErr = null;
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  done.catch((e) => { ffErr = e; });
  ff.stdin.on('error', (e) => { ffErr = ffErr || e; });
  const pending = new Map();
  let next = f0, written = 0;
  const t0 = Date.now();
  const write = (buf) => new Promise((res, rej) => {
    if (ffErr) return rej(ffErr);
    if (ff.stdin.write(buf)) return res();
    const onDrain = () => { ff.stdin.off('error', onErr); res(); };
    const onErr = (e) => { ff.stdin.off('drain', onDrain); rej(e); };
    ff.stdin.once('drain', onDrain); ff.stdin.once('error', onErr);
    done.catch(rej);
  });
  const flush = async () => {
    while (pending.has(next)) {
      const png = pending.get(next); pending.delete(next);
      await write(png);
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
      // bound memory, but never block the worker that owns the next frame to flush
      while (pending.size > 24 * app.pages.length && i !== next && !ffErr) await new Promise((r) => setTimeout(r, 5));
      if (ffErr) throw ffErr;
      const { png } = await lib.capture(p, i / fps, { subframes, shutter: 0.5, fps });
      pending.set(i, png);
      flushing = flushing.then(flush);
    }
  }));
  await flushing;
  ff.stdin.end();
  await done;
  log(`encoded ${total} frames (${subframes} sub-frame sample${subframes > 1 ? 's' : ''} each) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const j = probe(part);
  const v = j.streams.find((s) => s.codec_name === 'h264'), a = j.streams.find((s) => s.codec_name === 'aac');
  if (!v || +v.nb_frames !== total || !a || Math.abs(+j.format.duration - adur) > 0.05) throw Object.assign(new Error(`output check failed: ${JSON.stringify(j)}`), { code: 4 });
  fs.renameSync(part, out);
  log(`→ ${path.relative(process.cwd(), out)}`);
}

function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt,color_space,sample_rate,channels,bit_rate', '-of', 'json', file], { encoding: 'utf8' }));
  log('ffprobe:', JSON.stringify(j));
  return j;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  log(checkFfmpeg());
  const html = build();
  log(`built ${path.relative(process.cwd(), html)}`);
  const workers = Math.max(1, Math.min(4, +opt('workers', Math.max(1, Math.floor(os.cpus().length / 2)))));
  const app = await lib.open(html, { workers });
  try {
    if (app.info.fontsMissing.length && !flag('force')) { log('fonts missing: ' + app.info.fontsMissing.join(', ')); process.exitCode = 2; return; }
    const wav = await soundtrack(app.pages[0]);
    if (!flag('skip-selftest')) {
      const hard = await selftest(app);
      if (flag('selftest')) { process.exitCode = hard.length ? 2 : 0; return; }
      if (hard.length && !flag('force')) { log('self-test failed — fix the issues above or pass --force'); process.exitCode = 2; return; }
    }
    const out = path.resolve(opt('out', path.join(OUT_DIR, 'linog_explainer.mp4')));
    await renderVideo(app, wav, out);
    const errs = await app.pages[0].page.evaluate(() => window.LINOG.errors);
    if (errs.length) { log('scene errors during render:\n' + errs.join('\n')); process.exitCode = 3; }
  } catch (e) {
    console.error(e.message || e); process.exitCode = e.code === 4 ? 4 : 1;
  } finally {
    await app.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

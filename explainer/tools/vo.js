#!/usr/bin/env node
/* Project LInOG explainer — voice-over tools (cue sheet: src/vo_cues.js).
 *
 *   node tools/vo.js --cues            print the cue table (seconds, mm:ss.mmm, frames @ 60 fps, words, pace) and write
 *                                      out/vo_cues.csv + out/vo_cues_audacity.txt (Audacity label track)
 *                                      + out/vo_captions.srt (subtitles) + out/vo_captions.ass (burn-in style)
 *   node tools/vo.js --burn            burn the VO captions into a rendered film (no re-render):
 *        [--in out/linog_explainer.mp4] [--out out/linog_explainer_captions.mp4]
 *   node tools/vo.js --silent          write vo/vo.wav: a silent WAV of the film's length (recording template)
 *        [--rate 48000] [--bits 16|24|32] [--channels 1|2] [--out FILE] [--force]
 *   node tools/vo.js --assemble        build one VO of the film's length from per-line files vo/VO-01.wav … VO-16.wav: each line
 *        [--dir vo] [--out vo/vo.wav]  (leading/trailing silence trimmed) starts exactly at its cue's `in`; reports
 *        [--rate 48000] [--bits 24]    lines that overrun their slot or the next line
 *        [--no-trim] [--force]
 *   node tools/vo.js --take EDL.json   build vo/vo.wav from ONE continuous narration take: the edit list (e.g.
 *        [--out vo/vo.wav] [--force]   vo/source/elevenlabs_quentin_take1.json) cuts it into the cue lines; each
 *        [--rate 44100] [--bits 16]    line's first word lands on its cue's `in` (mono WAV)
 *   node tools/vo.js --test FILE      synthetic speech-like test VO inside the cue slots (to check ducking and levels;
 *        [--level -26] [--shift S]     never a deliverable). --shift moves every line by S seconds (drift test).
 *        [--rate 48000] [--mono]
 *
 * --silent / --assemble / --take refuse to overwrite a WAV that contains audio unless --force is given.
 * Requires FFmpeg on PATH for --assemble, --take and the overwrite check (any input format/rate is accepted).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const { CUES } = require('../src/vo_cues.js');
const { DURATION: DUR, FPS } = require('../src/timing.js'); // the film's length

/* ------------------------------------------------------------------ cue table */
const fmtTC = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
const words = (s) => s.split(/\s+/).filter(Boolean).length;
function cueRows() {
  return CUES.map((c) => {
    const slot = +(c.out - c.in).toFixed(3), n = words(c.text);
    return { id: c.id, in: c.in, out: c.out, slot, inTC: fmtTC(c.in), outTC: fmtTC(c.out), inFrame: Math.round(c.in * FPS), outFrame: Math.round(c.out * FPS), words: n, wps: +(n / slot).toFixed(2), text: c.text, delivery: c.delivery, spot: c.spot ? c.spot.target : '' };
  });
}
function cueTable() {
  const rows = cueRows(), out = [];
  out.push(`VO cue sheet (src/vo_cues.js): ${rows.length} lines; times are on the film timeline, frames at ${FPS} fps`);
  out.push('ID      in (s)  out (s)  slot  in mm:ss.mmm  out mm:ss.mmm  frames     words  w/s  text — delivery');
  for (const r of rows) {
    out.push(`${r.id.padEnd(6)} ${r.in.toFixed(3).padStart(7)} ${r.out.toFixed(3).padStart(8)} ${r.slot.toFixed(2).padStart(5)}  ${r.inTC}    ${r.outTC}      ${(r.inFrame + '–' + r.outFrame).padEnd(9)}  ${String(r.words).padStart(5)}  ${r.wps.toFixed(1).padStart(3)}  "${r.text}" — ${r.delivery}`);
  }
  return out.join('\n');
}
const csvField = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** Writes <dir>/vo_cues.csv and <dir>/vo_cues_audacity.txt; returns their paths. */
function writeCueFiles(dir = path.join(ROOT, 'out')) {
  fs.mkdirSync(dir, { recursive: true });
  const rows = cueRows();
  const head = ['id', 'in_s', 'out_s', 'slot_s', 'in_tc', 'out_tc', 'in_frame_60fps', 'out_frame_60fps', 'words', 'words_per_s', 'text', 'delivery', 'spotlight'];
  const csv = [head.join(',')].concat(rows.map((r) => [r.id, r.in.toFixed(3), r.out.toFixed(3), r.slot.toFixed(3), r.inTC, r.outTC, r.inFrame, r.outFrame, r.words, r.wps, r.text, r.delivery, r.spot].map(csvField).join(','))).join('\n') + '\n';
  const labels = rows.map((r) => `${r.in.toFixed(6)}\t${r.out.toFixed(6)}\t${r.id} ${r.text}`).join('\n') + '\n';
  const files = { csv: path.join(dir, 'vo_cues.csv'), labels: path.join(dir, 'vo_cues_audacity.txt') };
  fs.writeFileSync(files.csv, csv);
  fs.writeFileSync(files.labels, labels);
  return files;
}

/* ------------------------------------------------------------------ captions (subtitles of the VO) */
/** Caption events: one per line; a two-sentence line longer than 60 characters is split at the sentence, with time
 *  shared in proportion to length. Each event ends at its slot's `out` (+0.25 s of hang, never into the next line). */
function captionEvents() {
  const ev = [];
  CUES.forEach((c, i) => {
    const next = CUES[i + 1], end = Math.min(c.out + 0.25, next ? next.in - 0.05 : DUR - 0.05);
    const parts = c.text.length > 60 ? c.text.match(/[^.!?]+[.!?]+/g) || [c.text] : [c.text];
    const total = parts.reduce((n, p) => n + p.trim().length, 0);
    let t = c.in;
    parts.forEach((p, k) => {
      const t1 = k === parts.length - 1 ? end : t + (end - c.in) * (p.trim().length / total);
      ev.push({ id: c.id, t0: t, t1, text: p.trim() });
      t = t1;
    });
  });
  return ev;
}
const srtTC = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const assTC = (t) => { const cs = Math.round(t * 100), h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, s = Math.floor(cs / 100) % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`; };
/** Writes <dir>/vo_captions.srt (any player) and <dir>/vo_captions.ass (burn-in: Inter Medium 38 px, white on a
 *  translucent slate box, bottom centre above the HUD tracker, 150/200 ms fades). Returns their paths. */
function writeCaptionFiles(dir = path.join(ROOT, 'out')) {
  fs.mkdirSync(dir, { recursive: true });
  const ev = captionEvents();
  const srt = ev.map((e, i) => `${i + 1}\n${srtTC(e.t0)} --> ${srtTC(e.t1)}\n${e.text}\n`).join('\n');
  const ass = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: VO,Inter Medium,38,&H00F5F1E6,&H000000FF,&H40120B06,&H00000000,0,0,0,0,100,100,0.3,0,3,13,0,2,360,360,132,1', '',
    '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
    .concat(ev.map((e) => {
      // the end card's partner band fills the lower third from ≈ 54.5 s: captions there go to the top of the frame
      const top = e.t0 >= 54.5;
      return `Dialogue: 0,${assTC(e.t0)},${assTC(e.t1)},VO,,0,0,${top ? 40 : 0},,{\\fad(150,200)${top ? '\\an8' : ''}}${e.text}`;
    })).join('\n') + '\n';
  const files = { srt: path.join(dir, 'vo_captions.srt'), ass: path.join(dir, 'vo_captions.ass') };
  fs.writeFileSync(files.srt, srt);
  fs.writeFileSync(files.ass, ass);
  return files;
}
/** Burns the VO captions into a rendered MP4 (video re-encoded at the render's settings, audio copied). */
function burnCaptions(input = path.join(ROOT, 'out', 'linog_explainer.mp4'), output = path.join(ROOT, 'out', 'linog_explainer_captions.mp4')) {
  const { ass } = writeCaptionFiles(path.dirname(output));
  const esc = ass.replace(/\\/g, '/').replace(/:/g, '\\:');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', `ass=${esc}`,
    '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '16M', '-bufsize', '24M',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'copy', '-movflags', '+faststart', output], { stdio: 'inherit' });
  return output;
}

/* ------------------------------------------------------------------ WAV writing / decoding */
/** WAV bytes from Float32 channel data: 16/24-bit PCM or 32-bit float. */
function wavBytes(chs, rate, bits) {
  const ch = chs.length, n = chs[0].length, bps = bits / 8, isFloat = bits === 32, data = n * ch * bps;
  const fmtSize = isFloat ? 18 : 16, factSize = isFloat ? 12 : 0, hdr = 12 + 8 + fmtSize + factSize + 8;
  const b = Buffer.alloc(hdr + data);
  let o = 0;
  const str = (s) => { b.write(s, o, 'ascii'); o += 4; }, u32 = (v) => { b.writeUInt32LE(v, o); o += 4; }, u16 = (v) => { b.writeUInt16LE(v, o); o += 2; };
  str('RIFF'); u32(hdr - 8 + data); str('WAVE');
  str('fmt '); u32(fmtSize); u16(isFloat ? 3 : 1); u16(ch); u32(rate); u32(rate * ch * bps); u16(ch * bps); u16(bits); if (isFloat) u16(0);
  if (isFloat) { str('fact'); u32(4); u32(n); }
  str('data'); u32(data);
  const max = bits === 16 ? 32767 : 8388607;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const v = Math.max(-1, Math.min(1, chs[c][i]));
    if (isFloat) b.writeFloatLE(v, o);
    else if (bits === 16) b.writeInt16LE(Math.round(v * max), o);
    else b.writeIntLE(Math.round(v * max), o, 3);
    o += bps;
  }
  return b;
}
/** Decode any audio file with FFmpeg to Float32 stereo (or mono) at `rate`: returns [L, R] (or [M]). */
function decode(file, rate, channels = 2) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-af', `aresample=${rate}`, '-ac', String(channels), '-f', 'f32le', '-c:a', 'pcm_f32le', '-'], { maxBuffer: 1 << 30 });
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), n = all.length / channels, chs = [];
  for (let c = 0; c < channels; c++) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = all[i * channels + c]; chs.push(x); }
  return chs;
}
/** True when the file decodes to (near) digital silence (peak below −90 dBFS). */
function isSilent(file) {
  const [m] = decode(file, 8000, 1);
  let p = 0; for (let i = 0; i < m.length; i++) p = Math.max(p, Math.abs(m[i]));
  return p < 3.2e-5;
}
function guardOverwrite(file, force) {
  if (!fs.existsSync(file) || force) return;
  let silent = false;
  try { silent = isSilent(file); } catch (_) { /* unreadable: treat as audio */ }
  if (!silent) throw new Error(`${path.relative(process.cwd(), file)} contains audio — refusing to overwrite it (pass --force)`);
}
/** Silent WAV of exactly `seconds` (default: the film's length). */
function writeSilentWav(file, { rate = 48000, bits = 24, channels = 2, seconds = DUR, force = false } = {}) {
  if (![16, 24, 32].includes(bits)) throw new Error('--bits must be 16, 24 or 32 (float)');
  guardOverwrite(file, force);
  const n = Math.round(rate * seconds), chs = [];
  for (let c = 0; c < channels; c++) chs.push(new Float32Array(n));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, wavBytes(chs, rate, bits));
  return { file, frames: n, rate, bits, channels };
}

/* ------------------------------------------------------------------ per-line assembly */
function assemble({ dir, out, rate = 48000, bits = 24, trim = true, force = false, log = console.log }) {
  const lines = CUES.map((c, k) => ({ c, next: CUES[k + 1], file: path.join(dir, `${c.id}.wav`) })).filter((x) => fs.existsSync(x.file));
  if (!lines.length) throw new Error(`no per-line files in ${path.relative(process.cwd(), dir) || '.'} (expected ${CUES[0].id}.wav … ${CUES[CUES.length - 1].id}.wav)`);
  guardOverwrite(out, force);
  const n = rate * DUR, mix = [new Float32Array(n), new Float32Array(n)], warn = [];
  log('ID      file                 length  slot   placed at   ends at   note');
  for (const { c, next, file } of lines) {
    const [l, r] = decode(file, rate, 2);
    let a = 0, b = l.length;
    if (trim) {
      let pk = 0; for (let i = 0; i < l.length; i++) pk = Math.max(pk, Math.abs(l[i]), Math.abs(r[i]));
      const thr = Math.max(Math.pow(10, -50 / 20), pk * Math.pow(10, -40 / 20));
      const loud = (i) => Math.abs(l[i]) > thr || Math.abs(r[i]) > thr;
      while (a < b && !loud(a)) a++;
      while (b > a && !loud(b - 1)) b--;
      a = Math.max(0, a - Math.round(0.03 * rate)); b = Math.min(l.length, b + Math.round(0.12 * rate));
    }
    const at = Math.round(c.in * rate), len = b - a, end = (at + len) / rate, notes = [];
    if (len / rate > c.out - c.in + 0.1) notes.push(`overruns its ${(c.out - c.in).toFixed(2)} s slot by ${(len / rate - (c.out - c.in)).toFixed(2)} s`);
    if (next && end > next.in) notes.push(`overlaps ${next.id} (starts ${next.in.toFixed(2)} s)`);
    if (end > DUR) notes.push(`runs past ${DUR} s (cut)`);
    for (let i = 0; i < len && at + i < n; i++) { mix[0][at + i] += l[a + i]; mix[1][at + i] += r[a + i]; }
    if (notes.length) warn.push(`${c.id}: ${notes.join('; ')}`);
    log(`${c.id.padEnd(6)}  ${path.basename(file).padEnd(18)} ${(len / rate).toFixed(2).padStart(6)}  ${(c.out - c.in).toFixed(2).padStart(5)}  ${c.in.toFixed(3).padStart(9)}  ${end.toFixed(3).padStart(8)}   ${notes.join('; ') || 'ok'}`);
  }
  let pk = 0; for (const x of mix) for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(x[i]));
  if (pk > 1) warn.push(`overlapping lines clip (peak ${(20 * Math.log10(pk)).toFixed(1)} dBFS) — clamped`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, wavBytes(mix, rate, bits));
  const missing = CUES.filter((c) => !lines.some((x) => x.c === c)).map((c) => c.id);
  return { out, lines: lines.length, missing, warn };
}

/* ------------------------------------------------------------------ one continuous take → cue-aligned VO */
/** Cuts one continuous narration take into the cue lines of an edit list (JSON: {source, lines: [{id, src: [s, e],
 *  parts, pauses}]}, see vo/source/*.json) and puts each line's first word exactly on its cue's `in`.
 *  Speech is found on a 10 ms RMS envelope (threshold: the line's loudest frame − 30 dB, floor −60 dBFS); pauses of
 *  0.15 s or more split a line into parts, and a part count that differs from `parts` stops the edit. A line keeps 40 ms
 *  before its first word and 200 ms after its last (10 ms fade-in, 60 ms fade-out). A pause with a target length loses
 *  its middle (5 ms fades either side of the cut, which lies in silence); `gainDb` is a clip gain for the line.
 *  Output: mono, `rate`, `bits`, the film's length. */
function fromTake({ edl, out, rate = 44100, bits = 16, force = false }) {
  const spec = JSON.parse(fs.readFileSync(edl, 'utf8'));
  const [x] = decode(path.resolve(path.dirname(edl), spec.source), rate, 1);
  const H = Math.round(0.01 * rate), PRE = Math.round(0.04 * rate), TAIL = Math.round(0.2 * rate), MINP = 15; // frames
  const fade = (buf, i0, len, up) => { for (let i = 0; i < len && i0 + i < buf.length; i++) { const g = 0.5 - 0.5 * Math.cos(Math.PI * (i + 0.5) / len); buf[i0 + i] *= up ? g : 1 - g; } };
  guardOverwrite(out, force);
  const n = rate * DUR, y = new Float32Array(n), rows = [];
  for (const ln of spec.lines) {
    const k = CUES.findIndex((c) => c.id === ln.id);
    if (k < 0) throw new Error(`${ln.id}: not in src/vo_cues.js`);
    const c = CUES[k], a = Math.max(0, Math.round(ln.src[0] * rate)), b = Math.min(x.length, Math.round(ln.src[1] * rate));
    const nf = Math.floor((b - a) / H), db = new Float32Array(nf);
    let pk = -Infinity;
    for (let f = 0; f < nf; f++) { let e = 0; for (let i = a + f * H; i < a + (f + 1) * H; i++) e += x[i] * x[i]; db[f] = 10 * Math.log10(e / H + 1e-20); pk = Math.max(pk, db[f]); }
    const thr = Math.max(-60, pk - 30), runs = [];
    for (let f = 0; f < nf; f++) if (db[f] > thr) { const r = runs[runs.length - 1]; if (r && f - r[1] < MINP) r[1] = f + 1; else runs.push([f, f + 1]); }
    if (!runs.length) throw new Error(`${ln.id}: no speech in ${ln.src.join('–')} s of the take`);
    if (ln.parts && runs.length !== ln.parts) throw new Error(`${ln.id}: ${runs.length} speech part(s) in ${ln.src.join('–')} s, the edit list expects ${ln.parts} (wrong window for this take?)`);
    const on = a + runs[0][0] * H, off = a + runs[runs.length - 1][1] * H, s0 = Math.max(a, on - PRE), s1 = Math.min(b, off + TAIL);
    // keep-ranges: the line minus the middle of each pause that has a target length
    const keep = [[s0, s1]], pauses = [];
    for (let p = 0; p + 1 < runs.length; p++) {
      const p0 = a + runs[p][1] * H, p1 = a + runs[p + 1][0] * H, tgt = ln.pauses && ln.pauses[p] != null ? Math.round(ln.pauses[p] * rate) : null;
      pauses.push(`${((p1 - p0) / rate).toFixed(2)}${tgt != null && p1 - p0 > tgt ? '→' + (tgt / rate).toFixed(2) : ''}`);
      if (tgt == null || p1 - p0 <= tgt) continue;
      const last = keep.pop();
      keep.push([last[0], p0 + (tgt >> 1)], [p1 - (tgt - (tgt >> 1)), last[1]]);
    }
    const len = keep.reduce((m, [u, v]) => m + v - u, 0), seg = new Float32Array(len);
    let o = 0;
    keep.forEach(([u, v], j) => {
      seg.set(x.subarray(u, v), o);
      if (j > 0) fade(seg, o, Math.round(0.005 * rate), true);
      if (j < keep.length - 1) fade(seg, o + (v - u) - Math.round(0.005 * rate), Math.round(0.005 * rate), false);
      o += v - u;
    });
    fade(seg, 0, Math.round(0.01 * rate), true); fade(seg, len - Math.round(0.06 * rate), Math.round(0.06 * rate), false);
    if (ln.gainDb) { const g = Math.pow(10, ln.gainDb / 20); for (let i = 0; i < len; i++) seg[i] *= g; }
    const at = Math.round(c.in * rate) - (on - s0), cut = (s1 - s0) - len, end = c.in + (off - on - cut) / rate;
    for (let i = 0; i < len; i++) if (at + i >= 0 && at + i < n) y[at + i] += seg[i];
    const next = CUES[k + 1], notes = [];
    if (next && next.in - end < 0.25) notes.push(`only ${(next.in - end).toFixed(2)} s before ${next.id}`);
    if (Math.abs(end - c.out) > 0.05) notes.push(`cue out is ${c.out.toFixed(2)}`);
    if (ln.gainDb) notes.unshift(`clip gain ${ln.gainDb > 0 ? '+' : ''}${ln.gainDb} dB`);
    rows.push({ id: c.id, srcOn: on / rate, srcOff: off / rate, parts: runs.length, pauses, in: c.in, end, gap: next ? next.in - end : DUR - end, notes });
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(y[i]));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, wavBytes([y], rate, bits));
  return { out, rows, peakDb: 20 * Math.log10(pk + 1e-12), source: spec.source };
}

/* ------------------------------------------------------------------ synthetic test VO (QA only) */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Speech-like test signal: voiced syllables (formant-weighted harmonics with a gliding pitch) and fricative
 *  bursts, words with short gaps, filling each cue slot. Active level ≈ `level` dBFS. Deterministic. */
function testVO({ rate = 48000, level = -26, shift = 0 } = {}) {
  const n = rate * DUR, x = new Float32Array(n), R = rng(7171);
  const VOW = [[700, 1200], [500, 1900], [300, 2300], [500, 900], [350, 800]];
  for (const c of CUES) {
    const t0 = c.in + shift + 0.03, t1 = c.out + shift - 0.05, nw = words(c.text);
    let t = t0, f0 = 118 + 20 * R();
    for (let w = 0; w < nw && t < t1; w++) {
      const syl = 1 + Math.floor(R() * 2.2);
      for (let s = 0; s < syl && t < t1; s++) {
        const d = Math.min(t1 - t, 0.11 + 0.14 * R()), [F1, F2] = VOW[Math.floor(R() * VOW.length)], fric = R() < 0.45, g0 = f0 * (0.92 + 0.16 * R()), g1 = g0 * (0.9 + 0.12 * R());
        const i0 = Math.max(0, Math.round(t * rate)), i1 = Math.min(n, Math.round((t + d) * rate));
        let ph = 0;
        for (let i = i0; i < i1; i++) {
          const u = (i - i0) / (i1 - i0), env = Math.sin(Math.PI * Math.min(1, u * 1.6)) ** 0.8 * (u > 0.62 ? Math.cos(Math.PI / 2 * (u - 0.62) / 0.38) : 1), f = g0 + (g1 - g0) * u;
          ph += 2 * Math.PI * f / rate;
          let v = 0;
          for (let k = 1; k * f < 4000; k++) { const fk = k * f, a = Math.exp(-(((fk - F1) / 160) ** 2)) + 0.6 * Math.exp(-(((fk - F2) / 220) ** 2)) + 0.25 * Math.exp(-(((fk - 2600) / 300) ** 2)) + 0.05 / k; v += a * Math.sin(k * ph); }
          if (fric && u < 0.25) v += (R() * 2 - 1) * 0.9 * (1 - u / 0.25);
          x[i] += 0.12 * env * v;
        }
        t += d + 0.025 + 0.03 * R();
      }
      t += 0.06 + 0.09 * R();
      f0 *= 0.985;
    }
  }
  // scale to the requested active level (RMS of 50 ms blocks above −50 dBFS)
  const BL = Math.round(0.05 * rate); let s = 0, cnt = 0;
  for (let b = 0; b + BL <= n; b += BL) { let e = 0; for (let i = b; i < b + BL; i++) e += x[i] * x[i]; e /= BL; if (e > 1e-5) { s += e; cnt++; } }
  const g = cnt ? Math.pow(10, level / 20) / Math.sqrt(s / cnt) : 1;
  for (let i = 0; i < n; i++) x[i] *= g;
  return x;
}

module.exports = { CUES, cueRows, cueTable, writeCueFiles, writeCaptionFiles, burnCaptions, captionEvents, writeSilentWav, wavBytes, decode, isSilent, assemble, fromTake, testVO, fmtTC };

/* ------------------------------------------------------------------ CLI */
if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
  const flag = (k) => args.includes('--' + k);
  const rel = (f) => path.relative(process.cwd(), f) || f;
  try {
    let did = false;
    if (flag('cues')) {
      console.log(cueTable());
      const f = writeCueFiles(path.resolve(opt('out-dir', path.join(ROOT, 'out'))));
      const c = writeCaptionFiles(path.resolve(opt('out-dir', path.join(ROOT, 'out'))));
      console.log(`\nwrote ${rel(f.csv)} and ${rel(f.labels)} (Audacity: File → Import → Labels…), ${rel(c.srt)} and ${rel(c.ass)} (captions)`);
      did = true;
    }
    if (flag('burn')) {
      const out = burnCaptions(path.resolve(opt('in', path.join(ROOT, 'out', 'linog_explainer.mp4'))), path.resolve(opt('out', path.join(ROOT, 'out', 'linog_explainer_captions.mp4'))));
      console.log(`wrote ${rel(out)} (VO captions burned in)`);
      did = true;
    }
    if (flag('silent')) {
      const r = writeSilentWav(path.resolve(opt('out', path.join(ROOT, 'vo', 'vo.wav'))), { rate: +opt('rate', 48000), bits: +opt('bits', 24), channels: +opt('channels', 2), force: flag('force') });
      console.log(`wrote ${rel(r.file)}: silent, ${r.frames} frames = ${(r.frames / r.rate).toFixed(3)} s, ${r.rate} Hz, ${r.bits === 32 ? '32-bit float' : r.bits + '-bit PCM'}, ${r.channels === 2 ? 'stereo' : 'mono'}`);
      did = true;
    }
    if (flag('assemble')) {
      const r = assemble({ dir: path.resolve(opt('dir', path.join(ROOT, 'vo'))), out: path.resolve(opt('out', path.join(ROOT, 'vo', 'vo.wav'))), rate: +opt('rate', 48000), bits: +opt('bits', 24), trim: !flag('no-trim'), force: flag('force') });
      console.log(`wrote ${rel(r.out)} from ${r.lines} line file${r.lines === 1 ? '' : 's'}${r.missing.length ? ` (silent where missing: ${r.missing.join(', ')})` : ''}`);
      for (const w of r.warn) console.log('  ⚠ ' + w);
      did = true;
    }
    if (opt('take')) {
      const r = fromTake({ edl: path.resolve(opt('take')), out: path.resolve(opt('out', path.join(ROOT, 'vo', 'vo.wav'))), rate: +opt('rate', 44100), bits: +opt('bits', 16), force: flag('force') });
      console.log(`ID      take: first word – last word   parts  pauses (s)      film: in → end    gap   note`);
      for (const w of r.rows) console.log(`${w.id.padEnd(6)}  ${w.srcOn.toFixed(2).padStart(10)} – ${w.srcOff.toFixed(2).padEnd(14)} ${String(w.parts).padStart(3)}    ${w.pauses.join(', ').padEnd(14)}  ${w.in.toFixed(2).padStart(6)} → ${w.end.toFixed(2).padEnd(6)}  ${w.gap.toFixed(2).padStart(5)}   ${w.notes.join('; ') || 'ok'}`);
      console.log(`wrote ${rel(r.out)} from ${r.source}: ${r.rows.length} lines on their cues, peak ${r.peakDb.toFixed(1)} dBFS`);
      did = true;
    }
    if (opt('test')) {
      const file = path.resolve(opt('test')), rate = +opt('rate', 48000);
      if (path.resolve(file) === path.join(ROOT, 'vo', 'vo.wav') && !flag('force')) throw new Error('the test VO is a QA signal, not a deliverable: write it somewhere else than vo/vo.wav');
      const x = testVO({ rate, level: +opt('level', -26), shift: +opt('shift', 0) });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, wavBytes(flag('mono') ? [x] : [x, x.slice()], rate, 24));
      console.log(`wrote ${rel(file)}: synthetic speech-like test VO (${rate} Hz, 24-bit, ${flag('mono') ? 'mono' : 'stereo'}), lines shifted by ${(+opt('shift', 0)).toFixed(2)} s`);
      did = true;
    }
    if (!did) { const src = fs.readFileSync(__filename, 'utf8').split('\n'); console.log(src.slice(1, src.findIndex((l) => l.startsWith(' */'))).map((l) => l.replace(/^ \*\/?/, '')).join('\n')); process.exitCode = 1; }
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}

/* LInOG explainer — soundtrack engine (v2, documentary): original hybrid-orchestral score + voice-over mix.
 *
 * Output: 44.1 kHz stereo, exactly 60.000 s (2,646,000 frames); 16-bit WAV with seeded TPDF dither, −1 dBFS peak,
 * last sample 0. Reproducible to ±1 LSB (Chromium's vectorised DSP paths can round differently run to run).
 * No ConvolverNode, no Math.random, no Date.
 *
 * Pipeline
 *   1. Score: an OfflineAudioContext renders the instruments into 8 discrete channels (dry, room send, hall send,
 *      echo send). Voices are created just in time at ctx.suspend() points, so the live graph stays small.
 *   2. Effects in plain JS (bit-exact): two feedback-delay-network reverbs (room, hall) and a ping-pong echo.
 *   3. Music stem: the score (or an external music file, setMusic) → ducking under the VO → drop ending
 *      (57–60 s: exponential low-pass sweep 18 kHz → 200 Hz while the final chord's reverb tail fades to 0 at 60.000 s).
 *   4. VO (setVO): WAV parsed in JS (PCM 16/24/32-bit int, 32/64-bit float; any channel count; any sample rate, resampled
 *      with a windowed-sinc kernel) → 70 Hz high-pass → active-speech level (gated RMS) normalised to −19 dBFS →
 *      look-ahead peak limiter at −3 dBFS.
 *   5. Mix = ducked music + VO → look-ahead limiter at −1 dBFS → 16-bit TPDF dither.
 *
 * Ducking (music only): (a) automation from the cue sheet (src/vo_cues.js): −8 dB, a raised-cosine ramp starting
 * 0.15 s before each line's `in`, back up over 0.4 s after its `out`, lines closer than 0.6 s merged (no pumping); a
 * gentle presence dip (−3 dB @ 2.8 kHz) rides the same curve so consonants stay clear. (b) From the VO signal itself:
 * its detected speech windows join the automation (a line that drifts out of its slot is still ducked the full −8 dB),
 * and an envelope follower (30 ms look-ahead, 30 ms attack, 300 ms release) adds up to −5 dB more under the words.
 *
 * Score (120 BPM: beat 0.5 s, bar 2 s; D minor, i–VI–III–VII = Dm–B♭–F–C, lifting to D major at the end card):
 *    0–10  prologue: earth boom, low drone, shimmering harmonics, sparse celesta + felt-piano motif; heartbeat toms
 *          and a pp spiccato from 4–6 s; taiko build, brass swell and reverse cymbal into the hit at 10.0
 *   10–42  the pipeline: spiccato string ostinato (8ths → 16ths, 3+3+2 accents), warm string pads, sustained low
 *          strings, syncopated taiko + frame-drum grooves; ensemble hits (taiko, sub boom, crash, brass stab) at 10, 18,
 *          30, 42; violins join at 22 ("motion turns to colour"); a breath 36–38 (Gm, drums out) rebuilding into 42
 *   42–48  lift (F – C – Dm), horns, then the big accent at 48.0 (B♭maj7) and a reflective, awe-filled 48–52
 *          (felt piano, celesta, low drone; no drums)
 *   52–57  pull-back: B♭ – Csus – C, rising bass, and a warm D-major (add 9) final chord at 55.0; last note 56.0
 *   57–60  drop: low-pass sweep + reverb tail to true silence at 60.000 s
 */
(function () {
  'use strict';
  const L = window.LINOG;
  const SR = 44100, DUR = 60, N = SR * DUR;
  const HITS = [10, 18, 30, 42]; // act cuts: riser → ensemble hit (the picture flares the through-line on each)
  const ACCENT = 48; // the Cabanatuan reveal
  const DROP = [57, 60]; // music low-pass sweep + fade to silence (the picture fades to black over the same span)
  const VO_TARGET_DB = -19, VO_CEIL_DB = -3, MASTER_CEIL_DB = -1;
  const MUSIC_EXT_RMS_DB = -20; // external music is matched to the score's gated RMS (peak-safe)
  const DUCK = { depth: 8, pre: 0.15, post: 0.4, merge: 0.6, eqDb: 3, eqHz: 2800, scDepth: 5, scLook: 0.03, scAttack: 0.03, scRelease: 0.3 };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const dbg = (db) => Math.pow(10, db / 20);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const cueList = () => ((L.VO && L.VO.cues) || []).slice().sort((a, b) => a.in - b.in);

  /* ------------------------------------------------------------------ harmony */
  // bass = low strings root; pad = string voices [tenor, alto, soprano] (voice-led); ost = low spiccato pool; hi = violins
  const CH = {
    Dm: { bass: 38, pad: [62, 65, 69], ost: [50, 53, 57, 62], hi: [62, 65, 69, 74], brass: [50, 57, 62, 65] },
    Bb: { bass: 34, pad: [62, 65, 70], ost: [46, 50, 53, 58], hi: [62, 65, 70, 74], brass: [46, 53, 62, 65] },
    F: { bass: 41, pad: [60, 65, 69], ost: [53, 57, 60, 65], hi: [65, 69, 72, 77], brass: [41, 53, 60, 65, 69] },
    C: { bass: 36, pad: [60, 64, 67], ost: [48, 52, 55, 60], hi: [64, 67, 72, 76], brass: [48, 55, 60, 64] },
    Gm: { bass: 43, pad: [62, 67, 70], ost: [55, 58, 62, 67], hi: [62, 67, 70, 74], brass: [43, 50, 58, 62] },
    Bbmaj7: { bass: 34, pad: [62, 65, 69], ost: [46, 53, 57, 62], hi: [65, 69, 74, 77], brass: [34, 46, 53, 62, 69] },
    FA: { bass: 33, pad: [60, 65, 69], ost: [45, 53, 57, 60], hi: [65, 69, 72, 77], brass: [45, 53, 60, 65] },
    Csus: { bass: 36, pad: [60, 65, 67], ost: [48, 53, 55, 60], hi: [65, 67, 72, 77], brass: [48, 55, 60, 65] },
    D: { bass: 38, pad: [62, 66, 69], ost: [50, 54, 57, 62], hi: [66, 69, 74, 78], brass: [50, 54, 57, 62] },
  };
  const PROG = [
    [0, 4, 'Dm'], [4, 6, 'Bb'], [6, 8, 'F'], [8, 10, 'C'],
    [10, 12, 'Dm'], [12, 14, 'Bb'], [14, 16, 'F'], [16, 18, 'C'],
    [18, 20, 'Dm'], [20, 22, 'Bb'], [22, 24, 'F'], [24, 26, 'C'], [26, 28, 'Dm'], [28, 29, 'Bb'], [29, 30, 'C'],
    [30, 32, 'Dm'], [32, 34, 'Bb'], [34, 36, 'F'], [36, 38, 'Gm'], [38, 40, 'Bb'], [40, 42, 'C'],
    [42, 44, 'F'], [44, 46, 'C'], [46, 48, 'Dm'],
    [48, 50, 'Bbmaj7'], [50, 52, 'FA'],
    [52, 54, 'Bb'], [54, 54.5, 'Csus'], [54.5, 55, 'C'], [55, 60, 'D'],
  ];
  const chordAt = (t) => { for (const c of PROG) if (t >= c[0] - 1e-9 && t < c[1] - 1e-9) return CH[c[2]]; return CH.D; };
  /** Piecewise-linear curve through [t, v] points (repeat a time for a step). */
  const curve = (pts) => (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return t1 > t0 ? v0 + (v1 - v0) * (t - t0) / (t1 - t0) : v1; }
    return pts[pts.length - 1][1];
  };
  // section levels (0..1) — the arrangement's dynamics
  const LV = {
    pad: curve([[4, 0.42], [9.8, 0.62], [10, 0.5], [17.8, 0.6], [18, 0.52], [29.8, 0.66], [30, 0.6], [35.6, 0.7], [36.2, 0.38], [38, 0.45], [41.8, 0.72], [42, 0.66], [47.8, 0.78], [48, 0.82], [52, 0.68], [54.8, 0.74], [55, 0.86], [60, 0.86]]),
    cut: curve([[4, 900], [10, 1500], [18, 1700], [30, 1950], [36, 1150], [38, 1300], [42, 2300], [48, 2700], [52, 2000], [55, 2500], [60, 2500]]),
    low: curve([[4, 0.3], [9.9, 0.5], [10, 0.62], [29.9, 0.68], [30, 0.74], [35.8, 0.78], [36.2, 0.32], [38, 0.42], [42, 0.74], [47.9, 0.8], [48, 0.68], [52, 0.5], [55, 0.62], [60, 0.62]]),
    ost: curve([[6, 0.18], [9.9, 0.5], [10, 0.5], [14, 0.6], [17.9, 0.72], [18, 0.62], [29.9, 0.82], [30, 0.8], [35.9, 0.9], [38, 0.3], [41.9, 0.95], [42, 0.82], [47.9, 0.95], [52, 0.26], [54.5, 0.3]]),
    perc: curve([[4, 0.3], [9.9, 0.85], [10, 0.62], [17.9, 0.72], [18, 0.66], [29.9, 0.84], [30, 0.82], [35.9, 0.9], [38, 0.35], [41.9, 0.95], [42, 0.8], [47.9, 1], [52, 0.3], [55, 0.35]]),
  };

  /* ------------------------------------------------------------------ score: OfflineAudioContext → 8 discrete channels */
  /** Renders the instruments. Channels: 0/1 dry · 2/3 room-reverb send · 4/5 hall-reverb send · 6/7 echo send.
   *  opts.solo: render only these buses (development aid). */
  function renderScore(opts = {}) {
    const ctx = new OfflineAudioContext(8, N, SR);
    const rnd = L.rng(20261014);
    const nb = ctx.createBuffer(2, SR * 3, SR); // seeded stereo noise, shared by every noise voice
    for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
    const merger = ctx.createChannelMerger(8);
    ctx.destination.channelInterpretation = 'discrete';
    merger.connect(ctx.destination);
    const out2 = (ch) => { const g = ctx.createGain(); g.channelCount = 2; g.channelCountMode = 'explicit'; const sp = ctx.createChannelSplitter(2); g.connect(sp); sp.connect(merger, 0, ch); sp.connect(merger, 1, ch + 1); return g; };
    const DRY = out2(0), ROOM = out2(2), HALL = out2(4), ECHO = out2(6);
    const mkBus = (name, lv, s) => {
      const g = ctx.createGain(); g.gain.value = !opts.solo || opts.solo.includes(name) ? lv : 0; g.channelCount = 2; g.channelCountMode = 'explicit';
      for (const [dst, amt] of [[DRY, s.dry === undefined ? 1 : s.dry], [ROOM, s.room], [HALL, s.hall], [ECHO, s.echo]]) if (amt) { const x = ctx.createGain(); x.gain.value = amt; g.connect(x); x.connect(dst); }
      return g;
    };
    const B = {
      pad: mkBus('pad', 1, { room: 0.1, hall: 0.42 }),
      low: mkBus('low', 1, { room: 0.08, hall: 0.2 }),
      ost: mkBus('ost', 1, { room: 0.3, hall: 0.16 }),
      brass: mkBus('brass', 1, { room: 0.1, hall: 0.5 }),
      perc: mkBus('perc', 1, { room: 0.36, hall: 0.14 }),
      fx: mkBus('fx', 1, { hall: 0.32 }),
      sub: mkBus('sub', 1, { hall: 0.1 }),
      keys: mkBus('keys', 1, { room: 0.08, hall: 0.55, echo: 0.3 }),
      air: mkBus('air', 1, { dry: 0.55, hall: 0.9 }),
    };
    const busLv = {};
    for (const k of Object.keys(B)) busLv[k] = B[k].gain.value;

    /* ---- node helpers */
    const O = (type, f, t0, t1, det) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.start(t0); o.stop(t1); return o; };
    const G = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const F = (type, f, q = 0.707) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const P = (p) => { const s = ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; };
    const NZ = (t0, t1, off) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t0, ((off % 2.9) + 2.9) % 2.9); s.stop(t1); return s; };
    const chain = (...ns) => { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns; };
    /** Percussive envelope: 0 → peak in `a`, exponential decay to −80 dB at t0 + d, exactly 0 10 ms later. */
    const pk = (p, t0, peak, a, d) => { p.setValueAtTime(0, t0); p.linearRampToValueAtTime(peak, t0 + a); p.exponentialRampToValueAtTime(Math.max(peak, 1e-6) * 1e-4, t0 + d); p.linearRampToValueAtTime(0, t0 + d + 0.01); };
    /** Raised-cosine move of a param from v0 to v1 over [t0, t1]. */
    const glide = (p, t0, t1, v0, v1) => { const n = 24, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * i / (n - 1))); p.setValueCurveAtTime(c, t0, Math.max(0.002, t1 - t0)); };
    /** Make a long-lived param follow fn(t) (linear segments every `step` s). */
    const follow = (p, fn, t0, t1, step) => { p.setValueAtTime(fn(t0), t0); for (let t = t0 + step; t <= t1 + 1e-9; t += step) p.linearRampToValueAtTime(fn(t), t); };
    const TANH = new Float32Array(1025);
    for (let i = 0; i < TANH.length; i++) { const x = i / 512 - 1; TANH[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }

    /* ---- instruments (each returns the nodes it created, so the scheduler can release them) */
    function padNote(t0, t1, m, o) { // warm string section: 3 detuned saws, delayed vibrato, slow raised-cosine attack
      const end = t1 + o.rel, f = mtof(m);
      const lp = F('lowpass', o.cut(t0) * 0.6, 0.5), hp = F('highpass', 130, 0.6), g = G(0), p = P(o.pan);
      const vib = O('sine', o.vib, t0, end + 0.01), vd = G(0);
      vd.gain.setValueAtTime(0, t0); vd.gain.linearRampToValueAtTime(6.5, t0 + Math.min(1.2, t1 - t0));
      vib.connect(vd);
      const ns = [lp, hp, g, p, vib, vd];
      for (const det of [-11, 0.5, 10]) { const s = O('sawtooth', f, t0, end + 0.01, det + o.dj); vd.connect(s.detune); s.connect(lp); ns.push(s); }
      chain(lp, hp, g, p); p.connect(o.bus);
      lp.frequency.setValueAtTime(o.cut(t0) * 0.6, t0);
      for (let t = t0 + 0.5; t < end; t += 0.5) lp.frequency.linearRampToValueAtTime(o.cut(t), t);
      const a = Math.min(o.att, (t1 - t0) * 0.6);
      glide(g.gain, t0, t0 + a, 0, o.lv); glide(g.gain, t1, end, o.lv, 0);
      return ns;
    }
    function lowNote(t0, t1, m, o) { // celli + basses: sustained root (+ soft octave), marcato bite on act hits
      const end = t1 + o.rel;
      const lp = F('lowpass', 560, 0.6), g = G(0), p = P(0.05);
      const ns = [lp, g, p];
      for (const [mm, det, lvl] of [[m, -6, 1], [m, 7, 1], [m + 12, 3, 0.38]]) { const s = O('sawtooth', mtof(mm), t0, end + 0.01, det); const sg = G(lvl); chain(s, sg, lp); ns.push(s, sg); }
      chain(lp, g, p); p.connect(B.low);
      if (o.marc) {
        lp.frequency.setValueAtTime(1500, t0); lp.frequency.exponentialRampToValueAtTime(560, t0 + 0.4);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(o.lv * 1.6, t0 + 0.012); g.gain.exponentialRampToValueAtTime(o.lv, t0 + 0.45);
        g.gain.setValueAtTime(o.lv, t1); g.gain.linearRampToValueAtTime(0, end);
      } else { glide(g.gain, t0, t0 + o.att, 0, o.lv); glide(g.gain, t1, end, o.lv, 0); }
      return ns;
    }
    function spic(t, m, v, o) { // spiccato: two detuned saws, filter + amp snap, a breath of bow noise
      const f = mtof(m), len = 0.13, end = t + len + 0.01;
      const lp = F('lowpass', o.bright, 0.9), body = F('peaking', 320, 1.1), g = G(0), p = P(o.pan);
      body.gain.value = 4;
      const s1 = O('sawtooth', f, t, end, -7 + o.dj), s2 = O('sawtooth', f, t, end, 7 - o.dj);
      s1.connect(lp); s2.connect(lp); chain(lp, body, g, p); p.connect(B.ost);
      lp.frequency.setValueAtTime(o.bright, t); lp.frequency.exponentialRampToValueAtTime(o.bright * 0.28, t + 0.1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(v * 0.1, t + len - 0.015); g.gain.linearRampToValueAtTime(0, t + len);
      const n = NZ(t, t + 0.045, o.off), nf = F('bandpass', 2600, 0.9), ng = G(0);
      chain(n, nf, ng, p); pk(ng.gain, t, v * 0.16, 0.002, 0.03);
      return [lp, body, g, p, s1, s2, n, nf, ng];
    }
    function brassNote(m, pts, o) { // horns / trombones: the filter opens with the dynamic (pts: [[t, level 0..1], …], ends at 0)
      const t0 = pts[0][0], end = pts[pts.length - 1][0], f = mtof(m);
      const lp = F('lowpass', 220, 1.4), g = G(0), p = P(o.pan || 0);
      const s1 = O('sawtooth', f, t0, end + 0.01, -4), s2 = O('sawtooth', f, t0, end + 0.01, 5);
      s1.connect(lp); s2.connect(lp); chain(lp, g, p); p.connect(B.brass);
      g.gain.setValueAtTime(0, t0); lp.frequency.setValueAtTime(220, t0);
      for (let i = 1; i < pts.length; i++) {
        const [ta, la] = pts[i - 1], [tb, lb] = pts[i], steps = tb - ta > 0.3 ? 6 : 1;
        for (let k = 1; k <= steps; k++) { const t = ta + (tb - ta) * k / steps, l = la + (lb - la) * k / steps; g.gain.linearRampToValueAtTime(o.lv * l * l, t); lp.frequency.linearRampToValueAtTime(220 + o.bright * Math.pow(l, 1.5), t); }
      }
      return [lp, g, p, s1, s2];
    }
    const KIT = {
      odaiko: { f: 52, f0: 2.4, d: 1.25, m2: 0.22, sk: 650, skd: 0.07, nz: 0.5 },
      taiko: { f: 76, f0: 2.2, d: 0.75, m2: 0.25, sk: 1100, skd: 0.05, nz: 0.55 },
      tom: { f: 108, f0: 1.8, d: 0.45, m2: 0.3, sk: 1500, skd: 0.04, nz: 0.45 },
      frame: { f: 166, f0: 1.4, d: 0.22, m2: 0.3, sk: 850, skd: 0.05, nz: 0.8, bp: 1.1 },
      slap: { f: 205, f0: 1.3, d: 0.14, m2: 0.2, sk: 2300, skd: 0.035, nz: 1.0, bp: 1.2 },
    };
    function drum(t, kind, v, pan, off) { // pitched membrane (+ first overtone) and a filtered-noise skin attack
      const k = KIT[kind], p = P(pan);
      const b = O('sine', k.f * k.f0, t, t + k.d + 0.02), bg = G(0);
      b.frequency.setValueAtTime(k.f * k.f0, t); b.frequency.exponentialRampToValueAtTime(k.f, t + 0.03); b.frequency.exponentialRampToValueAtTime(k.f * 0.9, t + k.d);
      pk(bg.gain, t, v, 0.0015, k.d);
      const o2 = O('sine', k.f * 1.59, t, t + k.d * 0.35 + 0.02), og = G(0);
      pk(og.gain, t, v * k.m2, 0.0015, k.d * 0.35);
      const n = NZ(t, t + k.skd + 0.02, off), nf = F(k.bp ? 'bandpass' : 'lowpass', k.sk, k.bp || 0.7), ng = G(0);
      pk(ng.gain, t, v * k.nz, 0.0006, k.skd);
      chain(b, bg, p); chain(o2, og, p); chain(n, nf, ng, p); p.connect(B.perc);
      return [b, bg, o2, og, n, nf, ng, p];
    }
    const METAL = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0];
    function crash(t, v, d, off) { // metallic square cluster + bright noise wash, long decay into the hall
      const ns = [], hp = F('highpass', 4200, 0.7), mg = G(0), out = G(1);
      for (let i = 0; i < METAL.length; i++) { const o = O('square', METAL[i] * 3.1, t, t + d * 0.6 + 0.02); o.connect(hp); ns.push(o); }
      chain(hp, mg, out); pk(mg.gain, t, v * 0.05, 0.002, d * 0.6);
      const n = NZ(t, t + d + 0.02, off), nh = F('highpass', 5200, 0.6), ng = G(0);
      chain(n, nh, ng, out); pk(ng.gain, t, v, 0.0015, d);
      out.connect(B.fx);
      return ns.concat([hp, mg, out, n, nh, ng]);
    }
    function riser(t0, t1, v, off) { // reverse cymbal: rising high-passed noise + a resonant sweep, cut 12 ms before the hit
      const n = NZ(t0, t1 + 0.02, off), hp = F('highpass', 1500, 0.7), g = G(0);
      hp.frequency.setValueAtTime(1500, t0); hp.frequency.exponentialRampToValueAtTime(6500, t1);
      const c = new Float32Array(48); for (let i = 0; i < 48; i++) c[i] = v * Math.pow(i / 47, 3.2);
      g.gain.setValueCurveAtTime(c, t0, t1 - 0.012 - t0); g.gain.linearRampToValueAtTime(0, t1);
      const n2 = NZ(t0, t1 + 0.02, off + 1.3), bp = F('bandpass', 350, 2.4), g2 = G(0);
      bp.frequency.setValueAtTime(350, t0); bp.frequency.exponentialRampToValueAtTime(5200, t1);
      const c2 = new Float32Array(48); for (let i = 0; i < 48; i++) c2[i] = v * 0.6 * Math.pow(i / 47, 2);
      g2.gain.setValueCurveAtTime(c2, t0, t1 - 0.012 - t0); g2.gain.linearRampToValueAtTime(0, t1);
      chain(n, hp, g, B.fx); chain(n2, bp, g2, B.fx);
      return [n, hp, g, n2, bp, g2];
    }
    function whoosh(t0, t1, v, off) { // soft transition swish travelling left → right
      const n = NZ(t0, t1 + 0.02, off), bp = F('bandpass', 300, 1.4), g = G(0), p = P(-0.6);
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(4500, t1);
      p.pan.setValueAtTime(-0.6, t0); p.pan.linearRampToValueAtTime(0.6, t1);
      const tp = t0 + (t1 - t0) * 0.75;
      glide(g.gain, t0, tp, 0, v); glide(g.gain, tp, t1, v, 0);
      chain(n, bp, g, p, B.fx);
      return [n, bp, g, p];
    }
    function boom(t, v, d) { // sub drop, lightly saturated so it reads on small speakers
      const s = O('sine', 66, t, t + d + 0.02), g = G(0), ws = ctx.createWaveShaper();
      ws.curve = TANH; ws.oversample = 'none';
      s.frequency.setValueAtTime(66, t); s.frequency.exponentialRampToValueAtTime(31, t + 1.6);
      pk(g.gain, t, v, 0.008, d);
      chain(s, g, ws, B.sub);
      return [s, g, ws];
    }
    function celesta(t, m, v, pan) { // struck-bar modes 1 : 2.756 : 5.404 (+ the resonator's octave)
      const f = mtof(m), k = Math.pow(523 / f, 0.35), p = P(pan), ns = [p];
      for (const [r, a, d] of [[1, 1, 1.7 * k], [2, 0.1, 0.6 * k], [2.756, 0.26, 0.3 * k], [5.404, 0.08, 0.1 * k]]) {
        if (f * r > 15000) continue;
        const o = O('sine', f * r, t, t + d + 0.03), g = G(0);
        pk(g.gain, t, v * a, 0.0025, d); chain(o, g, p); ns.push(o, g);
      }
      p.connect(B.keys);
      return ns;
    }
    function piano(t, m, v, pan) { // felt piano: slightly stretched partials, soft hammer
      const f = mtof(m), k = Math.pow(262 / f, 0.4), p = P(pan), lp = F('lowpass', Math.min(5200, f * 7), 0.5), ns = [p, lp];
      [1, 0.55, 0.3, 0.17, 0.1, 0.06].forEach((a, i) => {
        const n = i + 1, fn = n * f * Math.sqrt(1 + 0.00035 * n * n);
        if (fn > 12000) return;
        const d = 2.8 * k / (1 + 0.55 * i), o = O('sine', fn, t, t + d + 0.03), g = G(0);
        pk(g.gain, t, v * a, 0.006, d); chain(o, g, lp); ns.push(o, g);
      });
      const n = NZ(t, t + 0.05, m * 0.37), nf = F('bandpass', Math.min(4000, f * 2.2), 0.8), ng = G(0);
      pk(ng.gain, t, v * 0.08, 0.001, 0.025); chain(n, nf, ng, lp);
      chain(lp, p, B.keys);
      return ns.concat([n, nf, ng]);
    }
    function shimmer(t0, t1, m, lv, hz, pan, fin, fout) { // high harmonic with a slow tremolo
      const s = O('sine', mtof(m), t0, t1 + 0.02), tr = G(0.62), lfo = O('sine', hz, t0, t1 + 0.02), ld = G(0.38), g = G(0), p = P(pan);
      chain(lfo, ld); ld.connect(tr.gain); chain(s, tr, g, p, B.air);
      glide(g.gain, t0, t0 + fin, 0, lv); glide(g.gain, t1 - fout, t1, lv, 0);
      return [s, tr, lfo, ld, g, p];
    }
    function air(t0, t1, lv, fin, fout, off) { // breathy high noise band
      const n = NZ(t0, t1 + 0.02, off), bp = F('bandpass', 7000, 0.5), g = G(0);
      chain(n, bp, g, B.air);
      glide(g.gain, t0, t0 + fin, 0, lv); glide(g.gain, t1 - fout, t1, lv, 0);
      return [n, bp, g];
    }
    function drone(t0, t1, m, lv, fin, fout) { // sub sine + low saws under a slowly breathing filter
      const g = G(0), lp = F('lowpass', 240, 0.8), sub = O('sine', mtof(m - 12), t0, t1 + 0.02), sg = G(0.9), p = P(0);
      const lfo = O('sine', 0.09, t0, t1 + 0.02), ld = G(90); chain(lfo, ld); ld.connect(lp.frequency);
      const ns = [g, lp, sub, sg, p, lfo, ld];
      for (const [mm, det] of [[m, -6], [m, 6], [m + 12, 0]]) { const s = O('sawtooth', mtof(mm), t0, t1 + 0.02, det); s.connect(lp); ns.push(s); }
      chain(sub, sg, g); chain(lp, g, p, B.sub);
      glide(g.gain, t0, t0 + fin, 0, lv); glide(g.gain, t1 - fout, t1, lv, 0);
      return ns;
    }
    function ping(t, v) { // sonar-like ping (radar)
      const o = O('sine', 1240, t, t + 1.8), g = G(0), p = P(0.2);
      o.frequency.setValueAtTime(1240, t); o.frequency.exponentialRampToValueAtTime(1160, t + 1.6);
      pk(g.gain, t, v, 0.004, 1.7); chain(o, g, p, B.keys);
      return [o, g, p];
    }

    /* ---- arrangement: an event list; voices are instantiated just in time by the scheduler below */
    const EV = [];
    const at = (t, end, make) => EV.push({ t, end, make });
    const R = L.rng(4242); // humanisation, drawn in a fixed order while the list is built
    const hv = (v, amt = 0.08) => v * (1 - amt + 2 * amt * R());
    let noff = 0;
    const off = () => (noff = (noff + 0.618034) % 2.9);
    const dr = (t, kind, v, pan = 0) => { const o = off(), vv = hv(v, 0.06); at(t, t + KIT[kind].d + 0.1, () => drum(t, kind, vv, pan, o)); };
    const cel = (t, m, v, pan) => { const vv = hv(v, 0.05); at(t, t + 2.3, () => celesta(t, m, vv, pan)); };
    const pno = (t, ms, v, pan = -0.15) => ms.forEach((m, i) => { const vv = hv(v, 0.05), tt = t + i * 0.014; at(tt, tt + 3.4, () => piano(tt, m, vv, pan + i * 0.08)); });
    const rise = (t0, T, v) => { const o = off(); at(t0, T + 0.05, () => riser(t0, T, v, o)); };
    const wh = (t0, t1, v) => { const o = off(); at(t0, t1 + 0.05, () => whoosh(t0, t1, v, o)); };
    const cr = (t, v, d) => { const o = off(); at(t, t + d + 0.1, () => crash(t, v, d, o)); };
    const bm = (t, v, d = 2.9) => at(t, t + d + 0.1, () => boom(t, v, d));
    const brassPan = (i) => (i % 2 ? 0.28 : -0.28) * (0.6 + 0.2 * i);
    /** Brass swell on `chord`, crescendo into T (cut 15 ms before it). */
    const swell = (t0, T, chord, peak = 0.9, lv = 0.1) => CH[chord].brass.forEach((m, i) => at(t0, T + 0.05, () => brassNote(m, [[t0, 0], [t0 + (T - t0) * 0.45, 0.3 * peak], [T - 0.015, peak], [T, 0]], { lv, bright: 2400, pan: brassPan(i) })));
    /** Soft sustained horn chord. */
    const horn = (t0, t1, ms, peak, lv = 0.085) => ms.forEach((m, i) => at(t0, t1 + 0.05, () => {
      const a = Math.min(0.8, (t1 - t0) * 0.4), r = Math.min(0.6, (t1 - t0) * 0.3);
      return brassNote(m, [[t0, 0], [t0 + a, peak], [t1 - r, peak * 0.9], [t1, 0]], { lv, bright: 1500, pan: brassPan(i) });
    }));
    /** Ensemble hit: taiko trio, sub boom, crash, brass stab on the new chord settling to a soft sustain. */
    const hit = (T, big, chord) => {
      [['odaiko', 1.0, -0.1, 0], ['taiko', 0.8, 0.28, 0.004], ['tom', 0.55, -0.3, 0.009]].forEach(([k, v, pn, dt]) => dr(T + dt, k, v * big, pn));
      bm(T, 0.9 * big);
      cr(T, 0.5 * big, 2.7);
      CH[chord].brass.forEach((m, i) => at(T, T + 2.7, () => brassNote(m, [[T, 0], [T + 0.018, big], [T + 0.32, 0.62 * big], [T + 1.4, 0.34 * big], [T + 2.6, 0]], { lv: 0.1, bright: 2600, pan: brassPan(i) })));
    };

    follow(B.pad.gain, (t) => busLv.pad * LV.pad(t), 0, DUR, 0.25);
    follow(B.low.gain, (t) => busLv.low * LV.low(t), 0, DUR, 0.25);

    // prologue 0–10: the earth (boom + drone), shimmer, celesta + felt piano motif, radar ping, heartbeat, build
    bm(0, 0.36, 3.2);
    at(0, 10.9, () => drone(0, 10.8, 38, 0.3, 2.8, 0.9));
    [[86, 0.15, 0.23, -0.5], [88, 0.11, 0.31, 0.45], [93, 0.1, 0.17, -0.2], [98, 0.045, 0.41, 0.6]].forEach(([m, lv, hz, pn], i) => { const t0 = 0.3 + i * 0.7; at(t0, 10.7, () => shimmer(t0, 10.6, m, lv, hz, pn, 2.5, 0.9)); });
    { const o = off(); at(0, 10.7, () => air(0, 10.6, 0.05, 3, 1, o)); }
    [[0, 74, 0.8], [0.75, 76, 0.5], [1, 77, 0.62], [2, 81, 0.7], [2.75, 79, 0.45], [3, 76, 0.6], [4, 77, 0.7], [4.75, 79, 0.45], [5, 81, 0.6],
      [6, 84, 0.7], [6.75, 82, 0.45], [7, 81, 0.6], [8, 79, 0.55], [8.75, 76, 0.4], [9, 79, 0.45]].forEach(([t, m, v]) => cel(t, m, v * 0.5, 0.25));
    pno(0, [50, 62], 0.42); pno(2, [57], 0.3); pno(4, [46, 58], 0.38); pno(6, [53, 60], 0.36); pno(8, [48, 55], 0.34);
    at(4, 5.9, () => ping(4, 0.16));
    [[4, 0.32], [4.375, 0.22], [6, 0.38], [6.375, 0.27]].forEach(([t, v]) => dr(t, 'tom', v, -0.1));
    [[8, 'odaiko', 0.5], [8.75, 'taiko', 0.36], [9, 'taiko', 0.5], [9.5, 'taiko', 0.56], [9.75, 'tom', 0.6], [9.875, 'tom', 0.68]].forEach(([t, k, v]) => dr(t, k, v, 0.1));
    for (let i = 0; i < 8; i++) dr(9 + i * 0.125, 'frame', 0.14 + 0.06 * i, -0.2);

    // act hits, the 48 s accent, swells and risers into them
    hit(10, 1, 'Dm'); hit(18, 0.95, 'Dm'); hit(30, 1, 'Dm'); hit(42, 1, 'F'); hit(ACCENT, 1.12, 'Bbmaj7');
    swell(8.6, 10, 'C'); rise(8, 10, 0.4);
    swell(16.6, 18, 'C', 0.85); rise(16.5, 18, 0.34);
    swell(28.8, 30, 'C', 0.88); rise(28.5, 30, 0.38);
    swell(40.4, 42, 'C', 0.95); rise(40, 42, 0.44);
    swell(46.2, 48, 'Dm', 1.0, 0.11); rise(46, 48, 0.52);
    rise(50.6, 52, 0.16); rise(54, 55, 0.14);
    wh(13.2, 14.05, 0.2); wh(21.2, 22.05, 0.22); wh(26.9, 27.55, 0.15);
    bm(36, 0.3, 2.8); bm(52, 0.32, 2.8); bm(55, 0.38, 2.8);
    cr(52, 0.12, 3.5); cr(55, 0.1, 3.5);

    // grooves: syncopated taiko (TK), toms (TM), frame drum (FR); never on every beat
    const TK = { A: { 0: 1, 6: 0.6, 10: 0.75 }, B: { 0: 1, 3: 0.55, 8: 0.8, 11: 0.6, 14: 0.7 }, C: { 0: 1, 3: 0.5, 6: 0.8, 10: 0.8, 12: 0.55, 13: 0.6, 14: 0.7, 15: 0.8 } };
    const TM = { a: { 4: 0.5, 12: 0.6 }, b: { 7: 0.45, 12: 0.6, 14: 0.5 }, f: { 12: 0.5, 13: 0.6, 14: 0.7, 15: 0.8 }, g: { 12: 0.4, 14: 0.5 } };
    const FR = { 16: [0.5, 0.15, 0.28, 0.18, 0.75, 0.15, 0.32, 0.2, 0.45, 0.15, 0.28, 0.18, 0.8, 0.2, 0.4, 0.3], 8: [0.45, 0, 0.3, 0, 0.7, 0, 0.3, 0, 0.45, 0, 0.3, 0, 0.75, 0, 0.35, 0] };
    const BARS = [
      [10, 'A', null, 8], [12, 'A', 'g', 8], [14, 'B', 'a', 16], [16, 'A', 'f', 16],
      [18, 'A', 'a', 16], [20, 'B', 'a', 16], [22, 'B', 'a', 16], [24, 'A', 'b', 16], [26, 'C', 'b', 16], [28, 'C', 'f', 16],
      [30, 'C', 'a', 16], [32, 'B', 'b', 16], [34, 'C', 'a', 16],
      [38, null, null, 8], [40, null, null, 16],
      [42, 'A', 'a', 16], [44, 'B', 'b', 16], [46, 'C', 'f', 16],
    ];
    for (const [t0, tk, tm, fr] of BARS) for (let i = 0; i < 16; i++) {
      const t = t0 + i * 0.125, lv = LV.perc(t);
      if (i === 0 && (HITS.includes(t) || t === ACCENT)) continue; // the ensemble hit plays there
      if (tk && TK[tk][i]) dr(t, i === 0 ? 'odaiko' : 'taiko', TK[tk][i] * lv * 0.85, i % 2 ? 0.2 : -0.1);
      if (tm && TM[tm][i]) dr(t, 'tom', TM[tm][i] * lv * 0.8, 0.3);
      const fv = FR[fr][i] * (t0 === 40 ? 0.35 + 0.65 * i / 15 : 1);
      if (fv) dr(t, fv >= 0.7 ? 'slap' : 'frame', fv * lv * 0.5, -0.25);
    }
    [[40, 'odaiko', 0.5], [40.75, 'taiko', 0.4], [41, 'taiko', 0.52], [41.5, 'taiko', 0.58], [41.75, 'tom', 0.62], [41.875, 'tom', 0.7]].forEach(([t, k, v]) => dr(t, k, v, 0.1));
    [[52, 0.28], [52.375, 0.2], [54, 0.3], [54.375, 0.22]].forEach(([t, v]) => dr(t, 'tom', v, -0.1));
    dr(55, 'taiko', 0.3, 0);

    // spiccato ostinato: low strings (8ths → 16ths, 3+3+2 accents) and violins (8ths) from 22 s
    const OST = {
      16: { idx: [0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 0, 3, 2, 1, 2], acc: [1, 0.42, 0.62, 0.5, 0.58, 0.45, 0.95, 0.48, 0.62, 0.45, 0.6, 0.5, 0.9, 0.55, 0.72, 0.58], step: 0.125 },
      8: { idx: [0, 2, 1, 2, 0, 2, 3, 2], acc: [1, 0.55, 0.65, 0.9, 0.6, 0.65, 0.88, 0.6], step: 0.25 },
    };
    for (const [a, b, kind] of [[6, 10, 8], [10, 14, 8], [14, 36, 16], [38, 40, 8], [40, 48, 16], [52, 54.5, 8]]) {
      const pat = OST[kind];
      for (let i = 0, t = a; t < b - 1e-9; t = a + (++i) * pat.step) {
        const j = i % pat.idx.length, m = chordAt(t).ost[pat.idx[j]], lv = LV.ost(t);
        const v = hv(0.075 * lv * pat.acc[j], 0.1), dj = (R() - 0.5) * 6, o = off(), bright = 1500 + 2600 * lv * (0.7 + 0.3 * pat.acc[j]);
        at(t, t + 0.2, () => spic(t, m, v, { pan: -0.22, bright, dj, off: o }));
      }
    }
    const HI8 = { idx: [3, 1, 2, 1, 3, 1, 2, 0], acc: [1, 0.55, 0.7, 0.85, 0.6, 0.6, 0.9, 0.6] };
    for (const [a, b] of [[22, 36], [42, 48]]) for (let i = 0, t = a; t < b - 1e-9; t = a + (++i) * 0.25) {
      const j = i % 8, m = chordAt(t).hi[HI8.idx[j]], lv = LV.ost(t);
      const v = hv(0.05 * lv * HI8.acc[j], 0.1), dj = (R() - 0.5) * 6, o = off(), bright = 2600 + 2400 * lv;
      at(t, t + 0.2, () => spic(t, m, v, { pan: 0.3, bright, dj, off: o }));
    }

    // string pads from 4 s: three voice-led lines (common tones tied), slow attacks, final chord released at 57.6 s
    const lines = [[], [], []];
    for (const [a, b, name] of PROG) {
      if (b <= 4) continue;
      CH[name].pad.forEach((m, v) => { const ln = lines[v], last = ln[ln.length - 1]; if (last && last[2] === m) last[1] = b; else ln.push([Math.max(a, 4), b, m]); });
    }
    const PADV = [{ pan: -0.42, vib: 5.1 }, { pan: 0.05, vib: 5.5 }, { pan: 0.42, vib: 4.8 }];
    const padOpts = (v, first, last) => ({ lv: 0.03, att: first ? 1.4 : 0.35, rel: last ? 1.5 : 0.45, pan: PADV[v].pan + (R() - 0.5) * 0.1, vib: PADV[v].vib + R() * 0.3, dj: (R() - 0.5) * 4, cut: LV.cut, bus: B.pad });
    lines.forEach((ln, v) => ln.forEach(([t0, t1, m], i) => {
      const last = t1 >= DUR - 1e-6, e1 = last ? 57.6 : t1, o = padOpts(v, i === 0, last);
      at(t0, e1 + o.rel + 0.1, () => padNote(t0, e1, m, o));
    }));
    for (const [a, b] of [[42, 52], [55, 57.6]]) lines[2].forEach(([t0, t1, m]) => { // violins an octave above the top line
      const s = Math.max(a, t0), e = Math.min(b, t1);
      if (e - s < 0.5) return;
      const o = { ...padOpts(2, true, e >= 57.6), lv: 0.016, att: 0.6, pan: 0.25 };
      at(s, e + o.rel + 0.1, () => padNote(s, e, m + 12, o));
    });

    // low strings from 10 s: sustained roots, marcato on the hits
    const low = [];
    for (const [a, b, name] of PROG) { if (b <= 10) continue; const m = CH[name].bass, last = low[low.length - 1]; if (last && last[2] === m) last[1] = b; else low.push([Math.max(a, 10), b, m]); }
    low.forEach(([t0, t1, m]) => {
      const last = t1 >= DUR - 1e-6, e1 = last ? 57.6 : t1, o = { lv: 0.06, att: 0.18, rel: last ? 1.4 : 0.35, marc: HITS.includes(t0) || t0 === ACCENT };
      at(t0, e1 + o.rel + 0.1, () => lowNote(t0, e1, m, o));
    });

    // horns: lift 42–48, awe after the accent, warm close
    horn(42.3, 44.3, [53, 60, 65], 0.42); horn(44.1, 46.3, [55, 60, 64], 0.42);
    horn(48.3, 51.4, [46, 53, 62, 69], 0.36);
    horn(52.2, 54.2, [53, 58, 62], 0.3); horn(54.0, 55.2, [55, 60, 64], 0.32); horn(55.0, 58.6, [54, 57, 62], 0.38);

    // celesta / piano: phase sparkles, the breath, the lift, the reveal, the end motif in D major (last note 56.0)
    [[14, 72], [14.125, 77], [14.25, 81], [14.375, 84]].forEach(([t, m], i) => cel(t, m, 0.2 + i * 0.03, 0.3));
    [[22, 77], [22.125, 81], [22.25, 84], [22.375, 89], [22.5, 93]].forEach(([t, m], i) => cel(t, m, 0.22 + i * 0.02, 0.35));
    cel(27.5, 86, 0.2, 0.3); cel(27.625, 81, 0.16, 0.3);
    [[36, 74], [36.75, 77], [37, 79], [38, 82], [38.75, 81], [39, 77]].forEach(([t, m], i) => cel(t, m, i % 3 ? 0.24 : 0.32, 0.2));
    pno(36, [43, 55], 0.3); pno(38, [46, 58], 0.3);
    [[43, 81], [43.5, 84], [45, 79], [45.5, 84], [47, 81], [47.5, 77]].forEach(([t, m]) => cel(t, m, 0.16, 0.4));
    [[48, 81], [49, 77], [49.75, 79], [50, 76], [51, 72], [51.75, 74]].forEach(([t, m], i) => cel(t, m, i === 0 ? 0.34 : 0.26, 0.25));
    pno(48, [46, 53, 57, 62], 0.34); pno(50, [45, 53, 57, 60], 0.3);
    [[52, 74, 0.3], [52.75, 76, 0.22], [53, 77, 0.28], [54, 79, 0.28], [54.5, 76, 0.22], [55, 78, 0.36], [55.5, 81, 0.3], [56, 86, 0.32]].forEach(([t, m, v]) => cel(t, m, v, 0.25));
    pno(52, [46, 58], 0.3); pno(54, [48, 55], 0.3); pno(55, [38, 50, 57, 66], 0.4);

    // shimmer + air: discovery (22), the reveal (48), the close (52–60)
    [[84, 0.07, 0.26, -0.3], [89, 0.06, 0.34, 0.35], [91, 0.05, 0.19, 0]].forEach(([m, lv, hz, pn], i) => { const t0 = 22 + i * 0.25; at(t0, 26.5, () => shimmer(t0, 26.4, m, lv, hz, pn, 1.0, 1.2)); });
    [[81, 0.1, 0.21, -0.4], [86, 0.09, 0.29, 0.4], [89, 0.07, 0.37, -0.1]].forEach(([m, lv, hz, pn], i) => { const t0 = 48.2 + i * 0.4; at(t0, 52.8, () => shimmer(t0, 52.7, m, lv, hz, pn, 1.6, 0.9)); });
    [[86, 0.1, 0.23, -0.45], [88, 0.075, 0.33, 0.35], [93, 0.07, 0.19, 0.05]].forEach(([m, lv, hz, pn], i) => { const t0 = 52 + i * 0.3; at(t0, 59.7, () => shimmer(t0, 59.6, m, lv, hz, pn, 1.2, 2.4)); });
    at(55, 59.7, () => shimmer(55, 59.6, 90, 0.07, 0.27, 0.5, 1.0, 2.4));
    { const o = off(); at(48, 59.7, () => air(48, 59.6, 0.04, 2, 2.5, o)); }

    /* ---- scheduler: create voices ≥ 1 s before they start, release them once they are silent */
    EV.sort((a, b) => a.t - b.t);
    let k = 0;
    const live = [];
    const spawn = (until) => { while (k < EV.length && EV[k].t < until) { const e = EV[k++]; live.push({ end: e.end, ns: e.make() }); } };
    const reap = (now) => { let j = 0; for (const v of live) { if (v.end < now - 0.05) { for (const n of v.ns) n.disconnect(); } else live[j++] = v; } live.length = j; };
    spawn(2);
    for (let T = 1; T < DUR; T++) ctx.suspend(T).then(() => { reap(T); spawn(T + 2); ctx.resume(); });
    return ctx.startRendering().then((buf) => ({ buf, events: EV.length }));
  }

  /* ------------------------------------------------------------------ DSP in plain JS (bit-exact, deterministic) */
  const pow2 = (n) => { let p = 1; while (p < n) p <<= 1; return p; };
  /** RBJ biquad coefficients [b0, b1, b2, a1, a2] (normalised). */
  function bq(type, f, q, gainDb = 0) {
    const w = 2 * Math.PI * clamp(f, 1, SR * 0.49) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q), A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; } // peaking
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  /** In-place biquad, transposed direct form II. */
  function biquad(x, c) {
    const [b0, b1, b2, a1, a2] = c;
    let z1 = 0, z2 = 0;
    for (let i = 0; i < x.length; i++) { const xi = x[i], y = b0 * xi + z1; z1 = b1 * xi - a1 * y + z2; z2 = b2 * xi - a2 * y; x[i] = y; }
  }
  /** In-place time-varying biquad: coef(i) is evaluated every 32 samples. */
  function biquadTV(x, coef) {
    let z1 = 0, z2 = 0, b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    for (let i = 0; i < x.length; i++) {
      if ((i & 31) === 0) [b0, b1, b2, a1, a2] = coef(i);
      const xi = x[i], y = b0 * xi + z1; z1 = b1 * xi - a1 * y + z2; z2 = b2 * xi - a2 * y; x[i] = y;
    }
  }
  function peakOf(chs) { let p = 0; for (const c of chs) for (let i = 0; i < c.length; i++) { const a = c[i] < 0 ? -c[i] : c[i]; if (a > p) p = a; } return p; }
  const toDb = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

  /** Stereo FDN reverb (8 lines, Hadamard feedback, Jot absorbent filters for a frequency-dependent RT60, input
   *  diffusion, pre-delay). o: {rt60 (s), hf (RT ratio at Nyquist), size, pre (s)}. Returns the wet signal. */
  function reverb(inL, inR, o) {
    const n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n);
    const D = [1931, 2213, 2477, 2767, 3001, 3329, 3593, 3907].map((d) => Math.round(d * o.size));
    const g = D.map((d) => Math.pow(10, -3 * d / (o.rt60 * SR)));
    const bb = g.map((gi) => (Math.LN10 / 4) * Math.log10(gi) * (1 - 1 / (o.hf * o.hf)));
    const ga = g.map((gi, k) => gi * (1 - bb[k]));
    const buf = D.map((d) => new Float32Array(pow2(d + 1))), msk = buf.map((b) => b.length - 1);
    const ap = [[142, 107, 379, 277], [149, 113, 367, 283]].map((ds) => ds.map((d) => { const len = Math.max(8, Math.round(d * o.size)); return { b: new Float32Array(pow2(len + 1)), d: len, w: 0 }; }));
    const AG = 0.62;
    const apRun = (list, x) => { for (const a of list) { const m = a.b.length - 1, r = a.b[(a.w - a.d) & m], y = -AG * x + r; a.b[a.w] = x + AG * y; a.w = (a.w + 1) & m; x = y; } return x; };
    const pre = Math.round(o.pre * SR), lp = new Float64Array(8), y = new Float64Array(8);
    const SL = [1, -1, 1, -1, 1, -1, 1, -1], SRr = [1, 1, -1, -1, 1, 1, -1, -1], IL = [1, 1, 1, 1, -1, -1, -1, -1], IR = [1, -1, -1, 1, 1, -1, -1, 1];
    const nrm = 1 / Math.sqrt(8);
    let w = 0;
    for (let i = 0; i < n; i++) {
      const j = i - pre;
      const xl = apRun(ap[0], j >= 0 ? inL[j] : 0), xr = apRun(ap[1], j >= 0 ? inR[j] : 0);
      let ol = 0, or = 0;
      for (let k = 0; k < 8; k++) {
        const v = buf[k][(w - D[k]) & msk[k]];
        lp[k] = ga[k] * v + bb[k] * lp[k];
        y[k] = lp[k]; ol += SL[k] * y[k]; or += SRr[k] * y[k];
      }
      outL[i] = ol * nrm; outR[i] = or * nrm;
      // unnormalised fast Walsh–Hadamard transform (×nrm below makes it orthonormal)
      for (let h = 1; h < 8; h <<= 1) for (let a = 0; a < 8; a += h << 1) for (let b = a; b < a + h; b++) { const u = y[b], v = y[b + h]; y[b] = u + v; y[b + h] = u - v; }
      for (let k = 0; k < 8; k++) buf[k][w & msk[k]] = y[k] * nrm + 0.5 * (IL[k] * xl + IR[k] * xr);
      w++;
    }
    return [outL, outR];
  }
  /** Ping-pong echo (mono in → L → R → L …) with a low-passed feedback path. */
  function echo(inL, inR, o) {
    const d = Math.round(o.time * SR), n = inL.length, oL = new Float32Array(n), oR = new Float32Array(n);
    const bl = new Float32Array(pow2(d + 1)), br = new Float32Array(pow2(d + 1)), m = bl.length - 1, a = Math.exp(-2 * Math.PI * o.lp / SR);
    let zl = 0, zr = 0;
    for (let i = 0; i < n; i++) {
      zl = (1 - a) * bl[(i - d) & m] + a * zl; zr = (1 - a) * br[(i - d) & m] + a * zr;
      oL[i] = zl; oR[i] = zr;
      bl[i & m] = 0.5 * (inL[i] + inR[i]) + o.fb * zr; br[i & m] = zl;
    }
    return [oL, oR];
  }
  /** Look-ahead peak limiter, in place: no added latency (offline), linear attack over `la` s reaching the gain
   *  needed at each peak exactly on it, exponential release. Returns the deepest gain reduction (dB). */
  function limiter(chs, ceil, la, rel) {
    const n = chs[0].length, W = Math.max(1, Math.round(la * SR)), k = 1 - Math.exp(-1 / (rel * SR));
    const req = new Float32Array(n);
    for (let i = 0; i < n; i++) { let p = 0; for (const c of chs) { const v = c[i] < 0 ? -c[i] : c[i]; if (v > p) p = v; } req[i] = p > ceil ? ceil / p : 1; }
    const e = new Float32Array(n), dq = new Int32Array(n + W);
    let qh = 0, qt = 0, prev = 1;
    for (let j = 0; j < n + W - 1; j++) { // e[i] = release-smoothed min(req[i .. i+W-1])
      if (j < n) { while (qt > qh && req[dq[qt - 1]] >= req[j]) qt--; dq[qt++] = j; }
      const i = j - W + 1;
      if (i < 0) continue;
      while (dq[qh] < i) qh++;
      const h = req[dq[qh]], r = prev + (1 - prev) * k;
      prev = h < r ? h : r; e[i] = prev;
    }
    let sum = 0, minG = 1;
    for (let i = 0; i < n; i++) { // box filter: the gain ramps linearly down over W samples to each peak
      sum += e[i] - (i >= W ? e[i - W] : 1);
      const gi = (sum + (i < W - 1 ? (W - 1 - i) : 0)) / W;
      if (gi < minG) minG = gi;
      for (const c of chs) c[i] *= gi;
    }
    return toDb(minG);
  }
  /** Active level (gated RMS, ITU-T P.56-style): 50 ms blocks above −60 dBFS, then iterated relative gate at
   *  15.9 dB below the level. Returns {db, active (fraction of blocks above the gate)}. */
  function activeLevel(chs, absDb = -60) {
    const n = chs[0].length, BL = Math.round(0.05 * SR), nb = Math.floor(n / BL), ms = new Float64Array(nb);
    for (let b = 0; b < nb; b++) { let s = 0; for (const c of chs) for (let i = b * BL; i < (b + 1) * BL; i++) s += c[i] * c[i]; ms[b] = s / (BL * chs.length); }
    const mean = (thr) => { let s = 0, c = 0; for (let b = 0; b < nb; b++) if (ms[b] > thr) { s += ms[b]; c++; } return [c ? 10 * Math.log10(s / c) : -Infinity, c]; };
    let [lv, cnt] = mean(Math.pow(10, absDb / 10));
    if (!cnt) return { db: -Infinity, active: 0 };
    for (let it = 0; it < 20; it++) { const [l2, c2] = mean(Math.pow(10, (Math.max(absDb, lv - 15.9)) / 10)); const done = Math.abs(l2 - lv) < 0.005; lv = l2; cnt = c2; if (done) break; }
    return { db: lv, active: cnt / nb };
  }

  /* ------------------------------------------------------------------ WAV I/O + resampling */
  /** Parse a RIFF/RF64 WAVE file: PCM 8/16/24/32-bit int or 32/64-bit float (incl. WAVE_FORMAT_EXTENSIBLE). */
  function parseWav(ab) {
    if (ab instanceof Uint8Array) ab = ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    const dv = new DataView(ab), u8 = new Uint8Array(ab), len = ab.byteLength;
    const tag = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    if (len < 12 || (tag(0) !== 'RIFF' && tag(0) !== 'RF64') || tag(8) !== 'WAVE') throw new Error('not a RIFF/WAVE file');
    let o = 12, fmt = null, data = null;
    while (o + 8 <= len) {
      const id = tag(o); let size = dv.getUint32(o + 4, true);
      if (id === 'fmt ') {
        fmt = { tag: dv.getUint16(o + 8, true), ch: dv.getUint16(o + 10, true), sr: dv.getUint32(o + 12, true), align: dv.getUint16(o + 20, true), bits: dv.getUint16(o + 22, true) };
        if (fmt.tag === 0xfffe && size >= 40) fmt.tag = dv.getUint16(o + 32, true); // extensible: sub-format GUID
      } else if (id === 'data') {
        if (size === 0xffffffff || o + 8 + size > len) size = len - o - 8; // RF64 / streamed / truncated
        data = { off: o + 8, size };
        if (fmt) break;
      }
      o += 8 + size + (size & 1);
    }
    if (!fmt || !data) throw new Error('WAV: missing fmt or data chunk');
    const { ch, bits } = fmt, bps = bits >> 3, align = fmt.align || ch * bps;
    if (!ch || !fmt.sr) throw new Error('WAV: bad header');
    const isFloat = fmt.tag === 3;
    if (!isFloat && fmt.tag !== 1) throw new Error(`WAV: unsupported format tag ${fmt.tag} (need PCM or IEEE float)`);
    if (isFloat ? bits !== 32 && bits !== 64 : ![8, 16, 24, 32].includes(bits)) throw new Error(`WAV: unsupported ${bits}-bit ${isFloat ? 'float' : 'PCM'}`);
    const frames = Math.floor(data.size / align), chs = [];
    for (let c = 0; c < ch; c++) chs.push(new Float32Array(frames));
    for (let i = 0; i < frames; i++) for (let c = 0; c < ch; c++) {
      const p = data.off + i * align + c * bps;
      let v;
      if (isFloat) v = bits === 32 ? dv.getFloat32(p, true) : dv.getFloat64(p, true);
      else if (bits === 16) v = dv.getInt16(p, true) / 32768;
      else if (bits === 24) { let x = u8[p] | (u8[p + 1] << 8) | (u8[p + 2] << 16); if (x & 0x800000) x -= 0x1000000; v = x / 8388608; }
      else if (bits === 32) v = dv.getInt32(p, true) / 2147483648;
      else v = (u8[p] - 128) / 128;
      chs[c][i] = v;
    }
    return { sampleRate: fmt.sr, channels: chs, bits, format: isFloat ? 'float' : 'pcm', frames };
  }
  function i0(x) { let s = 1, t = 1; for (let k = 1; k < 40; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; if (t < 1e-12 * s) break; } return s; }
  /** Deterministic band-limited resampler: Kaiser-windowed sinc (β = 8.6, 24 zero crossings, 512-phase table). */
  function resample(x, from, to) {
    if (from === to) return x;
    const ratio = to / from, nOut = Math.round(x.length * ratio), y = new Float32Array(nOut);
    const cut = Math.min(1, ratio) * 0.96, ZC = 24, OS = 512, beta = 8.6, I0b = i0(beta);
    const tab = new Float64Array(ZC * OS + 2);
    for (let i = 0; i < tab.length; i++) { const u = i / OS, r = u / ZC; tab[i] = r >= 1 ? 0 : (u === 0 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u)) * i0(beta * Math.sqrt(1 - r * r)) / I0b; }
    const half = Math.ceil(ZC / cut), n = x.length;
    for (let j = 0; j < nOut; j++) {
      const pos = j / ratio, i0p = Math.floor(pos), fr = pos - i0p;
      let acc = 0;
      for (let k = -half + 1; k <= half; k++) {
        const ii = i0p + k;
        if (ii < 0 || ii >= n) continue;
        let u = (k - fr) * cut; if (u < 0) u = -u;
        const f = u * OS, fi = f | 0;
        if (fi >= ZC * OS) continue;
        acc += x[ii] * (tab[fi] + (tab[fi + 1] - tab[fi]) * (f - fi));
      }
      y[j] = acc * cut;
    }
    return y;
  }
  /** 16-bit PCM WAV with seeded TPDF dither; the dither fades out over the last second and the final frame is 0. */
  function toWav16(chs, seed) {
    const ch = chs.length, n = chs[0].length, bytes = n * ch * 2;
    const ab = new ArrayBuffer(44 + bytes), dv = new DataView(ab);
    const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); dv.setUint32(4, 36 + bytes, true); wr(8, 'WAVE'); wr(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, SR, true);
    dv.setUint32(28, SR * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
    wr(36, 'data'); dv.setUint32(40, bytes, true);
    const rnd = L.rng(seed), fadeFrom = n - SR;
    let o = 44;
    for (let i = 0; i < n; i++) {
      const da = i < fadeFrom ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (i - fadeFrom) / (n - 1 - fadeFrom));
      for (let c = 0; c < ch; c++) {
        const d = (rnd() - rnd()) * da;
        let v = i < n - 1 ? Math.round(chs[c][i] * 32767 + d) : 0;
        if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
        dv.setInt16(o, v, true); o += 2;
      }
    }
    return ab;
  }
  function b64(ab) { const u8 = new Uint8Array(ab); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function fromB64(s) { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8.buffer; }

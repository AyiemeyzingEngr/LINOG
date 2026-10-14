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

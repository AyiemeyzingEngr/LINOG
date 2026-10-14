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

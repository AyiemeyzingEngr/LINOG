/* LInOG explainer — original 60 s, 120 BPM soundtrack synthesised with the Web Audio API.
 * OfflineAudioContext, 44.1 kHz stereo, exactly 60.000 s. All noise comes from a seeded PRNG,
 * so the render is reproducible. Exported as 16-bit PCM WAV.
 *
 * Arrangement (bars of 2.0 s, D minor: Dm – B♭ – F – C, two bars per chord):
 *   kick on every quarter note (0.0 … 59.5 s)
 *   sub-bass impacts + noise risers on act changes (10, 18, 30, 42, 52) and the end card (56)
 *   radar ping-sweeps on each pipeline phase transition
 *   rolling 16th bass from 10 s, 16th arp from 18 s, pad throughout, hats/clap build with the acts.
 */
(function () {
  'use strict';
  const L = window.LINOG;
  const SR = 44100, DUR = 60, BEAT = 0.5;
  const ACT_HITS = [10, 18, 30, 42, 52, 56];
  const PINGS = [0.0, 4.0, 10, 14, 18, 22, 26, 30, 36, 42, 48, 52];
  const CHORDS = [
    { root: 38, tones: [62, 65, 69] }, // Dm
    { root: 34, tones: [58, 62, 65] }, // B♭
    { root: 41, tones: [60, 65, 69] }, // F
    { root: 36, tones: [60, 64, 67] }, // C
  ];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const chordAt = (t) => CHORDS[Math.floor(Math.floor(t / 2) / 2) % 4];

  function build(ctx) {
    const rnd = L.rng(20250317);
    // shared seeded noise buffer
    const nb = ctx.createBuffer(2, SR * 2, SR);
    for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
    // reverb impulse (seeded, exponentially decaying)
    const ir = ctx.createBuffer(2, SR * 2.4, SR);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }

    // Master: gain → tanh soft-clipper → end fade → out. No DynamicsCompressor: its ~6 ms look-ahead
    // would delay the whole mix against the picture and push audio past the final fade.
    const master = ctx.createGain(); master.gain.value = 0.62;
    const clip = ctx.createWaveShaper(); clip.oversample = 'none';
    const curve = new Float32Array(4097); for (let i = 0; i < curve.length; i++) { const x = (i / 2048) - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
    clip.curve = curve;
    const fade = ctx.createGain(); fade.gain.value = 1;
    // hard stop at 60.000 s: 10 ms fade to silence so the last sample is 0 (no click)
    fade.gain.setValueAtTime(1, DUR - 0.01); fade.gain.linearRampToValueAtTime(0, DUR);
    master.connect(clip); clip.connect(fade); fade.connect(ctx.destination);

    const verb = ctx.createConvolver(); verb.buffer = ir; const verbOut = ctx.createGain(); verbOut.gain.value = 0.32; verb.connect(verbOut); verbOut.connect(master);
    // ping-pong delay (dotted eighth = 0.375 s)
    const dl = ctx.createDelay(1), dr = ctx.createDelay(1); dl.delayTime.value = 0.375; dr.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.38; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
    const merger = ctx.createChannelMerger(2); const delayIn = ctx.createGain();
    delayIn.connect(dl); dl.connect(dlp); dlp.connect(dr); dr.connect(fb); fb.connect(dl);
    dl.connect(merger, 0, 0); dr.connect(merger, 0, 1); const delayOut = ctx.createGain(); delayOut.gain.value = 0.5; merger.connect(delayOut); delayOut.connect(master);

    const drums = ctx.createGain(); drums.gain.value = 0.95; drums.connect(master);
    const music = ctx.createGain(); music.gain.value = 1; music.connect(master);
    const musicSend = ctx.createGain(); musicSend.gain.value = 0.35; music.connect(musicSend); musicSend.connect(verb);
    // sidechain: duck the music bus on every kick
    for (let i = 0; i < DUR / BEAT; i++) {
      const tb = i * BEAT;
      music.gain.setValueAtTime(0.38, tb);
      music.gain.setTargetAtTime(1, tb + 0.02, 0.085);
    }

    const noise = (t, dur, dest, o = {}) => {
      const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      let node = src;
      if (o.type) { const f = ctx.createBiquadFilter(); f.type = o.type; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 0.7; if (o.sweep) { f.frequency.setValueAtTime(o.sweep[0], t); f.frequency.exponentialRampToValueAtTime(o.sweep[1], t + dur); } node.connect(f); node = f; }
      node.connect(g); g.connect(dest);
      return { src, g, start: () => { src.start(t, (o.offset || 0) % 1.9); src.stop(t + dur + 0.05); } };
    };

    /* ---- kick: every quarter note */
    for (let i = 0; i < DUR / BEAT; i++) {
      const t = i * BEAT;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.0, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.45);
      const ck = noise(t, 0.012, drums, { type: 'highpass', freq: 2500, offset: i * 0.013 });
      ck.g.gain.setValueAtTime(0.35, t); ck.g.gain.exponentialRampToValueAtTime(0.001, t + 0.012); ck.start();
    }
    /* ---- hats: offbeat 8ths from 4 s, 16ths from 30 s to 52 s */
    for (let s = 0; s < DUR / 0.125; s++) {
      const t = s * 0.125, pos = s % 4;
      let on = false, vel = 0;
      if (t >= 4 && pos === 2) { on = true; vel = 0.22; }
      if (t >= 30 && t < 52 && (pos === 1 || pos === 3)) { on = true; vel = 0.09; }
      if (!on || t >= 59.9) continue;
      const open = t >= 18 && t < 52 && pos === 2 && Math.floor(t / 0.5) % 2 === 1;
      const h = noise(t, open ? 0.2 : 0.05, drums, { type: 'highpass', freq: 7600, offset: s * 0.037 });
      h.g.gain.setValueAtTime(vel, t); h.g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.18 : 0.045)); h.start();
    }
    /* ---- clap on beats 2 & 4 from 10 s */
    for (let i = 0; i < DUR / BEAT; i++) {
      const t = i * BEAT;
      if (t < 10 || i % 2 === 0 || t >= 59.9) continue;
      for (let k = 0; k < 3; k++) {
        const tt = t + k * 0.011;
        const c = noise(tt, 0.12, drums, { type: 'bandpass', freq: 1300, q: 1.2, offset: i * 0.071 + k * 0.2 });
        c.g.gain.setValueAtTime(k === 2 ? 0.32 : 0.18, tt); c.g.gain.exponentialRampToValueAtTime(0.001, tt + (k === 2 ? 0.12 : 0.012)); c.start();
      }
    }
    /* ---- sub drone (0–10 s), then rolling 16th bass */
    {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(26); // D1
      const g = ctx.createGain(); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.32, 1.5); g.gain.setValueAtTime(0.32, 9.0); g.gain.linearRampToValueAtTime(0, 10.2);
      o.connect(g); g.connect(music); o.start(0); o.stop(10.3);
    }
    for (let s = 0; s < DUR / 0.125; s++) {
      const t = s * 0.125, pos = s % 4;
      if (t < 6 || t >= 59.9) continue;
      const rolling = t >= 10;
      if (!rolling && pos !== 2) continue; // offbeat 8ths in the build (6–10 s)
      if (rolling && pos === 0) continue; // leave the downbeat to the kick
      const ch = chordAt(t);
      const m = ch.root + (rolling && pos === 3 && (s >> 2) % 4 === 3 ? 12 : 0);
      const f = mtof(m);
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = f / 2;
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 6;
      const peak = t >= 30 && t < 52 ? 1500 : 950;
      flt.frequency.setValueAtTime(160, t); flt.frequency.exponentialRampToValueAtTime(peak, t + 0.012); flt.frequency.exponentialRampToValueAtTime(190, t + 0.11);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.26, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.115);
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      o1.connect(flt); o2.connect(g2); g2.connect(flt); flt.connect(g); g.connect(music);
      o1.start(t); o2.start(t); o1.stop(t + 0.13); o2.stop(t + 0.13);
    }
    /* ---- pad: detuned saws per chord, filter opening with the acts */
    for (let c = 0; c < DUR / 4; c++) {
      const t = c * 4, ch = chordAt(t);
      const end = Math.min(DUR, t + 4.25);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 0.8;
      const cut = t < 4 ? 500 : t < 10 ? 800 : t < 30 ? 1100 : t < 52 ? 1500 : 2600;
      flt.frequency.setValueAtTime(cut * 0.7, t); flt.frequency.linearRampToValueAtTime(cut, t + 2);
      const g = ctx.createGain(); const lvl = t < 4 ? 0.05 : t >= 52 ? 0.11 : 0.075;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + 0.6); g.gain.setValueAtTime(lvl, end - 0.45); g.gain.linearRampToValueAtTime(0.0001, end);
      flt.connect(g); g.connect(music);
      const tones = ch.tones.concat([ch.root + 24]);
      for (const m of tones) for (const det of [-7, 7]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(flt); o.start(t); o.stop(end);
      }
    }
    /* ---- 16th arp (18–56 s), plucky, into the ping-pong delay */
    for (let s = 0; s < DUR / 0.125; s++) {
      const t = s * 0.125;
      if (t < 18 || t >= 56) continue;
      const ch = chordAt(t), seq = [0, 1, 2, 3, 2, 1, 0, 2];
      const idx = seq[s % 8];
      const m = idx === 3 ? ch.tones[0] + 12 : ch.tones[idx] + 12;
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = mtof(m); o2.detune.value = 5;
      const g = ctx.createGain(); const v = (s % 4 === 0 ? 0.075 : 0.05) * (t >= 30 && t < 52 ? 1.15 : 1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 2800; const g2 = ctx.createGain(); g2.gain.value = 0.25;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(flt); flt.connect(music); flt.connect(delayIn);
      o.start(t); o2.start(t); o.stop(t + 0.16); o2.stop(t + 0.16);
    }
    /* ---- radar ping-sweeps on phase transitions */
    PINGS.forEach((t, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(2640, t + 0.07); o.frequency.exponentialRampToValueAtTime(1760, t + 0.16);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      const pan = ctx.createStereoPanner(); pan.pan.value = i % 2 ? 0.35 : -0.35;
      o.connect(g); g.connect(pan); pan.connect(master); pan.connect(delayIn); pan.connect(verb);
      o.start(t); o.stop(t + 1);
    });
    /* ---- risers into each act change + sub-bass impacts */
    ACT_HITS.forEach((t) => {
      const rise = 2.0;
      if (t - rise >= 0) {
        const r = noise(t - rise, rise, music, { type: 'bandpass', freq: 400, q: 1.4, sweep: [300, 7000], offset: t * 0.11 });
        r.g.gain.setValueAtTime(0.0001, t - rise); r.g.gain.exponentialRampToValueAtTime(0.16, t - 0.02); r.g.gain.linearRampToValueAtTime(0.0001, t); r.start();
      }
      const big = t === 56 ? 1.15 : 1;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75 * big, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      o.connect(g); g.connect(drums); o.start(t); o.stop(Math.min(DUR, t + 1.9));
      const w = noise(t, 1.2, verb, { type: 'lowpass', freq: 1800, sweep: [5000, 200], offset: t * 0.07 });
      w.g.gain.setValueAtTime(0.4 * big, t); w.g.gain.exponentialRampToValueAtTime(0.001, t + 1.2); w.start();
    });
  }

  function floatToWav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, bytes = n * ch * 2;
    const ab = new ArrayBuffer(44 + bytes), dv = new DataView(ab);
    const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); dv.setUint32(4, 36 + bytes, true); wr(8, 'WAVE'); wr(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, buf.sampleRate, true);
    dv.setUint32(28, buf.sampleRate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
    wr(36, 'data'); dv.setUint32(40, bytes, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let peak = 0; for (const d of data) for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    const gain = peak > 0 ? Math.min(4, 0.891 / peak) : 1; // normalise to −1 dBFS
    const rnd = L.rng(44100);
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
      const dither = (rnd() - rnd()) / 32768; // TPDF, seeded
      let v = data[c][i] * gain + (i < n - 1 ? dither : 0); // final sample exactly 0
      v = Math.max(-1, Math.min(1, v));
      dv.setInt16(o, v < 0 ? v * 32768 : v * 32767, true); o += 2;
    }
    return ab;
  }

  let cached = null;
  L.audio = {
    SR, DUR,
    /** Render the soundtrack. Resolves to an AudioBuffer (2 ch, 44.1 kHz, 2,646,000 frames). */
    render() {
      if (cached) return cached;
      const ctx = new OfflineAudioContext(2, SR * DUR, SR);
      build(ctx);
      cached = ctx.startRendering();
      return cached;
    },
    wav: floatToWav,
    async wavBase64() {
      const ab = floatToWav(await this.render());
      const u8 = new Uint8Array(ab); let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    },
  };
})();

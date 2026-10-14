/* LInOG explainer — timeline runtime.
 * window.seek(t[, {subframes, shutter}]) draws the frame at time t (seconds) deterministically.
 * Scenes register with LINOG.scene({...}); see SCENE_GUIDE.md for the contract.
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, W = L.W, H = L.H;
  const scenes = L.scenes; // filled by scene files via LINOG.scene() (defined in core.js)

  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  const canvas = document.getElementById('stage');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const measureCtx = L.canvas(8, 8).getContext('2d');

  function sceneAt(t) {
    for (const s of scenes) if (t >= s.t0 && t < s.t1) return s;
    return scenes[scenes.length - 1];
  }
  function makeEnv(sc, t, handoff, c) {
    const lt = t - sc.t0;
    const cam = L.cam(t, typeof sc.focus === 'function' ? sc.focus(lt) : sc.focus);
    return {
      t, lt, dur: sc.t1 - sc.t0, t0: sc.t0, t1: sc.t1, scene: sc, cam, handoff,
      beat: L.beat(t), pulse: L.pulse(t), W, H, ctx: c, measure: measureCtx,
      tlDrawn: false, tl: null,
      /** Draw the through-line now (screen space) — call from draw() to control z-order. */
      drawTL() { if (this.tl) { L.TL.draw(c, this.tl); this.tlDrawn = true; } },
    };
  }
  // Handoff = previous scene's TL state at its own end time, measured at runtime (cached; pure).
  const handoffs = new Map();
  function handoffFor(i) {
    if (i <= 0) return null;
    const key = scenes[i].id;
    if (handoffs.has(key)) return handoffs.get(key);
    const prev = scenes[i - 1];
    // measure just inside the outgoing act, so env.cam is that act's final camera (L.cam(t1) already belongs to the next act)
    const env = makeEnv(prev, prev.t1 - 1e-6, handoffFor(i - 1), measureCtx);
    let st = null;
    try {
      st = prev.tl ? L.TL.state(prev.tl(env)) : null;
      if (st) { // phase velocity at the cut, so the incoming act can carry the wave's motion through it
        const e2 = makeEnv(prev, prev.t1 - 1 / 60 - 1e-6, handoffFor(i - 1), measureCtx);
        st.phaseRate = (st.phase - L.TL.state(prev.tl(e2)).phase) * 60;
      }
    } catch (e) { console.error('handoff', prev.id, e); }
    handoffs.set(key, st);
    return st;
  }
  /* Phase carry: an incoming act's own phase usually differs in value and speed from the hand-off.
   * For CARRY_T s after a cut we add c(lt) = (c0 + dv·lt)·(1 − smoother(lt/T)): continuous value and
   * velocity at the cut, exactly the act's own phase from T on. c0 is wrapped by the form's visual period. */
  const CARRY_T = 1.0, PERIOD = { pulse: L.TAU, node: L.TAU, fringe: L.TAU, pixel: 2 * L.TAU, ring: 2 * L.TAU };
  const carries = new Map();
  function carryFor(i) {
    const sc = scenes[i], key = sc.id;
    if (carries.has(key)) return carries.get(key);
    const h = handoffFor(i);
    let c = null;
    if (h && sc.tl) {
      const P = PERIOD[L.TL.dominant(h)];
      if (P) {
        const s0 = L.TL.state(sc.tl(makeEnv(sc, sc.t0, h, measureCtx)));
        const s1 = L.TL.state(sc.tl(makeEnv(sc, sc.t0 + 1 / 60, h, measureCtx)));
        let c0 = h.phase - s0.phase; c0 -= P * Math.round(c0 / P);
        c = { c0, dv: (h.phaseRate || 0) - (s1.phase - s0.phase) * 60 };
      }
    }
    carries.set(key, c);
    return c;
  }
  L.handoffFor = (id) => handoffFor(scenes.findIndex((s) => s.id === id));

  const errors = [];
  L.errors = errors;

  /* Spotlight compositing (see LINOG.spot in core.js). One quarter-resolution overlay: the frame, defocused (downscale +
   * small blur) and dimmed, with the target rectangles cut out through a feathered mask, drawn back over the sharp frame
   * with opacity k. Two full-frame passes only (read down, write up); the target region keeps the untouched sharp pixels.
   * Scratch canvas reused; the result is a pure function of the frame. */
  const SP = {};
  function applySpot(c, m, k) {
    if (!SP.s) SP.s = L.canvas(W / 4, H / 4);
    const sx = SP.s.getContext('2d');
    sx.save();
    sx.globalCompositeOperation = 'copy'; sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
    sx.filter = 'blur(2.5px)'; sx.drawImage(c.canvas, 0, 0, W / 4, H / 4); sx.filter = 'none';
    sx.globalCompositeOperation = 'source-atop'; sx.fillStyle = 'rgba(3,6,12,0.6)'; sx.fillRect(0, 0, W / 4, H / 4);
    sx.globalCompositeOperation = 'destination-out'; sx.filter = 'blur(5px)'; sx.fillStyle = '#000';
    sx.beginPath();
    for (const q of m) sx.roundRect((q.x - q.pad) / 4, (q.y - q.pad) / 4, (q.w + 2 * q.pad) / 4, (q.h + 2 * q.pad) / 4, q.r / 4);
    sx.fill();
    sx.restore();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low'; // bilinear is enough for an already-blurred layer (4× cheaper than 'high')
    c.globalAlpha = k; c.drawImage(SP.s, 0, 0, W, H);
    c.restore();
  }

  function drawFrame(c, t) {
    L.resetLayout();
    c.reset(); // clears pixels AND the save/restore stack, so a scene error can never leak state
    L.bg.draw(c, t);
    const i = scenes.indexOf(sceneAt(t));
    const sc = scenes[i];
    let env = null, spot = null;
    if (sc) {
      L._sceneId = sc.id;
      env = makeEnv(sc, t, handoffFor(i), c);
      try {
        env.tl = sc.tl ? L.TL.state(sc.tl(env)) : null;
        if (env.tl && i > 0 && env.lt < CARRY_T) {
          const cr = carryFor(i);
          if (cr) env.tl.phase += (cr.c0 + cr.dv * env.lt) * (1 - L.smoother(env.lt / CARRY_T));
        }
        // cut accent, locked to the soundtrack's act impacts: the TL flares and sheds one hairline shock ring
        let cut = 0;
        if (env.tl && i > 0 && env.lt < 0.75) {
          cut = (1 - Math.exp(-env.lt / 0.02)) * Math.exp(-env.lt / 0.16);
          env.tl.energy += 1.3 * cut;
        }
        c.save(); env.cam.apply(c);
        sc.draw(c, env);
        c.restore();
        if (!env.tlDrawn && env.tl) L.TL.draw(c, env.tl);
        if (env.tl && i > 0 && env.lt < 0.75) {
          const k = L.ease.outCubic(env.lt / 0.75), col = L.mix(C.cyan, C.crimson, L.TL.weight(env.tl, 'contour'));
          c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
          c.strokeStyle = L.css(col, 0.55 * (1 - k) * Math.min(1, env.lt / 0.03)); c.lineWidth = 1.5;
          c.beginPath(); c.arc(env.tl.x, env.tl.y, env.tl.size * (0.9 + 2.4 * k), 0, L.TAU); c.stroke();
          c.restore();
        }
        if (sc.overlay) { c.save(); sc.overlay(c, env); c.restore(); }
        // VO spotlight: dim + defocus everything but the data point the narration names
        const sp = L.spot.at(t);
        if (sp) {
          const m = L.spot.marks.get(sp.target);
          spot = { cue: sp.id, target: sp.target, k: sp.k, found: !!m };
          if (m && sp.k > 0.004) applySpot(c, m, sp.k);
        }
      } catch (e) {
        const msg = `${sc.id} @ ${t.toFixed(3)}s: ${e && e.message}`;
        if (errors.length < 50 && !errors.includes(msg)) { errors.push(msg); console.error(msg, e); }
        c.reset(); L.bg.draw(c, t);
        c.fillStyle = '#EF4444'; c.font = '600 28px monospace'; c.fillText('SCENE ERROR: ' + msg, 120, 540);
      }
      L._sceneId = 'hud';
    }
    L.hud.draw(c, t);
    L.bg.post(c, t);
    // the picture fades to black over the last three seconds (the music drops out under it in audio.js)
    if (t > L.FADE[0]) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = `rgba(0,0,0,${L.ease.inOutSine((t - L.FADE[0]) / (L.FADE[1] - L.FADE[0])).toFixed(5)})`;
      c.fillRect(0, 0, W, H); c.restore();
    }
    if (env) env.spot = spot;
    return env;
  }

  let accum = null;
  /** Deterministic frame draw. opts.subframes > 1 averages that many samples across opts.shutter (fraction of a 1/60 s frame). */
  window.seek = function (t, opts = {}) {
    t = Math.max(0, Math.min(L.DURATION - 1e-6, +t || 0));
    const t0 = performance.now();
    const n = Math.max(1, opts.subframes | 0), shutter = opts.shutter === undefined ? 0.5 : opts.shutter;
    let env;
    if (n === 1) env = drawFrame(ctx, t);
    else {
      if (!accum) { accum = L.canvas(W, H); }
      const actx = accum.getContext('2d', { alpha: false });
      // running average: sample k is composited with weight 1/(k+1); samples span [t, t + shutter/FPS)
      for (let k = n - 1; k >= 0; k--) {
        const ts = Math.min(L.DURATION - 1e-6, t + (k / n) * (shutter / (opts.fps || L.FPS)));
        env = drawFrame(actx, ts);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 / (n - k);
        ctx.drawImage(accum, 0, 0);
      }
      ctx.globalAlpha = 1; // the last sample drawn is t itself, so the layout registry matches the nominal time
    }
    const msJs = performance.now() - t0;
    if (opts.measure) ctx.getImageData(0, 0, 1, 1); // forces Chromium to rasterise the recorded commands
    const info = {
      t, scene: env && env.scene.id, ms: msJs, msRaster: performance.now() - t0,
      tl: env && env.tl ? { x: env.tl.x, y: env.tl.y, size: env.tl.size, form: env.tl.form, to: env.tl.to, k: env.tl.k, alpha: env.tl.alpha } : null,
      layout: { text: L.LAYOUT.text.slice(), panels: L.LAYOUT.panels.slice() },
      typo: L.LAYOUT.typo.slice(), spot: env ? env.spot : null,
    };
    window.__frame = info;
    return info;
  };

  /** Small thumbnail of the current canvas for QA diffs (192×108 RGBA, as a plain array). */
  const thumb = L.canvas(192, 108), tctx = thumb.getContext('2d', { willReadFrequently: true });
  window.__thumb = () => { tctx.drawImage(canvas, 0, 0, 192, 108); return Array.from(tctx.getImageData(0, 0, 192, 108).data); };

  /* ---------------------------------------------------------------- readiness */
  const FACES = ['700 40px "LInOG Display"', '500 40px "LInOG Display"', '400 40px "LInOG Sans"', '500 40px "LInOG Sans"', '600 40px "LInOG Sans"', '700 40px "LInOG Sans"', '400 40px "LInOG Mono"', '600 40px "LInOG Mono"'];
  window.ready = (async () => {
    await Promise.all(FACES.map((f) => document.fonts.load(f, 'AaΔλ°0')));
    await document.fonts.ready;
    const missing = FACES.filter((f) => !document.fonts.check(f, 'Aa'));
    window.__fontsMissing = missing;
    // logos + real-data images: decode every asset before the first frame, so drawing them is synchronous and pure
    const assetsMissing = [];
    await Promise.all(Object.entries(L.ASSET_SRC || {}).map(async ([name, src]) => {
      const im = new Image(); im.src = src;
      try {
        await im.decode();
        // keep a canvas copy, not the <img>: Chromium caches scaled decodes of <img> sources, so a downscaled drawImage
        // could differ depending on which sizes were drawn before (seek-order dependent); canvas sources are not cached
        const cv = L.canvas(im.naturalWidth, im.naturalHeight);
        cv.getContext('2d').drawImage(im, 0, 0);
        L.IMG[name] = cv;
      } catch (e) { assetsMissing.push(name); }
    }));
    if (L.real) L.real.init();
    // warm caches (pure) so the first frame is not slow
    for (let i = 0; i < scenes.length; i++) handoffFor(i);
    for (const s of scenes) if (s.init) { try { s.init(); } catch (e) { errors.push(`${s.id} init: ${e.message}`); } }
    window.seek(0);
    return { scenes: scenes.map((s) => [s.id, s.t0, s.t1]), fontsMissing: missing, assetsMissing };
  })();

  /* ---------------------------------------------------------------- preview player (not used when ?render) */
  if (!RENDER) {
    const ui = document.getElementById('ui');
    if (ui) ui.style.display = 'flex';
    const bar = document.getElementById('scrub'), lab = document.getElementById('time'), btn = document.getElementById('play');
    let playing = false, ac = null, src = null, startAt = 0, offset = 0, raf = 0;
    const show = (t) => { window.seek(t); if (bar) bar.value = String(t); if (lab) lab.textContent = `${t.toFixed(2)} s · bar ${Math.floor(t / 2) + 1}/30`; };
    const loop = () => { const t = offset + (ac.currentTime - startAt); if (t >= L.DURATION) { stop(); show(L.DURATION - 1e-6); return; } show(t); raf = requestAnimationFrame(loop); };
    async function play() {
      if (playing) return;
      btn.textContent = '…';
      const buf = await L.audio.render();
      ac = ac || new AudioContext();
      src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
      if (offset >= L.DURATION - 0.05) offset = 0;
      startAt = ac.currentTime + 0.05; src.start(startAt, offset);
      playing = true; btn.textContent = 'Pause'; raf = requestAnimationFrame(loop);
    }
    function stop() { if (!playing) return; offset = Math.min(L.DURATION, offset + (ac.currentTime - startAt)); src.stop(); playing = false; cancelAnimationFrame(raf); btn.textContent = 'Play'; }
    btn && btn.addEventListener('click', () => (playing ? stop() : play()));
    bar && bar.addEventListener('input', () => { if (playing) stop(); offset = +bar.value; show(offset); });
    window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); } if (e.code === 'ArrowRight') { stop(); offset = Math.min(59.99, offset + 0.5); show(offset); } if (e.code === 'ArrowLeft') { stop(); offset = Math.max(0, offset - 0.5); show(offset); } });
    // drop a recorded vo.wav (or a music.wav named so) onto the page to hear it mixed with the score
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (!f || !L.audio || !L.audio.setVO) return;
      stop(); if (btn) { btn.disabled = true; btn.textContent = /music/i.test(f.name) ? 'Mixing music…' : 'Mixing VO…'; }
      const buf = await f.arrayBuffer();
      if (/music/i.test(f.name) && L.audio.setMusic) await L.audio.setMusic(buf); else await L.audio.setVO(buf);
      await L.audio.render();
      if (btn) { btn.disabled = false; btn.textContent = 'Play'; }
    });
    const fit = () => { const s = Math.min(window.innerWidth / W, (window.innerHeight - 56) / H); canvas.style.width = `${W * s}px`; canvas.style.height = `${H * s}px`; };
    window.addEventListener('resize', fit); fit();
    const t0 = parseFloat(params.get('t') || '0');
    window.ready.then(() => {
      offset = t0; show(t0);
      // warm the soundtrack in the background (the offline render takes a while) so Play starts instantly
      if (btn) { btn.textContent = 'Preparing audio…'; btn.disabled = true; }
      L.audio.render().then(() => { if (btn) { btn.disabled = false; btn.textContent = 'Play'; } });
    });
  }
})();

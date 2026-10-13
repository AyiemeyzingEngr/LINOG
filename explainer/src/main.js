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
    try { st = prev.tl ? L.TL.state(prev.tl(env)) : null; } catch (e) { console.error('handoff', prev.id, e); }
    handoffs.set(key, st);
    return st;
  }
  L.handoffFor = (id) => handoffFor(scenes.findIndex((s) => s.id === id));

  const errors = [];
  L.errors = errors;
  function drawFrame(c, t) {
    L.resetLayout();
    c.reset(); // clears pixels AND the save/restore stack, so a scene error can never leak state
    L.bg.draw(c, t);
    const i = scenes.indexOf(sceneAt(t));
    const sc = scenes[i];
    let env = null;
    if (sc) {
      L._sceneId = sc.id;
      env = makeEnv(sc, t, handoffFor(i), c);
      try {
        env.tl = sc.tl ? L.TL.state(sc.tl(env)) : null;
        c.save(); env.cam.apply(c);
        sc.draw(c, env);
        c.restore();
        if (!env.tlDrawn && env.tl) L.TL.draw(c, env.tl);
        if (sc.overlay) { c.save(); sc.overlay(c, env); c.restore(); }
      } catch (e) {
        const msg = `${sc.id} @ ${t.toFixed(3)}s: ${e && e.message}`;
        if (errors.length < 50 && !errors.includes(msg)) { errors.push(msg); console.error(msg, e); }
        c.reset(); L.bg.draw(c, t);
        c.fillStyle = '#EF4444'; c.font = '600 28px monospace'; c.fillText('SCENE ERROR: ' + msg, 120, 540);
      }
      L._sceneId = 'hud';
    }
    L.hud.draw(c, t);
    L.bg.post(c);
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
        const ts = Math.min(L.DURATION - 1e-6, t + (k / n) * (shutter / L.FPS));
        env = drawFrame(actx, ts);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 / (n - k);
        ctx.drawImage(accum, 0, 0);
      }
      ctx.globalAlpha = 1; // the last sample drawn is t itself, so the layout registry matches the nominal time
    }
    const info = {
      t, scene: env && env.scene.id, ms: performance.now() - t0,
      tl: env && env.tl ? { x: env.tl.x, y: env.tl.y, size: env.tl.size, form: env.tl.form, to: env.tl.to, k: env.tl.k, alpha: env.tl.alpha } : null,
      layout: { text: L.LAYOUT.text.slice(), panels: L.LAYOUT.panels.slice() },
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
    // warm caches (pure) so the first frame is not slow
    for (let i = 0; i < scenes.length; i++) handoffFor(i);
    for (const s of scenes) if (s.init) { try { s.init(); } catch (e) { errors.push(`${s.id} init: ${e.message}`); } }
    window.seek(0);
    return { scenes: scenes.map((s) => [s.id, s.t0, s.t1]), fontsMissing: missing };
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
    const fit = () => { const s = Math.min(window.innerWidth / W, (window.innerHeight - 56) / H); canvas.style.width = `${W * s}px`; canvas.style.height = `${H * s}px`; };
    window.addEventListener('resize', fit); fit();
    const t0 = parseFloat(params.get('t') || '0');
    window.ready.then(() => { offset = t0; show(t0); });
  }
})();

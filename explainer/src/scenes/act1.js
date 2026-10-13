/* Act 1 — STUB (replace). */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C;
  L.scene({
    id: 'act1', t0: 0, t1: 10,
    tl(env) {
      const target = { x: 960 + 300 * Math.sin(env.lt), y: 540, size: 110, form: 'pulse', phase: env.t * 6, energy: 0.4 + 0.6 * env.pulse };
      return env.handoff ? L.TL.blend(env.handoff, target, L.sp(env.lt, 0, 1.0)) : target;
    },
    draw(ctx, env) {
      const p = L.inout(env.lt, 0, env.dur, 0.6, 0.6);
      L.text(ctx, 'ACT 1 STUB · ' + env.lt.toFixed(2), 960, 300, { kind: 'display', size: 64, weight: 700, align: 'center', p });
    },
  });
})();

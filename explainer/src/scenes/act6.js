/* Act 6 · Institutional payoff & outro (52–60 s) — bars 27–30, HUD gone (full title-safe frame).
 *
 * Beat plan (lt = t − 52 s; 1 beat = 0.5 s; camera sections [52,56] and [56,60] push ×1.04 each).
 * Every reveal starts on a quarter note (16th staggers only inside a group).
 *  A · EMBLEM (bars 27–28, 52–56)
 *   0.0  HIT. Two crimson echoes of the hand-off contour ring out from where it stands (shockwave).
 *        The contour whips to the emblem centre while it spins (1.5 turns, near-critically damped: no settle
 *        wobble) and CONTRACTS to 0.5 × its hand-off size, morphing contour → ring; crimson → white-hot.
 *   0.5  white-hot peak (smallest, brightest). The ring is RELEASED out to its orbit radius and cools to cyan.
 *        Geodetic reticle draws on around it. Satellite dot steps along the orbit on every beat (whole act).
 *   1.0  the TL now IS ring 0 of the EGG emblem (rx 1.02 r, ry 0.3 r, rot −0.42); L.drawEGG (PLACEHOLDER mark)
 *        constructs around it: gold ring draws on, egg body unmasks on scanlines.
 *   1.5  label scans in: "UP NIGS · Earthquake Geodesy and Geology (EGG) Laboratory" (readable 1.65–4.0).
 *   2.0  bar 28: gold satellite grows in; the rings tuck BEHIND the egg on their far side (depth); orbital
 *        ripple; reticle beat cursor grows in; band colours step on the beat.
 *  B · END CARD (bars 29–30, 56–60)
 *   4.0  HIT. Label wipes out toward the mark, reticle collapses into the ring, strong orbital ripple + ring
 *        flash; the emblem (with the TL ring) springs left into the lockup.
 *   4.5  "Project LInOG" scans in (the mark has cleared the title area: move k ≈ 0.95).
 *   5.0  tagline + accent rule + divider; L / In / O / G underlines on 16ths; IMPLEMENTING AGENCY (+1/16).
 *   5.5  FUNDED BY · DOST-PCIEERD, SUPPORTING · DOST-PHIVOLCS & PhilSA (+1/16), footer (screen space).
 *   6.0  bar 30: all revealed (readable ≥ 2 s before the cut). Motion continues: satellites step on the beat
 *        (passing behind the egg), token underline chases the beat (L → In → O → G), ripple, camera push.
 *        Last frame 59.983 s = full end card; the TL stays the logo ring (no fade — the 60.00 s cut ends it).
 */
(function () {
  'use strict';
  const L = window.LINOG, C = L.C, TAU = Math.PI * 2;
  const lerp = L.lerp, clamp = L.clamp;

  /* ------------------------------------------------------------ L.drawEGG internals this act mirrors
   * (assets.js; the emblem is a PLACEHOLDER). init() verifies them against drawEGG's source and reports a
   * scene error (→ QA issue) if assets.js changes, so the "TL is ring 0" match can never break silently. */
  const EGG = {
    rings: [
      { rx: 1.02, ry: 0.3, rot: -0.42, speed: 1.2, phase: 0 },  // ring 0 (cyan) = the TL
      { rx: 1.10, ry: 0.3, rot: 0.42, speed: -1.6, phase: 1 },  // ring 1 (gold)
    ],
    // drawEGG draws ring k's dot once clamp(p·1.4 − 0.2k) ≥ 1. p ≤ pMax keeps ring 1's dot hidden (this act
    // draws that satellite itself so it can grow in) while ring 1 is still drawn to 99.9995 % of its length.
    pMax: 0.85714,
  };
  const EGG_SIG = [ // whitespace-free fragments of L.drawEGG that the constants above depend on
    'r*0.62*(1+0.1*Math.sin(th))', 'Math.cos(th)*rr*0.86', 'L.clamp(p*1.6-0.3)',
    'createRadialGradient(-r*0.2,-r*0.25,r*0.05,0,0,r*0.7)', "'#1F3B57'", "'#0F1D30'",
    'L.css(L.fringeRGB(i*0.9+t*0.6),0.55)', 'yy=i*r*0.13', 'ctx.moveTo(-r,yy-r*0.05);ctx.lineTo(-r*0.05,yy)',
    'ctx.moveTo(r*0.05,yy+r*0.07);ctx.lineTo(r,yy+r*0.12)', 'ctx.moveTo(-r*0.12,-r);ctx.lineTo(r*0.12,r)',
    'L.clamp(p*1.4-k*0.2)', 'k===0?-0.42:0.42', 'rx=r*(1.02+k*0.08),ry=r*0.3', 't*(k?-1.6:1.2)+k', 'if(pk>=1)',
  ];
  let EGG_OK = true;
  const RING0 = EGG.rings[0], RING1 = EGG.rings[1];

  /* ------------------------------------------------------------ geometry (single source of truth) */
  const R_A = 184, R_B = 176;                      // emblem radius (world px): hero (A) → lockup (B)
  const A_POS = [960, 492];                        // section A emblem centre (world)
  const B_POS = [420, 532];                        // section B lockup emblem centre (world)
  const SPIN_M = 3;                                // spin: 1.5 turns (odd multiple of π: ellipse is π-symmetric)
  const ROT_F = RING0.rot - SPIN_M * Math.PI;      // final TL rot (same ellipse as ring 0)
  const SQ = 0.5;                                  // contraction on the 52 s hit (× hand-off size)
  const OMEGA = TAU / 10;                          // TL satellite step per beat (rad, ring parameter)
  const OMEGA1 = -0.84, A1_0 = 5.76;               // gold satellite: contra-rotating step per beat, start angle
  const RET_K = 1.3;                               // geodetic reticle radius / emblem radius
  const DEPTH_W = 11;                              // screen px half-width of the "behind the egg" band (covers the TL halo)

  // end card text column (section B, world)
  const X0 = 720, DIV_X = 660, Y_T = 405;
  const Y_S = Y_T + 74, Y_RULE = Y_S + 34, Y_L1 = Y_S + 108, Y_V1 = Y_L1 + 40, Y_L2 = Y_V1 + 62, Y_V2 = Y_L2 + 40;
  // Brief copy (storyboard). Flagged to the brief owner: the report says "sub-centimetre precision" — see known issues.
  const TAGLINE = 'Measuring mm-scale crustal movements from space';

  /* ------------------------------------------------------------ timing (pure functions of lt) */
  const kB = (lt) => L.sp(lt, 4.0, 0.8);                  // A → B lockup move (56 s hit)
  const travelK = (lt) => L.sp(lt, 0, 0.7);               // hand-off position → emblem centre
  const morphK = (lt) => L.sp(lt, 0, 0.6);                // contour → ring
  const squeezeK = (lt) => L.sp(lt, 0, 0.5);              // contract to SQ × hand-off size (peak on the 52.5 beat)
  const releaseK = (lt) => L.sp(lt, 0.5, 0.9);            // release out to the orbit radius from the 52.5 beat
  // Rotation only: near-critically damped (ζ 0.97, overshoot ~4e-6 of 9.8 rad) so the mark does not drift back
  // ~6° while it constructs. Position/size/morph/reveals keep ζ 0.82 (L.sp).
  const spinK = (lt) => L.spring(lt, 0.95, 0.97);
  const hotK = (lt) => L.inout(lt, 0, 1.3, 0.45, 0.8);    // white-hot energy envelope (peak ≈ 0.5)
  const steps = (lt) => L.steps(lt, 0.5, 0.35);
  const eggP = (lt) => L.sp(lt, 1.0, 1.4);
  const depthK = (lt) => L.sp(lt, 2.0, 0.5);              // rings tuck behind the egg (bar 28)

  const emblemAt = (lt) => {
    const k = kB(lt);
    return { x: lerp(A_POS[0], B_POS[0], k), y: lerp(A_POS[1], B_POS[1], k), r: lerp(R_A, R_B, k), k };
  };
  const rotAt = (lt, h) => lerp(h ? h.rot || 0 : 0, ROT_F, spinK(lt));
  // TL ring parameter of its satellite dot (L.TL draws it at th = phase / 2)
  const dotTh = (lt, h) => (h ? (h.phase || 0) / 2 : 0) + OMEGA * steps(lt);
  // drawEGG time so that ITS ring-0 dot sits exactly under the TL dot (the extra SPIN_M·π flips the parameter by π)
  const eggT = (lt, h) => (dotTh(lt, h) + SPIN_M * Math.PI - RING0.phase) / RING0.speed;
  const goldA = (lt) => A1_0 + OMEGA1 * steps(lt);

  function tlAt(lt, h, cam, pulse) {
    const E = emblemAt(lt), kb = clamp(E.k);
    const [ex, ey] = cam.toScreen(E.x, E.y);
    const ringS = RING0.rx * E.r * cam.z;
    const flash = L.inout(lt, 4.0, 5.3, 0.2, 1.0);       // ring flash on the 56 s hit
    const target = {
      x: ex, y: ey, size: ringS, form: 'ring', aspect: RING0.ry / RING0.rx, rot: ROT_F,
      phase: 2 * dotTh(lt, h),
      // section B: the halo eases down toward the crisp vector mark
      energy: lerp(0.4 + 0.35 * pulse, 0.25 + 0.2 * pulse, kb) + 0.45 * flash,
      lw: lerp(0.85, 0.75, kb), alpha: 1,
    };
    if (!h) return target;
    const mk = morphK(lt), mkc = clamp(mk);
    const st = L.TL.blend(h, target, mk);                 // form/colour/alpha morph; exactly h at lt = 0
    const kp = travelK(lt);
    st.x = lerp(h.x, ex, kp); st.y = lerp(h.y, ey, kp);
    st.size = lerp(lerp(h.size, SQ * h.size, squeezeK(lt)), ringS, releaseK(lt));
    st.rot = rotAt(lt, h);
    st.lw = lerp(h.lw === undefined ? 1 : h.lw, target.lw, mkc);
    st.energy = lerp(h.energy === undefined ? 0.5 : h.energy, target.energy, mkc) + 0.7 * hotK(lt);
    // colour: hand-off colour → white-hot (peak on the 52.5 beat) → cyan; st.form is blend's dominant hand-off form
    const c0 = h.tint || (st.form === 'contour' ? C.crimson : C.cyan);
    st.tint = L.mix(L.mix(c0, C.text, L.sp(lt, 0, 0.45)), C.cyan, L.sp(lt, 0.5, 0.6));
    return st;
  }

  /* ------------------------------------------------------------ small drawing helpers */
  // interlaced scanline reveal rows (same look as text 'scan'), added to the current path
  function scanRows(ctx, x, y, w, h, p) {
    const rowH = 3, rows = Math.max(1, Math.ceil(h / rowH));
    const f1 = clamp(p * 2), f2 = clamp(p * 2 - 1);
    for (let i = 0; i < rows; i++) {
      const fr = (i + 0.5) / rows;
      if (fr <= (i % 2 === 0 ? f1 : f2)) ctx.rect(x, y + i * rowH, w, rowH + 0.6);
    }
  }
  function scanBarAt(ctx, x, y, w, h, p, color, k = 1) {
    if (p <= 0 || p >= 1 || k <= 0) return;
    const f = p < 0.5 ? p * 2 : p * 2 - 1, yy = y + h * f, a = 0.8 * k * Math.sin(Math.PI * p);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = L.rgba(color, a); ctx.fillRect(x, yy - 1, w, 2);
    ctx.fillStyle = L.rgba(color, a * 0.22); ctx.fillRect(x, yy - 5, w, 10);
    ctx.restore();
  }
  const ellPt = (rx, ry, a) => [Math.cos(a) * rx, Math.sin(a) * ry];
  // comet tail behind a dot on an ellipse (in the ellipse's own frame)
  function orbitTail(ctx, rx, ry, a, span, dir, color, alpha) {
    if (alpha <= 0.01 || span <= 0.01) return;
    const n = 14;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const a0 = a - dir * span * (i / n), a1 = a - dir * span * ((i + 1) / n);
      const [x0, y0] = ellPt(rx, ry, a0), [x1, y1] = ellPt(rx, ry, a1);
      ctx.strokeStyle = L.rgba(color, alpha * Math.pow(1 - i / n, 1.6));
      ctx.lineWidth = 4.2 * (1 - 0.6 * (i / n));
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();
  }
  // measure prefix x-offsets of segments (for underlines / column alignment)
  function segOffsets(ctx, segs, o) {
    const out = []; let acc = '';
    for (const sg of segs) {
      const x0 = acc ? L.measure(ctx, acc, o).w + (o.tracking || 0) * o.size : 0;
      acc += sg;
      out.push([x0, L.measure(ctx, sg, o).w]);
    }
    return out;
  }
  // drawEGG's egg outline (mirrored; verified by init) — `grow` px outward
  function eggPath(ctx, r, grow = 0) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const th = (i / 96) * TAU, rr = r * 0.62 * (1 + 0.1 * Math.sin(th));
      const x = Math.cos(th) * (rr * 0.86 + grow), y = Math.sin(th) * (rr + grow);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  // drawEGG's egg body (fill, outline, geology bands, fault) — redrawn over the rings' far arcs for depth
  function eggBody(ctx, r, t, a) {
    ctx.save(); ctx.globalAlpha *= a;
    eggPath(ctx, r);
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 0.7);
    g.addColorStop(0, '#1F3B57'); g.addColorStop(1, '#0F1D30');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = L.rgba(C.cyan, 0.9); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.clip();
    for (let i = -4; i <= 4; i++) {
      const yy = i * r * 0.13;
      ctx.strokeStyle = L.css(L.fringeRGB(i * 0.9 + t * 0.6), 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r, yy - r * 0.05); ctx.lineTo(-r * 0.05, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.05, yy + r * 0.07); ctx.lineTo(r, yy + r * 0.12); ctx.stroke();
    }
    ctx.strokeStyle = L.rgba(C.crimson, 0.95); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.12, -r); ctx.lineTo(r * 0.12, r); ctx.stroke();
    ctx.restore();
  }
  // band around the FAR half (ring-frame y < 0) of each orbital ring, added to the current path (same winding → union)
  function farBands(ctx, R, w) {
    for (const rg of EGG.rings) {
      const ax = rg.rx * R, ay = rg.ry * R;
      ctx.save(); ctx.rotate(rg.rot);
      ctx.moveTo(-(ax + w), 0);
      ctx.ellipse(0, 0, ax + w, ay + w, 0, Math.PI, TAU, false);
      ctx.ellipse(0, 0, ax - w, ay - w, 0, TAU, Math.PI, true);
      ctx.closePath();
      ctx.restore();
    }
  }
  // how far "behind the egg" a point (emblem frame) on ring rg at parameter a is: 0 = in front / outside, 1 = hidden
  function occlusion(rg, R, a) {
    const [u, v] = ellPt(rg.rx * R, rg.ry * R, a);
    const c = Math.cos(rg.rot), s = Math.sin(rg.rot);
    const x = u * c - v * s, y = u * s + v * c;
    const q = (x / (0.535 * R)) ** 2 + (y / (0.66 * R)) ** 2;
    return clamp((1.12 - q) / 0.3) * clamp(-Math.sin(a) * 4);
  }

  /* ------------------------------------------------------------ scene */
  L.scene({
    id: 'act6', t0: 52, t1: 60,
    focus: [960, 540],

    init() {
      const src = String(L.drawEGG).replace(/\s+/g, '');
      const miss = EGG_SIG.filter((s) => !src.includes(s));
      if (miss.length) {
        EGG_OK = false; // falls back to a flat emblem; the TL ↔ ring-0 match may be off until EGG/eggBody are updated
        throw new Error(`L.drawEGG internals changed (${miss.join(' | ')}): update EGG / eggBody in act6.js`);
      }
    },

    tl(env) { return tlAt(env.lt, env.handoff, env.cam, env.pulse); },

    draw(ctx, env) {
      const lt = env.lt, h = env.handoff, cam = env.cam, pulse = env.pulse, tl = env.tl;
      const E = emblemAt(lt), kb = clamp(E.k);
      // the drawn emblem is derived from the TL (centre + ring-0 size) so the TL IS ring 0 at every frame
      const [X, Y] = cam.toWorld(tl.x, tl.y);
      const R = tl.size / (RING0.rx * cam.z);
      const dl = rotAt(lt, h) - ROT_F;                 // residual spin, carried by the whole mark
      const te = eggT(lt, h);
      const pE = eggP(lt), pEgg = Math.min(pE, EGG.pMax);
      const pScan = L.sp(lt, 1.0, 1.0);
      const outA = 1 - L.sp(lt, 4.0, 0.45);           // section-A-only elements unmask on the 56 s hit
      const dK = EGG_OK ? depthK(lt) * clamp(pEgg * 1.6 - 0.3) : 0;

      /* --- 52 s hit: crimson echoes ring out from the hand-off contour (screen space, where it stood) */
      if (h && lt < 1.25) {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        for (const [grow, dur, a0] of [[0.85, 1.0, 0.6], [0.45, 1.2, 0.4]]) {
          const a = a0 * L.sp(lt, 0, 0.15) * Math.pow(clamp(1 - lt / 1.25), 1.6);
          if (a < 0.01) continue;
          const { P } = L.TL.points({ ...h, size: h.size * (1 + grow * L.sp(lt, 0, dur)) });
          ctx.beginPath(); ctx.moveTo(P[0], P[1]);
          for (let i = 1; i < L.TL.N; i++) ctx.lineTo(P[i * 2], P[i * 2 + 1]);
          ctx.closePath();
          ctx.strokeStyle = L.rgba(C.crimson, a * 0.3); ctx.lineWidth = 7; ctx.stroke();
          ctx.strokeStyle = L.rgba(C.crimson, a); ctx.lineWidth = 1.6; ctx.stroke();
        }
        ctx.restore();
      }

      /* --- soft backlight behind the mark (beat-breathing) */
      L.glow(ctx, X, Y, R * 2.1, C.cyan, (0.10 + 0.05 * pulse) * clamp(pE * 1.4));

      /* --- geodetic reticle (section A): draws on from the 52.5 beat, ticks step on the beat, collapses at 56 s */
      const pRet = Math.min(L.sp(lt, 0.5, 1.2), outA);
      if (pRet > 0.002) {
        const RET_R = E.r * lerp(RING0.rx, RET_K, clamp(outA));
        ctx.save(); ctx.translate(X, Y);
        const spin = 0.04 * steps(lt);
        const span = TAU * clamp(pRet);
        ctx.lineWidth = 1.2; ctx.strokeStyle = L.rgba(C.cyan, 0.22);
        ctx.beginPath(); ctx.arc(0, 0, RET_R, -Math.PI / 2 + spin, -Math.PI / 2 + spin + span); ctx.stroke();
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * TAU;
          if (a > span) break;
          const ang = -Math.PI / 2 + spin + a, major = i % 6 === 0;
          const r0 = RET_R + (major ? 4 : 2), r1 = RET_R + (major ? 16 : 8);
          ctx.strokeStyle = L.rgba(C.cyan, major ? 0.42 : 0.2); ctx.lineWidth = major ? 1.6 : 1;
          ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); ctx.stroke();
        }
        // beat cursor: grows out of its tick from the 54 s downbeat, jumps one major division per beat
        const cg = clamp((pRet - 0.85) / 0.15) * clamp(L.sp(lt, 2.0, 0.4));
        if (cg > 0.002) {
          const cur = -Math.PI / 2 + spin + (TAU / 12) * steps(lt);
          ctx.strokeStyle = L.rgba(C.cyan, 0.75 * cg); ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.arc(0, 0, RET_R + 10, cur - 0.06 * cg, cur + 0.06 * cg); ctx.stroke();
        }
        ctx.restore();
      }

      /* --- orbital ripples on bar downbeats once the ring exists (the 56 s hit gets the big one) */
      for (const [b, grow, a0, life] of [[2, 0.75, 0.38, 1.9], [4, 0.85, 0.62, 1.5], [6, 0.75, 0.38, 1.9]]) {
        const age = lt - b;
        if (age <= 0 || age >= life) continue;
        const s = 1 + grow * L.sp(age, 0, life - 0.2), a = a0 * Math.pow(1 - age / life, 1.4);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(dl + RING0.rot);
        ctx.strokeStyle = L.rgba(C.cyan, a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, RING0.rx * R * s, RING0.ry * R * s, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }

      /* --- the EGG emblem (placeholder mark) constructs around the TL ring */
      if (pE > 0.001) {
        ctx.save();
        if (pScan < 1) { // egg region unmasks on scanlines; everything outside it (ring arcs) draws on freely
          const bx = X - 0.78 * R, by = Y - 0.78 * R, bw = 1.56 * R, bh = 1.56 * R, BIG = 4000;
          ctx.beginPath();
          ctx.rect(-BIG, -BIG, 2 * BIG, by + BIG);
          ctx.rect(-BIG, by + bh, 2 * BIG, BIG);
          ctx.rect(-BIG, by, bx + BIG, bh);
          ctx.rect(bx + bw, by, BIG, bh);
          scanRows(ctx, bx, by, bw, bh, pScan);
          ctx.clip();
        }
        ctx.translate(X, Y); ctx.rotate(dl);
        L.drawEGG(ctx, { x: 0, y: 0, r: R, p: pEgg, t: te });
        ctx.restore();
        if (pScan < 1) { // scan front, confined to the egg
          ctx.save(); ctx.translate(X, Y); ctx.rotate(dl); eggPath(ctx, R); ctx.clip(); ctx.rotate(-dl); ctx.translate(-X, -Y);
          scanBarAt(ctx, X - 0.78 * R, Y - 0.78 * R, 1.56 * R, 1.56 * R, pScan, C.cyan, clamp(pEgg * 1.6 - 0.3));
          ctx.restore();
        }

        // satellites: comet tail behind the TL dot (ring 0); gold satellite (ring 1) grows in on bar 28
        ctx.save(); ctx.translate(X, Y); ctx.rotate(dl);
        const lp = Math.max(0, lt - 0.3);
        ctx.save(); ctx.rotate(RING0.rot);
        const a0 = RING0.speed * te + RING0.phase, a0p = RING0.speed * eggT(lp, h) + RING0.phase;
        orbitTail(ctx, RING0.rx * R, RING0.ry * R, a0, clamp(a0 - a0p, 0.12, 1.1), 1, C.cyan, 0.5 * clamp(morphK(lt)));
        ctx.restore();
        const pk1 = clamp(pEgg * 1.4 - 0.2);
        const g = L.sp(lt, 2.0, 0.45) * clamp((pk1 - 0.9) * 10);
        if (g > 0.001) {
          const a1 = goldA(lt), a1p = goldA(lp);
          const vis = 1 - dK * occlusion(RING1, R, a1); // its glow fades as it passes behind the egg
          ctx.save(); ctx.rotate(RING1.rot);
          orbitTail(ctx, RING1.rx * R, RING1.ry * R, a1, clamp(a1p - a1, 0.12, 1.4), -1, C.gold, 0.5 * clamp(g));
          const [gx, gy] = ellPt(RING1.rx * R, RING1.ry * R, a1);
          ctx.fillStyle = C.gold;
          ctx.beginPath(); ctx.arc(gx, gy, 5.2 * clamp(g, 0, 1.05), 0, TAU); ctx.fill();
          L.glow(ctx, gx, gy, 26, C.gold, 0.35 * clamp(g) * vis * (0.6 + 0.4 * pulse));
          ctx.restore();
        }
        ctx.restore();
      }

      /* --- rotational smear while the contour spins into the ring (screen space, behind the TL) */
      if (h && lt < 1.6) {
        const w = Math.abs(rotAt(lt, h) - rotAt(Math.max(0, lt - 0.02), h)) / 0.02; // rad/s
        const sm = clamp(w / 9) * (1 - clamp((lt - 1.1) / 0.5));
        if (sm > 0.02) {
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
          for (let j = 1; j <= 4; j++) {
            const st = tlAt(Math.max(0, lt - j * 0.03), h, cam, pulse);
            const { P, C: Cc } = L.TL.points(st);
            const N = L.TL.N;
            ctx.strokeStyle = `rgba(${Cc[0] | 0},${Cc[1] | 0},${Cc[2] | 0},${0.32 * sm * (1 - j / 5)})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(P[0], P[1]);
            for (let i = 1; i < N; i++) ctx.lineTo(P[i * 2], P[i * 2 + 1]);
            ctx.closePath(); ctx.stroke();
          }
          ctx.restore();
        }
      }

      /* --- the TL ring, drawn now so the egg can occlude its far arc.
       * (L.TL.draw adds its radial glow AFTER restoring the caller's transform → call it in screen space.) */
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); env.drawTL(); ctx.restore();

      /* --- depth: the far half of both orbital rings (and their satellites) passes BEHIND the egg */
      if (dK > 0.002 && pE > 0.001) {
        ctx.save();
        ctx.translate(X, Y); ctx.rotate(dl);
        ctx.beginPath(); farBands(ctx, R, DEPTH_W / cam.z); ctx.clip();
        eggPath(ctx, R, 1.5); ctx.clip();
        eggBody(ctx, R, te, dK);
        // put back the TL's own additive glow that the redrawn body covered (same params as L.TL.draw)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const e = clamp(tl.energy, 0, 1.5);
        L.glow(ctx, tl.x, tl.y, tl.size * (0.9 + 0.5 * e), C.cyan, 0.25 * e * clamp(tl.alpha) * dK);
        ctx.restore();
      }

      /* --- section A label */
      const pLab = Math.min(L.sp(lt, 1.5, 0.5), outA);
      L.text(ctx, [{ s: 'UP NIGS', color: C.cyan }, { s: ' · ', color: C.textDim }, { s: 'Earthquake Geodesy and Geology (EGG) Laboratory', color: C.text }],
        A_POS[0], A_POS[1] + RET_K * R_A + 66, { kind: 'display', size: 40, weight: 500, align: 'center', p: pLab, mode: lt >= 4.0 ? 'wipe' : 'scan', id: 'a6-lab' });

      /* --- section B: end card (every group starts on a quarter note) */
      if (lt >= 4.0) {
        const tO = { kind: 'display', size: 110, weight: 700, tracking: -0.01 };
        const offs = segOffsets(ctx, ['Project ', 'L', 'In', 'O', 'G'], tO);
        const COL2 = offs[1][0];                       // second credit column aligns under "LInOG"
        // vertical divider between the mark and the text column (grows from the middle) — 57.0
        const pDiv = L.sp(lt, 5.0, 0.6);
        if (pDiv > 0.002) {
          const top = Y_T - 92, bot = Y_V2 + 14, yc = (top + bot) / 2, hh = (bot - top) / 2 * clamp(pDiv);
          const gr = ctx.createLinearGradient(0, yc - hh, 0, yc + hh);
          gr.addColorStop(0, L.rgba(C.cyan, 0)); gr.addColorStop(0.5, L.rgba(C.cyan, 0.6)); gr.addColorStop(1, L.rgba(C.cyan, 0));
          ctx.fillStyle = gr; ctx.fillRect(DIV_X, yc - hh, 1.5, hh * 2);
        }
        // title — 56.5
        L.text(ctx, [{ s: 'Project ', color: C.text }, { s: 'LInOG', color: C.cyan }], X0, Y_T, { ...tO, p: L.sp(lt, 4.5, 0.55), id: 'a6-title' });
        // L / In / O / G underlines in the fringe cycle, on 16ths from 57.0; the beat-hot token chases from 58.0
        const tokCol = [C.cyan, C.gold, C.magenta, C.cyan];
        const beatI = Math.floor(lt / 0.5);
        for (let i = 0; i < 4; i++) {
          const pu = L.sp(lt, 5.0 + i * 0.125, 0.4);
          if (pu <= 0.002) continue;
          const [ox, w] = offs[i + 1];
          const hot = lt >= 6.0 && beatI % 4 === i ? pulse : 0;
          const th = 3 + 3.5 * hot;
          ctx.fillStyle = L.rgba(tokCol[i], 0.9 + 0.1 * hot);
          ctx.fillRect(X0 + ox + 3, Y_T + 17 - th / 2, Math.max(0, (w - 6) * clamp(pu)), th);
          if (hot > 0.05) L.glow(ctx, X0 + ox + w / 2, Y_T + 17, 40, tokCol[i], 0.6 * hot);
        }
        // tagline + accent rule — 57.0
        L.text(ctx, TAGLINE, X0, Y_S, { kind: 'sans', size: 38, weight: 500, color: C.text, p: L.sp(lt, 5.0, 0.5), id: 'a6-tag' });
        const pR = L.sp(lt, 5.0, 0.5);
        if (pR > 0.002) { ctx.fillStyle = L.rgba(C.cyan, 0.9); ctx.fillRect(X0, Y_RULE, 96 * clamp(pR), 2); }
        // credits — 57.125 / 57.5 / 57.625
        const lab = { kind: 'mono', size: 20, weight: 600, tracking: 0.14, color: C.cyan };
        const val = { kind: 'sans', size: 31, weight: 500, color: C.text };
        const p1 = L.sp(lt, 5.125, 0.45), p2 = L.sp(lt, 5.5, 0.45), p3 = L.sp(lt, 5.625, 0.45);
        L.text(ctx, 'IMPLEMENTING AGENCY', X0, Y_L1, { ...lab, p: p1, id: 'a6-l1' });
        L.text(ctx, 'UP Diliman – National Institute of Geological Sciences (UPD NIGS)', X0, Y_V1, { ...val, p: p1, id: 'a6-v1' });
        L.text(ctx, 'FUNDED BY', X0, Y_L2, { ...lab, p: p2, id: 'a6-l2' });
        L.text(ctx, 'DOST-PCIEERD', X0, Y_V2, { ...val, p: p2, id: 'a6-v2' });
        L.text(ctx, 'SUPPORTING', X0 + COL2, Y_L2, { ...lab, p: p3, id: 'a6-l3' });
        L.text(ctx, 'DOST-PHIVOLCS & PhilSA', X0 + COL2, Y_V2, { ...val, p: p3, id: 'a6-v3' });
      }
    },

    overlay(ctx, env) {
      const lt = env.lt;
      if (lt < 5.5) return;
      L.text(ctx, 'Values: LInOG Year-2 report (2026) · graphics schematic', 960, 1004, { kind: 'mono', size: 20, weight: 400, color: C.textDim, align: 'center', p: L.sp(lt, 5.5, 0.5), id: 'a6-foot' });
    },
  });
})();

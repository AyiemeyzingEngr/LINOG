/* LInOG explainer — voice-over cue sheet (VO script v2). Single source of truth for:
 *   - the page: spotlight timing (LINOG.spot) and music ducking (LINOG.audio),
 *   - render.js / tools/vo.js: the cue log, the CSV and the Audacity label track for recording.
 * in/out: where each line is spoken, in seconds on the film timeline: `in` = its first word, `out` = the end of its
 *         last word in the delivered narration (vo/vo.wav, built from the ElevenLabs take by tools/vo.js --take).
 *         A new recording starts each line on `in` and should end near `out`.
 * spot:   what the picture spotlights while the line plays — {target, t0, t1, strength 0..1}. Everything outside
 *         the target is dimmed and defocused; scenes register the target's rectangle with LINOG.spot.mark().
 * Pronunciation (from the client): LInOG = "lee-nog"; Cabanatuan = "ka-ba-na-tu-an" (all five syllables).
 */
(function (root) {
  'use strict';
  const CUES = [
    { id: 'VO-01', in: 0.5, out: 2.35, text: 'The Earth never stops moving.', delivery: 'Slow and weighty; each word lands with the title.' },
    { id: 'VO-02', in: 2.65, out: 4.15, text: 'Yet we seldom see it.', delivery: 'Quieter, close to the microphone.' },
    { id: 'VO-03', in: 4.5, out: 7.5, text: 'From orbit, radar measures it, even through cloud.', delivery: 'Opening up; a sense of scale.' },
    { id: 'VO-04', in: 7.8, out: 9.55, text: 'This is Project LInOG.', delivery: 'Clear and proud. LInOG = "lee-nog".' },
    { id: 'VO-05', in: 10.3, out: 13.8, text: 'Seven hundred seventy-nine radar archives, unified.', delivery: 'Crisp and factual.', spot: { target: 'archives', t0: 10.6, t1: 13.7, strength: 0.8 } },
    { id: 'VO-06', in: 14.3, out: 17.45, text: 'Mapped onto the terrain, then linked, pair by pair.', delivery: 'Measured.', spot: { target: 'network', t0: 15.6, t1: 17.6, strength: 0.6 } },
    { id: 'VO-07', in: 18.4, out: 20.4, text: 'Aligned to a fraction of a pixel.', delivery: 'Precise.', spot: { target: 'subpixel', t0: 19.2, t1: 21.6, strength: 0.75 } },
    { id: 'VO-08', in: 22.4, out: 25.7, text: 'Then the waves interfere, and motion turns to colour.', delivery: 'The moment of discovery.', spot: { target: 'fringes', t0: 22.8, t1: 25.6, strength: 0.7 } },
    { id: 'VO-09', in: 26.3, out: 29.8, text: 'Each pair is unwrapped, then inspected before it goes forward.', delivery: 'Brisk, then settling.', spot: { target: 'qc', t0: 28.1, t1: 29.85, strength: 0.75 } },
    { id: 'VO-10', in: 30.3, out: 34.7, text: 'More than sixteen hundred interferograms become one history of the ground.', delivery: 'Building.', spot: { target: 'ifg-count', t0: 30.7, t1: 35.2, strength: 0.75 } },
    { id: 'VO-11', in: 36.3, out: 41.7, text: 'Unreliable pixels are masked out. Nearly twenty-eight thousand square kilometres remain.', delivery: 'Grave, then a reveal on the number.', spot: { target: 'valid-area', t0: 38.3, t1: 41.7, strength: 0.8 } },
    { id: 'VO-12', in: 42.4, out: 44.3, text: 'Every pixel is placed on the map.', delivery: 'Confident.' },
    { id: 'VO-13', in: 45.0, out: 47.7, text: 'Each frame is delivered as sixteen products.', delivery: 'Matter-of-fact.', spot: { target: 'products', t0: 45.3, t1: 47.9, strength: 0.75 } },
    { id: 'VO-14', in: 48.3, out: 51.65, text: 'Around Cabanatuan, satellite data show subsidence.', delivery: 'The headline, unhurried. Cabanatuan = "ka-ba-na-tu-an".', spot: { target: 'cabanatuan', t0: 48.3, t1: 52.0, strength: 1 } },
    { id: 'VO-15', in: 52.3, out: 54.75, text: 'This signal still needs validation on the ground.', delivery: 'Measured and careful; not alarming.' },
    { id: 'VO-16', in: 56.3, out: 59.05, text: 'Project LInOG. The work continues.', delivery: 'Warm sign-off over the fade to black; starts just after the 56.0 s music arrival. LInOG = "lee-nog".' },
  ];
  const PRONUNCIATION = { LInOG: 'lee-nog', Cabanatuan: 'ka-ba-na-tu-an' };
  if (typeof module !== 'undefined' && module.exports) module.exports = { CUES, PRONUNCIATION };
  else { const L = (root.LINOG = root.LINOG || {}); L.VO = { cues: CUES, pronunciation: PRONUNCIATION }; }
})(typeof window !== 'undefined' ? window : globalThis);

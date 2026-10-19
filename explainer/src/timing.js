/* LInOG explainer — the film's length and ending. One source for the page (LINOG.TIMING, read by core.js, audio.js and
 * the scenes) and for the Node tools (render.js, tools/*.js).
 * DURATION: the film, in seconds (DURATION × FPS frames). FADE: the picture fades to black and the score falls away
 * under a low-pass sweep over these seconds. END_CARD: the end card's music arrival (D major), the start of the hold
 * on the logos. The film was 60 s with FADE 57–60; v3 holds the end card 56–63 s for the longer sign-off and the logos.
 */
(function (root) {
  'use strict';
  const TIMING = { DURATION: 66, FPS: 60, FADE: [63, 66], END_CARD: 56 };
  if (typeof module !== 'undefined' && module.exports) module.exports = TIMING;
  else { const L = (root.LINOG = root.LINOG || {}); L.TIMING = TIMING; }
})(typeof window !== 'undefined' ? window : globalThis);

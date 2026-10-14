# Project LInOG explainer: voice-over script v2

This script replaces v1. The wording is formal, with no contractions or slang. The Cabanatuan lines are reframed so the
result is presented as a satellite-observed signal that still needs ground validation.

The single source of truth for timing is `src/vo_cues.js`. When the timings change, this page and the cue logs
(`node tools/vo.js --cues`) must follow it.

## Pronunciation

| Word | Say it as | Note |
|---|---|---|
| LInOG | **lee-nog** | Two syllables. Do not spell out the letters. |
| Cabanatuan | **ka-ba-na-tu-an** | Five syllables, each pronounced. |
| interferograms | in-ter-FEER-o-grams | |
| validation | val-i-DAY-shun | |

## Delivery

- **Tone and pace:** documentary narration at about 140–160 words per minute, warm and unhurried. Awe without hype.
- **Timing:** `In` is where the line's first word lands and `Out` is where its last word ends, in seconds on the film
  timeline. The times are those of the delivered narration: the ElevenLabs take, fitted by `tools/vo.js --take`. A new
  recording starts each line on `In` and should end near `Out`.
- **Spotlight:** the picture highlights the named data point (dims and blurs everything else) during the spotlight
  window. Lines with a spotlight should land the number or name inside that window.

## Script (16 lines, 120 words; timings as delivered)

| ID | In | Out | Line | Delivery | Spotlight |
|---|---|---|---|---|---|
| VO-01 | 0.50 | 2.35 | The Earth never stops moving. | Slow and weighty; each word lands with the title. | – |
| VO-02 | 2.65 | 4.15 | Yet we seldom see it. | Quieter, close to the microphone. | – |
| VO-03 | 4.50 | 7.50 | From orbit, radar measures it, even through cloud. | Opening up; a sense of scale. | – |
| VO-04 | 7.80 | 9.55 | This is Project LInOG. | Clear and proud. | – |
| VO-05 | 10.30 | 13.80 | Seven hundred seventy-nine radar archives, unified. | Crisp and factual. | "779" archives, 10.6–13.7 |
| VO-06 | 14.30 | 17.45 | Mapped onto the terrain, then linked, pair by pair. | Measured. | Baseline network, 15.6–17.6 |
| VO-07 | 18.40 | 20.40 | Aligned to a fraction of a pixel. | Precise. | Sub-pixel offset, 19.2–21.6 |
| VO-08 | 22.40 | 25.70 | Then the waves interfere, and motion turns to colour. | The moment of discovery. | Fringes, 22.8–25.6 |
| VO-09 | 26.30 | 29.80 | Each pair is unwrapped, then inspected before it goes forward. | Brisk, then settling. | "1,779 → 1,634", 28.1–29.85 |
| VO-10 | 30.30 | 34.70 | More than sixteen hundred interferograms become one history of the ground. | Building. | "1,634 interferograms", 30.7–35.2 |
| VO-11 | 36.30 | 41.70 | Unreliable pixels are masked out. Nearly twenty-eight thousand square kilometres remain. | Grave, then a reveal on the number. | "27,893 km²", 38.3–41.7 |
| VO-12 | 42.40 | 44.30 | Every pixel is placed on the map. | Confident. | – |
| VO-13 | 45.00 | 47.70 | Each frame is delivered as sixteen products. | Matter-of-fact. | "16" products, 45.3–47.9 |
| VO-14 | 48.30 | 51.65 | Around Cabanatuan, satellite data show subsidence. | The headline, unhurried. | Cabanatuan bowl + value, 48.3–52.0 |
| VO-15 | 52.30 | 54.75 | This signal still needs validation on the ground. | Measured and careful; not alarming. | – |
| VO-16 | 56.30 | 59.05 | Project LInOG. The work continues. | Warm sign-off over the fade, just after the 56.0 s music arrival. | – |

The picture fades to black over 57.0–60.0 s, and the music falls away under a low-pass sweep and reverb tail.
- VO-16 is spoken over the fade, after the end card's music arrival at 56.0 s, and ends at about 59.0 s with the picture
  nearly black.
- The mix silences the voice track over the last 0.5 s, so no line may run past 59.5 s.
- The music marks fall in the gaps between lines: the act hits at 10, 18, 30 and 42 s, the 48 s reveal and the 56 s
  arrival.

## What changed from v1

**Formal wording**

| v1 (informal) | v2 |
|---|---|
| "We just can't see it." | "Yet we seldom see it." |
| "Forest scrambles the signal." | "Unreliable pixels are masked out." |
| "Every pixel, pinned to the map." | "Every pixel is placed on the map." |
| "Project LInOG. Watching the ground move." | "Project LInOG. The work continues." |

**Cabanatuan claim** (client instruction: there are no ground-validation studies yet)

| v1 | v2 |
|---|---|
| "Cabanatuan is sinking — over four centimetres a year." | "Around Cabanatuan, satellite data show subsidence." |
| "Nearly twenty centimetres in four years — measured from space." | "This signal still needs validation on the ground." |

The screen follows the same framing: the value is labelled "4.4–4.7 cm/yr · relative to nearby ground" with the
caveat "needs ground validation". The CABN GNSS comparison, the cumulative "18–19 cm" and any cause attribution are
removed.

**Phases:** the narration never reads out phase names. The on-screen HUD carries the official Phase 0–7 taxonomy.

## Fact basis

| Line | Source |
|---|---|
| VO-05 | 779 PALSAR Level 1.1 archives (felix listing). |
| VO-09 | 1,779 interferograms formed and 1,634 inverted (Y2Q2 report, Table 3); report pages are Phase 4.5 of the v4.0 pipeline. |
| VO-10 | 1,634 interferograms inverted across 12 frames. |
| VO-11 | 27,893 km² valid area after the temporal coherence ≥ 0.7, water and swath-edge masks (Y2Q2). |
| VO-13 | 16 products per frame: 6 GeoTIFF, 4 KMZ and 6 hillshade PNG (v1.2 transfer manifest). |
| VO-14 | 4.4–4.7 cm/yr vertical subsidence signal, 2007–2011, relative to nearby stable ground (Y2Q2, Paths 449 and 448). Not ground-validated. |

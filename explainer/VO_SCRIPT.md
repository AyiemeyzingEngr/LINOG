# Project LInOG explainer: voice-over script v3

This script builds on v2, which replaced v1. The wording is formal, with no contractions or slang. The Cabanatuan lines are reframed so the
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

## Script (16 lines, 123 words; timings as delivered)

| ID | In | Out | Line | Delivery | Spotlight |
|---|---|---|---|---|---|
| VO-01 | 0.40 | 2.40 | The Earth never stops moving. | Slow and weighty; each word lands with the title. | – |
| VO-02 | 2.67 | 4.20 | Yet we seldom see it. | Quieter, close to the microphone. | – |
| VO-03 | 4.50 | 7.60 | From orbit, radar measures it, even through cloud. | Opening up; a sense of scale. | – |
| VO-04 | 7.90 | 9.75 | This is Project LInOG. | Clear and proud. | – |
| VO-05 | 10.30 | 13.75 | Four years of satellite radar observations, unified. | Crisp and factual. | "779" archives · 2007–2011, 10.6–13.7 |
| VO-06 | 14.30 | 17.70 | Mapped onto the terrain, then linked, pair by pair. | Measured. | Baseline network, 15.6–17.6 |
| VO-07 | 18.40 | 20.55 | Aligned to a fraction of a pixel. | Precise. | Sub-pixel offset, 19.2–21.6 |
| VO-08 | 22.40 | 25.70 | Then the waves interfere, and motion turns to colour. | The moment of discovery. | Fringes, 22.8–25.6 |
| VO-09 | 26.00 | 29.65 | Each pair is unwrapped, then inspected before it goes forward. | Brisk, then settling. | "1,779 → 1,634", 28.1–29.85 |
| VO-10 | 30.30 | 34.90 | More than sixteen hundred interferograms become one history of the ground. | Building. | "1,634 interferograms", 30.7–35.2 |
| VO-11 | 36.20 | 41.70 | Unreliable pixels are masked out. Nearly twenty-eight thousand square kilometres remain. | Grave, then a reveal on the number. | "27,893 km²", 38.3–41.7 |
| VO-12 | 42.40 | 44.35 | Every pixel is placed on the map. | Confident. | – |
| VO-13 | 44.85 | 47.65 | Each frame is delivered as sixteen products. | Matter-of-fact. | "16" products, 45.3–47.9 |
| VO-14 | 48.30 | 51.80 | Around Cabanatuan, satellite data show subsidence. | The headline, unhurried. | Cabanatuan bowl + value, 48.3–52.0 |
| VO-15 | 52.30 | 54.90 | This signal still needs validation on the ground. | Measured and careful; not alarming. | – |
| VO-16 | 56.30 | 61.30 | Project LInOG. Towards nationwide ground deformation detection from space. | Warm sign-off over the end card, after the 56.0 s music arrival. | – |

The end card arrives with the music at 56.0 s and holds, complete, until 63.0 s; then the picture fades to black over
63.0–66.0 s and the music falls away under a low-pass sweep and reverb tail (src/timing.js).
- VO-16 is spoken over the end card, 56.3–61.3 s; the logos then hold for about 1.7 s before the fade.
- The mix silences the voice track over the last 0.5 s, so no line may run past 65.5 s.
- The music marks fall in the gaps between lines: the act hits at 10, 18, 30 and 42 s, the 48 s reveal and the 56 s
  arrival.

## What changed in v3 (October 2026)

Doc JD's revisions, read by the ElevenLabs voice "Max – Elearning and Documentary" (`vo/source/elevenlabs_max_take2.mp3`):

| v2 | v3 |
|---|---|
| "Seven hundred seventy-nine radar archives, unified." | "Four years of satellite radar observations, unified." |
| "Project LInOG. The work continues." | "Project LInOG. Towards nationwide ground deformation detection from space." |

- **End card:** the tagline is now **TOWARDS NATIONWIDE GROUND DEFORMATION DETECTION FROM SPACE** (it replaces
  "Measuring mm-scale crustal movements from space"), the EGG Laboratory lockup with its orbiting satellite is larger
  (92 → 150 px tall), and the card holds for 7 s before the fade. The film is 66 s long.
- **Archive card:** it now reads "PALSAR Level 1.1 archives · 2007–2011 · 1.04 TB", so the spotlit card shows the four
  years that VO-05 names.
- **Re-timed lines:** this read is slower than take 1. VO-01 starts at 0.40 s and VO-04 at 7.90 s, so the opening
  fits before the 10 s hit. VO-09 starts at 26.0 s, VO-11 at 36.2 s and VO-13 at 44.85 s, so they end clear of the
  30 s and 42 s hits and the 48 s reveal.

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
| VO-05 | Four years: ALOS-1 PALSAR acquisitions 2007–2011, 779 Level 1.1 archives (felix listing). |
| VO-09 | 1,779 interferograms formed and 1,634 inverted (Y2Q2 report, Table 3); report pages are Phase 4.5 of the v4.0 pipeline. |
| VO-10 | 1,634 interferograms inverted across 12 frames. |
| VO-11 | 27,893 km² valid area after the temporal coherence ≥ 0.7, water and swath-edge masks (Y2Q2). |
| VO-13 | 16 products per frame: 6 GeoTIFF, 4 KMZ and 6 hillshade PNG (v1.2 transfer manifest). |
| VO-14 | 4.4–4.7 cm/yr vertical subsidence signal, 2007–2011, relative to nearby stable ground (Y2Q2, Paths 449 and 448). Not ground-validated. |

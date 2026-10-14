# Project LInOG — 60-second documentary explainer

A deterministic 1920×1080 / 60 fps scientific motion explainer for **Project LInOG** (Leveraging InSAR for Observation and
Modeling of Earthquake Generators, UP Diliman NIGS — Earthquake Geodesy and Geology Laboratory). It is narrated by a
documentary voice-over and scored with an original 120 BPM hybrid-orchestral cue synthesised in code, mixed under the voice.
v2 is the National Geographic-style cut: VO-driven spotlights, ALL-CAPS headlines, the official Phase 0–7 taxonomy, the
real logos, and the **real LInOG velocity products**.

| File | What it is |
|---|---|
| `dist/linog_explainer.html` | **The animation.** One standalone file: all code, coastlines, fonts, logos and data are embedded. Open it in Chromium or Chrome to preview with sound. Space plays and pauses, ← and → step one beat, `?t=24.5` starts at a time. Play is enabled after about 6–8 s. Drop a recorded VO WAV onto the page to hear it mixed; a file whose name contains "music" replaces the score instead. |
| `render.js` | Playwright + FFmpeg renderer → `out/linog_explainer.mp4`. |
| `VO_SCRIPT.md` | The voice-over script v2: lines, slots, delivery, pronunciation and fact basis. |
| `vo/` | `vo/vo.wav` is a silent 60.000 s template (48 kHz 24-bit stereo) until the narration is recorded. `vo/README.md` describes the recording and delivery workflow. |
| `src/` | Sources. |
| `src/core.js` | Engine: phases, HUD, typography rule, spotlight API. |
| `src/main.js` | Runtime: seek, spotlight compositing, fade-out, asset loading. |
| `src/vo_cues.js` | The cue sheet, the single source of truth for VO timing. |
| `src/real.js` | The real data products. |
| `src/audio.js` | The score and the VO mix. |
| `src/scenes/act1…6.js` | The six acts. |
| `src/geo.js`, `src/assets.js` | Maps and procedural graphics. |
| `assets/logos`, `assets/data` | Processed logos and quantised velocity products, made by `tools/prepare_assets.py`. |
| `SCENE_GUIDE.md` | The scene contract, typography rules, fact sheet and storyboard. |
| `tools/snap.js` | Renders chosen times to PNG, with a contact sheet and automated QA. |
| `tools/vo.js` | Cue table, CSV and Audacity labels; silent template; per-line assembly; test signal. |

## Render the MP4

Requirements: Node 18+, FFmpeg ≥ 4 with libx264 and the native AAC encoder, and Chromium for Playwright.

```bash
cd explainer
npm install                    # playwright 1.56.1 (then `npx playwright install chromium` if no browser is present)
node render.js --selftest      # build + soundtrack + 61 beat frames + contact sheet + QA report → out/selftest/
node render.js                 # build → soundtrack → self-test → 3,600 frames → out/linog_explainer.mp4
node render.js --vo path/to/narration.wav     # use a recorded VO (default: vo/vo.wav)
```

What `render.js` does:

1. **Build.** `build.js` inlines every script and base64-embeds the fonts, logos and data images into
   `dist/linog_explainer.html`.
2. **Load.** It opens the file in headless Chromium at 1920×1080 and waits for the fonts and images (`window.ready`).
3. **Mix the soundtrack in the page** (`src/audio.js`).
   - An OfflineAudioContext renders the score (44.1 kHz, exactly 60.000 s, seeded noise). Reverbs, ducking and limiting run in plain JS.
   - The score is mixed with `vo/vo.wav` (`--vo FILE`, `--no-vo`; `--music FILE` replaces the score). FFmpeg first normalises these inputs to 44.1 kHz stereo of exactly 60.000 s.
   - The VO's speech level is set to −16.5 dBFS (mix ≈ −16 LUFS with narration, for web delivery).
   - The music ducks −8 dB under every cue-sheet line, plus up to −5 dB from a sidechain on the recording.
   - The music drops out with a low-pass sweep and a reverb tail over 57–60 s.
   - Outputs:
     - `out/soundtrack.wav`: 16-bit, peaks held at or below −1 dBFS by the master limiter, TPDF dither, last sample 0.
     - `out/music_stem.wav` and `out/vo_stem.wav`.
     - `out/vo_cues.csv` and `out/vo_cues_audacity.txt`.
   - The mix is reproducible to ±1 LSB. It is cached by a hash of `src/audio.js`, `src/core.js`, `src/vo_cues.js` and the VO and music files; `--fresh-audio` forces a new mix.
4. **Self-test.** It renders beat frames every 1.0 s and runs QA every 0.25 s. Blocking issues abort the render (`--force` overrides). QA checks:
   - text inside the title-safe and HUD-safe areas;
   - no overlapping text;
   - WCAG contrast;
   - the typography rule: headlines in ALL CAPS, labels and UI not in caps;
   - every string, and every counter's final value, readable for at least 1.5 s;
   - every VO spotlight target marked by the scene on screen;
   - no blank frames and no static hold over 1 s (both exempt during the final fade);
   - frame cost;
   - through-line visibility and continuity at every act cut.
5. **Render frames.** It calls `window.seek(i / 60, {subframes: 4})` for i = 0…3599. Each frame averages 4 sub-frame samples
   across a 180° shutter for motion blur. Frames are captured losslessly (PNG via CDP) with parallel pages and streamed in order into FFmpeg.
6. **Mux.** FFmpeg muxes with `-c:v libx264 -pix_fmt yuv420p -b:v 12M -c:a aac -b:a 320k` (BT.709, `+faststart`). The MP4 is written to
   `*.part.mp4` and renamed only after ffprobe confirms the frame count and duration.

Options:
- `--vo FILE`, `--no-vo` and `--music FILE`.
- `--workers N`: parallel pages, default CPUs/2.
- `--subframes N`: default 4; 1 means no motion blur.
- `--from S --to S`: partial render; the audio is trimmed to the exact frame range.
- `--fps`, `--preset` (x264, default medium) and `--out FILE`.
- `--skip-selftest`, `--force` and `--fresh-audio`.

Run time on 4 cores: about 1 min for build, soundtrack (≈ 7 s) and self-test, then about 6 min for 3,600 frames.

Exit codes:
- 0: ok.
- 1: crash.
- 2: self-test failed, or fonts or images missing.
- 3: scene errors during the render.
- 4: output check failed.

Other tools:
- `node tools/snap.js --from A --to B --step S --out DIR [--sheet] [--qa] [--dist]`: frames, contact sheet and QA for a range.
- `node tools/determinism.js [--dist]`: pixel hashes across seek orders and fresh pages.
- `node tools/strings.js [--out FILE]`: every on-screen string with its time span.
- `node tools/vo.js --cues | --silent | --assemble | --test FILE`: see `vo/README.md`.

## Voice-over workflow

1. `node tools/vo.js --cues` prints the 16 lines with their slots: seconds, mm:ss.mmm and 60 fps frame numbers. It also writes
   `out/vo_cues.csv` and an Audacity label track (`out/vo_cues_audacity.txt`).
2. Record each line inside its slot. Pronunciation: **LInOG = "lee-nog"**, **Cabanatuan = "ka-ba-na-tu-an"**.
   See `VO_SCRIPT.md` for delivery notes.
3. Deliver either one 60.000 s WAV aligned to the film as `vo/vo.wav`, or per-line files `vo/VO-01.wav` … `vo/VO-16.wav`
   assembled with `node tools/vo.js --assemble`.
4. Run `node render.js`. The music ducks under the voice automatically.
5. Optional captions: `node tools/vo.js --cues` also writes `out/vo_captions.srt` (for any player) and
   `out/vo_captions.ass`; `node tools/vo.js --burn` burns them into `out/linog_explainer_captions.mp4` without re-rendering
   (Inter Medium on a translucent slate box, bottom centre above the HUD tracker; the end-card line sits at the top).

## Determinism

`window.seek(t, {subframes, shutter})` draws the frame for time `t` as a pure function. There is no `Math.random`, `Date`,
timer, CSS animation or state carried between frames; caches are pure functions of their keys. Seeking in any order gives
identical pixels, which is what makes parallel rendering safe. Logos are kept as canvases rather than `<img>` elements,
because Chromium caches scaled decodes of images, which made small logo draws depend on seek order.

## Motion and spotlight

- **Beat grid.** At 120 BPM, bars every 2.0 s carry the major state changes; quarter notes (0.5 s) drive micro-motion.
  Every state change uses a damped spring (ζ = 0.82).
- **Through-line.** The camera pushes ×1.04 across each storyboard section and re-enters at 1.00 on each act cut, where
  the through-line "The Radar Phase Wave" carries the match cut: pulse → SLC pixel → network node → fringe loop → SBAS
  node → geocoded pixel → subsidence contour → the EGG logo's orbit.
- **VO spotlight.** While the narration names a data point (`spot` in `src/vo_cues.js`), the runtime dims and defocuses
  everything except that target. Scenes mark the target each frame with `LINOG.spot.mark`. It is a single
  quarter-resolution overlay costing about 7 ms per frame.
- **Ending.** The picture fades to black over 57–60 s in sync with the music's low-pass drop; there is no hard cut.

## Content notes

**Sources.** Numbers come from the DOST Y2Q2 report, processing manual v4.0 (D6) and the v1.2 transfer manifest. "779
archives / 1.04 TB" comes from the felix archive listing in `housekeeping/`. See `SCENE_GUIDE.md` §5.

**Phases.** The HUD follows the official taxonomy:
- 0 Install and Prove the Environment
- 1 Stage, Unpack and Unify the Two Modes
- 2 DEM and Stack Configuration
- 3 Coregistration
- 4 Interferograms
- 4.5 Interferogram Report Pages
- 5 MintPy Time-Series Inversion
- 6 Delivery, Verification, Transfer
- 7 Reading the Products

**Real data** (acts 5–6). The velocity maps are the delivered LInOG products: vertical velocity with the ramp removed, in cm/yr.
- P448 F0290 is shown at full resolution.
- Mosaics cover the 12 ascending frames (v1.2, 24 Sep 2026) and the 4 descending Path 84 frames (Oct 2026).
- Recomputing the valid area of the 12 ascending products gives 27,864 km², matching the report's 27,893 km² to within 0.1 %.
- `tools/prepare_assets.py` documents the processing.

**Cabanatuan** is presented as a subsidence signal seen by the satellite that still needs ground validation:
- 4.4–4.7 cm/yr vertical, 2007–2011;
- relative to nearby ground;
- assumes vertical motion.

There is no GNSS comparison, cumulative total or cause.

**Schematic graphics.** The DEM, fringes, networks and the act-4 masking map are schematic and labelled as such.
Coastlines are Natural Earth 10 m (public domain).

**Logos.** The official logos (LInOG, NIGS, EGG Laboratory, UP, DOST-PCIEERD, DOST-PHIVOLCS, PhilSA, UP CSRC, UP ISC,
JAXA) were taken from the project Drive `07_dashboard/LOGOS`. They are trimmed and resampled but not recoloured; the EGG
artwork is its white variant for dark backgrounds.

**Velocity colours** follow the brand palette: subsidence (down) is crimson, up is blue → cyan. Every map carries a legend.

**Fonts** are Space Grotesk, Inter and JetBrains Mono (SIL OFL 1.1; licences in `assets/fonts/`).

# Project LInOG — documentary explainer (66 s)

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
| `vo/` | `vo/vo.wav` is the narration: an ElevenLabs read cut from `vo/source/` onto the cue sheet by `tools/vo.js --take`. `vo/README.md` describes the narration, how it was fitted, and the recording and delivery workflow. |
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
| `tools/layers.js` | The film as editable layers for a video editor: graphics, text (alpha) and HUD (alpha) videos, plus the score as six stems. |

## Render the MP4

Requirements: Node 18+, FFmpeg ≥ 4 with libx264 and the native AAC encoder, and Chromium for Playwright.

```bash
cd explainer
npm install                    # playwright 1.56.1 (then `npx playwright install chromium` if no browser is present)
node render.js --selftest      # build + soundtrack + 61 beat frames + contact sheet + QA report → out/selftest/
node render.js                 # build → soundtrack → self-test → 3,960 frames → out/linog_explainer.mp4
node render.js --vo path/to/narration.wav     # use a recorded VO (default: vo/vo.wav)
```

What `render.js` does:

1. **Build.** `build.js` inlines every script and base64-embeds the fonts, logos and data images into
   `dist/linog_explainer.html`.
2. **Load.** It opens the file in headless Chromium at 1920×1080 and waits for the fonts and images (`window.ready`).
3. **Mix the soundtrack in the page** (`src/audio.js`).
   - An OfflineAudioContext renders the score (44.1 kHz, exactly the film's length, seeded noise). Reverbs, ducking and limiting run in plain JS.
   - The score is mixed with `vo/vo.wav` (`--vo FILE`, `--no-vo`; `--music FILE` replaces the score). FFmpeg first normalises these inputs to 44.1 kHz stereo of exactly the film's length.
   - The VO's speech level is set to −16.5 dBFS (mix ≈ −15 LUFS integrated, true peak ≤ −1 dBTP, for web delivery).
   - The music ducks −6.5 dB under every line, with a −6 dB speech-band dip (1.5 kHz) and up to −3.5 dB more from a
     sidechain on the recording. The act hits (10, 18, 30, 42 s), the 48 s accent and the 56 s arrival stay at full level
     between lines.
   - The music drops out with a low-pass sweep and a reverb tail over 63–66 s.
   - Outputs:
     - `out/soundtrack.wav`: 16-bit, peaks held at or below −1.5 dBFS by the master limiter, TPDF dither, last sample 0.
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

Run time on 4 cores: about 2 min for build, soundtrack (≈ 12 s) and self-test, then about 6 min for 3,960 frames.

The film's length and its fade live in `src/timing.js` (66 s, fade 63–66 s, end-card arrival at 56 s); the page, the
score, the renderer and every tool read them from there.

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
- `node tools/vo.js --cues | --take EDL.json | --assemble | --silent | --burn | --test FILE`: see `vo/README.md`.

## Voice-over workflow

The film is narrated by an ElevenLabs read (v3: voice "Max – Elearning and Documentary", with Doc JD's revisions).
- `vo/source/elevenlabs_max_take2.mp3` is the take as generated.
- `vo/source/elevenlabs_max_take2.json` is the edit list that cuts it into the 16 cue lines.
- `node tools/vo.js --take vo/source/elevenlabs_max_take2.json --force` rebuilds `vo/vo.wav`, with every first word
  on its cue's `in`.

To replace the narration:
1. `node tools/vo.js --cues` prints the 16 lines with their timings: seconds, mm:ss.mmm and 60 fps frame numbers. It also
   writes `out/vo_cues.csv` and an Audacity label track (`out/vo_cues_audacity.txt`).
2. Record each line from its `in`, ending near its `out`. Pronunciation: **LInOG = "lee-nog"**, **Cabanatuan =
   "ka-ba-na-tu-an"**. See `VO_SCRIPT.md` for delivery notes.
3. Deliver one of these:
   - one 60.000 s WAV aligned to the film, as `vo/vo.wav`;
   - per-line files `vo/VO-01.wav` … `vo/VO-16.wav`, assembled with `node tools/vo.js --assemble`;
   - one continuous take with an edit list, fitted with `--take`.
4. Run `node render.js`. The music ducks under the voice automatically.
5. Optional captions: `node tools/vo.js --cues` also writes `out/vo_captions.srt` (for any player) and
   `out/vo_captions.ass`; `node tools/vo.js --burn` burns them into `out/linog_explainer_captions.mp4` without re-rendering
   (Inter Medium on a translucent slate box, bottom centre above the HUD tracker; the end-card line sits at the top).

## Editing as layers (invideo or any editor)

The animation is drawn by code, so no editor can open its motion design as keyframes. To edit the film in a timeline,
`tools/layers.js` splits it into layers that stack back into the film, and the soundtrack into stems.

```bash
node tools/layers.js            # → out/layers/LInOG_L1_graphics.mp4, LInOG_L2_text.webm, LInOG_L3_hud.webm (≈ 15 min)
node tools/layers.js --stems    # → out/layers/stems/: the score as 6 stems + the whole score, unducked
node tools/layers.js --verify   # restack the layers (+ the fade) and measure them against out/linog_explainer.mp4
node tools/layers.js --check 3,12,29,50   # stills of each layer and of the restack vs the film frame
```

**Picture layers** (`seek(t, {layer})` in `src/main.js`):
- **L1 · graphics and motion** is opaque H.264. It holds everything except the scene text, the HUD and the fade: maps,
  data, cards, logos, the through-line and the spotlight.
- **L2 · text and labels** is VP9 with alpha. It holds whatever `L.text` paints, spotlit like the picture.
- **L3 · HUD** is VP9 with alpha: the phase header, tracker and logo.

Stacked L1 → L2 → L3 under the fade to black (src/timing.js), the layers rebuild the film: SSIM 0.994 over all frames
for the encoded layers, and 47–76 dB PSNR for most stills. Known differences:
- the through-line passes under the headline at about 3 s instead of over it;
- the scan-line texture sits on L1 only;
- the spotlight defocuses text and picture separately.

**Stems** (`L.audio.stemBase64`): strings, spiccato ostinato, brass, percussion, keys and textures, and hits & FX.
- Each renders only its own score buses, through the same reverbs, level, limiter gain curve and drop ending.
- Together they sum to the unducked score, with a residual 63 dB down.

**The invideo project**, "Project LInOG · 60 s explainer (editable layers)", timeline "LInOG explainer · editable
layers", 1080p60, has a checkpoint "v1" that matches the v2 film (60 s, the Quentin read). It has not been updated
to v3 yet: re-render the layers with `tools/layers.js` and replace them when the v3 cut is approved.
- **Video tracks:**
  - L1 and L2 are cut at the act boundaries (10, 18, 30, 42, 52 s), giving six named clips each.
  - L3 runs 10–52 s.
  - A black shape with an opacity ramp makes the fade to black.
  - The captions track holds the 16 VO lines as native, editable caption slides. It is hidden.
- **Audio tracks:**
  - The narration is split into 16 named clips, VO-01 to VO-16, on their cues.
  - The six stems are routed to a music bus whose ducker follows the narration track, so moved lines stay ducked.
  - The film's music mix sits on a muted reference track. invideo's ducker approximates the film's ducking: it has no
    hit protection and no speech-band dip.
- **Markers:** the six acts and the music hits.
- **Bin:** the layers, narration, stems, the reference mix, the brand fonts (Inter, Space Grotesk, JetBrains Mono)
  and the 11 official logos.

**What stays in code:** the content inside a layer (a label's wording, a number, a map colour, an animation) is changed
in `src/` and re-rendered with `tools/layers.js --layers text` (for example). The new file replaces the clip in the
editor at the same timing, so edits made around it survive.

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
- **Ending.** The end card holds, complete, from 56 to 63 s; then the picture fades to black over 63–66 s in sync with
  the music's low-pass drop. There is no hard cut.

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

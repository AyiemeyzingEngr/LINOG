# Project LInOG — 60-second motion explainer

A deterministic 1920×1080 / 60 fps scientific motion explainer for **Project LInOG**
(Leveraging InSAR for Observation and Modeling of Earthquake Generators, UP Diliman NIGS —
Earthquake Geodesy and Geology Laboratory), with an original 120 BPM soundtrack synthesised in code.

| file | what it is |
|---|---|
| `dist/linog_explainer.html` | **the animation** — one standalone file (all code, coastline data and fonts embedded). Open it in Chromium/Chrome to preview with sound (Space = play/pause, ←/→ = ±1 beat, `?t=24.5` to start at a time). |
| `render.js` | Playwright + FFmpeg renderer → `out/linog_explainer.mp4` |
| `src/` | sources (`core.js` engine, `geo.js` maps/DEM, `assets.js` satellite/SAR/emblem, `audio.js` soundtrack, `main.js` runtime, `scenes/act1…6.js`) |
| `SCENE_GUIDE.md` | the scene contract, fact sheet and storyboard |
| `tools/snap.js` | render chosen times to PNG + contact sheet + automated QA |

## Render the MP4

Requirements: Node 18+, FFmpeg with libx264/AAC, and Chromium for Playwright.

```bash
cd explainer
npm install                    # playwright 1.56.1 (then `npx playwright install chromium` if no browser is present)
node render.js --selftest      # build + WAV + 61 beat frames (every 1.0 s) + contact sheet + QA report → out/selftest/
node render.js                 # build → WAV → self-test → 3,600 frames → out/linog_explainer.mp4
```

What `render.js` does:
1. `build.js` inlines every script and base64-embeds the fonts into `dist/linog_explainer.html`.
2. Opens it in headless Chromium at 1920×1080, waits for fonts (`window.ready`).
3. Renders the soundtrack in the page with an `OfflineAudioContext` (44.1 kHz, stereo, exactly 60.000 s;
   seeded noise, so it is reproducible) and writes `out/soundtrack.wav` (16-bit PCM, −1 dBFS peak, last sample 0).
4. **Self-test**: renders beat frames every 1.0 s (`out/selftest/beat_*.png` + `contact_sheet.png`) and runs QA every 0.25 s:
   text inside title-safe / HUD-safe areas, no overlapping text, WCAG contrast, no blank frames, no static hold > 1 s,
   through-line visible at every sample, and match-cut continuity of the through-line at every act boundary
   (position/size/form measured at runtime on both sides of the cut). Blocking issues abort the render (`--force` overrides).
5. Calls `window.seek(i / 60)` for i = 0…3599, captures each frame losslessly (PNG via CDP) with parallel pages,
   streams them in order into FFmpeg and muxes the WAV:
   `-c:v libx264 -pix_fmt yuv420p -b:v 12M -c:a aac -b:a 320k` (BT.709 tagged, `+faststart`).

Options: `--workers N` (parallel pages), `--subframes N` (motion blur: N sub-frame samples averaged across a 180° shutter),
`--from S --to S` (partial render), `--fps`, `--out FILE`, `--skip-selftest`, `--force`.

## Determinism

`window.seek(t, {subframes, shutter})` draws the frame for time `t` as a pure function: no `Math.random`, `Date`,
timers, CSS animations or state carried between frames (caches are pure functions of their keys). Seeking in any order
gives identical pixels, which is what makes parallel rendering safe. The preview player only maps the audio clock to `seek()`.

## Motion system

- 120 BPM grid: bars every 2.0 s carry the major state changes; quarter notes (0.5 s) drive micro-motion (`L.steps`, `L.pulse`).
- Every state change uses a damped spring with ζ = 0.82 (≈1 % overshoot, no bounce).
- Text and panels construct along interlaced scanlines; nothing pops in.
- Camera: a continuous ×1.04 push across every storyboard section within an act; it re-enters at 1.00 on each act cut,
  where the through-line — "The Radar Phase Wave" — carries the match cut. Each act's end state is measured at runtime
  from that act's own layout and handed to the next act, which morphs it (pulse → SLC pixel → network node →
  interferometric fringe loop → SBAS node → geocoded pixel → subsidence contour → logo orbit ring).

## Content notes

- Numbers come from the LInOG Year-2 semi-annual report (pipeline v4.0, 12 frames, Cabanatuan City subsidence)
  and the felix raw-archive listing in `housekeeping/` (779 PALSAR L1.1 archives, 1.04 TB). See `SCENE_GUIDE.md` §5.
- Coastlines are Natural Earth 10 m (public domain, via `world-atlas`). The DEM, velocity/coherence fields, fringes,
  networks, fault trace and path footprints are **schematic illustrations**, not survey data.
- The EGG Laboratory emblem is a **procedural placeholder**, not the official logo; agencies appear as text only.
- Fonts: Space Grotesk, Inter, JetBrains Mono (SIL OFL 1.1; licences in `assets/fonts/`).

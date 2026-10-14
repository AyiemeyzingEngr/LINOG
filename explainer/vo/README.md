# Voice-over — recording and delivery

The film is narrated by 16 short lines. Their text, delivery notes and timing live in one place, the cue sheet
`src/vo_cues.js`; the picture (spotlights) and the soundtrack (music ducking) both read it. Each line has a **slot**
(`in` → `out`, seconds on the film timeline): the recorded line must start at `in` and be finished by `out`.

`vo/vo.wav` in this folder is a **silent** 60.000 s WAV (48 kHz, 24-bit, stereo). It is the recording template and
the "no narration yet" placeholder: renders with it already have the final music dynamics (the music ducks under every
slot). Replace it with the recorded narration when it arrives.

## 1. Get the cue sheet

```bash
node tools/vo.js --cues
```

prints every line with its slot in seconds, `mm:ss.mmm` and frame numbers (60 fps), the slot length, the word count and
the pace the slot implies (words per second), and writes

- `out/vo_cues.csv` — the same table for a spreadsheet or the recording script;
- `out/vo_cues_audacity.txt` — a label track (`start⇥end⇥ID text`). In Audacity: *File → Import → Labels…*; most DAWs
  can import it as markers/regions.

`node render.js` prints and writes the same files at the start of every render.

Pronunciation: **LInOG** = "lee-nog" · **Cabanatuan** = "ka-ba-na-tu-an" (all five syllables).

## 2. Record

- Record to picture if you can (play `out/linog_explainer.mp4` or a preview render against the label track); otherwise
  record against the label track alone. Each line starts on its slot's `in` and ends before its `out` — a few tenths of
  a second early is fine, late is not (the next line, a hit or a spotlight follows).
- Deliver clean, dry narration: no music, no reverb, no heavy compression or limiting. Mono or stereo, any sample rate
  and bit depth (PCM 16/24/32-bit or 32-bit float). Aim for speech around −20 dBFS RMS with peaks below −3 dBFS; quiet room
  tone (below about −50 dBFS) between lines is fine.
- Levels are handled in the mix: the active speech level (gated RMS, ITU-T P.56-style) is normalised to −19 dBFS and
  peaks are limited at −3 dBFS, under a −1 dBFS master limiter.

## 3. Deliver — either way works

**A. One file, aligned to the film (preferred).** Export a single WAV of exactly 60.000 s whose t = 0 is the film's first
frame (e.g. export the whole session from 0:00 to 1:00). Save it as `vo/vo.wav` (overwrite the silent template; to get
the template back: `node tools/vo.js --silent --force`). A file that is not exactly 60.000 s long is padded or trimmed at
the end by the renderer — so it must still start at t = 0.

**B. One file per line.** Name each file after its cue ID — `vo/VO-01.wav`, `vo/VO-02.wav`, … `vo/VO-16.wav` (missing
lines stay silent) — and assemble them:

```bash
node tools/vo.js --assemble            # → vo/vo.wav (48 kHz 24-bit stereo); --force to replace a non-silent vo/vo.wav
```

Each file's leading and trailing silence is trimmed (threshold: 40 dB below the file's own peak, but never lower than
−50 dBFS; 30 ms of pre-roll and 120 ms of tail kept), and its first sound is placed exactly at the cue's `in`. The tool reports every line that is longer than
its slot or runs into the next line. Options: `--dir DIR`, `--out FILE`, `--rate`, `--bits`, `--no-trim` (place each file
exactly as recorded, from its first sample).

## 4. Hear it and render

- Preview: open `dist/linog_explainer.html` and drop the WAV onto the page (a file whose name contains "music" replaces
  the score instead); Space plays.
- Render: `node render.js` uses `vo/vo.wav` automatically (`--vo FILE` for another file, `--no-vo` for none). Outputs:
  `out/soundtrack.wav` (the mix, muxed into the MP4), `out/music_stem.wav` (the music exactly as it sits in the mix) and
  `out/vo_stem.wav` (the processed narration).

## How the music makes room for the voice

- **From the cue sheet:** the music dips −8 dB under every slot (a smooth ramp starting 0.15 s before `in`, back up over
  0.4 s after `out`; lines less than 0.6 s apart are treated as one, so the music never pumps between them), with a gentle
  −3 dB presence dip around 2.8 kHz.
- **From the recording itself:** the speech the mix detects in `vo.wav` is ducked the same way even where it drifts out of
  its slot, and an envelope follower (30 ms look-ahead, 30 ms attack, 300 ms release) takes the music up to −5 dB further
  down under the words. The act hits (10, 18, 30, 42 s) and the 48 s reveal sit in the gaps between lines — keep those
  gaps clear.

## Test signal (QA only)

`node tools/vo.js --test /tmp/test_vo.wav [--shift 0.4] [--mono]` writes a synthetic, speech-like signal inside the slots
(`--shift` moves every line, to check that drifting lines still duck). It is a measurement aid — never ship it as
`vo/vo.wav`.

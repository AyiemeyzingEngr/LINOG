# Voice-over: recording and delivery

The film is narrated in 16 short lines. Their text, delivery notes and timing live in one place, the cue sheet
`src/vo_cues.js`. The picture (spotlights) and the soundtrack (music ducking) both read it. On the film timeline, each
line's `in` is its first word and its `out` is the end of its last word.

`vo/vo.wav` is the **delivered narration** (v3): an ElevenLabs read by the voice "Max – Elearning and Documentary",
with Doc JD's revisions. It is as long as the film (66.000 s, src/timing.js), 44.1 kHz, 16-bit mono, with every line's
first word on its cue's `in`.

- The source take: `vo/source/elevenlabs_max_take2.mp3`.
- The edit list: `vo/source/elevenlabs_max_take2.json`.
- Rebuild it with `node tools/vo.js --take vo/source/elevenlabs_max_take2.json --force`.
- The v2 read (voice "Quentin – Narrator and Educator") and its edit list stay in `vo/source/elevenlabs_quentin_take1.*`.

To render without narration, use `node render.js --no-vo`. `node tools/vo.js --silent --out FILE` writes a silent
template as long as the film.

## 1. Get the cue sheet

```bash
node tools/vo.js --cues
```

This prints every line with:
- its `in`/`out` in seconds, `mm:ss.mmm` and frame numbers (60 fps);
- its length and word count.

It also writes these files:
- `out/vo_cues.csv`: the same table, for a spreadsheet or the recording script.
- `out/vo_cues_audacity.txt`: a label track (`start⇥end⇥ID text`). In Audacity use *File → Import → Labels…*. Most DAWs
  can import it as markers or regions.
- `out/vo_captions.srt` and `out/vo_captions.ass`: captions. They are not burned in by default; see the main README.

`node render.js` prints and writes the same files at the start of every render.

Pronunciation: **LInOG** = "lee-nog" · **Cabanatuan** = "ka-ba-na-tu-an" (all five syllables).

## 2. Record (for a new narration)

- Record to picture if you can: play `out/linog_explainer.mp4` against the label track. Otherwise record against the
  label track alone.
- Start each line on its `in` and end near its `out`. A few tenths of a second early is fine; late is not, because the
  next line, a music hit or a spotlight follows.
- Deliver clean, dry narration: no music, no reverb, and no heavy compression or limiting.
  - Format: mono or stereo, any sample rate and bit depth (PCM 16/24/32-bit or 32-bit float).
  - Level: speech around −20 dBFS RMS, with peaks below −3 dBFS.
  - Quiet room tone (below about −50 dBFS) between lines is fine.
- Levels are handled in the mix. The active speech level (gated RMS, ITU-T P.56-style) is normalised to −16.5 dBFS and
  peaks are limited at −1.5 dBFS, under a −1.5 dBFS master limiter (true peak ≤ −1 dBTP).

## 3. Deliver: three ways

**A. One file aligned to the film.**
- Export a single WAV as long as the film (66.000 s) whose t = 0 is the film's first frame (for example, export the whole session
  from 0:00 to 1:06).
- Save it as `vo/vo.wav`.
- A file of another length is padded or trimmed at the end by the renderer, so it must still start at t = 0.

**B. One file per line.** Name each file after its cue ID: `vo/VO-01.wav`, `vo/VO-02.wav`, … `vo/VO-16.wav`. Missing
lines stay silent. Then assemble them:

```bash
node tools/vo.js --assemble --force    # → vo/vo.wav (48 kHz 24-bit stereo)
```

- Each file's leading and trailing silence is trimmed. The threshold is 40 dB below the file's own peak, but never lower
  than −50 dBFS; 30 ms of pre-roll and 120 ms of tail are kept.
- Each file's first sound is placed exactly at the cue's `in`.
- The tool reports every line that runs past its `out` or into the next line.
- Options: `--dir DIR`, `--out FILE`, `--rate`, `--bits`, and `--no-trim` (place each file exactly as recorded, from its
  first sample).

**C. One continuous take** (how the current narration was made). For a TTS or studio read of the whole script in one
file, write an edit list next to it, like `vo/source/elevenlabs_max_take2.json`. For each line, give:
- `src`: the source window, cut in the pauses between lines;
- `parts`: how many speech runs the line has;
- `pauses` (optional): target lengths for its internal pauses;
- `gainDb` (optional): a clip gain.

Then:

```bash
node tools/vo.js --take vo/source/elevenlabs_max_take2.json --force
```

- The tool finds speech on a 10 ms envelope. It stops if a window holds a different number of speech runs than
  `parts`, so a window cannot drift onto the wrong line.
- It keeps 40 ms before each line's first word and 200 ms after its last.
- It shortens only the pauses you name.
- It puts each first word on the cue's `in` and prints each line's source span, film position and gap to the next line.

After a new take, set each cue's `out` in `src/vo_cues.js` to the printed end (rounded up to 0.05 s), so that captions
and ducking follow the voice.

**How the current take (v3) was fitted**
- The read is 59.2 s long, slower than the v2 take. Its 16 lines were identified from their pauses and confirmed by
  their lengths and by fricatives at the boundaries: "Four…", "…satellite data show subsidence.", "…products.",
  "…from space.".
- Seven cues moved, by 0.05–0.30 s:
  - VO-01 starts at 0.40 s, VO-02 at 2.67 s, VO-03 at 4.50 s and VO-04 at 7.90 s. The opening four lines finish
    0.28 s before the 10 s hit, with about 0.3 s between them.
  - VO-09 starts at 26.0 s, VO-11 at 36.2 s and VO-13 at 44.85 s. They end 0.31–0.37 s clear of the 30 s and 42 s
    hits and the 48 s reveal.
- Five pauses were shortened:
  - VO-02's pause after "Yet": 0.16 → 0.14 s;
  - VO-03's comma pauses: 0.29 → 0.16 s and 0.40 → 0.20 s;
  - VO-09's comma pause: 0.21 → 0.15 s;
  - VO-11's pause between its two sentences: 0.45 → 0.32 s.
- No speed change and no clip gain. VO-16, the sign-off, runs 56.3–61.3 s over the end card.

## 4. Hear it and render

- **Preview:** open `dist/linog_explainer.html` and drop a WAV onto the page. A file whose name contains "music"
  replaces the score instead. Space plays.
- **Render:** `node render.js` uses `vo/vo.wav` automatically. Use `--vo FILE` for another file, or `--no-vo` for none.
- **Outputs:**
  - `out/soundtrack.wav`: the mix, muxed into the MP4.
  - `out/music_stem.wav`: the music exactly as it sits in the mix.
  - `out/vo_stem.wav`: the processed narration.

## How the music makes room for the voice

- **From the cue sheet:** the music dips −6.5 dB under every line.
  - The dip ramps down from 0.15 s before `in` and back up over 0.4 s after `out`.
  - Lines less than 0.9 s apart are treated as one, so the music never pumps between them.
  - A broad −6 dB speech-band dip (1.5 kHz, Q 0.6) rides the same curve. The bed keeps its lows and air, while strings,
    horns and the radar ping clear the band the voice needs.
- **From the recording itself:** speech the mix detects in `vo.wav` is ducked the same way, even outside its cue. An
  envelope follower (30 ms look-ahead, 30 ms attack, 300 ms release) takes the music up to −3.5 dB further down under
  the words.
- **Music marks:** the act hits (10, 18, 30, 42 s), the 48 s reveal and the 56.0 s end-card arrival sit in the gaps
  between lines, and the ducking never covers them.
  - A release before a mark is shortened so it ends just ahead of it.
  - The next line's dip waits until just after it.
  - Keep a few tenths of a second clear before each mark.
- **Measured with this narration** (v3, the Max take):
  - Over each line's cue window, the voice sits 11.5–18 LU over the music (median 13 LU, integrated loudness of the
    two stems). The sign-off, VO-16, sits highest, over the quiet end-card bed.
  - The marks peak at about the voice's own peaks.
  - The mix is −14.7 LUFS integrated, with true peak −1.3 dBTP (−1.4 dBTP after AAC encoding in the MP4).

## Test signal (QA only)

`node tools/vo.js --test /tmp/test_vo.wav [--shift 0.4] [--mono]` writes a synthetic, speech-like signal inside the cue
windows. `--shift` moves every line, to check that drifting lines still duck. It is a measurement aid; never ship it as
`vo/vo.wav`.

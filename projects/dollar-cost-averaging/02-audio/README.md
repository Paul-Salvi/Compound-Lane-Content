# 02-audio/ — Voiceover script + regen helper

This folder holds the **text source** for the single voiceover audio
file shipped in `03-Video/.media/voiceover/voiceover.mp3`. The
`.mp3` is the generated artifact; `tts_script.txt` here is the
single source of truth for the spoken words.

> **Before writing or editing `tts_script.txt`**, read
> [`AUDIO_STYLE.md`](../../../AUDIO_STYLE.md) at the repo root and apply
> the 7 rules + checklist. The rules exist because Kokoro (our TTS
> engine) doesn't support SSML — punctuation is the only prosody lever.

## Why this folder

When you want to change what the video *says* (re-word a line, fix a
mispronunciation, swap a number), you edit `tts_script.txt` and
regenerate the `.mp3` — you do **not** re-author from the JSON or
storyboard. The HF project (`03-Video/`) only reads the
`voiceover.mp3`, so as long as the new audio's duration is updated
in `index.html`, no other files need to change.

## Layout

| File | Role |
|---|---|
| `tts_script.txt` | The full voiceover script. One section per beat (`# intro`, `# concept1`, ... `# outro`) for editing; section markers are stripped before TTS sees it. **Apply the rules in `AUDIO_STYLE.md` at the repo root before authoring.** |
| `regen.sh` | Helper that runs `npx hyperframes tts` to produce `voiceover.mp3`. |

## Regenerating

From `03-Video/`:

```bash
../02-audio/regen.sh
```

This:
1. Strips section headers and the header comment from `tts_script.txt`
2. Runs Kokoro TTS (`am_michael`, speed 1.15 — slower than 1.25 for more natural prosody) on the cleaned text
3. Writes `voiceover.mp3` (~1.1 MB, ~155s)
4. Prints the new duration

Override the speed or voice:

```bash
TTS_SPEED=1.40 ../02-audio/regen.sh
TTS_VOICE=af_sky ../02-audio/regen.sh
```

The script auto-sets `HYPERFRAMES_PYTHON` to the Windows Python 3.11
path from GUIDE.md. Override with `HYPERFRAMES_PYTHON=/path/to/python` if
you're on a different setup.

## After regenerating

1. The script prints the new duration. Open `03-Video/index.html` and update:
   - `data-duration` on `<div id="root">`
   - `data-duration` on `<div id="page-bg">`
   - `data-duration` on `<audio id="bed">`
   - `data-duration` on `<audio id="vo">`
2. Update the JS timeline: `data-duration` of the music fade-out (`tl.to(bed, ..., 141.0)`)
3. From `03-Video/`, run `npm run check` and `npm run render`

## TTS settings used (for reproducibility)

- Voice: `am_michael` (Kokoro-82M, local)
- Speed: `1.15` (slower than 1.25 for more natural prosody; see `AUDIO_STYLE.md`)
- Lang: en-us (auto-detected from voice prefix)

The combined-file duration (~155s) is longer than the original
8-file split (~91s) because Kokoro reads a single stream more
slowly than it reads 8 short independent streams, and we now run at
speed 1.15 instead of 1.25. The 95s composition design is now ~155s
— to fit a shorter cut, either time-stretch the audio (ffmpeg
`atempo`), or trim the script.

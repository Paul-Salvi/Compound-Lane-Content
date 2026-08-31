# Paul × TTS_SPEED A/B audit

Calibration runs of the VibeVoice/Paul voiceover pipeline at different
ffmpeg `atempo` rates, measured against the 30s floor of
`docs/pacing-rules-v1.md`.

## Test bench

- **Project:** `projects/roth-ira-sp500/` (the first post-pacing-rules-v1.md reel)
- **Script:** 93 words, 6 segments, blank-line separated, no comments
- **Voice:** VibeVoice 1.5B + `en-Paul_man.wav` (custom)
- **Backend:** VibeVoice local (GPU, RTX 4060 4 GB, bfloat16)
- **Post-process:** ffmpeg `-filter:a atempo=N.NN -codec:a libmp3lame -qscale:a 4`
- **Measurement:** `ffprobe .media/voiceover/voiceover.mp3` (printed by regen)

## Results

| TTS_SPEED | Native WAV | MP3 duration | Δ vs 30s floor | Verdict |
|---|---|---|---|---|
| 1.15× | 31.4s | **27.3s** | −2.7s (under) | too slow |
| **1.20×** | 35.7s | **29.8s** | **−0.2s (at floor)** | **winner** |
| 1.25× | (not measured) | (not measured) | — | runner-up |
| 1.30× | 33.2s | **25.5s** | −4.5s (under) | over-fast |

## Why 1.20× won

`docs/pacing-rules-v1.md` sets a 30-40s runtime window for any reel. The
Roth reel script lands at exactly the 30s floor when the MP3 is
rendered at 1.20× (29.8s, within VibeVoice's per-segment stochasticity
of ±0.3s). Faster speeds (1.30×) ship under-floor because VibeVoice's
per-segment fixed overhead shrinks the native WAV too much for the
higher atempo factor to fully compensate. Slower speeds (1.15×) are
calm but cross under the 30s floor.

## How to re-run

```bash
cd projects/roth-ira-sp500/04-video
TTS_SPEED=1.15 ./regen.sh   # → 27.3s
TTS_SPEED=1.20 ./regen.sh   # → 29.8s
TTS_SPEED=1.30 ./regen.sh   # → 25.5s
```

For each run, the regen prints `duration: N.NNN s`. Update this file
and `AUDIO_STYLE.md` / `memory/vibevoice-paul-tts.md` if the winner
changes (re-run after a new VibeVoice release or a script-length
shift of >10 words).

## Why this matters

The old default was 1.30× because that was the winner of an early
1.00/1.25/1.30/1.40 A/B on a 4-concept script. But once
`docs/pacing-rules-v1.md` set the 30s floor as a hard contract, the
sweet spot shifted down — the new winner for ~90-word scripts is
1.20×. This audit re-calibrates the production default.

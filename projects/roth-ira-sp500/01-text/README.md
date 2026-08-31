# 01-text/ — Platform copy for roth-ira-sp500

This directory holds the YouTube / Instagram / Twitter copy that ships with
the roth-ira-sp500 project, ready to paste into each platform at upload time.

## Files (fill in this order)

1. **keywords.txt** — keyword research (Stage 1). Drives the primary keyword
   that every platform's copy must lead with.
2. **youtube.txt** — title + description + tags + Category/Type for Studio.
3. **instagram.txt** — hook + caption + alt text.
4. **twitter.txt** — main post + reply-link note.
5. **youtube-problems.txt** — (Stage 3, post-render only) timecoded Q&A
   pairs for YouTube's LearningVideo structured data. This file is
   pre-created with a TODO block and stays blocked until
   `projects/roth-ira-sp500/04-video/` has rendered with section timecodes.
6. **spanish-subs.srt** — (Stage 4, post-render only, optional) Spanish
   SubRip subtitle file uploaded to YouTube Studio → Subtitles. Pre-created
   with a TODO block; filled by `node scripts/build-subs.mjs roth-ira-sp500` after
   the human translates `04-video/tts_script.txt` to
   `04-video/tts_script.es.txt`.

## How these were generated

Each file is pre-populated with section headers and the per-platform
checklist from [docs/text-prompt-engine-v2.md](../../docs/text-prompt-engine-v2.md).
Run `node scripts/build-text.mjs roth-ira-sp500` to regenerate the scaffolding
(idempotent — won't clobber your edits). Run with `--force` to overwrite
an existing file (e.g., after a doc revision).

## Authoring

1. Open [docs/text-prompt-engine-v2.md](../../docs/text-prompt-engine-v2.md).
2. Paste the Stage 1 prompt into Claude against
   `projects/roth-ira-sp500/01-source/` (Variant B — preferred, no web fetch) or
   the live article URL (Variant A).
3. Save the keyword-research output to **keywords.txt**.
4. Run the Stage 2 prompt (keywords + locked JSON as inputs) and save the
   three platform blocks to **youtube.txt / instagram.txt / twitter.txt**.
5. Run the output checklist (Stage 1-2 section) at the bottom of the doc
   before considering pre-render work complete.
6. After the video renders with section timecodes: run the Stage 3 prompt,
   fill **youtube-problems.txt**, and apply the Category: Education /
   Type: Problem walkthrough fields at upload.
7. (Optional, Stage 4) After the voiceover timings are measured
   (faster-whisper output in `04-video/.media/voiceover/voiceover.json`),
   translate `04-video/tts_script.txt` to Spanish and save as
   `04-video/tts_script.es.txt`. Then run
   `node scripts/build-subs.mjs roth-ira-sp500` to fill **spanish-subs.srt** with
   a real .srt aligned to the English word timings. Upload via
   YouTube Studio → Subtitles → upload → set language "Spanish" → publish.

## Fact-check discipline

Every number in these six files must trace to
`projects/roth-ira-sp500/01-content/roth-ira-sp500.json` — the same "every number sourced"
promise that gates the visual-notes PNG also gates the platform copy. If a
number appears in your draft that isn't in the JSON, delete it or trace it
to a cited source in the article and add that source to `sources_footer`
in the JSON first. Do not invent statistics, even plausible ones. See
[GUIDE.md §17.2](../../GUIDE.md) (visual-notes fact-check gate).

## Pipeline position

`01-source/` → `01-content/` (Stage 1 JSON — locked) → **`01-text/` (this dir)**
→ `02-visual/` → `04-video/`. Stages 1-2 of `01-text/` run alongside
`02-visual/`; Stage 3 (`youtube-problems.txt`) is gated on the
`04-video/` render; Stage 4 (`spanish-subs.srt`) is also gated on the
`04-video/` render (needs the faster-whisper `voiceover.json` output)
plus a human-translated `tts_script.es.txt`. `01-text/` is otherwise a
terminal artifact: nothing downstream reads from it. The copy is pasted
manually at upload time on each platform; the SRT is uploaded as a file
via YouTube Studio → Subtitles.

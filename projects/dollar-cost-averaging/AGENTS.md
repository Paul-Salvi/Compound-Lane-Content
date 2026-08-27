# HyperFrames Composition Project

## Skills — USE THESE FIRST

**Always invoke the relevant skill before writing or modifying compositions.** Skills encode framework-specific patterns (e.g., `window.__timelines` registration, `data-*` attribute semantics, shader-compatible CSS rules) that are NOT in generic web docs. Skipping them produces broken compositions.

**Doing anything with HyperFrames?** Start at `/hyperframes` — it tells you what HyperFrames can do and which skill or workflow handles your intent (make a video, TTS / BGM, prep footage, author / animate, render, install blocks), confirms your brief up front (the intent layer), and routes every "make me a…" request (a video, a deck, a composition port) to the right workflow. Read it first, especially when there's no project context to orient you. The workflows it routes to:

- `/product-launch-video` — any **website** URL or brief / script → a product launch / SaaS / promo video, or a site tour / showcase featuring the site's own captured visuals.
- `/faceless-explainer` — arbitrary text (topic / article / notes), **no URL, no website capture** → 60-90s faceless explainer.
- `/embedded-captions` — an existing talking-head video (MP4) → the same footage with captions / subtitles added (rail + embed, or pure-cinematic embed); the footage itself is untouched.
- `/talking-head-recut` — an existing talking-head / interview / podcast video (MP4) → the same footage **packaged with designed graphic overlays** (kinetic titles, lower-thirds, data callouts, pull-quotes, side panels, pip) synced to the transcript; the clip plays unchanged underneath. (Plain captions/subtitles → `/embedded-captions`.)
- `/pr-to-video` — a GitHub PR (URL / `owner/repo#N` / "this PR") → 30-90s code-change explainer (changelog / feature reveal / fix / refactor).
- `/motion-graphics` — a short (typically under 10s) design-led **motion graphic**, motion-is-the-message, no narration: kinetic type, a stat / number count-up, a chart, a logo sting, a lower-third / overlay, or an animated tweet / headline / captured-page highlight; rendered to MP4 or a transparent overlay. Longer / narrated / custom → `/general-video`.
- `/music-to-video` — a **music track** (audio file, video to pull audio from, or one generated from a mood brief) → beat-synced video (lyric / slideshow / kinetic promo). Music drives pacing; user-supplied images / videos are cut onto the same beat grid.
- `/slideshow` — a **presentation / pitch deck / interactive deck** — discrete slides, fragment reveals, branching, hotspot navigation, presenter mode. Output is a navigable deck, not a rendered video.
- `/general-video` — fallback for any other video (title card, longer brand / sizzle reel, multi-scene montage, static loop, custom composition) and the home of **companion mode** — co-create with the full HyperFrames toolbox; the original hyperframes authoring flow, any length.

**Porting an existing composition?** `/remotion-to-hyperframes` translates a Remotion (React) composition into HyperFrames HTML — a source migration, separate from the creation workflows above.

The domain skills (`/hyperframes-core`, `/hyperframes-animation`, `/hyperframes-keyframes`, `/hyperframes-creative`, `/hyperframes-cli`, `/media-use`, `/hyperframes-audio`, `/hyperframes-registry`, `/figma`) and the full capability map live inside `/hyperframes` — it is the single source of truth for which skill handles which intent.

**Changing how real footage or images look or reveal?** Load `/media-use` and read its `references/media-treatments.md` before editing, even when the request only says dark, flat, boring, retro, private, or “make the reveal cooler.” It governs how footage is treated, never whether media may be used. Use canonical media treatments and seek-safe motion; do not improvise equivalent CSS/SVG filters or overlays.

> **Tailwind v4 projects** (`hyperframes init --tailwind`): see `/hyperframes-core` → `references/tailwind.md`.

> **Skill missing or stale?** Run `npx hyperframes skills update <name>` to install/refresh
> the specific skill you need (the `/hyperframes` router does this automatically before
> entering a workflow), or bare `npx hyperframes skills update` to refresh the core set plus
> everything already installed — neither pulls the full set. Restart the agent session so
> newly installed skills load.

## Visual Notes vs Video — Which Workflow?

| Need | Workflow |
|---|---|
| Static hand-drawn infographic (IG/Pinterest save asset) | `docs/visual-notes-prompt-system.md` + `GUIDE.md §17` + `templates/notebook-v2.html` → `projects/{slug}/02-visual/{slug}.html` → headless screenshot → PNG. No `npm run render`. `input/sample.html` is a throwaway preview mirror. |
| Motion promo reel (VO + BGM + GSAP) | `GUIDE.md §3–§16` + HyperFrames contract (`npm run check` / `render`) |
| Both from one article | Start with §17 JSON (Stage 1 → `projects/{slug}/01-content/{slug}.json`), render the visual page, then reuse the same JSON for the reel (`GUIDE.md §17.6` → `03-video/`) |

Full routing, mapping table, and validation: `GUIDE.md §17` + `docs/visual-notes-prompt-system.md`. Prefer saved local HTML (`projects/{slug}/01-source/source.html`) over URL fetch per taste.

## Commands

```bash
npm run dev          # human-operated foreground preview (blocks until stopped)
npx hyperframes preview --background  # agent-safe persistent Studio preview
npx hyperframes preview --status      # verify the persistent preview is listening
npx hyperframes preview --stop        # stop it when review is finished
npm run check        # lint + runtime + layout + motion + contrast (one command)
npm run render       # render to MP4
npm run publish      # publish and get a shareable link
npx hyperframes lint --verbose  # include info-level findings
npx hyperframes lint --json     # machine-readable output for CI
npx hyperframes docs <topic> # reference docs in terminal
```

> **Agents must use `npx hyperframes preview --background` for Studio handoff.** Do not rely
> on a shell/tool `run_in_background` wrapper around `npm run dev`: that foreground process
> remains owned by the invoking session and can disappear while the browser stays open,
> leaving refreshes at `ERR_CONNECTION_TIMED_OUT`. Verify with `preview --status`, keep it
> alive through review, and stop it explicitly with `preview --stop` afterward.

> **Pinned CLI version.** These scripts pin an exact `hyperframes@X.Y.Z` so this project re-renders identically over time. Weeks later that pin lags fixes shipped since. To move up: `npx hyperframes@latest upgrade --project . --check` (shows the delta), then `npx hyperframes@latest upgrade --project .` to rewrite the pins. Always unpinned — the pinned script re-runs the old version against itself.

## Documentation

**For quick reference**, use the local CLI docs command (no network required):

```bash
npx hyperframes docs <topic>
```

Topics: `data-attributes`, `gsap`, `compositions`, `rendering`, `examples`, `troubleshooting`

**For full documentation**, discover pages via the machine-readable index — do NOT guess URLs:

```
https://hyperframes.heygen.com/llms.txt
```

## Project Structure

- `index.html` — main composition (root timeline)
- `compositions/` — sub-compositions referenced via `data-composition-src`
- `meta.json` — project metadata (id, name)
- `transcript.json` — whisper word-level transcript (if generated)

## Linting — ALWAYS RUN AFTER CHANGES

After creating or editing any `.html` composition, **always** run the full check before considering the task complete:

```bash
npm run check
```

Fix all errors before presenting the result. Warnings should be reviewed before rendering.

## Key Rules

1. Every timed element needs `data-start`, `data-duration`, and `data-track-index`
2. Elements with timing **MUST** have `class="clip"` — the framework uses this for visibility control
3. Timelines must be paused and registered on `window.__timelines`:
   ```js
   window.__timelines = window.__timelines || {};
   window.__timelines["composition-id"] = gsap.timeline({ paused: true });
   ```
4. Videos use `muted` with a separate `<audio>` element for the audio track
5. Sub-compositions use `data-composition-src="compositions/file.html"` to reference other HTML files
  6. Only deterministic logic — no `Date.now()`, no `Math.random()`, no network fetches

## Video Production Guide

**Full workflow reference:** See `GUIDE.md` at the repo root for the comprehensive production handbook (video: §3–§16, visual notes: §17).

### Essential commands not in the default script set

```bash
npx hyperframes auth status   # check HeyGen sign-in; falls back to local Kokoro TTS if signed out
npx hyperframes tts "Hello" --voice am_michael --speed 1.25 -o audio/vo.wav   # local TTS (needs Python 3 + kokoro-onnx)
mc ai play -m musicgen-small -p "calm cinematic, soft strings, subtle piano, restrained percussion" -d 10    # local BGM via music-cli — 10s loop
mc ai play -m audioldm-s-full-v2 -p "soft chime, warm bell, clean single tone" -d 5     # SFX reveal cue via music-cli (4-5s each)
npx hyperframes capture "<url>" --project .   # capture a website (requires web credits)
```

### Speed workflow (20s promo reel)

1. `npx hyperframes init "projects/<slug>/03-video" --non-interactive --example=blank --skill=product-launch-video` (then `cd projects/<slug>/03-video`)
2. Write `BRIEF.md` (YAML frontmatter, 6–8 lines — see GUIDE.md section 5)
3. Write `STORYBOARD.md` (5 frames × 4s — see GUIDE.md section 6)
4. Write `SCRIPT.md` (~30 words total, see GUIDE.md section 7)
5. Generate TTS: `npx hyperframes tts "$(cat audio/tts_script.txt)" --voice am_michael --speed 1.25 -o audio/voiceover.wav`
6. Copy `index.html` from the guide template; swap content per frame
7. `npx hyperframes check` → fix all errors → repeat
8. `npx hyperframes render --fps 30`

### Speed workflow (visual notes static page)

1. Run Stage 1 prompt (`docs/visual-notes-prompt-system.md`, Variant B if `input/3/...html` exists) on the article → save JSON to `projects/{slug}/01-content/{slug}.json`
2. Spot-check every number in `body` vs the article (fact-check gate — blocking; see `GUIDE.md §17.2`)
3. Update `projects/{slug}/02-visual/{slug}.html` per JSON: fork `templates/notebook-v2.html` (global template), inject header (`handle`/`title`/`series_label`/`page_label`) + one `<section>` per concept using the `visual_type → component` mapping (`GUIDE.md §17.3` table); mirror to `input/sample.html` for a quick preview if needed
4. Keep fixed 1080×1920 canvas, no scroll — dense pages use 2-up flex rows + smaller type (body 1.2rem, h2 1.6rem, 40px blobs) per `GUIDE.md §17.4`
5. Headless screenshot → PNG: `msedge.exe --headless --disable-gpu --window-size=1080,1920 --screenshot=projects/{slug}/02-visual/{slug}.png "file:///…/projects/{slug}/02-visual/{slug}.html"` (or `temp/after.png` for a throwaway — see `GUIDE.md §17.5`)
6. If a reel is also needed: scaffold `projects/{slug}/03-video/` from the `templates/notebook-v2.html` recipe, wire VO/BGM/SFX per `GUIDE.md §8` + `§17.6` (spotlight dim + pen-circle, no camera zoom)
7. Validate: read `projects/{slug}/02-visual/{slug}.png` back; video variant additionally `npm run check` (video only)

### Monolith vs. sub-compositions

For videos ≤30s, use a **single monolithic `index.html`** with all frames as timed clips. This is faster than managing separate sub-composition files. Sub-compositions are only worth it for videos ≥60s or reusable components.

### Common pitfalls (don't repeat these)

| Pitfall | Fix |
|---|---|
| `video-creator` agent fails: "tool permission denied" | Execute the workflow manually — all steps are scriptable from the AGENTS.md |
| `content_overlap` layout error | Add `margin-bottom` between stacked text elements (subtitle → hero stat needs 48–64px) |
| "GSAP target #xxx not found" runtime warning | Delete stale `tl.fromTo` calls for removed/renamed elements |
| Clips nested inside wrapper `<div>` | Clips MUST be direct children of `#root`; put wrappers INSIDE clips |
| TTS too long for 20s | Shorten script to ~30 words, or increase `--speed` to 1.3–1.4 |
| Missing `class="clip"` on timed elements | Framework won't hide them — always add `class="clip"` |
| Portrait stat overlap (1080×1920) | margin-top: 28px on subtitle, margin-bottom: 4px on stat |
| Breakdown label/value as sibling divs | Wrap each pair in spans inside a flex div |
| Looped BGM instances overlap lint | Give each loop segment its OWN `data-track-index` (12, 13, 14, …) — same-track clips must not overlap |
| SFX/BGM fight the voiceover | Layer by volume: VO `1`, BGM `0.12`, SFX `0.35` — no `class="clip"` on any `<audio>` |
| Missing `AGENTS.md`/`CLAUDE.md` in new project | Copy the root AGENTS.md into the project after scaffold, or run `hyperframes init` |

### What I Need From You (checklist)

Fill this out for each project to keep things moving at lightning speed:

```
□ Source:  URL _____  OR  local file _____  (dont webfetch — paste content)
□ Type:    promo / explainer / motion-graphic / caption-overlay / visual-notes / other: _____
□ Length:  ___s  (under 10s? over 60s?)
□ Format:  landscape 1920×1080 / portrait 1080×1920 / square 1080×1080
□ Voice:   yes / no  (if yes, male am_michael / female af_sky)
□ Speed:   1.0 / 1.25 / 1.3 / 1.4
□ Brand:   name _____  primary color _____  secondary color _____  bg _____
□ Fonts:   display _____  mono _____  body _____
□ Logo:    path _____  (or "no logo")
□ Hook:    one sentence — what should viewers remember?
□ Key data: _____  (3-5 numbers/stats to feature)
□ CTA:     destination URL or call-to-action _____
□ Don'ts:  _____  (what NOT to include or say)
□ Visual notes (if Type=visual-notes): JSON path projects/{slug}/01-content/{slug}.json OR article URL _____ (local file preferred)
□ Output:  static PNG only / video reel / both  (portrait 1080×1920 default)
□ Fact-check: numbers sourced per docs/visual-notes-prompt-system.md gate? yes / pending
□ Project: projects/{slug}/ (video always at `projects/{slug}/03-video/`)
```

### Audio setup (Windows)

```powershell
# If Kokoro TTS fails with "Python 3 is required":
$env:HYPERFRAMES_PYTHON="C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe"
pip install kokoro-onnx soundfile

# ALWAYS write the VO text to audio/tts_script.txt FIRST (single source of truth)
# so wording can be edited and the WAV regenerated without hunting for the text:
echo "Your voiceover text here." > audio/tts_script.txt
npx hyperframes tts "$(cat audio/tts_script.txt)" --voice am_michael --speed 1.25 -o audio/voiceover.wav

# Correct the voiceover: edit audio/tts_script.txt, re-run the tts command above,
# then update data-duration on <audio id="vo"> in index.html to the new length
# (ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 audio/voiceover.wav)
# and re-run `npx hyperframes check`.

# BGM — 10s loop (see GUIDE.md §8 for the looping pattern):
mc ai play -m musicgen-small -p "calm cinematic, soft strings, subtle piano, restrained percussion" -d 10
copy "%LOCALAPPDATA%\music-cli\ai_music\<newest>.wav" audio\bgm.wav

# SFX reveal cues — audioldm-s-full-v2 (4-5s each, volume 0.35):
mc ai play -m audioldm-s-full-v2 -p "soft chime, warm bell, clean single tone" -d 5
copy "%LOCALAPPDATA%\music-cli\ai_music\<newest>.wav" assets\sfx\sfx-chime.wav
```

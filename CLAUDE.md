# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Read these four files first, in this order:**
> 1. **`GUIDE.md`** — the 50KB production handbook. Rules, palettes, pitfalls, the HyperFrames contract, the visual-notes recipe, the speed workflow. Canonical; if anything in this file conflicts with it, **GUIDE.md wins**.
> 2. **`AGENTS.md`** — the skill-routing contract for video work. Tells Claude which HyperFrames skill to invoke for each intent (make a video, TTS, capture, animate, etc.) and the project-level lint/render commands.
> 3. **`docs/visual-notes-prompt-system.md`** — the Stage 1 (article → JSON) + Stage 2 (JSON → image/HTML) prompts. Use it whenever a new article enters the repo.
> 4. **`docs/pacing-rules-v1.md`** — the canonical pacing contract for any reel (30–40s runtime, 75–100 word VO, 7-beat map, 10-item validation). The regen scripts in `04-video/` call `scripts/check-pacing.mjs` against this spec before every TTS run. If anything in this file or `AUDIO_STYLE.md` conflicts with pacing-rules-v1.md for **delivery-layer** numbers (word count, hook deadline, beat placement, CTA position), pacing-rules-v1.md wins.
>
> This file is the **index** that tells future Claude sessions which file to read for which job, plus the load-bearing rules from `AGENTS.md` / `GUIDE.md` that the rest of those documents assume you already know.

## What this repo is

A content-factory repo for **Compound Lane** (a plain-English investing-education site). It produces two distinct deliverables per article:

1. **Visual notes** (hand-drawn notebook infographics) — static 1080×1920 PNGs for IG/Pinterest.
2. **Promo reels** — short vertical videos (1080×1920) with voiceover, BGM, and animated pointers.

Both lanes are driven by the same per-article JSON spec; the visual is the source of truth, the video is an optional second pass.

## Repository layout

```
.
├── GUIDE.md                       # canonical production handbook (§17 = visual notes)
├── AGENTS.md                      # HyperFrames skill routing + project-level contract
├── docs/
│   └── visual-notes-prompt-system.md   # Stage 1 (article→JSON) + Stage 2 (JSON→image/HTML)
├── templates/
│   └── notebook-v2.html           # global v2 notebook template (do not edit; fork per project)
├── assests/                       # shared brand assets (note the misspelling — historical)
│   └── logo.svg                   # compound-lane watermark for notebook pages
└── projects/
    └── {slug}/                    # one folder per article (kebab-case)
        ├── 01-source/             # raw saved HTML of the article
        ├── 01-content/{slug}.json # Stage 1 JSON — single source of truth
        ├── 01-text/               # platform copy (YouTube/IG/Twitter) + keywords + Spanish subs (post 01-content)
        │   ├── keywords.txt       # Stage 1 keyword research
        │   ├── youtube.txt        # Stage 2 YT title/description/tags
        │   ├── instagram.txt      # Stage 2 IG hook/caption/alt text
        │   ├── twitter.txt        # Stage 2 tweet + reply-link note
        │   ├── youtube-problems.txt  # Stage 3 (post-render) timecoded Q&A for YouTube Learning
        │   ├── spanish-subs.srt   # Stage 4 (post-render) Spanish SRT for YouTube Studio upload
        │   └── README.md          # per-project pointer to docs/text-prompt-engine-v2.md
        ├── 02-visual/             # rendered notebook HTML + PNG
        │   ├── {slug}.html        # forked from templates/notebook-v2.html
        │   └── {slug}.png         # headless screenshot
        ├── 03-Video/              # optional HyperFrames composition
        │   ├── index.html         # main composition (root timeline)
        │   ├── meta.json          # project metadata
        │   ├── transcript.json    # whisper word-level transcript (if generated)
        │   ├── hyperframes.json
        │   ├── package.json
        │   ├── compositions/      # sub-compositions referenced via data-composition-src
        │   ├── public/            # rasterized page background, hand SVG
        │   ├── .media/            # generated TTS + BGM
        │   └── renders/           # output MP4s
        ├── 03-Video-animate/      # whiteboard-style animation (hand-drawn reveal of visual notes)
        │   ├── index.html         # main composition (root timeline; static chrome + N section clips)
        │   ├── package.json       # pinned hyperframes scripts (read from 03-Video/package.json by build)
        │   ├── meta.json          # computed timeline summary (intro/concept/outro durations + per-section starts)
        │   ├── .media/music/      # BGM bed (copied from templates/audio/whiteboard-bgm.mp3)
        │   ├── .media/sfx/        # SFX scribble (copied from templates/audio/sfx/scribble-1.mp3)
        │   └── renders/           # output MP4s (1080×1920, ~30s, 1-2 MB)
        ├── BRIEF.md               # locked intent (5-line YAML frontmatter)
        ├── STORYBOARD.md          # beat-by-beat plan with anchor map
        ├── frame.md               # design spec (canvas, tokens, audio)
        ├── AGENTS.md              # project-scoped skill contract (copied from init)
        └── CLAUDE.md              # project-scoped guidance (copied from init)
```

## Where to start — read by intent

| You need to… | Read this first | Then this |
|---|---|---|
| Produce a static hand-drawn infographic from a new article | `docs/visual-notes-prompt-system.md` (Stage 1) | `GUIDE.md §17` (visual notes recipe) |
| Generate platform copy (YouTube/IG/Twitter) for a new article | `docs/text-prompt-engine-v2.md` | `node scripts/build-text.mjs <slug>` (then fill the 5 txt files; Stage 3 is post-render) |
| Generate a Spanish subtitle file for an existing video | `docs/text-prompt-engine-v2.md` §Stage 4 | translate `04-video/tts_script.txt` → `tts_script.es.txt`, then `node scripts/build-subs.mjs <slug>` |
| Scaffold a `03-Video/` HyperFrames composition from an existing JSON | `AGENTS.md` (skills + commands) | `GUIDE.md §3–§16` (full video workflow) |
| Add a 20s promo reel from scratch (URL or local file) | `AGENTS.md` → invoke `/product-launch-video` | `GUIDE.md §3–§16` for the contract |
| Add an animated notebook reel reusing the visual-notes JSON | `AGENTS.md` → `/general-video` companion mode | `GUIDE.md §17.6` (video variant recipe) |
| Add a whiteboard-style animation (stroke-draw + pop-in reveals, no VO) from an existing visual-notes JSON | run `node scripts/build-animate.mjs [slug]` | template `templates/notebook-v2-animate.html`; per-project config under `01-content/{slug}.json` `animate: { intro_s, concept_s, outro_s }` (defaults 2.0 / 4.5 / 2.0) |
| Fix a HyperFrames lint error in an existing `index.html` | `AGENTS.md` "Linting — ALWAYS RUN AFTER CHANGES" | `GUIDE.md §10` (contract) + `§15` (pitfalls) |
| Regenerate TTS or BGM for an existing composition | `AGENTS.md` "Audio setup (Windows)" | `GUIDE.md §8` (TTS / mc CLI music) |
| Write a voiceover script that won't sound robotic | `AUDIO_STYLE.md` (root — 7 rules + checklist) | `GUIDE.md §18` (full human-likeness recipe) |
| Understand a `frame.md` design spec | `GUIDE.md §11` (visual system) | `GUIDE.md §12` (frame patterns) |

**`AGENTS.md` is a project-level file**: every `projects/{slug}/03-Video/` (and the root) carries a copy. It's the same file in each spot — keep them in sync when you edit.

## Core contract (these rules are enforced by the framework)

These are the load-bearing rules from `AGENTS.md` + `GUIDE.md` §10 that all `03-Video/index.html` compositions must satisfy. If you only have time to read one section, read this one.

**Numbers everywhere.** The "every number sourced" rule that gates `01-content/{slug}.json` (see `GUIDE.md §17.2`) also gates `01-text/*.txt` — the platform copy is a terminal artifact, but every figure in the YouTube description / IG caption / tweet / YouTube Learning Q&A must trace to the same locked JSON, never be invented. Apply the `docs/text-prompt-engine-v2.md` output checklist before considering `01-text/` complete.

### HyperFrames composition contract
1. **Every timed element** needs `data-start`, `data-duration`, and `data-track-index`.
2. **Timed elements** MUST have `class="clip"` — the framework uses this for visibility control.
3. **Clips MUST be direct children of `#root`** — wrappers inside clips are fine, but never nest a clip inside a wrapper `<div>`. (Most common cause of "GSAP target not found" warnings.)
4. **Timelines** are `paused: true` and registered on `window.__timelines`:
   ```js
   window.__timelines = window.__timelines || {};
   window.__timelines["composition-id"] = gsap.timeline({ paused: true });
   ```
   The key must match `data-composition-id` on `#root`.
5. **Videos** use `muted` with a separate `<audio>` element for the audio track.
6. **Sub-compositions** use `data-composition-src="compositions/file.html"`.
7. **Only deterministic logic** — no `Date.now()`, no `Math.random()`, no network fetches at runtime.

### Audio convention (volume layering)
- VO `data-volume="1"`, BGM `0.12`, SFX `0.35`. Effects sit under narration, never over it.
- BGM loop segments each get their own `data-track-index` (12, 13, 14, …) — same-track clips cannot overlap.
- `<audio>` and `<video>` do **not** get `class="clip"` — the framework manages audio visibility directly.

### Lint + render workflow
- After **any** change to a `.html` composition: run `npm run check` (lint + runtime + layout + motion + contrast). Fix all errors before considering the task complete. Warnings should be reviewed before rendering.
- For agent-safe Studio handoff, use `npx hyperframes preview --background` + `--status` + `--stop` — never wrap `npm run dev` in a `run_in_background` shell.
- Pin policy: `package.json` scripts pin an exact `hyperframes@X.Y.Z`. To upgrade: `npx hyperframes@latest upgrade --project . --check` (preview delta), then `--project .` (rewrite pins). Never edit pins by hand.

## Workflow — which lane do I need?

| Deliverable | Lane | Source of truth | Output |
|---|---|---|---|
| Static hand-drawn infographic (IG/Pinterest) | Visual notes | `01-content/{slug}.json` | `02-visual/{slug}.png` |
| Short video (Reels / Shorts / TikTok) | Promo reel | same JSON + `BRIEF.md` / `STORYBOARD.md` | `03-Video/renders/*.mp4` |
| Both from one article | Both | JSON drives both | PNG + MP4 |

**Decision rule:** screenshotted/saved/pinned → visual notes. Watched with narration → video. The JSON is the contract that lets both come from one source.

### The whiteboard-animation lane (`03-Video-animate/`)

A third, lighter-weight lane: the static visual notes, animated. No voiceover, no camera moves — just the notebook page rendering itself stroke-by-stroke, blob-by-blob. Built from the same `01-content/{slug}.json` that drives the static PNG and the narrated reel, so the per-project content stays one source of truth.

- **Template:** `templates/notebook-v2-animate.html` (fork of `notebook-v2.html`; static chrome stays at z-index 0, each concept becomes a timed `<section class="clip">` clip at z-index 1).
- **Build:** `node scripts/build-animate.mjs [slug ...]` (auto-discovers all slugs with `01-content/*.json` if no args). Pure ESM, zero npm deps. Reads `animate: { intro_s, concept_s, outro_s }` per JSON, defaults `2.0 / 4.5 / 2.0` (~31 s for 6 concepts).
- **Animation:** CSS keyframes only — `ink-draw` (SVG stroke via `pathLength="1"`), `pop-in` (`.num-blob` scale-bounce), `fade-in` (text), `arrow-head-pop`. Stagger within each section: 0.00 num-blob + SVG, 0.05 h2, 0.15 lede, 0.25 visual, 0.30 arrowhead. GSAP timeline is audio-only (bed volume envelope).
- **Audio:** Optional. If `templates/audio/whiteboard-bgm.mp3` and `templates/audio/sfx/scribble-1.mp3` exist, the build copies them to `.media/music/bed.mp3` and `.media/sfx/scribble-1.mp3` and emits `<audio>` tags (BGM track 10, SFX tracks 12..12+N-1). `--with-audio` fails loudly on missing source files; `--skip-audio` disables detection. Default: detect, omit silently if absent.
- **Render:** `cd projects/{slug}/03-Video-animate && npm run render` — produces a 1080×1920 MP4 (~30 s, 1-2 MB) at `renders/{slug}-animate.mp4`.

## The visual-notes system (the dominant lane)

1. **Stage 1** — paste `docs/visual-notes-prompt-system.md` Stage 1 prompt (Variant B with local HTML) into Claude along with the article file path. Output: `01-content/{slug}.json`.
2. **Fact-check gate (blocking)** — every number in `concepts[].body` must trace to the article. Do not proceed to Stage 2 until verified.
3. **Render** — fork `templates/notebook-v2.html` into `02-visual/{slug}.html`, inject 6 concepts from JSON, then headless-screenshot to `02-visual/{slug}.png` (see `GUIDE.md §17.5` for the exact `msedge.exe` command).
4. **Optional video** — scaffold `03-Video/` from `templates/notebook-v2.html` recipe, wire VO/BGM/SFX per `GUIDE.md §8` + `§17.6`, then `npm run check` (0 errors required).

The v2 recipe is **fixed** (warm paper, `Caveat`+`Patrick Hand`, `ink-navy`/`ink-maroon`/`ink-green`/`ink-yellow`, 41px rules, `rough-a/b/c` filters, `.watermark`). Content swaps only — tokens, filters, ruled lines, and per-blob radii stay. Mixing visual-notes tokens with site-template tokens (`Fraunces`/`IBM Plex Mono`/`Inter`, `--paper`/`--pine`/`--ochre`) is a style bug.

## Speed workflow (20s promo reel)

From `AGENTS.md` "Speed workflow (20s promo reel)":

1. `npx hyperframes init "projects/<slug>/03-Video" --non-interactive --example=blank --skill=product-launch-video` (then `cd projects/<slug>/03-Video`)
2. Write `BRIEF.md` (YAML frontmatter, 6–8 lines — see `GUIDE.md §5`)
3. Write `STORYBOARD.md` (5 frames × 4s — see `GUIDE.md §6`)
4. Write `SCRIPT.md` (~30 words total, see `GUIDE.md §7`)
5. Generate TTS: `npx hyperframes tts "$(cat audio/tts_script.txt)" --voice am_michael --speed 1.15 -o audio/voiceover.wav` (20s promo lane — Kokoro local TTS. For the production 30s voiceover reels use the VibeVoice/Paul pipeline in `templates/video/regen.{ps1,sh}.tpl` instead; see `AUDIO_STYLE.md` for the current default and `samples/paul-speed-audit/` for the speed selection.)
6. Copy `index.html` from the guide template; swap content per frame
7. `npx hyperframes check` → fix all errors → repeat
8. `npx hyperframes render --fps 30`

For ≤30s videos, use a single monolithic `index.html` — sub-compositions aren't worth the overhead. Use sub-compositions only for ≥60s or reusable components.

## Common tasks

**Scaffold a new article project:**
```bash
mkdir -p projects/{slug}/{01-source,01-content,02-visual,03-Video}
# then run Stage 1 prompt → save JSON to 01-content/{slug}.json
# fork templates/notebook-v2.html → 02-visual/{slug}.html
# headless screenshot → 02-visual/{slug}.png
```

**Regenerate a video voiceover** (the WAV is derived; `tts_script.txt` is the source of truth):

> **Before writing or editing `tts_script.txt`**, read `AUDIO_STYLE.md` at the
> repo root and apply the 7 rules + checklist. The rules exist because
> neither TTS engine (Kokoro or VibeVoice) supports SSML — punctuation is
> the only prosody lever. The production 30s reels use **VibeVoice / Paul**
> (default speed `1.30×`); the 20s promo recipe below uses **Kokoro /
> `am_michael`** (speed `1.15`). The script-writing rules are shared
> across both lanes.

```powershell
# Windows / PowerShell — 20s promo recipe (Kokoro / am_michael)
# For the 30s voiceover reels, use the VibeVoice regen.ps1 / regen.sh in
# projects/<slug>/04-video/ instead. See AUDIO_STYLE.md for the current
# Paul + 1.30× default.
$env:HYPERFRAMES_PYTHON="C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe"
npx --yes hyperframes@0.8.11 tts "$(cat audio/tts_script.txt)" --voice am_michael --speed 1.15 -o audio/voiceover.wav
# then update <audio id="vo" data-duration="..."> in index.html to match the new length
npm run check
```

**Headless screenshot for static notes** (Windows):
```powershell
msedge.exe --headless --disable-gpu --window-size=1080,1920 `
  --screenshot=projects/{slug}/02-visual/{slug}.png `
  "file:///D:/Projects/Compound-Lande/Compound-Lane-Content/projects/{slug}/02-visual/{slug}.html"
```

**Run a one-shot lint pass** (CI-style, no render):
```bash
cd projects/{slug}/03-Video
npx --yes hyperframes@0.8.11 check
```

## Where to look when stuck

- **Layout / overlap / font issues** → `GUIDE.md §11` (Compound Lane visual system) + `§15` (pitfalls).
- **Style mixing / wrong palette** → `GUIDE.md §11` "Which Palette Where" table — site template (Fraunces/Plex/Inter, `--paper`/`--pine`/`--ochre`) is for **web articles only**; visual notes (Caveat/Patrick Hand, `--ink-navy`/etc.) is for **notebook assets only**.
- **GSAP target not found / dead tweens** → `GUIDE.md §15` Pitfall 7 — clean up `tl.fromTo` calls when restructuring HTML.
- **HyperFrames lint failure** → `npx hyperframes lint --verbose` for the sectioned output. Most failures are missing `class="clip"`, wrong `data-track-index` (same-track overlap), or clip-nested-in-wrapper.
- **TTS / BGM / SFX** → `GUIDE.md §8` covers Kokoro (local) + `mc ai play` (musicgen-small / audioldm-s-full-v2). No HeyGen key required.
- **Skill not found / stale** → `AGENTS.md` "Skill missing or stale" — `npx hyperframes skills update <name>` and restart the session.
- **Pinned CLI is behind on fixes** → `AGENTS.md` "Pinned CLI version" — `npx hyperframes@latest upgrade --project . --check` first.

## First example to read

`projects/dollar-cost-averaging/` is the canonical end-to-end example — JSON in `01-content/`, rendered HTML+PNG in `02-visual/`, full HyperFrames reel in `03-Video/` (with `BRIEF.md` / `STORYBOARD.md` / `frame.md` / `compositions/` / `public/` / `renders/`). When in doubt about layout, structure, or naming, mirror what this project did.

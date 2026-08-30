# HyperFrames Video Production Guide

A field manual for producing Compound Lane promo reels, educational videos, and **visual study-notes** at speed. This guide captures the **exact workflow**, **contract rules**, **pitfalls**, and **shortcuts** discovered building the first promo (Roth IRA Income Limits, 20s) plus the hand-drawn notebook system (`input/sample.html` + `docs/visual-notes-prompt-system.md`).

> **Which workflow do I need?** Motion promo reel with VO/BGM/GSAP → §3–§16. Static hand-drawn infographic (IG/Pinterest save asset) → **§17**. Both from the same article → start with §17 JSON, then feed §3–§16.

---

## Table of Contents

1. [Quick Start: 5-Minute Checklist](#1-quick-start-5-minute-checklist)
2. [Prerequisites](#2-prerequisites)
3. [Project Setup](#3-project-setup)
4. [Source Material & Capture](#4-source-material--capture)
5. [BRIEF.md — Locked Intent](#5-briefmd--locked-intent)
6. [Storyboarding (STORYBOARD.md)](#6-storyboarding-storyboardmd)
7. [Scripting (SCRIPT.md)](#7-scripting-scriptmd)
8. [Audio (TTS)](#8-audio-tts)
9. [Building the Composition (index.html)](#9-building-the-composition-indexhtml)
10. [The HyperFrames Contract](#10-the-hyperframes-contract)
11. [Compound Lane Visual System](#11-compound-lane-visual-system)
12. [Frame Patterns Library](#12-frame-patterns-library)
13. [Animation Quick Reference](#13-animation-quick-reference)
14. [Check, Fix, Render](#14-check-fix-render)
15. [Common Pitfalls & Gotchas](#15-common-pitfalls--gotchas)
16. [Speed Tips](#16-speed-tips)
17. [Visual Notes (Study Notes) System](#17-visual-notes-study-notes-system)

---

## 1. Quick Start: 5-Minute Checklist

For when you need a video yesterday:

```
1. npx hyperframes init "projects/<slug>/03-Video" --non-interactive --example=blank --skill=product-launch-video
2. cd projects/<slug>/03-Video
3. Write BRIEF.md (5 lines, YAML frontmatter)
4. Write STORYBOARD.md (N frames, 4s each, 20s total)
5. Write SCRIPT.md (5 VO lines, ~30 words total)
6. Generate TTS → audio/voiceover.wav
7. Write index.html (monolithic, see template below)
8. npx hyperframes check  →  fix errors  →  repeat
9. npx hyperframes render --fps 30
10. MP4 in renders/
```

---

## 2. Prerequisites

### Python 3 (for Kokoro TTS)
```bash
# Check if available
python --version

# If missing, install from python.org, then:
pip install kokoro-onnx soundfile
```

If `pip install` fails on Windows:
```bash
python -m pip install kokoro-onnx soundfile
```

The `npx hyperframes tts` command needs Python at the path pointed to by `HYPERFRAMES_PYTHON`. On Windows, set it explicitly:
```powershell
$env:HYPERFRAMES_PYTHON="C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe"
npx hyperframes tts "..." --voice am_michael -o audio/voiceover.wav --speed 1.15
```

### Node.js / npm
```bash
node --version  # v22+ recommended
npm --version
```

### ffmpeg
Automatically bundled with the HyperFrames CLI. No manual install needed.

### No HeyGen API key → use local Kokoro TTS + mc CLI music
```bash
npx hyperframes auth status   # should say "Not signed in"
# Falls back to Kokoro (local TTS) + mc CLI music (local BGM)
```

### GPU
Render uses headless Chromium with `--use-gl=angle --use-angle=d3d11`. Hardware acceleration is auto-detected. If unavailable, add `--no-sandbox` or use CPU mode.

---

## 3. Project Setup

### Create a new project
```bash
cd <repo-root>
npx hyperframes init "projects/<slug>/03-Video" \
  --non-interactive \
  --example=blank \
  --skill=product-launch-video
```

This creates:
```
projects/<slug>/
├── 01-source/         # Article source (HTML + files) — see §17 for visual notes
├── 01-content/        # Stage-1 JSON (single source of truth)
├── 02-visual/         # Static PNG/HTML render (visual notes)
└── 03-Video/          # ← The video project
    ├── AGENTS.md      # The product-launch-video workflow
    ├── BRIEF.md       # Locked intent (you write this)
    ├── CLAUDE.md      # Auto-generated, mirrors AGENTS.md
    ├── SCRIPT.md      # Locked voiceover (you write this)
    ├── STORYBOARD.md  # Frame plan (you write this)
    ├── frame.md       # Design spec (you write this or use build-frame.mjs)
    ├── hyperframes.json   # Project config (auto-generated)
    ├── index.html     # The composition (you write this)
    ├── meta.json      # Project metadata (auto-generated)
    ├── package.json   # NPM scripts (auto-generated)
    ├── audio/         # TTS and BGM output
    ├── capture/       # Source extraction
    │   └── extracted/ # tokens.json, visible-text.txt, asset-descriptions.md
    ├── compositions/  # Sub-composition files (if modular)
    └── assets/        # Logo, images, etc.
```

### Verify the init worked
```bash
cat hyperframes.json    # should show width/height 1920x1080, authoringSkill: product-launch-video
ls index.html           # should exist (blank template)
```

---

## 4. Source Material & Capture

### URL → capture (requires web access / credits)
If the `npx hyperframes capture` command has credits:
```bash
npx hyperframes capture "<url>" --project .
```

### Local HTML → no-capture path
When web access is blocked (no credits) or the user provides a saved HTML file:

1. **Extract brand tokens** from the HTML:
   - CSS custom properties: `--pine: #2F5D4E`, `--ochre: #A85A24`, `--paper: #FAF8F3`, etc.
   - Font families: `font-family: 'Fraunces'`, `'IBM Plex Mono'`, `'Inter'`
   - Logo SVG (inline or `<img src>`)

2. **Extract visible text** (headlines, stat numbers, key phrases)

3. **Extract asset descriptions** (charts, diagrams, tables, callouts)

4. **Copy logo SVG** to `assets/`:
   ```bash
   # From the project root:
   copy input\files\logo.svg assets\compound-lane-logo.svg
   ```

5. **Create capture/extracted/ files manually:**
   - `tokens.json` — brand colors, fonts, spacing
   - `visible-text.txt` — all visible text content
   - `asset-descriptions.md` — inventory of visual assets

### No-capture path summary
When you have local source material:
- Skip `npx hyperframes capture`
- Create `capture/extracted/` files by hand
- Copy the logo SVG to `assets/`
- Build `frame.md` from the brand tokens directly

### Visual notes source (static infographics)
For **visual notes** (hand-drawn study-notes infographics — see `docs/visual-notes-prompt-system.md` + `GUIDE.md §17`), the source is the **JSON spec** produced by Stage 1 — not a capture. Prefer the **local HTML file** variant (Variant B, `input/3/...html`) over URL fetch per taste ("dont webfetch"). See §17 for the `visual_type → component` mapping and deterministic `input/sample.html` render path.

---

## 5. BRIEF.md — Locked Intent

Minimal format (YAML frontmatter, ~5-8 lines):

```yaml
---
workflow: product-launch-video
flow: automation
storyboard: no
message: "<one-line value prop that will stick>"
destination: web
aspect: 1920x1080
language: en
length: 20s
angle: educational-promo
narration: yes
---
```

**Fields explained:**

| Field | Value | Notes |
|---|---|---|
| `workflow` | `product-launch-video` | Routes to the right skill. For web URL → promo. |
| `flow` | `automation` | "autonomous" = build without review gates. "storyboard" = show board first. |
| `storyboard` | `no` | Skip the separate storyboard review gate. |
| `message` | `<string>` | The hook. What should the viewer remember? |
| `destination` | `web` | Where it's consumed (affects bitrate/aspect). |
| `aspect` | `1920x1080` | Landscape for web promos. `1080x1920` for shorts. |
| `language` | `en` | Voice language. |
| `length` | `20s` | Total duration. Use `s` suffix. |
| `angle` | `educational-promo` | "how-to", "listicle", "comparison", etc. |
| `narration` | `yes` | Include voiceover. |
```

---

## 6. Storyboarding (STORYBOARD.md)

### Format
Frontmatter + one `## Frame N — Title` section per frame.

### 20-second formula
**5 frames × 4 seconds** each. This is the sweet spot:
- Enough time for an entrance animation (0.5–1s)
- Enough time to read (2–3s)
- Smooth transition/cut at the end

```markdown
---
format: 1920x1080
duration: 20s
message: "..."
arc: Hook → Numbers → Concept → Proof → CTA
audience: <who>
mode: autonomous
music: confident minimal tech underscore
---

## Frame 1 — Hook

- scene: <one-line visual description>
- voiceover: "<VO text for this frame, ~6-8 words>"
- duration: 4s
- transition_in: cut
- status: outline
- type: hook | feature_showcase | benefit_highlight | cta
- persuasion: Pain validation | Statistical proof | ...
- beat: anxiety → curiosity | clarity → urgency | ...
- blueprint: titlecard-reveal | grid-card-assemble | dataviz-countup | kinetic-type-beats | cta-morph-press
- asset_candidates: assets/compound-lane-logo.svg

narrativeRole: <why this frame matters>
keyMessage: <one sentence>

**Visual direction:** <CSS/layout details>
```

### Blueprint types (quick reference)
| Blueprint | When to use | Visual style |
|---|---|---|
| `titlecard-reveal` | Hook frame | Large title + stat, dramatic entrance |
| `grid-card-assemble` | Numbers/statistics | Cards animate in staggered |
| `dataviz-countup` | Data viz | Bars count up, markers appear |
| `kinetic-type-beats` | Formula/example | Text animates to VO rhythm |
| `cta-morph-press` | Final frame | CTA element scales in |

### Frame content mapping
Each frame's `voiceover` field must match the SCRIPT.md line for that frame. The VO is the anchor — visuals support what the VO says, nothing extra.

---

## 7. Scripting (SCRIPT.md)

### Constraints
- 20s video ≈ **22–26 words** of spoken text (at 1.15× speed, am_michael voice)
- Each frame gets **one short sentence** (5–8 words)
- No jargon. Plain English.
- End with CTA URL.

### Format
```markdown
# SCRIPT — <project-name>

**Voice:** am_michael (Kokoro local)
**Voice settings:** speed 1.15 · natural pace (see `AUDIO_STYLE.md`)
**Voice direction:** Clear, authoritative, educational — plain-English financial instruction.

---

## Line N — <Frame title> (Frame N)

**Time:** <start> – <end>s
**Delivery:** <tone note>

    <spoken text>
```

### Timing map example (20s)
| Frame | Time | VO | Word count |
|---|---|---|---|
| 1 | 0–4s | "2026 Roth IRA limit: $7,500." | 6 |
| 2 | 4–8s | "Full under $153K single, $242K joint." | 8 |
| 3 | 8–12s | "Phase-out windows: just $15K and $10K." | 7 |
| 4 | 12–16s | "A $5K raise inside that narrow window can halve your contribution." | 12 |
| 5 | 16–20s | "Over the limit? Backdoor Roth or max your 401k. Full math at compoundlane.com." | 15 |

Total: ~48 words → ~21s at 1.15× speed → fits in 20s with room for pauses (will need to trim ~3 words or bump speed to 1.25 for a tighter fit).

### Writing tight VO for 20s
If the VO comes out too long (>20s):
1. Remove examples and comparisons
2. Focus on: hook number → threshold → consequence → solution
3. Combine two short sentences into one
4. Drop filler words ("actually", "basically", "so", "um")
5. Re-render at speed 1.3 or 1.4

### VO length formula
```
target_WordCount ≈ (duration_in_seconds × speed_multiplier × words_per_minute) / 60

Example: 20s × 1.15 × 80_wpm / 60 = ~31 words
```
At am_michael's natural pace (~80 wpm at speed 1.0), 1.15× gives ~92 wpm; 1.25× gives ~100 wpm (use for tight cuts).

---

## 8. Audio (TTS)

> **Before writing `tts_script.txt`**, read [`AUDIO_STYLE.md`](AUDIO_STYLE.md)
> at the repo root. It contains the 7 rules + PR checklist that make
> Kokoro sound human (Kokoro doesn't support SSML — punctuation is the
> only prosody lever). Speed default is now `1.15` (down from `1.25`).

### Check auth status
```bash
npx hyperframes auth status

# Expected output (no HeyGen key):
# Not signed in
# Falls back to local engines (Kokoro voice, mc CLI music)
```

### Generate voiceover
```bash
# Set Python path (Windows)
$env:HYPERFRAMES_PYTHON="C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe"

# First-time: install packages
pip install kokoro-onnx soundfile

# Generate VO (write text to file first for safety with $ signs)
echo "2026 Roth IRA limit: 7500. Full under 153K single, 242K joint. Phase-out windows: just 15K and 10K. A 5K raise inside that narrow window can halve your contribution. Over the limit? Backdoor Roth or max your 401k. Full math at compoundlane.com." > audio/tts_script.txt

npx hyperframes tts "$(cat audio/tts_script.txt)" --voice am_michael --speed 1.15 -o audio/voiceover.wav
```

### Voice recommendations (from `media-use` skill)
| Voice | Use case |
|---|---|
| `af_sky` | Female, marketing/promo |
| `am_michael` | Male, professional, marketing/promo |
| `af_heart` | Default female |
| `am_puck` | Male, conversational |

For finance/education content: `am_michael` (authoritative, clear).

### Verify audio duration
The TTS command outputs: `Generated Xs of speech`. For a 20s video, aim for 18–19s of VO.

### Correcting the voiceover (edit → regenerate)
`audio/tts_script.txt` is the **single source of truth** for the spoken words — always write it before generating, and edit it (not the WAV) when you want to change wording.

1. **Edit the words:** open `audio/tts_script.txt` and fix the line you want (e.g. "one hundred eighty seven" → "187").
2. **Regenerate** the WAV from the file (same command as generation):
   ```powershell
   $env:HYPERFRAMES_PYTHON="C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe"
   cd projects\<slug>\03-Video
   npx --yes hyperframes@0.8.10 tts "$(cat audio/tts_script.txt)" --voice am_michael --speed 1.15 -o audio/voiceover.wav
   ```
3. **Sync the duration:** read the new duration (`npx hyperframes tts` prints "Generated Xs of speech", or `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 audio/voiceover.wav`) and update `data-duration` on the `<audio id="vo">` element in `index.html`.
4. **Re-run the check:** `npx hyperframes check` → fix any layout shifts from the changed VO length (frames may need re-timing if the speech got longer/shorter).

> If the VO runs long, prefer bumping `--speed` to 1.3–1.4 over rewriting — but always edit `tts_script.txt` first so the file stays the source of truth.

### Music (BGM)
```bash
# Generate via music-cli (`mc`) — musicgen-small is the default model
# PREFERRED: generate a SHORT 10s bed and LOOP it to cover the full cut
# (a 10s loop is cheaper, faster, and easier to iterate than one full-length track)
mc ai play -m musicgen-small -p "calm cinematic, soft strings, subtle piano, restrained percussion" -d 10
copy "%LOCALAPPDATA%\music-cli\ai_music\<newest>.wav" audio\bgm.wav

# Or a full-length bed if the track doesn't loop cleanly:
mc ai play -m musicgen-small -p "confident minimal tech underscore" -d 37

# Sound effects / ambient audio — audioldm-s-full-v2 (model pre-downloaded)
mc ai play -m audioldm-s-full-v2 -p "soft gentle chime, warm bell, clean single tone, calm and subtle" -d 5
```

`mc` command reference (from the [music-cli AI playbook](https://github.com/luongnv89/music-cli/blob/main/docs/AI_PLAYBOOK.md)):

| Command | Purpose |
|---|---|
| `mc ai play -p "<prompt>" -d <seconds>` | Generate music (default model) |
| `mc ai play -m musicgen-small -p "..." -d <s>` | Music bed — fast, good quality (default) |
| `mc ai play -m audioldm-s-full-v2 -p "..." -d <s>` | SFX / ambient audio (per-cue, 4-5s each) |
| `mc ai list` | List generated tracks |
| `mc ai model` | List models + download status |
| `mc ai model download <model>` | Pre-download a model |

### Mixing audio and BGM

**Loop a short bed** by placing back-to-back `<audio>` instances (no `class="clip"`), each on its OWN `data-track-index` (clips on the same track must not overlap):
```html
<audio id="bgm1" src="audio/bgm.wav" data-start="0"    data-duration="9.94" data-track-index="12" data-volume="0.12" preload="auto"></audio>
<audio id="bgm2" src="audio/bgm.wav" data-start="9.94" data-duration="9.94" data-track-index="13" data-volume="0.12" preload="auto"></audio>
<audio id="bgm3" src="audio/bgm.wav" data-start="19.88" data-duration="9.94" data-track-index="14" data-volume="0.12" preload="auto"></audio>
<audio id="bgm4" src="audio/bgm.wav" data-start="29.82" data-duration="7.18" data-track-index="15" data-volume="0.12" preload="auto"></audio>
```
- **BGM volume `0.12`** (~-18 dB) — a bed under narration. **SFX volume `0.35`** — sits under VO + BGM.
- **SFX cues** go on their own tracks after the BGM (16+), placed at the key visual beat (`data-start` = the reveal moment), 4–5s each:
  ```html
  <audio id="sfx-chime"  src="assets/sfx/sfx-chime.wav"  data-start="0.9"  data-duration="5" data-track-index="16" data-volume="0.35" preload="auto"></audio>
  <audio id="sfx-impact" src="assets/sfx/sfx-impact.wav" data-start="10.9" data-duration="4" data-track-index="17" data-volume="0.35" preload="auto"></audio>
  ```
- For ducking BGM under VO with GSAP volume tween:
```javascript
tl.to("#bgm1", { volume: 0.3, duration: 0.5 }, 0);  // duck when VO starts
tl.to("#bgm1", { volume: 1, duration: 1 }, 18);   // fade back in
```

---

## 9. Building the Composition (index.html)

### Two approaches

**Monolithic (recommended for ≤30s promos):** Single index.html with all frames as clips. Faster to write, fewer moving parts.

**Modular (recommended for ≥60s with reusable components):** Separate sub-composition files in `compositions/frames/`, loaded via `data-composition-src`.

### Monolithic index.html skeleton
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <!-- Google Fonts (auto-cached by check/render) -->
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      /* Minimal CSS: .clip, fonts, brand colors, frame layout */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; }
      #root { position: relative; width: 1920px; height: 1080px; background: #FAF8F3; overflow: hidden; }
      .clip { position: absolute; inset: 0; overflow: visible; }
      /* ...brand styles... */
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="20" data-width="1920" data-height="1080">

      <!-- Background -->
      <div id="bg" class="clip" data-start="0" data-duration="20" data-track-index="1">
        <div style="position: absolute; inset: 0; background: #FAF8F3;"></div>
      </div>

      <!-- Logo (always visible, NOT a clip) -->
      <div class="wordmark">
        <svg viewBox="0 0 96 96">...</svg>
        <span>Compound Lane</span>
      </div>

      <!-- Frame 1 (0-4s) -->
      <div id="frame-1" class="clip" data-start="0" data-duration="4" data-track-index="2">
        <div class="frame-wrap">
          <h1 id="f1-title">...</h1>
          <div id="f1-stat">$7,500</div>
        </div>
      </div>

      <!-- Frame 2 (4-8s) -->
      <div id="frame-2" class="clip" data-start="4" data-duration="4" data-track-index="3">
        <div class="frame-wrap">
          ...
        </div>
      </div>

      <!-- ... more frames ... -->

      <!-- Progress bar -->
      <div id="progress" class="clip" data-start="0" data-duration="20" data-track-index="7">
        <div id="progress-fill"></div>
      </div>

      <!-- Audio (no class="clip" — framework manages) -->
      <audio id="vo" src="audio/voiceover.wav"
        data-start="0" data-duration="18.9" data-track-index="10" data-volume="1" preload="auto"></audio>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });

      /* Progress bar */
      tl.fromTo("#progress-fill", { width: 0 }, { width: "100%", duration: 20, ease: "none" }, 0);

      /* Frame 1 animations */
      tl.fromTo("#f1-title", { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.4);
      /* ... more animations ... */

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
```

---

## 10. The HyperFrames Contract

### Root element (REQUIRED)
```html
<div id="root"
  data-composition-id="main"
  data-start="0"
  data-duration="20"
  data-width="1920"
  data-height="1080">
```

- `id="root"` — convention (scaffolds use it for CSS targeting)
- `data-composition-id` — MUST match `window.__timelines["<id>"]` key
- `data-start="0"` — always 0 for the root
- `data-duration` — total video length in seconds
- `data-width` / `data-height` — can be 1920x1080 (landscape), 1080x1920 (portrait), 1080x1080 (square)

### Clips (REQUIRED for timed elements)
```html
<div id="unique-id"
  class="clip"
  data-start="0"
  data-duration="4"
  data-track-index="2">
```

- `class="clip"` — required on visible timed elements (`<div>`, `<img>`)
- `data-start` — when this element becomes visible (seconds)
- `data-duration` — how long it stays visible
- `data-track-index` — z-order layer; **clips on the same track must not overlap**

**Critical:** Visual clips MUST be **direct children** of the composition root. A clip nested inside a wrapper `<div>` is NOT registered.

### Audio element
```html
<audio id="vo" src="audio/voiceover.wav"
  data-start="0"
  data-duration="18.9"
  data-track-index="10"
  data-volume="1"
  preload="auto">
</audio>
```

- NO `class="clip"` — the framework manages audio visibility directly
- `data-track-index` should be high (e.g., 10) to avoid z-fighting
- `data-duration` should match the audio file's actual length

### Timeline registration (REQUIRED)
```javascript
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
// ... add tweens with absolute time ...
window.__timelines["main"] = tl;
```

- Timeline MUST be `paused: true`
- Use **absolute timestamps** (not relative labels) for all tweens
- Register on `window.__timelines` with the composition ID

### Font loading (standalone compositions)
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&...&display=swap" rel="stylesheet">
```

Fonts are fetched and cached by the HyperFrames compiler. They work in both `check` and `render`.

### Determinism rules
```
❌ NO Date.now()
❌ NO Math.random()
❌ NO fetch() / XMLHttpRequest
❌ NO WebSocket
✅ DO: deterministic GSAP animations with absolute timestamps
✅ DO: CSS animations with finite durations
✅ DO: static data attributes
```

---

## 11. Compound Lane Visual System

### Colors
```css
/* Primary palette */
--paper: #FAF8F3;         /* cream background */
--paper-alt: #F1EDE2;     /* cream card background */
--ink: #1B1F1D;           /* primary text */
--ink-muted: #565A55;     /* secondary text */
--rule: #DBD5C4;          /* borders/dividers */
--pine: #2F5D4E;          /* primary accent */
--pine-deep: #223F35;     /* dark pine */
--ochre: #A85A24;         /* secondary accent (warnings) */
--white: #FFFFFF;
--ochre-tint: #F3EBDD;
--sage-tint: #E4ECE7;
```

### Fonts
| Role | Font | Fallback |
|---|---|---|
| Headlines | `Fraunces` (serif) | `Georgia, serif` |
| Numbers/Stats | `IBM Plex Mono` (mono) | `'Courier New', monospace` |
| Body text | `Inter` (sans) | `-apple-system, sans-serif` |

### Portrait format tips (1080×1920)
- Reduce font sizes by 15-20% from landscape equivalents (Hero stat: 96px, Display title: 48px, Section title: 36px)
- Stack content vertically (portrait canvas is only 1080px wide)
- Logo at 32px offset (not 48px)
- Use `max-width: 880px` on content wrappers instead of 1400px
- 8-10 frames for 36-60s videos (each frame ~4-6s); each frame on its own track

### Layout principles
- **Cream paper background** (`#FAF8F3`) everywhere — never pure white
- **Pine green** for primary accents and important numbers
- **Ochre** for warnings, alerts, phase-out indicators
- **Stat cards**: cream background (`#F1EDE2`), 3px pine left border, subtle rule border
- **Logo**: top-left corner, 48px from edges
- **Progress bar**: 4px height, pine green, bottom edge
- **Monospace numbers** with `tabular-nums` for consistent digit alignment

### Typography scales (1920×1080)
| Element | Size | Font | Color |
|---|---|---|---|
| Hero stat | 5.5rem (88px) | IBM Plex Mono 700 | `--pine` |
| Display title | 3.2rem (51px) | Fraunces 600 | `--pine` |
| Section title | 2.5rem (40px) | Fraunces 600 | `--pine` |
| Stat card value | 1.4rem (22px) | IBM Plex 700 | `--ink` / `--pine` |
| Body text | 1.1rem (18px) | Inter 400 | `--ink-muted` |
| Eyebrow/label | 0.72rem (12px) | IBM Plex Mono | `--pine` |
| Formula | 1.1rem (18px) | IBM Plex Mono | `--ink` |

### Which Palette Where (don't mix)

| Lane | Canonical file | Fonts | Palette | Use when |
|---|---|---|---|---|
| **Site / article template** | Graphite Mono system | Fraunces (headlines) · IBM Plex Mono (numbers) · Inter (body) | `--paper #FAF8F3` / `--pine #2F5D4E` / `--ochre #A85A24` | Web article pages — never for notes assets |
| **Visual notes + notebook reels** | `templates/notebook-v2.html` (global template) → `projects/{slug}/02-visual/{slug}.html` (project render; `input/sample.html` throwaway) | Caveat 500/600/700 + Patrick Hand only (`--font-script`/`--font-hand`) | warm paper `oklch(97.5% .008 85)` · rule `oklch(85% .045 250)` at 41px · inks: `--ink-navy 42% .16 268` / `--ink-maroon 50% .18 25` / `--ink-green 50% .13 158` / `--ink-yellow 85% .13 95` · filters `rough-a/b/c` + `.ink` multiply · `.watermark` 700×700 | IG/Pinterest save assets + hand-drawn video reels |

Mixing the two (e.g. Fraunces inside `input/sample.html`, or `ink-navy` inside a promo stat card) is a style bug — keep lanes separate. Full notebook recipe: `GUIDE.md §17` + `docs/visual-notes-prompt-system.md` Stage 2 + taste #31/#49–#52.

---

## 12. Frame Patterns Library

### Pattern 1: Hook (titlecard-reveal)
```
[Background: --paper]
[Logo: top-left]
[Title: Fraunces 600, --pine, centered]
[Subtitle: Fraunces 400, --ink-muted, below title, 16px margin]
[Hero stat: IBM Plex Mono 700, --pine, 5.5rem, tilted -6° via GSAP rotation]

Animations:
  logo → opacity 0→1, y -10→0, 0.4s, 0.1s delay
  title → opacity 0→1, y -30→0, 0.6s ease power2.out, 0.4s delay
  subtitle → opacity 0→1, 0.3s, 1.2s delay  (margin: 16px below title, 64px above stat)
  stat → opacity 0→1, y 80→0, scale 0.5→1, 0.8s ease back.out(1.7), 0.9s delay
```

**Spacing fix:** Always give the subtitle `margin-bottom: 64px` (or large) before a hero stat to avoid content_overlap layout errors.

**Portrait fix:** In portrait (1080×1920), add margin-top: 28px to subtitle and margin-bottom: 4px to stat to prevent overlap — the narrower canvas makes this more likely.

### Pattern 2: Numbers (grid-card-assemble)
```
[Title: Fraunces 600, --pine]
[3 stat cards in a row, gap: 24px]
[Each card: --paper-alt bg, --rule border, 3px --pine left border]
[Card value: IBM Plex Mono 700, --ink or --pine]
[Card desc: Inter 400, 0.78rem, --ink-muted]
[Windows text: IBM Plex Mono, --ochre, 1.05rem]

Animations:
  title → fade up, 0.4s
  card-1 → fade up from y:20, 0.4s ease power2.out  (delay: +0.4s after title)
  card-2 → same, +0.3s stagger
  card-3 → same, +0.3s stagger
  windows → fade in, 0.3s
```

### Pattern 3: Data viz (dataviz-countup)
```
[Title: Fraunces 600, --pine]
[Horizontal bar: 800px wide, 44px tall, --ink border, --ink radius]
[3 zones (absolute positioned): Full (--pine tint 15%), Partial (--ochre tint 28%), None (--gray tint 22%)]
[Zone labels: IBM Plex Mono 700, centered in each zone]
[Below: $153K / $168K / $242K / $252K markers, IBM Plex Mono 10px, --ink-muted]
[Callout: --ochre bg, --paper text, rounded, fade in with scale]
[Formula: IBM Plex Mono 1.1rem, --ink, below callout]

Animations:
  title → fade up, 0.4s
  zone-full → width 0%→40%, 0.6s ease power2.inOut
  zone-partial → width 0%→35%, 0.6s (delay +0.6s)
  zone-none → width 0%→25%, 0.6s (delay +0.6s)
  callout → scale 0.8→1, 0.4s ease back.out(1.7)
  formula → fade in, 0.3s
```

**Zone structure:**
```css
.phaseout-bar { position: relative; width: 800px; height: 44px; border: 1.5px solid #1B1F1D; border-radius: 6px; overflow: hidden; }
.zone { position: absolute; top: 0; height: 100%; width: 0%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.zone-full { left: 0; background: rgba(47, 93, 78, 0.18); }
.zone-partial { left: 40%; background: rgba(168, 90, 36, 0.28); }
.zone-none { left: 75%; background: rgba(86, 90, 85, 0.22); }
```

### Pattern 4: Impact (count-up)
```
[Title: Fraunces 600, --pine]
[Stat: IBM Plex Mono 700, 4.5rem, --pine, scales in]
[Subtext: Inter 400, --ink-muted, 24px margin above stat]
[Comparison: split $354K (gray) / $708K (pine), 2rem, with divider]

Animations:
  title → fade up, 0.4s
  stat → scale 0.3→1, 1s ease back.out(1.7)
  subtext → fade in, 0.3s
  comparison → fade up + y 30→0, 0.5s ease power2.out
```

### Pattern 5: CTA (cta-morph-press)
```
[Title: Fraunces 600, --pine]
[3 option tags: --paper-alt bg, --pine left border, IBM Plex Mono, inline-block]
[CTA: Fraunces 600, --pine, 3.5rem, large]

Animations:
  title → fade up, 0.4s
  option-1 → slide in x -40→0, 0.3s ease power2.out
  option-2 → same, +0.2s stagger
  option-3 → same, +0.2s stagger
  cta → fade + y 30→0, 0.6s ease back.out(1.7)
```

---

## 13. Animation Quick Reference

### Entrance patterns
```javascript
// Fade + slide up (most common)
tl.fromTo("#id", { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, time);

// Scale in (for stats/hero numbers)
tl.fromTo("#id", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }, time);

// Stagger (cards, options)
tl.fromTo("#card-1", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, t);
tl.fromTo("#card-2", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, t + 0.3);
tl.fromTo("#card-3", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, t + 0.6);

// Width count-up (bars)
tl.fromTo("#zone", { width: "0%" }, { width: "40%", duration: 0.6, ease: "power2.inOut" }, time);

// Progress bar (full duration)
tl.fromTo("#progress-fill", { width: 0 }, { width: "100%", duration: 20, ease: "none" }, 0);
```

### Easing reference
| Name | Use case |
|---|---|
| `power2.out` | Most entrance animations |
| `back.out(1.7)` | Stats/hero numbers (adds overshoot) |
| `power2.inOut` | Width animations (bars) |
| `none` | Linear (progress bars) |

### Animation timing
- **Entrance**: 0.3–0.6s (0.4s default)
- **Stat reveal**: 0.8–1.0s (with back.out ease)
- **Stagger gap**: 0.2–0.3s between elements
- **Progress bar**: full duration, ease "none"
- **Total per-frame animation budget**: ~2s (start animations at +0.2s, end by +3.5s)

---

## 14. Check, Fix, Render

### Run the check
```bash
npx hyperframes check
# or
npm run check
```

### Interpreting output
| Section | What it checks | Common fixes |
|---|---|---|
| **Lint** | Data attributes, clip structure, duplicate IDs | Add `class="clip"`, fix `data-start/duration/track-index`, ensure clips are direct children |
| **Runtime** | GSAP target not found, console warnings | Remove dead `fromTo` calls, check element IDs match |
| **Layout** | Content overlap, clipping, text fit | Add margins/padding, use `data-layout-allow-overflow` for intentional overflow |
| **Motion** | Non-allowlisted properties, infinite animations | Use `opacity`, `transform`, `width` only; no `repeat: -1` |
| **Contrast** | WCAG AA text contrast | Ensure ≥4.5:1 for normal text, ≥3:1 for large text |

### Common fix patterns
```bash
# 1. Fix content_overlap — add margin
# In index.html, add style="margin-bottom: 64px;" between overlapping elements

# 2. Fix missing GSAP targets — remove stale animations
# Delete the tl.fromTo("#bar-label-full", ...) calls if elements don't exist

# 3. Fix clip nesting — move clip to direct child of root
# <div class="clip"> → must be inside #root, not inside another div
```

### Render
```bash
npx hyperframes render --fps 30
# or
npm run render
```

**Render options:**
| Flag | Purpose |
|---|---|
| `--fps 30` | 30fps (default ~24) — smoother motion |
| `--workers 4` | Limit parallel workers (if heap error) |
| `--strict` | Block on lint warnings (production) |

**Output:** `renders/<name>_YYYY-MM-DD_HH-MM-SS.mp4`

---

## 15. Common Pitfalls & Gotchas

### Pitfall 1: Clips nested in wrappers
```html
<!-- ❌ WRONG — clip is nested inside a div -->
<div class="wrapper">
  <div id="frame-1" class="clip" data-start="0" data-duration="4" data-track-index="2">
</div>

<!-- ✅ RIGHT — clip is a direct child of root -->
<div id="root" ...>
  <div id="frame-1" class="clip" data-start="0" data-duration="4" data-track-index="2">
    <div class="wrapper"> ...content... </div>
  </div>
</div>
```

### Pitfall 2: Clips on the same track overlapping
```html
<!-- ❌ WRONG — both on track 2, overlap at t=4 -->
<div class="clip" data-start="0" data-duration="4" data-track-index="2">
<div class="clip" data-start="4" data-duration="4" data-track-index="2">  <!-- shares boundary -->

<!-- ✅ RIGHT — use different tracks for sequential frames -->
<div class="clip" data-start="0" data-duration="4" data-track-index="2">
<div class="clip" data-start="4" data-duration="4" data-track-index="3">
```

### Pitfall 3: Missing `class="clip"` on timed elements
```html
<!-- ❌ WRONG — no class="clip", element always visible -->
<div id="frame-1" data-start="0" data-duration="4" data-track-index="2">

<!-- ✅ RIGHT -->
<div id="frame-1" class="clip" data-start="0" data-duration="4" data-track-index="2">
```

### Pitfall 4: Timeline ID mismatch
```javascript
// ❌ WRONG — ID doesn't match data-composition-id
window.__timelines["main-comp"] = tl;

// ✅ RIGHT — must match data-composition-id
window.__timelines["main"] = tl;
```

### Pitfall 5: Audio with `class="clip"`
```html
<!-- ❌ WRONG — audio doesn't need clip class -->
<audio class="clip" data-start="0" data-duration="18.9" ...>

<!-- ✅ RIGHT — no class="clip" on audio -->
<audio data-start="0" data-duration="18.9" data-track-index="10" data-volume="1" src="...">
```

### Pitfall 6: Content overlap in Frame 1
The most common layout error: subtitle text overlaps with a large hero stat. **Always** give the subtitle `margin-bottom: 48-64px` before a large stat number.

### Pitfall 7: Dead GSAP targets
When you restructure HTML (removing/rename elements), old `tl.fromTo("#old-id", ...)` calls produce console warnings and waste render time. Always clean up the timeline.

### Pitfall 8: Google Fonts in sub-composition `<head>`
If using sub-compositions, `<link>` and `<style>` in `<head>` are **discarded** by the runtime. Put all styles/scripts **inside** the `<template>` wrapper. For monolithic (standalone) compositions, `<head>` is fine.

### Pitfall 9: Video-creator agent tool permission errors
The `video-creator` sub-agent may fail with "a required tool permission was denied." **Always be prepared to execute the workflow manually.** The agent is a convenience, not a requirement.

### Pitfall 10: TSP text length vs duration
At 20s with am_michael @ 1.15×, you get ~30 words. Measure twice: generate the TTS, check the duration, and trim the script if needed. You can always re-render VO faster (speed 1.25–1.4) rather than rewriting.

### Pitfall 11: Portrait stat overlap
Same principle as Pitfall 6 but worse in portrait — the narrower canvas (1080px wide) gives large stats more relative vertical footprint. **Fix:** `style="margin-top: 28px;"` on subtitle, `style="margin-bottom: 4px;"` on stat.

### Pitfall 12: Breakdown label/value as sibling divs
Putting a label `<div>` and value `<div>` as siblings inside a flex container doesn't create side-by-side layout. **Fix:** Wrap each pair in a single flex div with two spans:
```html
<div class="bd"><span class="bd-l">Salary</span><span class="bd-v">$60,000</span></div>
```
```css
.bd { display: flex; justify-content: space-between; align-items: center; width: 100%; }
```

### Pitfall 13: Looped BGM instances overlap lint
When looping a 10s bed across the cut with back-to-back `<audio>` elements, give each segment its **OWN `data-track-index`** (12, 13, 14, …) — clips on the same track must not overlap, and loop segments are adjacent (share a boundary), so they'd trip `clips_overlap` if on one track.

### Pitfall 14: SFX/BGM fight the voiceover
Layer by volume, not by effect. **VO `data-volume="1"`, BGM `0.12`, SFX `0.35`.** Effects are generated short (4–5s each) and placed at the exact visual beat via `data-start`; they sit UNDER narration, never over it. No `class="clip"` on any `<audio>`.

### Pitfall 15: Audio element silent in render
Every `<audio>` needs `data-track-index` + `data-duration` (or it's ignored), and no `class="clip"`. Keep the voice on a low track (11), BGM loop segments next (12–15), SFX after (16+).

---

## 16. Speed Tips

1. **Use the monolithic template** — copy-paste index.html from this guide, swap content. ~2 min setup.

2. **5-frame template** — always plan 5 frames × 4s for 20s videos. It's the fastest rhythm to write and animate.

3. **Reuse animation blocks** — the GSAP timeline patterns (from this guide) are copy-paste ready. Only change IDs and timestamps.

4. **TTS speed trick** — start at speed 1.15. If too long, bump to 1.4. If too short, slow the animations to fill the gap.

5. **Font caching** — Google Fonts are cached to `~/.cache/hyperframes/fonts/`. First render is slower (downloads), subsequent renders are instant.

6. **Check-then-render** — always `check` before `render`. Fixes the 80% layout/motion issues before wasting render time.

7. **Progress bar is 1 line** — copy-paste the progress bar animation. It works for every project.

8. **Logo wordmark is 1 block** — the SVG + text wordmark is identical across projects. Keep a snippet.

9. **Render at 30fps** — 600 frames for 20s. Renders in ~35s on this machine. 24fps saves time but 30fps is smoother.

10. **Kill background processes** — if you start a preview server (`npx hyperframes preview --background`), always stop it with `npx hyperframes preview --stop` when done.

11. **Frame count by duration** — 5 frames × 4s for 20s videos; 8–10 frames × 3–5s for 36–60s videos; landscape uses fewer, wider frames; portrait uses more, stacked frames.

12. **Track allocation for 8+ frames** — Give each frame its own track (frame 1 → track 2, frame 2 → track 3, etc.) to avoid overlap lint errors. Keep background at track 1, progress bar at track N-1, audio at the highest track.

13. **10s BGM loop** — generate a 10s bed with `mc ai play -m musicgen-small -p "<mood>" -d 10`, copy it to `audio/bgm.wav`, and place 3–4 back-to-back `<audio>` instances to cover the cut. Faster iteration than one full-length track, and the loop seam is masked by the VO + SFX.

14. **SFX per reveal, not per frame** — pick 3–5 key beats (hook, data reveal, warning stat, CTA) and generate one short cue each with `audioldm-s-full-v2`. Sync `data-start` to the visual landing, keep them at `0.35` volume. Too many cues sound like a game; too few feel flat.

---

## 17. Visual Notes (Study Notes) System

Hand-drawn notebook infographics (IG/Pinterest "save this" assets + optional reel variant) — the **second lane** alongside video promos (§3–§16). Source of truth: **`docs/visual-notes-prompt-system.md`** (2-stage prompts) + **`templates/notebook-v2.html`** (global v2 template, mirrored at `input/sample_v2.html`) → **`projects/{slug}/02-visual/{slug}.html`** (project render; `input/sample.html` is a throwaway mirror). Same JSON feeds both a static PNG and, optionally, an animated reel. New projects scaffold under `projects/` — see §17.4.

### 17.1 When to use which

| Need | Workflow |
|---|---|
| Flat hand-drawn infographic (no motion, no VO) | This section (§17): JSON → `input/sample.html` → headless screenshot → PNG |
| Motion promo reel (VO + BGM + GSAP) | §3–§16 video workflow (HyperFrames contract, `npm run check`, `render`) |
| Both from one article | Start with §17 JSON (Stage 1), render the static page, then reuse the same JSON for the reel (see §17.6) |

Decision rule: if the deliverable must be screenshotted, saved, and pinned — it's visual notes. If it must be watched with narration — it's video. No `npm run render` for static notes.

### 17.2 Input — the JSON spec

Stage 1 (`docs/visual-notes-prompt-system.md`) produces:

```
handle, title (ALL CAPS ≤45 chars), series_label, page_label (if multi-page),
total_pages, concepts[] { number, title (2-5 words), body (25-35 words), visual_type, visual_spec }, sources_footer
```

`visual_type` in `none | diagram | table | comparison | callout`. Prefer **Variant B** (local HTML file, e.g. `input/3/...html`) over URL fetch per taste ("dont webfetch") when a saved copy exists — pasted `visible_text.txt` + `asset-descriptions.md` produce the same JSON. Multi-page: flat JSON with `total_pages` + `page_label`; run Stage 2 once per page, incrementing the circled page number.

**Fact-checking gate (blocking):** every stat/number in `body` must trace to the article or its cited sources. Do NOT send Stage 1 JSON to Stage 2 (or to `input/sample.html`) until you've spot-checked the numbers against the source. The extraction step can compress or slightly misstate a stat.

### 17.3 Renderer — `templates/notebook-v2.html` is global template; per-project render at `projects/{slug}/02-visual/{slug}.html` (`input/sample_v2.html` mirror, `input/sample.html` throwaway)

`templates/notebook-v2.html` (mirrored at `input/sample_v2.html`) is the ground truth for v2 style (warm paper, `Caveat`+`Patrick Hand` only, `ink-yellow`, 41px rule, `rough-a/b/c`, `.watermark`). Each new article scaffolds `projects/{slug}/`: fork the template into `02-visual/{slug}.html`, inject 6 concepts from `01-content/{slug}.json`. Keep the v2 recipe intact; content swaps are the only edits. `input/sample.html` is just a quick-preview copy of the latest project render.

**`visual_type → component` mapping (v2 classes — use exactly these):**

| `visual_type` | Component(s) in `input/sample.html` (v2) | When to use |
|---|---|---|
| `table` | `.ledger` (3-col) / `.ledger.four-col` (4-col for Strategy/Avg/Value/Gap) / `.ledger.two-col` — `ledger-head` + `ledger-row`, `warn` = `--ink-yellow` wash + maroon text, `rule-line` wavy svg under head | 3+ options compared (rollover destinations, fee tiers) |
| `comparison` | `.compare-row` → ` .compare-card.direct` (navy) vs `.compare-card.indirect` (maroon) + `.vs-mark` | Exactly 2 choices (Roth vs Traditional, spreading cash vs paycheck) |
| `callout` | `.warning-box` (maroon) / `.warning-box.tip` (green) — `.heading` + `.text` | Single most important gotcha/tip (one per page max) |
| `diagram` | `.flow-row` 6-col grid: `.flow-node.n1/.n2/.n3` + `.flow-label` + `.flow-arrow` | Process/sequence (what happens step-by-step) |
| `none` | Plain `.lede` (no visual) | Concept needs no graphic |

Header per page: `.brand` (`@compoundlane · notes`, top-right script) → `.kicker` (maroon text + wavy underline svg) → `h1` (with `.hl::before` `--ink-yellow` block) → optional page_label. Center `.watermark` (`assests/logo.svg`, 700×700, `opacity .11`, `multiply`, `z-index 0`) behind all `.ink` content — very subtle, in both `sample_v2.html` + `sample.html`. Footer: `sources_footer` (916px, dashed navy ticks) + `compoundlane.com` script link.

When swapping in new article content: keep `input/sample_v2.html` variables, inks, ruled lines, `rough-a/b/c`, paper grain, per-blob `b1`..`b6` radii, and `.ink` multiply **unchanged** — only swap header/concepts. Dense pages: v2 `main gap 15px` + `lede 22px` is tighter than v1; if overflow, shave `lede` 22→21px or `ledger-row` padding 4→3px — stay single fixed page, never scroll. No `duo-row` in v2. Drop the `<script>` block when no interactivity is needed.

### 17.4 Canvas, layout & file conventions

- **Fixed canvas 1080×1920** — `body` + `.notebook-page` locked to `width:1080px; height:1920px; overflow:hidden` (taste #32). No scrolling, no page movement — compress to fit. `1080×1350` (4:5) only when explicitly requested for an IG feed crop.
- **Multi-page:** sequential static images with incremented circled page number (`1 / total_pages`, `2 / total_pages`, …), not scroll or long page. Video compresses to one fixed page instead.
- **Project scaffold — when you receive a new article URL/local file, create:**

  ```
  projects/{slug}/                          # kebab-case slug (e.g. dollar-cost-averaging)
    01-source/source.html                   # saved article HTML (Variant B input)
    01-source/source_files/                 # _files bundle (css2, logo.svg) if present
    01-content/{slug}.json                  # Stage 1 JSON — single source of truth
    02-visual/{slug}.html                   # fork of input/sample_v2.html, 6 concepts injected
    02-visual/{slug}.png                    # headless screenshot (or temp/ for quick check)
    03-Video/                               # optional HyperFrames reel (same JSON)
  ```

  Global template at `templates/notebook-v2.html` (mirrored at `input/sample_v2.html`); `input/sample.html` is a throwaway mirror of the latest `02-visual` for fast preview. First example: `projects/dollar-cost-averaging/` (migrated from `input/4` + `input/dollar-cost-averaging.json` + `input/sample.html`).
- **Legacy paths** (`input/<slug>.json`, `input/sample.html` as canonical) are retired — use `projects/{slug}/` going forward. Existing `input/` files are kept as archive until you delete them.

### 17.5 Validation (static — no HyperFrames)

Static notes do **not** use `npm run check` / `render` (that's the HyperFrames contract, §10). Validate with a headless screenshot and visual read-back:

```powershell
# Windows — PowerShell — project render (preferred)
msedge.exe --headless --disable-gpu --window-size=1080,1920 --screenshot=projects/{slug}/02-visual/{slug}.png "file:///D:/content-creator/video/init-video/projects/{slug}/02-visual/{slug}.html"
# Throwaway preview still works:
# msedge.exe --headless --disable-gpu --window-size=1080,1920 --screenshot=temp/after.png "file:///D:/content-creator/video/init-video/input/sample.html"

# Then read the PNG back in the session and inspect it.
# Also sanity-check any JS-rendered values against expected outputs (proves script untouched).
```

Pass criteria: full page visible, no scroll, no overflow, footer near the bottom edge, ruled lines at 41px bound to text via `repeating-linear-gradient`, contrast AA in all states. If also building the reel, additionally run `npm run check` on `projects/<slug>/03-Video/` (video only, 0 errors).

### 17.6 Video variant from the same JSON (optional)

Reuse the Stage 1 JSON for a notebook-style reel — same visual language, now animated:

- **Preset:** `frame.md` → `preset: notebook-handwritten` (see `projects/target-date-funds/03-Video/frame.md`).
- **Motion:** no camera zoom (taste #33 — zoom crops neighbors on dense infographics). Use **spotlight dim** (non-active sections → opacity 0.32, active → 1.0, `power2.inOut` 0.5s) + **red pen-circle draw** (`pathLength="1"` → `strokeDashoffset` 1→0) per VO section, then clear dim for the final CTA. Logo stays visible throughout. Draw-in is pure opacity + path draws (no `y` slide).
- **Audio:** per §8 — VO via Kokoro (`audio/tts_script.txt` → `audio/voiceover.wav`), BGM 10s loop (`musicgen-small`, `data-volume 0.12`), SFX 4–5s cues (`audioldm-s-full-v2`, `data-volume 0.35` at key beats).
- **Pitfall:** style must pass WCAG AA **while dimmed** — never render light text inside colored bars (fails at 0.32 opacity).

### 17.7 Notebook recipe (quick reference — full tokens in `templates/notebook-v2.html`)

Warm paper `oklch(97.5% .008 85)` / shade `oklch(93% .015 80)` · rule `oklch(85% .045 250)` at **41px** (transparent) / **43px** (rule) + warm vignettes; outer `html,body #3a3a3a` + `.desk-shadow` · inks: `ink-navy 42% .16 268`, `ink-body 44% .1 264`, `text-muted 54% .05 262`, `ink-maroon 50% .18 25`, `ink-green 50% .13 158`, `ink-yellow 85% .13 95` · fonts: `Patrick Hand` (body/ledger) + `Caveat 500/600/700` (numbers/headings) via `--font-hand`/`--font-script` only · 3 filters `rough-a` (0.022/3/seed4/1.6), `rough-b` (0.035/2/seed17/1.15), `rough-c` (0.016/4/seed29/2) + `.ink {multiply; text-shadow}` · paper-grain `::before` opacity .38 (gamma 2.6, seed11, multiply) · per-blob `b1`..`b6` unique radii/rotations (-6deg..7deg), card radii per type · `.watermark` 700×700 `assests/logo.svg` `opacity .11` `multiply` center `translate(-50%,-50%)`.

If this summary and `templates/notebook-v2.html` diverge, **the template wins**.

---

## 19. Sound System (First-Class SFX)

The repo has a declarative, registry-driven sound system, not a one-off `.media/sfx/scribble-1.mp3` ad-hoc drop. The full design is in `docs/Sound Effects System.md` (1.2k lines, 19 sections). This section is the practical wiring guide.

### 19.1 Single source of truth

- **Library:** `templates/audio/sfx/manifest.json` — the 8 paper-explainer effects (pencil-write, pencil-draw-loop, marker-swipe, paper-place, soft-whoosh, soft-impact, chime-bright, plus a write-loop variant). Each is a 2s MP3 generated via `audioldm-s-full-v2` at 96kbps.
- **Engine:** `scripts/sound/` — the sound vocabulary (registry.mjs), animation→sound resolver (resolver.mjs), session lifecycle (session.mjs), global mute/volume (controller.mjs), style profile (profile-paper-explainer.mjs), and the browser bundle template.
- **Per-project copy:** the build copies the library's MP3s into `projects/{slug}/XX/.media/sfx/` (idempotent) and bundles the engine into `sound.js` next to `index.html`.

### 19.2 Style profile — `paper-explainer`

| Animation action | Effect | Volume | Loop |
|---|---|---|---|
| `write` (per word) | pencil-write | 0.18 | one-shot, throttled 1.5s |
| `draw` (SVG path) | pencil-draw-loop | 0.14 | one-shot, fired at stroke start |
| `highlight` (.hl) | marker-swipe | 0.22 | one-shot |
| `cardReveal` (compare-card, warning-box, flow-node) | paper-place | 0.22 | one-shot, once per concept |
| `appear` (ledger-row) | paper-place | 0.18 | one-shot |
| `sectionReveal`, `transition` | soft-whoosh | 0.20 | one-shot |
| `importantReveal` (closing CTA) | chime-bright | 0.28 | one-shot |

The full mapping table is in `scripts/sound/profile-paper-explainer.mjs`.

### 19.3 Wiring into a composition

For a project like `dollar-cost-averaging/04-Video-final`:

1. **Copy assets:** the build copies `templates/audio/sfx/*.mp3` to `projects/{slug}/04-Video-final/.media/sfx/`.
2. **Bundle the engine:** `node scripts/sound/bundle.mjs projects/{slug}/04-Video-final/sound.js`.
3. **Load it in `index.html`:** add `<script src="sound.js"></script>` near the top of `<body>`.
4. **Walk the DOM:** either emit `data-sound` on individual elements, or push to `window.__soundSchedule = [{ start, duration, action, seed }, ...]` before `sound.js` boots.
5. **Splice a static SFX block (required for headless render):** HyperFrames' renderer only captures `<audio>` elements that exist in the static HTML source. Run `node scripts/sound/inject-static-sfx.mjs projects/{slug}/04-Video-final/index.html` to splice 56 SFX `<audio>` cues (tracks 12–67) right after the voiceover (track 11). Each cue gets a unique `data-track-index` so the renderer concatenates them without overlap.

### 19.4 Override precedence (spec §6)

For per-clip overrides, emit `data-sound` with one of:

- `data-sound="false"` → silence this clip.
- `data-sound="action:write,intensity:emphasis"` → use the action from the profile, override the intensity.
- `data-sound-events='[{...}, {...}]'` → hand-authored event list, fully declarative.

### 19.5 Throttling and lifecycle (spec §8–§11)

- **Throttle:** writes are throttled to 1 per 1.5s window so the cumulative sound stays musical, not spammy. Card-reveals are throttled to once per concept.
- **Lifecycle:** loops stop exactly when the timeline reaches the clip's `data-start + data-duration`. `window.__sound.stopAll()` halts everything for a replay or scene change.
- **Failure safety (spec §14):** every play call is wrapped — audio load failure, autoplay rejection, missing `AudioContext` all degrade silently. The visual timeline never breaks.

### 19.6 Generation: re-sourcing a cue

```bash
# One-time per cue. Iterates on the prompt until it sounds right.
mc ai play -m audioldm-s-full-v2 -p "soft pencil writing on paper, subtle scratch" -d 2 -o templates/audio/sfx/pencil-write-1.mp3

# Re-bundle if you change registry.mjs / resolver.mjs / profile-paper-explainer.mjs:
node scripts/sound/bundle.mjs projects/dollar-cost-averaging/04-Video-final/sound.js

# Re-splice the static SFX block if you change the schedule:
node scripts/sound/inject-static-sfx.mjs projects/dollar-cost-averaging/04-Video-final/index.html
```

### 19.7 When to reach for the sound system

- **Promo reel with voiceover** (`03-Video/` or `04-Video-final/`) — wire up the full pipeline, since the runtime is already on a timeline.
- **Whiteboard lane** (`03-Video-animate/`) — currently still uses the simple per-section scribble; a follow-up can wire it through the same registry without redesign.
- **New style profile** — fork `scripts/sound/profile-paper-explainer.mjs` (e.g. `profile-ui-demo.mjs`), add a new mapping. The engine is profile-agnostic.

---

## File: GUIDE.md location
Save this at the repo root: `D:\content-creator\video\init-video\GUIDE.md`

Reference the skill playbooks at:
- `/hyperframes` — intent layer + routing
- `/product-launch-video` — full workflow (Step 0–6)
- `/hyperframes-core` — composition contract
- `/hyperframes-animation` — motion rules
- `/hyperframes-creative` — design system
- `/media-use` — audio/images/logos

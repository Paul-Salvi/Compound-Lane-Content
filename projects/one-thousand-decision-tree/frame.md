# frame.md — $1,000 Decision Tree Design Spec

> The design is the page. The composition reveals the page word-by-word as the pen writes it, with a single voiceover track. This spec documents the tokens the composition CSS needs to know.

## Canvas

| | |
|---|---|
| Aspect | 1080 × 1920 (vertical) |
| Duration | ~93s (1.0s flash + 92s reveal) |
| Background | `public/flash-preview.png` (rasterized from `02-visual/one-thousand-decision-tree.html`) for t=0–1.0s; live DOM for t=1.0s onward |
| Foreground | inline SVG pen (animated via GSAP) |

## Color tokens

Drawn from `02-visual/one-thousand-decision-tree.html` `:root`.

| Token | Value | Use |
|---|---|---|
| `--paper` | `oklch(97.5% .008 85)` | Page background |
| `--paper-shade` | `oklch(93% .015 80)` | Left margin shading |
| `--rule` | `oklch(85% .045 250)` | Ruled lines |
| `--ink-navy` | `oklch(42% .16 268)` | Concept 1 (cash), primary headings |
| `--ink-body` | `oklch(44% .1 264)` | Concept 4 (brokerage), body text |
| `--text-muted` | `oklch(54% .05 262)` | Captions, sources |
| `--ink-maroon` | `oklch(50% .18 25)` | Concept 2 (debt), callouts |
| `--ink-green` | `oklch(50% .13 158)` | Concept 3 (Roth), gain emphasis |
| `--ink-yellow` | `oklch(85% .13 95)` | Highlighter behind "now what?" + "Kill Debt" warn rows |

**Concept → color rotation** (one ink per concept for a colored-card feel):
- Concept 1 (Cash First): `--ink-navy`
- Concept 2 (Kill Debt Over 8%): `--ink-maroon` (h2 + warn rows)
- Concept 3 (Roth IRA + S&P 500): `--ink-green` (h2 + tip box border)
- Concept 4 (Rest to Brokerage): `--ink-body` (default)

The pen SVG uses analogous tones:
- Barrel: `#295497` (deep blue)
- Silver clip: `#c0c0c0` + dark stroke `#1c1c1c`
- Tip: `#ffffff` (white nib)

## Typography

The page text is in two web fonts. The composition imports them at runtime (Google Fonts) for any overlay labels — but the page itself is the only text, and it's already on the raster. No composition-level typography is needed beyond what `templates/video/composition.html` already provides.

| Family | Use | Loaded |
|---|---|---|
| `Patrick Hand` | Body, h1, h2, ledger | Page DOM + raster |
| `Caveat` | Numerals, kicker, brand, vs-mark | Page DOM + raster |

If a future edit needs an overlay caption, use `Patrick Hand` at the same sizes as the page (h1 61px, h2 34px, body 19px) to match.

## Page regions (anchor map for the pen)

The page is laid out in 4 horizontal bands matching the 4 concepts, plus header and footer. Each band has a "primary visual" the pen writes.

| Concept | Primary visual | Center (x, y) | y-band |
|---|---|---|---|
| Header | Title block (kicker + h1) | 540, 110 | 60–250 |
| 1 | Checking vs HYS compare cards | 250 / 830, 720 | 600–830 |
| 2 | 4-row ledger (CC / BNPL / Student / Mortgage) | 540, 1010–1130 | 950–1180 |
| 3 | Tip box | 540, 1290 | 1230–1340 |
| 4 | 4-node flow tree (cash → debt → roth → broker) | 230 / 410 / 660 / 850, 1640 | 1580–1720 |
| Footer | Sources + handle | 540, 1880 | 1850–1920 |

## Motion

| Element | Property | Range | Duration | Easing |
|---|---|---|---|---|
| Pen position (per word) | x, y | per write target | 60ms snap | `none` |
| Word reveal | opacity, y, rotation | 0→1, 6→0, ±1.5° | 420ms | `power2.out` |
| Num-blob pop | opacity, scale, rotation | 0→1, 0.8→1, -4°→0° | 400ms | `back.out(1.5)` |
| SVG stroke draw | strokeDashoffset | len→0 | 500ms | `power1.inOut` |
| Arrowhead pop | opacity, scale | 0→1, 0.4→1 | 300ms | `back.out(1.5)` |
| Pen fade-out | opacity | 1→0 | 250ms | `power2.in` |

The pen SVG's `transform-origin` is the **nib** (10% from left, 90% from top). Composition code sets `transform: translate(x, y)` where (x, y) is the write target.

## Pen asset

- Path: inline SVG in `templates/video/composition.html` (auto-included by `build-video.mjs`)
- Native: 1000×1000 viewBox
- Drop shadow: `filter: drop-shadow(4px 10px 6px rgba(0, 0, 0, 0.4))`
- Rotation: -45° (so the nib points up-left, like a writer holding a pen)
- Reduced motion: pen is hidden entirely under `prefers-reduced-motion: reduce`

Composition places the pen `<div>` at `position: absolute; left: 0; top: 0` and uses GSAP to set `transform: translate(x, y)` on the wrapper.

## Audio

| Track | File | Start | Duration | Gain |
|---|---|---|---|---|
| VO (combined) | `.media/voiceover/voiceover.mp3` | 1.0s | ~92s expected | 1.0 |

VO is the only audio track. No music bed, no separate per-section VOs — the tts_script.txt is rendered as one combined MP3 by VibeVoice/Paul per the single-file convention (memory `voiceover-single-file-convention.md`).

SFX are driven by `window.__soundSchedule` and routed through `scripts/sound/profile-paper-explainer.mjs` — declarative `<audio>` block disabled for this project (SFX inline path is simpler for a 4-concept scope). The `emit-static-sfx.mjs` script is **not** run for this project.

## Composition contract

The composition HTML lives at `projects/one-thousand-decision-tree/04-video/index.html` (auto-generated by `scripts/build-video.mjs` from `templates/video/composition.html`) and:

- declares `data-duration="93.0"`, `data-aspect="1080x1920"`
- has one root timeline registered as `window.__timelines["one-thousand-decision-tree-video"]`
- uses `class="clip"` on every timed element
- has 1 audio track: 1 voiceover (no music)
- embeds GSAP and registers a paused timeline; HyperFrames calls `.tweenTo(time)` on seek
- preloads all assets at startup (no network during render)

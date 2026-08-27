# frame.md — DCA Explainer Design Spec

> The design is the page. The composition renders the page raster as the background, and overlays a hand + audio on top. This spec documents the tokens the composition CSS needs to know.

## Canvas

| | |
|---|---|
| Aspect | 1080 × 1920 (vertical) |
| Duration | 91.6s |
| Background | `public/page-background.png` (rasterized from `02-visual/dollar-cost-averaging.html`) |
| Foreground | `public/hand-pointer.svg` (animated via GSAP) |

## Color tokens

Drawn from `02-visual/dollar-cost-averaging.html` `:root`.

| Token | Value | Use |
|---|---|---|
| `--paper` | `oklch(97.5% .008 85)` | Page background |
| `--paper-shade` | `oklch(93% .015 80)` | Left margin shading |
| `--rule` | `oklch(85% .045 250)` | Ruled lines |
| `--ink-navy` | `oklch(42% .16 268)` | Primary headings, body emphasis |
| `--ink-body` | `oklch(44% .1 264)` | Body text |
| `--text-muted` | `oklch(54% .05 262)` | Captions, sources |
| `--ink-maroon` | `oklch(50% .18 25)` | Concept 4 warning, callouts |
| `--ink-green` | `oklch(50% .13 158)` | Concept 5 helps, gain emphasis |
| `--ink-yellow` | `oklch(85% .13 95)` | Highlighter behind keywords |

The hand SVG uses analogous tones:
- Skin: `#F5DCC0`
- Ink stroke: `#3D2A1A`
- Tap ripple: `#A85A24`

## Typography

The page text is in two web fonts. The composition imports them at runtime (Google Fonts) for any overlay labels — but the hand is the only overlay, and it has no text, so the fonts are **only on the raster**. No composition-level typography is needed.

| Family | Use | Loaded |
|---|---|---|
| `Patrick Hand` | Body, headings | Page raster |
| `Caveat` | Numerals, brand | Page raster |

If a future edit needs an overlay caption, use `Patrick Hand` at the same sizes as the page (h1 61px, h2 34px, body 19px) to match.

## Page regions (anchor map for the hand)

The page is laid out in 6 horizontal bands matching the 6 concepts. Each band has a "primary visual" the hand taps.

| Concept | Primary visual | Center (x, y) | y-band |
|---|---|---|---|
| Header | Title block | 540, 120 | 60–250 |
| 1 | "Spreading cash" / "Investing from income" cards | 250 / 830, 720 | 600–830 |
| 2 | 3-row ledger (Vanguard, Schwab, Edge) | 540, 970–1090 | 920–1140 |
| 3 | 3-row ledger (Lump, DCA end, DCA start) | 540, 1230–1290 | 1180–1340 |
| 4 | Flow diagram (3 nodes + 2 arrows) | 230 / 480 / 850, 1430 | 1380–1500 |
| 5 | "Helps" / "Hurts" cards | 250 / 830, 1620 | 1530–1730 |
| 6 | Tip box | 540, 1810 | 1750–1880 |
| Footer | Sources + handle | 540, 1900 | 1880–1920 |

## Motion

| Element | Property | Range | Duration | Easing |
|---|---|---|---|---|
| Hand position | x, y | per beat | 0.4–2.0s | `cubic-bezier(.4,.1,.3,1)` |
| Hand scale (tap) | scale | 1 → 0.92 → 1 | 240ms (single), 480ms (double) | `power2.out` |
| Hand long move | mid-arc offset | +40–80px perpendicular | derived | same as above |
| Tap ripple | scale, opacity | 1→3, 0.7→0 | 600ms | `power1.out` |

The hand SVG's `transform-origin` is **top center** (the fingertip). Composition code sets `transform: translate(x, y)` where (x, y) is the tap target.

## Hand asset

- Path: `public/hand-pointer.svg`
- Native: 240×320 viewBox
- Drop shadow: 5px blur, 3px x-offset, 8px y-offset, 45% opacity
- Rough filter: subtle (scale 2) for ink-on-paper feel
- Tap ripple: two concentric circles in `tap-ripple` group at fingertip (0, 0)

Composition places the hand `<img>` at `position: absolute; left: 0; top: 0` and uses GSAP to set `transform: translate(x, y) scale(s)` on the wrapper.

## Audio

| Track | File | Start | Duration | Gain |
|---|---|---|---|---|
| VO intro | `.media/voiceover/intro.mp3` | 0.0s | ~2.4s | 0dB |
| VO c1 | `.media/voiceover/concept1.mp3` | 3.0s | ~12.0s | 0dB |
| VO c2 | `.media/voiceover/concept2.mp3` | 15.0s | ~12.0s | 0dB |
| VO c3 | `.media/voiceover/concept3.mp3` | 27.0s | ~12.0s | 0dB |
| VO c4 | `.media/voiceover/concept4.mp3` | 39.0s | ~12.0s | 0dB |
| VO c5 | `.media/voiceover/concept5.mp3` | 51.0s | ~12.0s | 0dB |
| VO c6 | `.media/voiceover/concept6.mp3` | 63.0s | ~12.0s | 0dB |
| VO outro | `.media/voiceover/outro.mp3` | 75.0s | ~5.0s | 0dB |
| Music bed | `.media/music/bed.mp3` | 0.0s | 91.6s | -8dB (full), -16dB (ducked) |

Bed envelope (handled by `hyperframes-audio`):
- 0 → 2s: fade in from -40dB to -8dB
- 3s → 14s: -16dB (during VO c1)
- 15s → 26s: -16dB (during VO c2)
- 27s → 38s: -16dB (during VO c3)
- 39s → 50s: -16dB (during VO c4)
- 51s → 62s: -16dB (during VO c5)
- 63s → 74s: -16dB (during VO c6)
- 75s → 80s: -16dB (during VO outro)
- 80s → 87s: -8dB (no VO)
- 87s → 91.6s: fade out -8dB → -40dB

## Composition contract

The composition HTML lives at `compositions/dca-explainer/index.html` and:

- declares `data-duration="91.6s"`, `data-aspect="1080x1920"`
- has one root timeline registered as `window.__timelines["dca-explainer"]`
- uses `class="clip"` on every timed element
- has 10 audio tracks: 1 music + 8 VO + 1 (or 0) master
- embeds GSAP and registers a paused timeline; HyperFrames calls `.tweenTo(time)` on seek
- preloads all assets at startup (no network during render)

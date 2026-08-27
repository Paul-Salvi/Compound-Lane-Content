# BRIEF — DCA Explainer

> Confirmed intent for the `dca-explainer` HyperFrames composition. Read this first; the rest of the project files (STORYBOARD, frame, composition) follow from it.

## Message

Explain **dollar-cost averaging (DCA) — does it actually work?** in 90 seconds, so a retail investor who's heard the term but never been told the trade-offs leaves the video knowing:

1. What DCA literally is (same dollars on a schedule, not all at once).
2. The 68% rule — that lump sum has historically beat 12-month DCA about 2/3 of the time.
3. A concrete head-to-head ($10k lump vs $10k DCA → ~$373 cash-drag gap).
4. *Why* the gap exists (lump gets a full year; DCA's later blocks earn less time).
5. When DCA actually helps vs hurts.
6. How to use it right (paycheck DCA is free; windfall DCA should be short).

The frame: "Drag-free DCA" — invest each paycheck, no cash sitting out. For windfalls, invest promptly or DCA a short window.

## Audience

Retail investors, US, mid-30s. Know the term "DCA" but have never been told the trade-off. Skim-style attention — the video must show the visual fix the viewer expects while the voiceover runs, and a "real" hand pointing makes the page feel explained rather than just read.

Distribution: vertical short-form (Reels, Shorts, TikTok) — 1080×1920, 9:16.

## Length

**91.6s** target, matching the reference sample pacing (~15s per concept × 6 + intro/outro).

| Beat | Duration |
|---|---|
| Intro | 3.0s |
| Concept 1 (What DCA means) | 12.0s |
| Concept 2 (The 68% rule) | 12.0s |
| Concept 3 ($10k head-to-head) | 12.0s |
| Concept 4 (See the cash drag) | 12.0s |
| Concept 5 (When DCA helps vs hurts) | 12.0s |
| Concept 6 (Use it right) | 12.0s |
| Outro | 5.0s |
| **Total** | **80s** (10s flex inside 91.6s) |

## Aspect

1080×1920, vertical. Composition canvas matches the page raster (no crop).

## Audio

Two layers, mixed:

- **Voiceover (VO)**: 8 clips (intro + 6 concepts + outro), TTS via local Kokoro. Drew from `01-content/dollar-cost-averaging.json` `concepts[i].body` for the concept beats. Slight warmth, conversational pace.
- **Music bed**: A-minor ambient pad (sine-wave chord stack generated with ffmpeg), ~91.6s. Fade-in 0–2s, fade-out 87–91.6s. Ducked to ~-16dB during each VO block via `hyperframes-audio` envelope.

## Pointer style

**Realistic hand, in the notebook's hand-drawn style.**

Source: `public/hand-pointer.svg`. Skin tone fill (#F5DCC0), knuckle and palm crease lines, drop shadow, animated tap ripple at the fingertip. The "realistic" here means: a human-shaped hand with skin tone and proportion, not a flat icon — drawn in the same ink-on-paper style as the rest of the page so it sits on the notebook, not pasted on.

Why SVG over a photo cutout: no media provider installed in this environment; a cutout PNG would clash with the hand-drawn page. The SVG keeps the visual language consistent and the tap ripple is animatable via GSAP.

## Reveal style

**Full static page visible from frame 1.** The hand enters from off-frame, points to one section at a time, taps to indicate the active concept, then moves on. No reveals, no cuts — the page is the stage; the hand is the lecturer's pointer.

This mirrors the reference sample's pacing: still page + animated pointer + voiceover.

## Customizations

- **Fingertip is the tap point.** The hand is positioned so the tip of the index finger lands on the concept the voiceover is talking about. The rest of the hand trails below.
- **Tap is a brief scale bounce (1 → 0.92 → 1) over 240ms**, plus the SVG ripple expands and fades. This is the only animation on the hand besides position; we want the page to stay legible.
- **Hand is parked off-screen (bottom-right) between beats.** Reduces clutter when the voiceover pauses.
- **No text overlays.** The page already has all the copy. Adding captions would duplicate it. The hand + voiceover carry the explanation.

## Assets

| Path | Source | Notes |
|---|---|---|
| `public/page-background.png` | Copied from `02-visual/dollar-cost-averaging.png` | 1.7MB, 1080×1920. Frozen for the full 91.6s. |
| `public/hand-pointer.svg` | Hand-authored SVG | 240×320 viewBox. Drop-shadowed. |
| `.media/voiceover/intro.mp3` | Kokoro TTS | 32KB, 2.4s. |
| `.media/voiceover/concept[1-6].mp3` | Kokoro TTS | ~150KB each, ~12s each. |
| `.media/voiceover/outro.mp3` | Kokoro TTS | 127KB, 5.0s. |
| `.media/music/bed.mp3` | ffmpeg-generated | 1.4MB, 91.6s. A-minor ambient pad. |

## Out of scope

- Rebuilding the notebook page as live DOM. The PNG is the stage; the page itself never animates.
- Photo cutout hand. The SVG is the pointer.
- Multi-take renders. Single best version.
- Captions / subtitles. Voiceover only.
- Lower-thirds, kinetic titles, B-roll. The page *is* the visual.

## Approval

Plan approved by user. Build proceeds.

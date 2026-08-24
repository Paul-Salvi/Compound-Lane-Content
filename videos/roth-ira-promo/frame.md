---
version: alpha
name: Compound Lane Frame
description: >-
  Video-first design system adapted from Compound Lane's editorial brand.
  Unit: 1920x1080 frame. Atoms: cream paper ground, pine green primary accent,
  ochre secondary accent, serif display + monospace numbers + sans body.
  Composition is free; numbers come from the script.
unit: the frame — 1920x1080 primary; 9:16 and 1:1 documented
principle: atoms are sacred · composition is free · numbers come from the script

colors:
  bg: "#FAF8F3"
  bg-alt: "#F1EDE2"
  ink: "#1B1F1D"
  ink-muted: "#565A55"
  rule: "#DBD5C4"
  pine: "#2F5D4E"
  pine-deep: "#223F35"
  pine-active: "#1A3027"
  ochre: "#A85A24"
  ochre-tint: "#F3EBDD"
  white: "#FFFFFF"

typography:
  display:
    fontFamily: "Fraunces"
    weight: 600
    lineHeight: 1.12
    color: "ink"
    letterSpacing: "-0.015em"
  display-sm:
    fontFamily: "Fraunces"
    weight: 600
    lineHeight: 1.15
    color: "ink"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter"
    weight: 400
    lineHeight: 1.55
    color: "ink-muted"
    fontSize: "1rem"
  label:
    fontFamily: "IBM Plex Mono"
    weight: 600
    fontSize: "0.72rem"
    letterSpacing: "0.08em"
    textTransform: "uppercase"
    color: "pine"
  stat-number:
    fontFamily: "IBM Plex Mono"
    weight: 700
    fontSize: "2rem"
    color: "pine"
    letterSpacing: "-0.01em"
  stat-number-sm:
    fontFamily: "IBM Plex Mono"
    weight: 700
    fontSize: "1.2rem"
    color: "ochre"
    letterSpacing: "-0.01em"
  caption:
    fontFamily: "Inter"
    weight: 400
    lineHeight: 1.5
    color: "ink-muted"
    fontSize: "0.85rem"

spacing:
  pad: "64px"
  gap: "32px"
  rule: "1px solid var(--rule)"

components:
  stat-card:
    backgroundColor: "bg-alt"
    border: "1px solid var(--rule)"
    borderLeft: "3px solid var(--pine)"
    borderRadius: "3px"
    padding: "16px 18px"
    typography: "stat-number + label"
    description: "Compound Lane stat callout style"
  threshold-table:
    border: "1px solid var(--rule)"
    borderCollapse: "collapse"
    th:
      backgroundColor: "bg-alt"
      fontFamily: "IBM Plex Mono"
      fontSize: "0.72rem"
      textTransform: "uppercase"
      letterSpacing: "0.04em"
      color: "ink-muted"
    td:
      fontFamily: "IBM Plex Mono"
      fontSize: "0.88rem"
      color: "ink"
  phaseout-bar:
    description: "Three-zone horizontal bar: full (bg), partial (bg with stripes), none (ink)"
    height: "34px"
  progress-bar:
    backgroundColor: "pine"
    height: "4px"
    position: "bottom"
    width: "grows with frame index"
---

# Compound Lane Frame

## Overview

Clean, authoritative financial-education aesthetic. Cream paper ground (#FAF8F3), pine
green (#2F5D4E) as the primary accent, ochre (#A85A24) as the secondary accent for highlights
and warnings. Fraunces serif for headlines, IBM Plex Mono for all numbers and stats, Inter
for body copy. Every numeral carries stakes, not inventory.

## The Frame

### Eyeball tests
- **Squint** — one display moment dominates (a key number or title), nothing competes.
- **Silence** — statement frames reserve 50–60% negative space; data grids are the one dense exception.
- **Restraint** — pine green and ochre are the only accents; one display moment per frame.
- **Reference** — aim at a clean financial-education article / mid-century annual report.

### Format
- Primary: 1920×1080 (16:9).

## Colors

- `{colors.bg}` cream paper — the default ground.
- `{colors.ink}` brown-black — body text, headers.
- `{colors.pine}` — primary accent; thresholds, stat numerals, progress bar, key highlights.
- `{colors.ochre}` — secondary accent; phase-out zone, warnings, callouts.
- `{colors.rule}` — borders and dividers.
- `{colors.white}` — for contrast swaps.

## Typography

- **Display**: Fraunces 600, tight tracking, serif — headlines and section titles.
- **Stat numeral**: IBM Plex Mono 700, tabular-nums — all key figures.
- **Body**: Inter 400, cream paper ground.
- **Label**: IBM Plex Mono 600, uppercase, 0.08em tracking — eyebrows and captions.

Legibility floor: body ≥ 20px, stat numbers ≥ 48px on hero frames.

## Motion

See `../hyperframes-animation/rules/` for atomic motion rules. Quick: 0.3–0.6s, vary eases,
combine transforms on entrances, overlap entries. Numbers count up; stat cards slide in
one at a time; phase-out bar animates left to right revealing zones.

## Composition Rules

### Do
- Stack hero titles in Fraunces serif; make every key numeral monospace bold in pine or ochre.
- Build data grids with 1px rule borders; use red-leftbar style cards for editorial callouts.
- Use ochre for the phase-out warning zone, pine for thresholds and progress.
- One display moment per frame; reserve negative space on statement frames.

### Don't
- No neon, no cyan-on-dark, no gradient text. Keep the cream paper ground across all scenes.
- No default bullets; use em-dashes or numeric lists.
- Don't invent figures — every number traces to the script, else placeholder.

## Aspect-Ratio Behavior
- 16:9 primary — all frames composed for 1920×1080.

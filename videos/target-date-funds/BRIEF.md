---
workflow: product-launch-video
flow: automation
storyboard: no
message: "One fund that auto-rebalances as you age — but only if you pick the right year and the cheap version"
destination: social
aspect: 1080x1920
language: en
length: 37s
angle: educational-promo
narration: yes
---

## Intent

A 37-second portrait reel for Compound Lane's article "Target Date Funds: Are They Right for You?" The video surfaces the article's three most actionable hooks: the glide path (90% → 50% → 30% stocks as you age), the index-vs-active fee gap ($40 vs $315/year on $50K), and the compound cost of that gap over 30 years ($187K). Ends with the simple rule for choosing a fund (the year you turn 65–67).

**Visual style: the notebook / graph-paper hand-drawn format** (per `input/sample.html` + user's confirmed house style). Handwriting fonts (Permanent Marker titles, Caveat numbers, Patrick Hand body), graph-paper grid with red margin line, everything drawn with inline SVG (underlines, circles, arrows, squiggles), sketchy borders, yellow highlighter swipes, slight rotations. Educational, hand-written-notes energy.

## Assets

- `input/3/Target Date Funds_ Are They Right for You_ — Compound Lane.html` — full article source saved locally; use as capture source material instead of web fetch
- `assets/compound-lane-logo.svg` — Compound Lane wordmark + mark logo
- Glide-path bars, fee table, stat callouts — reconstructed from the article content, hand-drawn in SVG/CSS (no images)

## Customizations

- Voiceover: ~58-word VO at speed 1.25 highlighting hook → glide path → fees → cost → rule
- Style: notebook/graph-paper hand-drawn — Permanent Marker + Caveat + Patrick Hand; green/red/blue semantics; write-in + draw-path animation
- Format: portrait 1080×1920

## Notes

- Do not web-fetch; use the local HTML file as source material
- This project uses the notebook format (from input/sample.html) as its visual language
- BGM: 10s calm-cinematic finance bed (musicgen-small), looped 4× across the 37s cut (no HeyGen credential — local generation path)
- SFX: 4 reveal cues generated with audioldm-s-full-v2 (chime@hook, impact@glide-path, whoosh@fee-table, downer@$187K), at 0.35 volume under VO+BGM
- Validation via npm run check only; no render unless requested

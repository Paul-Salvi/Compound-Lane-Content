---
workflow: product-launch-video
flow: automation
storyboard: no
message: "One fund that auto-rebalances as you age — but only if you pick the right year and the cheap version"
destination: social
aspect: 1080x1920
language: en
length: 40s
angle: educational-promo
narration: yes
---

## Intent

A 40-second portrait reel for Compound Lane's article "Target Date Funds: Are They Right for You?" The video surfaces the article's three most actionable hooks: the glide path (90% → 50% → 30% stocks as you age), the index-vs-active fee gap ($40 vs $315/year on $50K), and the compound cost of that gap over 30 years ($187K). Ends with the simple rule for choosing a fund (the year you turn 65–67). Clean, authoritative, educational tone matching Compound Lane's minimalist financial-education aesthetic.

## Assets

- `input/3/Target Date Funds_ Are They Right for You_ — Compound Lane.html` — full article source saved locally; use as capture source material instead of web fetch
- `assets/compound-lane-logo.svg` — Compound Lane wordmark + mark logo (copied from 401k-vesting project)
- Glide-path bars, fee table, stat callouts — reconstructed from the article content

## Customizations

- Voiceover: ~58-word VO at speed 1.25 highlighting hook → glide path → fees → cost → rule
- Style: Compound Lane brand colors and typography (Fraunces display, IBM Plex Mono numbers, Inter body)
- Format: portrait 1080×1920, following videos/401k-vesting patterns

## Notes

- Do not web-fetch; use the local HTML file as source material
- input/sample.html (Expense Ratios notebook style) is style reference ONLY per user instruction — do NOT import its Kalam/notebook aesthetic or content
- BGM: 10s calm-cinematic finance bed (musicgen-small), looped 4× across the 37s cut (no HeyGen credential — local generation path)
- SFX: 4 reveal cues generated with audioldm-s-full-v2 (chime@hook, impact@glide-path, whoosh@fee-table, downer@$187K), at 0.35 volume under VO+BGM
- Validation via npm run check only; no render unless requested

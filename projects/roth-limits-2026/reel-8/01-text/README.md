# 01-text/ — Platform copy for roth-30yr-compound (Roth Limits 2026 / Reel #8)

This directory holds the YouTube / Instagram / Twitter copy that ships with
the **$7,500 a year for 30 years. The Roth math.** reel, ready to paste into each platform at upload time.

## Source numbers (locked, trace to `01-content/roth-30yr-compound.json`)

- $7,500 — 2026 base Roth IRA contribution limit
- 30 years — time horizon
- 7% — historical real return (S&P 500, Damodaran 2026 update)
- $708,000 — future value of $7,500/yr × 30yr at 7% real
- $225,000 — total contributions over 30 years
- $483,000 — tax-free growth (the Roth's compounding engine)

## Files (filled in this order)

1. **keywords.txt** — keyword research (Stage 1)
2. **youtube.txt** — title + description + tags + Category/Type for Studio
3. **instagram.txt** — hook + caption + alt text
4. **twitter.txt** — main post + reply-link note
5. **youtube-problems.txt** — (Stage 3, post-render) timecoded Q&A
6. **spanish-subs.srt** — (Stage 4, post-render) Spanish SRT for YouTube Studio

## Authoring reference

`docs/text-prompt-engine-v2.md` is the canonical authoring guide for this
directory. Pacing (`docs/pacing-rules-v1.md`) is the binding contract for
the 04-video VO: every script word in `tts_script.txt` and every beat in
the platform copy must align with that spec's 7-beat map (orient → frame →
warn → quantify_cost → quantify_opportunity_cost → closing_edge_case → cta).

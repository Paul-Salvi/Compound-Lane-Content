# 01-text/ — Platform copy for roth-vs-traditional (Roth Limits 2026 / Reel #6)

This directory holds the YouTube / Instagram / Twitter copy that ships with
the **Roth vs Traditional: one decision** reel, ready to paste into each platform at upload time.

## Source numbers (locked, trace to `01-content/roth-vs-traditional.json`)

- $7,500 — 2026 IRA contribution limit (both Roth and Traditional)
- 24% / 35% — example marginal tax rate brackets (locked: today's rate vs retirement rate)
- "when you pay tax" — the only difference between the two account types

## Files (filled in this order)

1. **keywords.txt** — keyword research (Stage 1)
2. **youtube.txt** — title + description + tags + Category/Type for Studio
2. **instagram.txt** — hook + caption + alt text
3. **twitter.txt** — main post + reply-link note
4. **youtube-problems.txt** — (Stage 3, post-render) timecoded Q&A
5. **spanish-subs.srt** — (Stage 4, post-render) Spanish SRT for YouTube Studio

## Authoring reference

`docs/text-prompt-engine-v2.md` is the canonical authoring guide for this
directory. Pacing (`docs/pacing-rules-v1.md`) is the binding contract for
the 04-video VO: every script word in `tts_script.txt` and every beat in
the platform copy must align with that spec's 7-beat map (orient → frame →
warn → quantify_cost → quantify_opportunity_cost → closing_edge_case → cta).

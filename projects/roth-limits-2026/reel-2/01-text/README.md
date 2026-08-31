# 01-text/ — Platform copy for roth-ira-catchup-50 (Roth Limits 2026 / Reel #2)

This directory holds the YouTube / Instagram / Twitter copy that ships with
the **$1,100 catch-up at 50** reel, ready to paste into each platform at upload time.

## Source numbers (locked, trace to `01-content/roth-ira-catchup-50.json`)

- $1,100 — 2026 catch-up contribution for age 50+
- $7,500 — 2026 base Roth IRA contribution limit
- $8,600 — 2026 total per eligible spouse ($7,500 + $1,100)
- "50 by Dec 31" rule — IRS Rev. Proc. (annual 401(k) limit release)

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

# 01-text/ — Platform copy for roth-ira-phaseout-mfj (Roth Limits 2026 / Reel #5)

This directory holds the YouTube / Instagram / Twitter copy that ships with
the **Married filing jointly: the $242k Roth cliff** reel, ready to paste into each platform at upload time.

## Source numbers (locked, trace to `01-content/roth-ira-phaseout-mfj.json`)

- $242,000 — MFJ phase-out floor (2026)
- $252,000 — MFJ phase-out ceiling (2026)
- $10,000 — phase-out window width (narrower than single's $15,000)
- MAGI — Modified Adjusted Gross Income, the line that triggers the phase-out
- Spousal backdoor Roth — workaround above $252k

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

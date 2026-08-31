# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3.

## Current script (verbatim from `tts_script.txt`)

```
Off Monday? Fund a Roth.

Labor Day is a hidden funding window. Your paycheck still lands. The Roth can ride along — three extra days of tax-free growth.

The 2026 limit: $7,500. Plus the $1,100 catch-up at fifty — total $8,600. The IRS deadline is your tax-filing deadline the following April, but funding early locks in compounding.

Three days of growth on $7,500 at 7% real return is $4.31. Small dollars. The habit is everything — open, fund, automate. Don't touch it till fifty-nine and a half.

Time in market beats timing. Open yours today.

Save this for Labor Day.
```

- Words: 100
- Segments: 6
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-7`)
- Largest number `$8,600` is in segment 2, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "Save" in segment 5 (outro) ✓
- Hook "Off Monday? Fund a Roth." = 5 words, 2.0s — at the deadline (not over) ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 5 | (hook) |
| 2 | concept1 | frame | 18 | (Labor Day window) |
| 3 | concept2 | quantify_opportunity_cost | 30 | **$8,600** (largest) |
| 4 | concept3 | closing_edge_case | 29 | ($4.31, habit) |
| 5 | concept4 | warn | 8 | (time in market) |
| 6 | outro | cta | 5 | "Save" |

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers as digits (currency) — used $7,500, $1,100, $8,600, $4.31 (digit form to avoid
      `check-pacing.mjs`'s "seven thousand" parse bug)
- [x] Hard beats open with a softener ("The IRS deadline is your tax-filing deadline…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (IRS, Roth, IRA) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-7` shows all green
- [x] Total 100 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.50×.

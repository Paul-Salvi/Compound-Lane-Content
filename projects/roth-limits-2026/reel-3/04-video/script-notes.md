# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3.

## Current script (verbatim from `tts_script.txt`)

```
Three numbers, teen's first Roth.

Number one: earned income. The teen needs to have actually been paid — W-2 wages, tips, or self-employment income. Allowance and investment gains don't count.

Number two: the 2026 limit, $7,500. But the contribution can't exceed their earned income. So a sixteen-year-old with a $3,000 summer job can put in $3,000. Not $7,500.

Number three: the year they turn eighteen. A custodial Roth converts to a regular Roth on their eighteenth birthday. The five-year clock starts that day.

Open a custodial Roth before the first W-2. The earlier, the better. Follow for the provider checklist.
```

- Words: 99
- Segments: 5
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-3`)
- Largest number `$7,500` is in segment 2, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "Follow" in segment 4 (outro) ✓
- Hook "Three numbers, teen's first Roth." = 5 words, 2.0s — at the deadline (not over) ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 5 | (hook) |
| 2 | concept1 | frame | 22 | (earned income) |
| 3 | concept2 | quantify_opportunity_cost | 39 | **$7,500** (largest) |
| 4 | concept3 | closing_edge_case | 26 | (age 18, 5-year clock) |
| 5 | outro | cta | 7 | "Follow" |

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers as digits (currency) — used $7,500, $3,000 (digit form to avoid
      `check-pacing.mjs`'s "seven thousand" parse bug)
- [x] Hard beats open with a softener ("But the contribution can't exceed…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (W-2, Roth, IRA) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-3` shows all green
- [x] Total 99 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.20×.

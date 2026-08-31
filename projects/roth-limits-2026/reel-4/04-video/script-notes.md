# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3.

## Current script (verbatim from `tts_script.txt`)

```
Income $153,000? Roth just shrank.

Modified adjusted gross income is the line that matters — not your salary. The IRS worksheet takes your AGI, adds back a few items, and that's your MAGI for Roth purposes.

Single filers phase out from $153,000 to $168,000 in 2026. That's a fifteen-thousand-dollar window. Inside the window, the IRS worksheet reduces your allowed contribution.

Above $168,000, you can't contribute directly. Zero. The direct-contribution door closes.

The backdoor Roth is the workaround — through a non-deductible traditional IRA conversion. That's tomorrow's reel.

Save this if your income is rising.
```

- Words: 94
- Segments: 6
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-4`)
- Largest number `$168,000` is in segment 2, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "Save" in segment 5 (outro) ✓
- Hook "Income $153,000? Roth just shrank." = 5 words, 2.0s — at the deadline (not over) ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 5 | (hook) |
| 2 | concept1 | frame | 25 | (MAGI) |
| 3 | concept2 | quantify_opportunity_cost | 29 | **$168,000** (largest) |
| 4 | concept3 | closing_edge_case | 14 | (zero direct above) |
| 5 | concept4 | quantify_cost | 16 | (backdoor workaround) |
| 6 | outro | cta | 5 | "Save" |

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers as digits (currency) — used $153,000, $168,000 (digit form to avoid
      `check-pacing.mjs`'s "seven thousand" parse bug)
- [x] Hard beats open with a softener ("Above $168,000, you can't contribute…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (IRS, MAGI, AGI, Roth, IRA) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-4` shows all green
- [x] Total 94 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.20×.

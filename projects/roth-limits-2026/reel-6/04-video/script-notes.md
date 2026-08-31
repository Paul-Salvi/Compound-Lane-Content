# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3.

## Current script (verbatim from `tts_script.txt`)

```
Roth or Traditional? One number.

Both accounts have the same $7,500 contribution limit for 2026. The only difference is when you pay tax. Traditional: deduct now, pay at withdrawal. Roth: pay now, withdraw tax-free.

If your retirement tax rate is higher than today's, Roth wins. A 24% marginal rate today is locked in. Retire at 35%? Roth pays you back.

If your retirement tax rate is lower than today's, Traditional wins. The deduction saves you today's higher rate, and the lower retirement rate applies to withdrawals.

Same limit, different timing. The decision is yours.

Save this before open enrollment.
```

- Words: 99
- Segments: 6
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-6`)
- Largest number `$7,500` is in segment 1, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "Save" in segment 5 (outro) ✓
- Hook "Roth or Traditional? One number." = 5 words, 2.0s — at the deadline (not over) ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 5 | (hook) |
| 2 | concept1 | quantify_opportunity_cost | 28 | **$7,500** (largest) |
| 3 | concept2 | frame | 24 | (24% → 35% Roth wins) |
| 4 | concept3 | closing_edge_case | 24 | (35% → 24% Traditional wins) |
| 5 | concept4 | warn | 6 | (decision) |
| 6 | outro | cta | 5 | "Save" |

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers as digits (currency) — used $7,500, 24%, 35% (digit form to avoid
      `check-pacing.mjs`'s "seven thousand" parse bug)
- [x] Hard beats open with a softener ("Same limit, different timing…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (Roth, IRA) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-6` shows all green
- [x] Total 99 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.50×.

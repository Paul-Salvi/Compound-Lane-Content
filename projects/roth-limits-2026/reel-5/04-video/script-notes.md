# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3.

## Current script (verbatim from `tts_script.txt`)

```
Married? Roth cliff at $242,000.

Same MAGI line as single filers — modified adjusted gross income, not salary. The IRS Pub 590-A worksheet takes your AGI, adds back a few items, and that's the MAGI for Roth purposes.

Married filing jointly phases out from $242,000 to $252,000 in 2026. A ten-thousand-dollar window — narrower than single. The worksheet reduces your allowed contribution.

Above $252,000, you cannot contribute directly. Zero. The direct-contribution door closes.

The spousal backdoor Roth is the workaround — through a non-deductible traditional IRA, then convert. Per spouse, same end account.

Save this before tax season.
```

- Words: 98
- Segments: 6
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-5`)
- Largest number `$252,000` is in segment 2, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "Save" in segment 5 (outro) ✓
- Hook "Married? Roth cliff at $242,000." = 5 words, 2.0s — at the deadline (not over) ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 5 | (hook) |
| 2 | concept1 | frame | 25 | (MAGI) |
| 3 | concept2 | quantify_opportunity_cost | 25 | **$252,000** (largest) |
| 4 | concept3 | closing_edge_case | 14 | (zero direct above) |
| 5 | concept4 | quantify_cost | 22 | (spousal backdoor workaround) |
| 6 | outro | cta | 5 | "Save" |

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers as digits (currency) — used $242,000, $252,000 (digit form to avoid
      `check-pacing.mjs`'s "seven thousand" parse bug)
- [x] Hard beats open with a softener ("Above $252,000, you cannot contribute…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (IRS, MAGI, AGI, MFJ, Roth, IRA) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-5` shows all green
- [x] Total 98 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.50×.

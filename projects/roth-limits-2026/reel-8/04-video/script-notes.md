# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3.

## Current script (verbatim from `tts_script.txt`)

```
$7,500 a year. Watch.

The 2026 Roth IRA limit is $7,500. Compound that over thirty years at a 7% real return. Future-value of an annuity — the math is unforgiving. The result is staggering.

Future value: roughly $708,000. Of that, you contributed $225,000. The remaining $483,000 is tax-free compound growth. That's the Roth's compounding engine.

Your contributions: $225,000 over thirty years. Tax-free growth: roughly $483,000. The growth is more than double your contributions. The Roth is a tax-free compounding engine. That's the whole point.

Start early. Stay consistent. Don't touch it.

Save this for your thirty-year-old self.
```

- Words: 97
- Segments: 6
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-8`)
- Largest number `$708,000` is in segment 2, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "Save" in segment 5 (outro) ✓
- Hook "$7,500 a year. Watch." = 4 words, 1.6s — under the 2.0s deadline ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 4 | (hook) |
| 2 | concept1 | frame | 22 | ($7,500 input) |
| 3 | concept2 | quantify_opportunity_cost | 28 | **$708,000** (largest) |
| 4 | concept3 | closing_edge_case | 27 | ($225k → $483k split) |
| 5 | concept4 | warn | 5 | (Start early…) |
| 6 | outro | cta | 5 | "Save" |

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers as digits (currency) — used $7,500, $708,000, $225,000, $483,000 (digit form to avoid
      `check-pacing.mjs`'s "seven thousand" parse bug)
- [x] Hard beats open with a softener ("The 2026 Roth IRA limit is $7,500…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (IRA, Roth) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-8` shows all green
- [x] Total 97 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.50×.

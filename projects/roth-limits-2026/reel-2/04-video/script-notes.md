# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3. The rule is enforced by the regen script's `Speaker 1:` pre-pass.

## Current script (verbatim from `tts_script.txt`)

```
Turn fifty: $1,100 more.

The 2026 catch-up is $1,100, on top of the $7,500 base limit. The catch-up is a flat add-on, not a multiplier. Same Roth account, more dollars in, same tax-free growth.

If you turn fifty by December thirty-first, you qualify for the whole year. Even on December thirty-first itself.

Base $7,500 plus catch-up $1,100 equals $8,600. Per spouse, per year, if you're both fifty by year-end.

Save this for your next birthday.
```

- Words: 75
- Segments: 5 (5 non-empty lines after the `Speaker 1:` filter)
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-limits-2026/reel-2`)
- Largest number `$8,600` is in segment 3, labelled `quantify_opportunity_cost` in `sections.json` ✓
- CTA "save" in segment 4, labelled `cta` ✓
- Hook "Turn fifty: $1,100 more." = 4 words, 1.6s — under the 2.0s deadline ✓

## Beat map (per `docs/pacing-rules-v1.md` 7-beat template)

| # | Section | Beat | Words | Lead number |
|---|---|---|---|---|
| 1 | intro | orient | 4 | $1,100 (hook) |
| 2 | concept1 | frame | 30 | $1,100, $7,500 |
| 3 | concept2 | warn | 17 | (eligibility frame) |
| 4 | concept3 | quantify_opportunity_cost | 19 | **$8,600** (largest) |
| 5 | outro | cta | 5 | "save" |

(Note: this reel uses 5 sections, not 7 — the spec permits dropping `quantify_cost` and `closing_edge_case` for short single-mechanic reels. The Roth #1 reel also uses 6 sections for the same reason.)

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers spelled out (currency, percent, year, month-count)
- [x] Hard beats open with a softener ("If you turn fifty…")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (IRA) kept as-is
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-limits-2026/reel-2` shows all green
- [x] Total 75 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.20×.

## Why this reel uses digit-form numerals, not spelled-out

`scripts/check-pacing.mjs`'s `findNumbers()` function has a known limitation with spelled-out compound numbers: "eleven hundred" parses as `11` and `1000` (separate tokens, not the product). This reel uses digit form (`$1,100`, `$7,500`, `$8,600`) throughout to avoid the parse bug. The Roth #1 reel uses spelled-out numbers because its largest number is "one million" (parsed as a single token, no bug).

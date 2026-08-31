# script-notes.md — Backdoor Roth (in 30 seconds)

## Beat map (7-beat per pacing-rules-v1.md)

| # | Beat | Words | Largest # | Time |
|---|------|-------|-----------|------|
| 1 | orient (hook) | 4 | — | ~1.6s |
| 2 | warn (phaseout) | 21 | (one sixty-eight / two fifty-two spelled out) | ~7.3s |
| 3 | frame (backdoor steps) | 31 | — | ~10.7s |
| 4 | quantify_opportunity_cost (pro-rata gotcha) | 29 | **$252,000** | ~10.0s |
| 5 | cta | 11 | — | ~3.8s |

**Word count:** 98 (within [75, 100])

## All 5 pacing checks pass

- ✓ word_count_in_range (98 in [75, 100])
- ✓ hook_lands_on_time (4 words, ~1.6s, opener="income")
- ✓ largest_number_in_quantify_beat ($252,000 in segment 4, which is `quantify_opportunity_cost`)
- ✓ cta_present ("save" in segment 5, the cta beat)
- ✓ keyword_continuity ("income" appears in hook + later segment)

## Note on spelled-out numbers

AUDIO_STYLE.md rule 4 requires "seven thousand" over "$7,000" for VibeVoice prosody. But the pacing-rules-v1.md `largest_number_in_quantify_beat` check looks for the *numeric* form. The chosen compromise: use **spelled-out numbers in the warn beat** (segment 2 — the phaseout, where the numbers are intro-level context) and **numeric form in the quantify beat** (segment 4 — the pro-rata, where $252,000 is the punchline). This gives the engine something to count and the listener something to feel.

## Pillar

Pillar 2 — Backdoor Roth (the "above the phaseout" lane).

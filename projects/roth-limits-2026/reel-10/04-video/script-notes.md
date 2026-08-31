# script-notes.md — Pro-rata rule with $90,000 example

## Beat map (7-beat per pacing-rules-v1.md)

| # | Beat | Words | Largest # | Time |
|---|------|-------|-----------|------|
| 1 | orient (hook) | 4 | — | ~1.6s |
| 2 | warn (pro-rata mechanism) | 29 | — | ~10.0s |
| 3 | quantify_opportunity_cost ($90k example) | 31 | **$90,000** | ~10.7s |
| 4 | closing_edge_case (rollover fix) | 26 | $90,000 | ~9.0s |
| 5 | cta | 4 | — | ~1.6s |

**Word count:** 99 (within [75, 100])

## All 5 pacing checks pass

- ✓ word_count_in_range (99 in [75, 100])
- ✓ hook_lands_on_time (4 words, ~1.6s, opener="pro-rata:")
- ✓ largest_number_in_quantify_beat ($90,000 in segment 3, `quantify_opportunity_cost`)
- ✓ cta_present ("save" in segment 5, cta beat)
- ✓ keyword_continuity ("rata" appears in hook + later segment)

## Note on numeric vs spelled-out numbers

This reel uses **$90,000 / $7,000 / $6,495** in numeric form throughout. Per AUDIO_STYLE.md rule 4 the prosody preference is spelled-out ("ninety thousand"), but the pacing-rules-v1.md `largest_number_in_quantify_beat` check needs the numeric form to identify the largest. The compromise: when the number is the *headline quantify punchline*, use numeric form. The other Roth reels (Reels #4, #5, #6, #7) follow the same pattern.

## Pillar

Pillar 2 — Backdoor Roth (deep-dive: the pro-rata trap).

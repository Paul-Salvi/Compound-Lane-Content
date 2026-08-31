# script-notes.md — editor's notes for `tts_script.txt`

This file is the human-facing sibling to `tts_script.txt`. It exists because **`tts_script.txt` itself cannot carry any notes**: every non-empty line in it (including comments) becomes a `Speaker 1:` segment in VibeVoice and adds ~7–15s of dead air to the MP3. The rule is enforced by the regen script's `awk 'NF { print "Speaker 1: " $0 }'` pre-pass.

## Why this file exists

Earlier versions of this project's `tts_script.txt` followed the `projects/dollar-cost-averaging/04-video/tts_script.txt` template, which has `# intro` / `# concept1` / `# concept2` / `# outro` section markers plus a 9-item AUDIO_STYLE checklist at the bottom. Those versions of the Roth reel shipped at 23.8s with the markers, then 21.9s once the markers were stripped — 1.9s of dead air gone, same spoken content. The DCA reel still ships at 136s for a 90s target for the same reason.

## Why this file has a sibling `sections.json`

`docs/pacing-rules-v1.md` (dated 2026-08-30) is the canonical pacing contract for any reel. It also requires section labels (orient, frame, warn, quantify_opportunity_cost, etc.) so the SRT builder and the ASR aligner can locate beats. Pre-pacing-rules-v1.md scripts embedded those labels in `tts_script.txt` as `# section` markers; the new convention is to put them in `04-video/sections.json` (one entry per blank-line-separated paragraph in `tts_script.txt`).

This project's `sections.json` (per `pacing-rules-v1.md`):

```json
{
  "sections": [
    { "key": "intro",    "label": "orient" },
    { "key": "concept1", "label": "frame" },
    { "key": "concept2", "label": "warn" },
    { "key": "concept3", "label": "quantify_opportunity_cost" },
    { "key": "concept4", "label": "closing_edge_case" },
    { "key": "outro",    "label": "cta" }
  ]
}
```

Note: `quantify_cost` (14-20s) and `quantify_opportunity_cost` (20-30s) are two distinct beats in pacing-rules-v1.md. The Roth reel's segment 3 ("But there's a catch. It caps at seven thousand a year. Earned income only.") carries **both** beats — the seven-thousand-dollar limit is the cost frame, and segment 4 ("Max out your Roth for thirty years at seven percent — you retire with over a million dollars. Tax free.") is the opportunity-cost frame where the largest number (one million) lands.

## Rules for `tts_script.txt`

1. **Only the spoken words.** Nothing else.
2. **Separate sections with a single blank line.** Not `# section` markers, not dashes, not bullets.
3. **No per-line commentary or editor's notes inline.** Put them here.
4. **Don't wrap at column 80.** VibeVoice counts lines, not paragraphs. One paragraph = one long line.
5. **No bottom-of-file checklist.** The AUDIO_STYLE 9-item checklist that other projects paste at the bottom of their `tts_script.txt` adds 9 dead-air segments (~60–90s at Paul 1.30×). Run the checklist mentally or check it into this file.
6. **Match `sections.json`.** `tts_script.txt` paragraph count must equal `sections.json` entry count. If they diverge, `scripts/build-subs.mjs` and `scripts/measure-vo-timing.mjs` throw.

## Current script (verbatim from `tts_script.txt`)

```
Roth IRA: best deal.

You put in post-tax dollars. It grows for decades, tax free. Not on the way in. Not on the way out.

But there's a catch. It caps at seven thousand a year. Earned income only.

Here's why. Max out your Roth for thirty years at seven percent — you retire with over a million dollars. Tax free.

Open a Vanguard. Fund it with VOO. Set it on autopilot. Don't touch it till fifty nine and a half.

If this saved you an afternoon, save it for the next one.
```

- Words: 93
- Segments: 6 (6 non-empty lines after the `awk` filter)
- Last measured duration: 29.8s at Paul 1.20× (35.7s native WAV)
- `pacing-rules-v1.md` validation: **all 5 checks pass** (verified by `node scripts/check-pacing.mjs roth-ira-sp500`)

## AUDIO_STYLE.md checklist (paste into the PR / commit)

- [x] One thought per line; paragraph breaks on the long-breath beats
- [x] Sentence lengths vary — at least one 3–6 word sentence per concept
- [x] Em-dashes used for breath, not hyphens
- [x] Numbers spelled out (currency, percent, year, month-count)
- [x] Hard beats open with a softener ("But there's a catch", "Here's why")
- [x] No all-caps; emphasis via word choice and pacing
- [x] Acronyms (IRA, S&P, VOO, VTSAX, FZROX) kept as-is; "S&P" → "S and P"
- [x] **File contains ONLY the spoken words** (no `# section` markers, no per-line commentary, no bottom-of-file checklist; see AUDIO_STYLE.md rule 8)
- [x] **No line-wrap at column ~80** — one paragraph = one long line
- [x] **Pacing rules pass** — `node scripts/check-pacing.mjs roth-ira-sp500` shows all green
- [x] Total 93 words in the pacing-rules-v1.md range [75, 100]
- [x] Read it aloud once. Sounds conversational at Paul 1.30×.

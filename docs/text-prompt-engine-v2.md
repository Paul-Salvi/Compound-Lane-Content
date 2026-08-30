# Text Prompt Engine v2 — Compound Lane

Generates `01-text/` for a reel: keyword research → platform-specific copy (YouTube, Instagram, Twitter/X) → YouTube learning structured data → optional Spanish subtitles. Stages 1-2 run after `01-source/` exists and before video generation. Stage 3 runs after video render, once section timecodes exist. Stage 4 (optional) runs after the voiceover timings are measured and a human translation of the script exists.

> **Pipeline position:** `01-source/` → `01-content/` (Stage 1 JSON — locked) → **`01-text/` (this doc)** → `02-visual/` → `04-video/`. Run `node scripts/build-text.mjs <slug>` to scaffold the five txt files plus the scaffolded `spanish-subs.srt`; then paste this doc's Stage 1 prompt into Claude against the saved `01-source/` file (Variant B — preferred, no web fetch) or the live URL (Variant A), fill the output into the txt files, run the output checklist before considering the project done. Stage 3 (the `youtube-problems.txt` file) and Stage 4 (the `spanish-subs.srt` file) are pre-created with TODO blocks and only get filled after the `04-video/` render produces section timecodes (and, for Stage 4, a human-translated `tts_script.es.txt` exists).

**Brand constraints (always apply):**
- Tone: plain-English, beginner-friendly, "every number sourced"
- Never state a number that isn't in the source article's extracted JSON (`01-content/{slug}.json` is the locked source of truth — the fact-check gate from `GUIDE.md §17.2` applies here too)
- Disclaimer required in every description/caption: "Educational content, not financial advice."
- No hashtag stuffing anywhere — this is a 2026-dated rule, not a style preference (see rationale below)

---

## STAGE 1 — Keyword Research

**Input:** source article text + extracted JSON from `01-content/{slug}.json` (the locked Stage 1 JSON — every number in the platform copy must trace here, never be invented)

**Task:** Produce `01-text/keywords.txt` with:

```
PRIMARY KEYWORD: [the core term this reel targets — must be a phrase people 
actually search, not a headline. e.g. "index fund vs ETF" not "Understanding 
Investment Vehicles"]

SECONDARY KEYWORDS (3-5):
- [related search term]
- [related search term]
- ...

SEARCH INTENT: [one of: "what is X" (definitional) / "X vs Y" (comparison) / 
"how to X" (procedural) / "should I X" (decision-support)]

HASHTAG CANDIDATES (tagged by specificity):
- Niche: [3-5 highly specific tags matching this exact topic]
- Broad: [1-2 category-level tags, use sparingly]
```

**Rules:**
- Primary keyword must be something a beginner would actually type into a search bar, not marketing copy
- Do not invent search volume or trend data — if you don't have a tool to verify it, note candidates as "unverified, use judgment" rather than presenting them as confirmed high-volume terms
- Secondary keywords should include at least one long-tail variant (4+ words)

---

## STAGE 2 — Platform Copy Generation

**Input:** `keywords.txt` + source article JSON (`01-content/{slug}.json`)

**Critical rule for all three platforms:** the PRIMARY KEYWORD must appear naturally in the first line of every platform's copy. This is not optional — in 2026, caption/description text (not hashtags) is what platforms index for search. Hashtags are a categorization signal only, not a discovery mechanism, on all three platforms.

### 2a. `youtube.txt`

```
TITLE (target 50-60 chars, hard cap 100): 
[keyword near the front, natural phrasing, no keyword stuffing]

DESCRIPTION HOOK (first 100-150 chars — this is what shows before "more"):
[does NOT restate the title — title is already visible above the description. 
Use this space for something additive: the stakes, the number, the hook]

DESCRIPTION FULL (200-500 words):
[hook + context + the disclaimer line + link/CTA]
Educational content, not financial advice.

HASHTAGS (3-5, placed at end of description, include #Shorts):
[first 3 will auto-display above the title — order accordingly, most 
important first. #Shorts is for categorization, doesn't count against 
the content-relevance 3-5]

TAGS (backend Studio field, 5-10 short phrases, comma-separated):
[minor SEO weight in 2026 — don't over-invest time here]

CATEGORY / TYPE (Studio upload field, not a text file — note for uploader):
Category: Education
Type: "Problem walkthrough" (matches Compound Lane's step-by-step format — 
see Stage 3 below for the structured data this unlocks)
```

### 2b. `instagram.txt`

```
HOOK (125 chars max — this is the ENTIRE caption most viewers will see):
[primary keyword + the core value prop, must stand alone as a complete thought]

FULL CAPTION (extend to ~300-500 chars total — Compound Lane's "study notes" 
format earns the extra read, this isn't a pure hook-and-scroll account):
[hook] + [teaching content — the actual substance, worth screenshotting] + 
[disclaimer line]
Educational content, not financial advice.

ALT TEXT (1-2 sentences, descriptive):
[what's visually on screen — now indexed alongside caption + hashtags]

HASHTAGS (3-5, niche-specific, placed in-caption not first comment):
[broad tags like #investing are close to useless now — go specific]
```

### 2c. `twitter.txt`

```
POST (target 70-100 chars, hard cap 280):
[keyword-led hook, no stuffing — X's algorithm reads semantic meaning, 
not tag density]

HASHTAGS (0-1, only if genuinely relevant — skip by default for evergreen 
educational content, this isn't event/trend-based):
[leave blank unless there's a real reason]

LINK PLACEMENT NOTE:
Do not put the article link in the main post — links in the first tweet 
cut reach ~50%. Put it in a reply.
```

---

## STAGE 3 — YouTube Learning Structured Data (post-render)

**Input:** final video's section timecodes (from the render template) + article JSON

**Task:** Produce `01-text/youtube-problems.txt` — timecoded question/answer pairs matching Google's `LearningVideo` structured data format. This lets Google Search and YouTube surface individual sections of the video as direct answers to specific searches, not just the video as a whole.

```
[timecode] [question a beginner would search, matching this section's content]

Example:
0:14 Should you keep cash or invest it first?
0:38 Should you pay off debt before investing?
1:05 How much can a Roth IRA save you in taxes?
1:48 When should you use a taxable brokerage account?
```

**Rules:**
- One question per distinct section/beat in the video — align to the same section boundaries as the narrative arc (Orient → Frame → Warn → Quantify → Opportunity cost → Closing edge case)
- Question phrasing should match how a beginner would actually search, same standard as the Stage 1 primary keyword
- Timecodes must come from actual render output, never estimated
- This field depends on video render being complete — cannot run at the same time as Stage 1/2. Note as a blocked/pending step in the pipeline if the render isn't done yet.

**Also apply at upload (Studio fields, not a text file, but part of this stage's checklist):**
- Category: Education
- Type: Problem walkthrough
- Paste the Stage 3 output into the Studio "Problems" field

---

## STAGE 4 — Spanish Subtitles (post-render, optional)

**Input:** Spanish translation of `04-video/tts_script.txt` (saved as `04-video/tts_script.es.txt`) + per-word timings from `04-video/.media/voiceover/voiceover.json` (produced by `node scripts/measure-vo-timing.mjs <slug>`)

**Task:** Generate `01-text/spanish-subs.srt` — a SubRip subtitle file uploaded to YouTube Studio (Subtitles tab) alongside the video. Viewers hear the English voiceover while reading Spanish text aligned to the same time slots.

**Translation step (paste into Claude against `04-video/tts_script.txt`):**

```
You are translating a Compound Lane voiceover script from English to
Spanish. Section markers (`# intro`, `# concept1`, etc.) and `# TODO`
comments must be preserved. Output every section, even if the Spanish
is a single line. Apply:
- Plain Spanish, beginner-friendly, neutral Latin American register
- Numbers stay as digits (Spanish viewers can read them faster than words)
- Keep brand names in English ("Vanguard", "S&P 500", "DCA", "Roth IRA")
- Keep currency in $ (Spanish viewers in LATAM/US are familiar)
- Preserve sentence count — one Spanish sentence per English sentence.
  The SRT generator aligns Spanish sentences to English word timings,
  so the cue count must match.
```

Then paste the contents of `04-video/tts_script.txt` below the prompt. Save Claude's output to `projects/{slug}/04-video/tts_script.es.txt`.

**Build step:**

```bash
node scripts/build-subs.mjs <slug>            # auto-discovers if no args
```

The build script:
- Parses both `tts_script.txt` (English) and `tts_script.es.txt` (Spanish) by `# section` markers — keys must match 1:1.
- Loads `voiceover.json` (faster-whisper per-word timings) and re-uses the same probe-based section alignment as `scripts/measure-vo-timing.mjs`, so the Spanish SRT aligns to the same section boundaries the video's visuals use.
- Within each section, walks the English word stream to find each English sentence's first/last word. The matching Spanish sentence gets `cue.start = firstWord.start`, `cue.end = lastWord.end`. Word-order drift is absorbed at the sentence level (clause-aligned, not word-aligned).
- Auto-merges cues shorter than 1.0s forward into the next cue; auto-splits cues longer than 7.0s at the nearest `,` `;` `:` boundary. Cue count and total duration are printed in the build summary.

**Rules:**
- Translation is the human's — paste the prompt above, save to `04-video/tts_script.es.txt`.
- The build script fails loudly if `tts_script.es.txt` or `voiceover.json` is missing (it never silently emits an empty SRT).
- Spanish SRT cues reuse English word timings. Drift per cue is ~50-200ms, well under YouTube's 1s tolerance.
- Cue length target: 1-7s on screen. Shorter cues merge forward; longer cues split at clause boundaries.
- At upload: YouTube Studio → Subtitles → upload `01-text/spanish-subs.srt` → set language to "Spanish" → publish.

---

## Variant B — Local file (preferred)

When the article HTML is already saved (e.g. `projects/{slug}/01-source/source.html`):

```
You are extracting platform-copy from a Compound Lane article HTML file to
generate YouTube / Instagram / Twitter copy. The article's locked JSON
(the source of truth for every number) is at:

projects/{slug}/01-content/{slug}.json

Article HTML file: projects/{slug}/01-source/{article-filename}
(visible text + asset list pasted below, or the raw HTML)

<paste visible_text.txt + asset-descriptions.md from the file, or the raw HTML>

Generate the four output sections from this doc (keywords.txt, youtube.txt,
instagram.txt, twitter.txt). Apply the brand constraints and per-platform
rules above. Do not invent numbers — every stat must appear in the pasted
source or in the locked JSON.
```

**Which variant to use:** Prefer **Variant B** when a local file exists (no credits, no drift, reproducible). Use **Variant A** (URL) only when you have a live URL and no saved copy. Both produce identical output.

---

## Output checklist (verify before marking `01-text/` complete)

**Stage 1-2 (pre-render):**
- [ ] Primary keyword appears in first line of all three platform files
- [ ] No fabricated numbers — every figure traces to `01-content/{slug}.json`
- [ ] Disclaimer present in YouTube description and Instagram caption
- [ ] Instagram hook is ≤125 chars and reads as a complete thought on its own
- [ ] YouTube title ≤60 chars, doesn't repeat verbatim in description hook
- [ ] Twitter post ≤100 chars target (280 hard cap), 0-1 hashtags
- [ ] No platform has more than 5 hashtags
- [ ] Link (if any) is in Twitter reply, not main post
- [ ] #Shorts included in YouTube hashtags
- [ ] This reel is substantively distinct from recent posts — not a reskin of the same template with numbers swapped (2026 "inauthentic/templated content" enforcement risk)

**Stage 3 (post-render):**
- [ ] Timecodes match actual render output
- [ ] One question per narrative section, phrased as a real search query
- [ ] Category set to Education, Type set to Problem walkthrough at upload

**Stage 4 (post-render, optional):**
- [ ] `04-video/tts_script.es.txt` translated and saved (section markers preserved)
- [ ] `04-video/.media/voiceover/voiceover.json` exists (run `node scripts/measure-vo-timing.mjs <slug>` if not)
- [ ] `node scripts/build-subs.mjs <slug>` produced `01-text/spanish-subs.srt` without errors
- [ ] SRT cue count is reasonable (typically 1-2× the section count, depending on sentence count)
- [ ] No cue is empty; no cue > 7s; no cue < 1s (or the build summary's auto-merge note explains it)
- [ ] Spanish text reads naturally (manual review of 2-3 random cues against the English source)

---

## Fact-check discipline

Every number in `01-text/*.txt` must trace back to `01-content/{slug}.json` — the same "every number sourced" promise that gates the visual-notes PNG also gates the platform copy. If a number appears in your draft that isn't in the JSON, delete it or trace it to a cited source in the article and add that source to `sources_footer` in the JSON first. Do not invent statistics, even plausible ones. See `GUIDE.md §17.2` (visual-notes fact-check gate) and `docs/visual-notes-prompt-system.md` "Fact-checking gate" for the full rule.

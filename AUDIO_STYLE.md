# Audio Style — Voiceover Script Rules

> **Canonical rules for every `tts_script.txt` in this repo.** Apply these
> when writing a voiceover script for any project. The rules exist because
> neither of our TTS engines supports SSML — no `<break>`, `<emphasis>`,
> or `<prosody>` tags. With no SSML, **punctuation is the only lever you
> have for prosody**. These rules are how we make the voice sound like
> a person rather than a teleprompter.

Voice default: **`Paul`** via VibeVoice 1.5B (local) with playback
speed **`1.20×`** (ffmpeg `atempo` post-process). The speed default is
calibrated against the 30s floor of `docs/pacing-rules-v1.md` — for
~90-word scripts, 1.20× lands at ~29.8s, right at the floor. Measured
ladder for the Roth reel (93 words, 6 segments):

| TTS_SPEED | Duration | Notes |
|---|---|---|
| 1.15× | 27.3s | Under 30s floor |
| **1.20×** | **29.8s** | **Current default** — right at the 30s floor |
| 1.30× | 25.5s | Over-fast for a 30s target (was the old default) |

Override per project with `TTS_SPEED=N.NN`. The legacy Kokoro/`am_michael`
path (`npx hyperframes tts --speed 1.15`) is kept as a fallback in
`templates/video/regen.{ps1,sh.tpl}` and is also speed-controlled by
`TTS_SPEED` (now defaulting to `1.20` to match the VibeVoice path).
See `GUIDE.md §8` for the generation command and `§18` for the full
human-likeness recipe (ffmpeg post-processing, voice alternates).

---

## The rules

### 1. One thought per line

Each line is a beat. Line breaks (`\n\n` between paragraphs, `\n` within)
become audible pauses. Don't cram two thoughts into one line; don't
break one thought across two.

```
❌ "DCA means investing the same dollars on a schedule, not all at once.
    You buy fewer shares when prices are high and more when low,
    smoothing your average cost, and there are two flavors of it."

✅ DCA means investing the same dollars on a schedule — not all at once.
   You buy fewer shares when prices are high. More when they're low.
   Smoothing your average cost.
```

### 2. Vary sentence length on purpose

A run of medium-length sentences sounds flat. After a long sentence, drop
in a 3–6 word punchline. Long / short / long / short — that's the rhythm
humans speak with.

```
❌ "Lump sum beat twelve-month DCA about two-thirds of the time, which is
    about sixty-eight percent, because markets rise more often than they
    fall over long horizons."

✅ Lump sum beat twelve-month DCA about two-thirds of the time — call it
   sixty-eight percent. The reason is simple. Markets rise more often
   than they fall.
```

### 3. Use em-dashes for breath

Em-dash (`—`, not hyphen) = the inhale before a pivot, the trailing
thought, the aside. It's the closest thing to SSML `<break>` we have.
Use it freely; the pause is short, intentional, and human.

```
❌ "There are two flavors: spreading cash you already have where the
    money sits out and loses time, or investing from each paycheck where
    nothing waits."

✅ There are two flavors. Spreading cash you already have, where the
   money sits out and loses time — that's cash drag. Or investing from
   each paycheck, where nothing waits — and that's drag-free DCA.
```

### 4. Spell out numbers in context

Kokoro reads digits as "one nine two eight" or "$10,000" as "dollar ten
thousand". Spelled-out numbers sound like a person. Currency, percentages,
and years are the highest-impact cases.

| On paper | Spoken form |
|---|---|
| `$10,000` | `ten thousand dollars` |
| `$833` | `eight thirty three dollars` |
| `$373` | `three hundred seventy three dollars` |
| `$10,700` | `ten thousand seven hundred` |
| `$10,327` | `ten thousand three hundred twenty seven` |
| `7%` | `seven percent` |
| `68%` | `sixty eight percent` |
| `32%` | `thirty two percent` |
| `12 months` | `twelve months` |
| `1920s` | `nineteen twenties` |
| `3–6 months` | `three to six months` |

**Keep as-is:** acronyms Kokoro knows (`DCA`, `SEC`, `FINRA`, `ETF`,
`IRA`, `S&P`). The voice handles them fine.

```
❌ "$10,000 invested day 1 grows to ~$10,700 after 12 months. DCA at
    end-of-month grows to ~$10,327. The ~$373 gap is not a fee."

✅ Ten thousand dollars invested day one grows to about ten thousand
   seven hundred after twelve months. DCA at end-of-month — the same
   ten thousand split into twelve checks — grows to about ten thousand
   three hundred twenty seven. The three hundred seventy three dollar
   gap is not a fee.
```

### 5. Lead hard beats with a softener

Difficult transitions (counter-arguments, "the catch", "but here's the
thing") need a verbal runway. Open with a softener so the listener knows
a pivot is coming.

Softeners that work:
- "Look —" / "Look at this —"
- "Here's the thing —"
- "So when does [X] actually [do Y]?"
- "How to use it right."
- "Think about it —"

```
❌ "DCA helps when you would otherwise stay in cash from fear or when
    markets drop right after. It hurts whenever markets rise while cash
    waits. That ~10% nominal return is the persistent cost."

✅ So when does DCA actually help? When you would otherwise sit in cash
   out of fear — or when markets drop right after you start. At least
   you didn't deploy everything before the fall.

   When does it hurt? Whenever markets rise while your cash waits.
   That's most years. The persistent cost of DCA isn't a fee. It's
   the ten percent nominal return you left on the table while your
   money sat on the sideline.
```

### 6. End paragraphs on the beat that should breathe longest

A new concept gets two newlines (paragraph break = ~0.4s pause). A
mid-paragraph pivot gets one. Don't put the punchline at the end of a
long paragraph — give it its own line so the breath lands before it.

```
❌ "Lump sum earns a full year on the whole ten thousand, but DCA at
    end-of-month earns about half a year on average, with your first
    eight-thirty-three earning roughly eleven months in the market and
    your last one earning almost zero, and the later your money
    arrives, the less time it has to compound, which is the drag."

✅ Lump sum earns a full year on the whole ten thousand. DCA at
   end-of-month earns about half a year on average.

   Your first eight thirty three earns roughly eleven months in the
   market. Your last one earns almost zero.

   The later your money arrives, the less time it has to compound.

   That's the drag, visualized.
```

### 7. No all-caps for emphasis

Kokoro doesn't honor caps as stress, and it sounds shouty. Use word
choice (`this`, `exactly`, `the catch`, `the punchline`) and pacing
(short sentences) for emphasis instead.

```
❌ "THE PERSISTENT COST OF DCA ISN'T A FEE. IT'S THE TEN PERCENT
    NOMINAL RETURN YOU LEFT ON THE TABLE."

✅ The persistent cost of DCA isn't a fee. It's the ten percent nominal
   return you left on the table while your money sat on the sideline.
```

### 8. `tts_script.txt` contains ONLY the spoken words

The regen scripts (`regen.{ps1,sh}`) prepend `Speaker 1:` to every
non-empty line of `tts_script.txt` before passing it to VibeVoice. That
means **every line — including comments, section markers, blank-line
separators, and bottom-of-file checklists — becomes a separate
inference segment with ~7–15s of fixed overhead.**

- ❌ No `# intro` / `# concept1` / `# outro` markers
- ❌ No per-line commentary or editor's notes inline
- ❌ No AUDIO_STYLE.md 9-item checklist at the bottom of the file
- ❌ No line-wrap at column ~80 (one paragraph = one long line)
- ❌ No section dividers (`---`, `===`, `* * *`)
- ✅ Sections separated by a single blank line
- ✅ Editor's notes live in a sibling file (e.g. `script-notes.md`)

**Why:** the Roth reel came out 23.8s with the markers and 21.9s
without them — 1.9s of dead air per run, every run. The DCA reel
ships at 136s for a 90s target for the same reason; the checklist at
the bottom of its `tts_script.txt` accounts for ~10–15s of that.

**How to apply:** before committing a `tts_script.txt`, mentally run
the AUDIO_STYLE.md checklist. The regen script also warns loudly if
any `#`-prefixed line is present, so a stray comment won't ship
silently.

---

## Quick checklist (paste into your PR / commit)

Before you commit a `tts_script.txt`, confirm:

- [ ] One thought per line; paragraph breaks on the long-breath beats
- [ ] Sentence lengths vary — at least one 3–6 word sentence per concept
- [ ] Em-dashes used for breath, not hyphens
- [ ] Numbers spelled out (currency, percent, year, month-count)
- [ ] Hard beats open with a softener ("Look —", "So when —", "How to —")
- [ ] No all-caps; emphasis via word choice and pacing
- [ ] Acronyms (`DCA`, `SEC`, `FINRA`, `ETF`, `IRA`, `S&P`) kept as-is
- [ ] **File contains ONLY the spoken words** (no `# section` markers,
      no per-line commentary, no bottom-of-file checklist; see rule 8)
- [ ] **No line-wrap at column ~80** — one paragraph = one long line
- [ ] **Pacing rules pass** — `node scripts/check-pacing.mjs <slug>` shows
      all green before regen. The spec is `docs/pacing-rules-v1.md`:
      75-100 word VO, hook ≤12 words / 2s, largest number in the
      quantify_opportunity_cost beat, CTA in 38-40s, keyword continuity.
- [ ] Total spoken word count in range for the target length
      (see `docs/pacing-rules-v1.md` for the canonical 75–100 word range;
       the older `GUIDE.md §7` numbers have been superseded)
- [ ] Read it aloud once. If you stumble, the TTS will too.

---

## Where this fits

| Doc | Role |
|---|---|
| `AUDIO_STYLE.md` (this file) | **The rules.** Read before writing any `tts_script.txt`. |
| `GUIDE.md §8` | TTS generation command, voice selection, regen workflow |
| `GUIDE.md §18` | Full human-likeness recipe (ffmpeg post-processing, voice alternates) |
| `projects/<slug>/02-audio/README.md` | Per-project regen instructions |
| `projects/<slug>/02-audio/tts_script.txt` | The script itself (source of truth for the spoken words) |

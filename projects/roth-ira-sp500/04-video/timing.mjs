// timing.mjs — Roth IRA + S&P 500 (04-video/)
//
// Single source of truth for the composition's reveal schedule.
// The regen script (regen.{ps1,sh}) wires this into index.html via
// scripts/sound/inject-static-sfx.mjs. Changing any of the REVEAL
// constants and re-running regen.{ps1,sh} cascades through:
//   - the inline `var <NAME> = N;` declarations in index.html
//   - the static data-duration / data-start attributes on the body / #root / #page-bg / #vo tags
//   - the declarative SFX <audio> cues (none for this audio-only project)
//
// Per-section REVEAL durations are sized to fit the actual spoken
// content of each paragraph in tts_script.txt, with a ~0.2s pad on
// each section so the visual reveal lands slightly before the next
// VO line begins. The sum of REVEALs + FLASH_DURATION = COMPOSITION_DURATION.

// ── Tunable constants (the only knobs in the system) ─────────────
export const FLASH_DURATION       = 1.0;   // pre-roll: finished page shown for this many seconds before reveal
export const FLASH_FADE           = 0.2;   // pre-roll fade-out duration at the end of FLASH_DURATION
export const VO_DURATION          = 27.3;  // voiceover.mp3 length — must match the actual MP3 (measured by ffprobe after regen)

// Per-section reveal durations, sized to fit the actual paragraph
// spoken in each section. Roth script has 6 paragraphs (header + 4
// concepts + footer). Word counts and estimated VO spans:
//   HEADER:  4 words → ~1.4s → HEADER_REVEAL  2.0
//   C1:     19 words → ~6.5s → C1_REVEAL      7.0
//   C2:     14 words → ~4.8s → C2_REVEAL      5.5
//   C3:     19 words → ~6.5s → C3_REVEAL      7.0
//   C4:     16 words → ~5.5s → C4_REVEAL      6.0
//   OUTRO:   9 words → ~3.1s → OUTRO_REVEAL   3.5
//   sum = 31.0s.  VO_DURATION = 27.3s (with VibeVoice per-segment
//   stochasticity, the script lands between 26.5 and 30.0s on
//   repeated regen — the 1.2s pad absorbs that drift).
export const HEADER_REVEAL        = 2.0;   // intro ("Roth IRA: best deal.")
export const C1_REVEAL            = 7.0;   // c1  ("You put in post-tax dollars…")
export const C2_REVEAL            = 5.5;   // c2  ("But there's a catch…")
export const C3_REVEAL            = 7.0;   // c3  ("Max out your Roth for thirty years…")
export const C4_REVEAL            = 6.0;   // c4  ("Open a Vanguard…")
export const OUTRO_REVEAL         = 3.5;   // outro ("If this saved you an afternoon…")

// Derived (do not edit by hand)
export const TOTAL_REVEAL  = HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL + C4_REVEAL + OUTRO_REVEAL;
export const COMPOSITION_DURATION = FLASH_DURATION + TOTAL_REVEAL;

// ── Schedule (6 reveal groups) ────────────────────────────────────
// One row per section. `start` is on the master timeline from t=0
// (the beginning of the flash pre-roll). `dur` is how long the
// reveal takes. The footer/outro's duration is whatever's left of
// the composition after the 4 concepts.
export const schedule = [
  { key: 'header', start: 0,                                       dur: HEADER_REVEAL  },
  { key: 'c1',     start: HEADER_REVEAL,                           dur: C1_REVEAL      },
  { key: 'c2',     start: HEADER_REVEAL + C1_REVEAL,               dur: C2_REVEAL      },
  { key: 'c3',     start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL,   dur: C3_REVEAL      },
  { key: 'c4',     start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL,                                dur: C4_REVEAL      },
  { key: 'footer', start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL + C4_REVEAL,                      dur: OUTRO_REVEAL   },
].map(row => ({ ...row, start: row.start + FLASH_DURATION }));

// ── What the inject step patches in the inline <script> ──────────
// The HTML keeps readable `var <NAME> = N;` declarations inside the
// inline script so the tween code is self-documenting. The inject
// step rewrites these lines to match this module. Each entry must
// have a matching `var <NAME> = N;` line in index.html, and the
// patcher's regex requires the line to be a numeric literal.
export const INLINE_PATCH_FIELDS = [
  'FLASH_DURATION', 'FLASH_FADE', 'VO_DURATION',
  'HEADER_REVEAL', 'C1_REVEAL', 'C2_REVEAL', 'C3_REVEAL', 'C4_REVEAL', 'OUTRO_REVEAL',
];

// ── What the inject step patches in the static HTML markup ────────
export const FLASH_TOTAL = FLASH_DURATION + FLASH_FADE;
export const MARKUP_PATCH_RULES = [
  { anchor: 'id="flash-preview"', attr: 'data-duration', value: FLASH_TOTAL },
  { anchor: 'id="vo"', attr: 'data-start', value: FLASH_DURATION },
  { anchor: 'id="vo"', attr: 'data-duration', value: VO_DURATION },
  { anchor: '<body class="clip"', attr: 'data-duration', value: COMPOSITION_DURATION },
  { anchor: 'id="root"', attr: 'data-duration', value: COMPOSITION_DURATION },
  { anchor: 'id="page-bg"', attr: 'data-duration', value: COMPOSITION_DURATION },
];

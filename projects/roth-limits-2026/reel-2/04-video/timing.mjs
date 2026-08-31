// timing.mjs — Roth IRA Catch-up at 50 (04-video/)
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
export const VO_DURATION          = 31.7;  // voiceover.mp3 length — must match the actual MP3 (measured by ffprobe after regen)

// Per-section reveal durations, sized to fit the actual paragraph
// spoken in each section. Roth #2 script has 5 paragraphs (header + 3
// concepts + footer). Word counts and estimated VO spans (Paul 1.20×):
//   HEADER:  4 words → ~1.6s → HEADER_REVEAL  2.0
//   C1:     30 words → ~10.3s → C1_REVEAL     11.0
//   C2:     17 words → ~5.8s → C2_REVEAL       6.5
//   C3:     19 words → ~6.5s → C3_REVEAL       7.0
//   OUTRO:   5 words → ~1.7s → OUTRO_REVEAL    2.0
//   sum = 28.5s.  VO_DURATION = 22.0s (with VibeVoice per-segment
//   stochasticity, the script lands between 21.0 and 25.0s on
//   repeated regen — the 6.5s pad absorbs that drift and gives the
//   visual room to breathe).
export const HEADER_REVEAL        = 2.0;   // intro ("Turn fifty: $1,100 more.")
export const C1_REVEAL            = 11.0;  // c1  ("The 2026 catch-up is $1,100…")
export const C2_REVEAL            = 6.5;   // c2  ("If you turn fifty by December thirty-first…")
export const C3_REVEAL            = 7.0;   // c3  ("Base $7,500 plus catch-up $1,100 equals $8,600…")
export const OUTRO_REVEAL         = 2.0;   // outro ("Save this for your next birthday.")

// Derived (do not edit by hand)
export const TOTAL_REVEAL  = HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL + OUTRO_REVEAL;
export const COMPOSITION_DURATION = FLASH_DURATION + TOTAL_REVEAL;

// ── Schedule (5 reveal groups) ────────────────────────────────────
// One row per section. `start` is on the master timeline from t=0
// (the beginning of the flash pre-roll). `dur` is how long the
// reveal takes. The footer/outro's duration is whatever's left of
// the composition after the 3 concepts.
export const schedule = [
  { key: 'header', start: 0,                                       dur: HEADER_REVEAL  },
  { key: 'c1',     start: HEADER_REVEAL,                           dur: C1_REVEAL      },
  { key: 'c2',     start: HEADER_REVEAL + C1_REVEAL,               dur: C2_REVEAL      },
  { key: 'c3',     start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL,   dur: C3_REVEAL      },
  { key: 'footer', start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL, dur: OUTRO_REVEAL   },
].map(row => ({ ...row, start: row.start + FLASH_DURATION }));

// ── What the inject step patches in the inline <script> ──────────
// The HTML keeps readable `var <NAME> = N;` declarations inside the
// inline script so the tween code is self-documenting. The inject
// step rewrites these lines to match this module. Each entry must
// have a matching `var <NAME> = N;` line in index.html, and the
// patcher's regex requires the line to be a numeric literal.
export const INLINE_PATCH_FIELDS = [
  'FLASH_DURATION', 'FLASH_FADE', 'VO_DURATION',
  'HEADER_REVEAL', 'C1_REVEAL', 'C2_REVEAL', 'C3_REVEAL', 'OUTRO_REVEAL',
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

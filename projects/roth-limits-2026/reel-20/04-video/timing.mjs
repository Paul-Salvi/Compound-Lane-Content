// timing.mjs — Same $7,500 in a taxable brokerage (04-video/)
//
// Single source of truth for the composition's reveal schedule.
// Reel #20 has 5 paragraphs (header + 3 concepts + footer).
//   HEADER:   4 words → ~1.6s → HEADER_REVEAL  1.5
//   C1:      28 words → ~9.7s → C1_REVEAL     10.0
//   C2:      20 words → ~6.9s → C2_REVEAL      7.0
//   C3:      32 words → ~11.1s → C3_REVEAL    11.5
//   OUTRO:    5 words → ~2.0s → OUTRO_REVEAL   2.0
//   sum = 32.0s.  VO_DURATION estimated ~32-34s at 1.50× atempo.

// ── Tunable constants (the only knobs in the system) ─────────────
export const FLASH_DURATION       = 1.0;
export const FLASH_FADE           = 0.2;
export const VO_DURATION          = 33.96; // voiceover.mp3 length — measured by ffprobe after regen @ 1.50x atempo

export const HEADER_REVEAL        = 1.5;
export const C1_REVEAL            = 10.0;
export const C2_REVEAL            = 7.0;
export const C3_REVEAL            = 11.5;
export const OUTRO_REVEAL         = 2.0;

// Derived (do not edit by hand)
export const TOTAL_REVEAL  = HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL + OUTRO_REVEAL;
export const COMPOSITION_DURATION = FLASH_DURATION + TOTAL_REVEAL;

// ── Schedule (5 reveal groups) ────────────────────────────────────
export const schedule = [
  { key: 'header', start: 0,                                                dur: HEADER_REVEAL },
  { key: 'c1',     start: HEADER_REVEAL,                                    dur: C1_REVEAL     },
  { key: 'c2',     start: HEADER_REVEAL + C1_REVEAL,                        dur: C2_REVEAL     },
  { key: 'c3',     start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL,            dur: C3_REVEAL     },
  { key: 'footer', start: HEADER_REVEAL + C1_REVEAL + C2_REVEAL + C3_REVEAL, dur: OUTRO_REVEAL },
].map(row => ({ ...row, start: row.start + FLASH_DURATION }));

// ── What the inject step patches in the inline <script> ──────────
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

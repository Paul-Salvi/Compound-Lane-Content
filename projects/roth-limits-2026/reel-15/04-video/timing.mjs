// timing.mjs — The Sept 15 deadline you think exists doesn't (04-video/)
//
// Single source of truth for the composition's reveal schedule.
// Reel #15 has 5 paragraphs (header + 3 concepts + footer).
//   HEADER:   4 words → ~1.6s → HEADER_REVEAL  2.0
//   C1:      27 words → ~9.4s → C1_REVEAL      9.5
//   C2:      18 words → ~6.2s → C2_REVEAL      6.5
//   C3:      35 words → ~12.1s → C3_REVEAL    12.5
//   OUTRO:    7 words → ~2.5s → OUTRO_REVEAL   2.5
//   sum = 33.0s.  VO_DURATION estimated ~33-35s at 1.50× atempo.

// ── Tunable constants (the only knobs in the system) ─────────────
export const FLASH_DURATION       = 1.0;
export const FLASH_FADE           = 0.2;
export const VO_DURATION          = 30.31; // voiceover.mp3 length — measured at 1.50× atempo

export const HEADER_REVEAL        = 2.0;
export const C1_REVEAL            = 9.5;
export const C2_REVEAL            = 6.5;
export const C3_REVEAL            = 12.5;
export const OUTRO_REVEAL         = 2.5;

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

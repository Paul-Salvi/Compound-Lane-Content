// timing.mjs — 6% excise tax on excess Roth contributions (04-video/)
//
// Single source of truth for the composition's reveal schedule.
// Reel #11 has 5 paragraphs (header + 3 concepts + footer). Word counts
// and estimated VO spans (Paul 1.50× for 5-segment VibeVoice):
//   HEADER:   5 words → ~2.0s → HEADER_REVEAL  2.0
//   C1:      20 words → ~6.9s → C1_REVEAL      7.5
//   C2:      35 words → ~12.1s → C2_REVEAL    12.0
//   C3:      33 words → ~11.4s → C3_REVEAL    11.5
//   OUTRO:    5 words → ~2.0s → OUTRO_REVEAL   2.0
//   sum = 35.0s.  VO_DURATION estimated ~35s native WAV (1.50× atempo).

// ── Tunable constants (the only knobs in the system) ─────────────
export const FLASH_DURATION       = 1.0;
export const FLASH_FADE           = 0.2;
export const VO_DURATION          = 32.51; // voiceover.mp3 length — measured at 1.55× atempo

export const HEADER_REVEAL        = 2.0;
export const C1_REVEAL            = 7.5;
export const C2_REVEAL            = 12.0;
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

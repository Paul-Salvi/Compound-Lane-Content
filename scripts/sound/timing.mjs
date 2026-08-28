// scripts/sound/timing.mjs
// Single source of truth for the video's reveal schedule.
//
// Every other consumer (the composition's inline <script> in
// index.html, scripts/sound/emit-static-sfx.mjs that generates the
// declarative SFX <audio> block) reads from here. Changing a value
// in this file and re-running the build step (node scripts/sound/
// inject-static-sfx.mjs <path/to/index.html>) updates the entire
// cascade — flash pre-roll, voiceover start, all 56 SFX cues, every
// section reveal.
//
// Constants and the schedule are derived from the voiceover, not
// arbitrary padding. The VO (generated from tts_script.txt via
// regen.sh/.ps1) is 106.4s and split into 7 sections: intro, 6
// concepts, outro. Each section's REVEAL duration is sized to fit
// that section's spoken content. So:
//
//   HEADER_REVEAL  = intro VO length (currently ~8s)
//   CONCEPT_REVEAL = per-concept VO length (currently ~11s)
//   OUTRO_REVEAL   = the remainder of the 106.4s VO after the
//                    other sections, plus a small tail
//
// If you regenerate the voiceover and its total length changes,
// re-measure the section lengths from the audio (e.g. faster-whisper
// + silence detect, per the audio-visual-sync rule in MEMORY.md) and
// update these constants. The cascade below will then re-emit the
// correct schedule.

// ── Tunable constants (the only knobs in the system) ─────────────
export const FLASH_DURATION       = 1.0;   // pre-roll: finished page shown for this many seconds before reveal
export const FLASH_FADE           = 0.2;   // pre-roll fade-out duration at the end of FLASH_DURATION
export const HEADER_REVEAL        = 8.0;   // intro section reveal (intro VO length)
export const CONCEPT_REVEAL       = 11.0;  // per-concept reveal (each concept's VO length)
export const OUTRO_REVEAL         = 32.4;  // outro section reveal (outro VO length + tail)
export const VO_DURATION          = 106.4; // voiceover.mp3 length — must match the actual MP3

// Derived (do not edit by hand)
export const TOTAL_REVEAL  = HEADER_REVEAL + 6 * CONCEPT_REVEAL + OUTRO_REVEAL;
export const COMPOSITION_DURATION = FLASH_DURATION + TOTAL_REVEAL;

// ── Schedule (7 reveal groups) ────────────────────────────────────
// Each row is a section. `start` is the time on the master timeline
// when the section's reveal tweens begin, measured from t=0 (the
// beginning of the flash pre-roll). `dur` is how long the reveal
// takes. The footer/outro's duration is whatever's left of the
// composition after the 6 concepts.
export const schedule = [
  { key: 'header', start: 0,                                       dur: HEADER_REVEAL  },
  { key: 'c1',     start: HEADER_REVEAL,                           dur: CONCEPT_REVEAL },
  { key: 'c2',     start: HEADER_REVEAL + 1 * CONCEPT_REVEAL,      dur: CONCEPT_REVEAL },
  { key: 'c3',     start: HEADER_REVEAL + 2 * CONCEPT_REVEAL,      dur: CONCEPT_REVEAL },
  { key: 'c4',     start: HEADER_REVEAL + 3 * CONCEPT_REVEAL,      dur: CONCEPT_REVEAL },
  { key: 'c5',     start: HEADER_REVEAL + 4 * CONCEPT_REVEAL,      dur: CONCEPT_REVEAL },
  { key: 'c6',     start: HEADER_REVEAL + 5 * CONCEPT_REVEAL,      dur: CONCEPT_REVEAL },
  { key: 'footer', start: HEADER_REVEAL + 6 * CONCEPT_REVEAL,      dur: OUTRO_REVEAL   },
].map(row => ({ ...row, start: row.start + FLASH_DURATION }));

// ── What the inject step patches in the inline <script> ──────────
// The HTML keeps readable `var FLASH_DURATION = N;` declarations
// inside the inline script so the tween code is self-documenting.
// The inject step rewrites these lines to match this module. Note:
// COMPOSITION_DURATION is intentionally NOT in this list — it's an
// expression in the HTML that derives from the other constants, so it
// cascades automatically without patching. DO NOT add a new entry
// here without also adding the corresponding `var <NAME> = N;` line
// in index.html, and verify the line is a numeric literal (not an
// expression) so the patcher's regex matches.
export const INLINE_PATCH_FIELDS = ['FLASH_DURATION', 'FLASH_FADE'];

// ── What the inject step patches in the static HTML markup ────────
// These are HTML attribute values that have to match the constants
// above. Each `anchor` is a unique substring that ends RIGHT BEFORE
// the attribute value (i.e. it includes the attribute name, the `=`,
// and the opening `"`). The inject step rewrites the next number.
// The anchor must be unique in the document AND end immediately
// before the value. If a tag wraps across lines, use `anchor` for
// the unique part earlier in the tag and `attr` for the attribute
// name to seek forward to (allowing newlines between). DO NOT add
// a new entry here without also adding a matching element in
// index.html, or the cascade will leave the markup out of sync.
export const FLASH_TOTAL = FLASH_DURATION + FLASH_FADE;  // total time the flash is on screen
export const MARKUP_PATCH_RULES = [
  // The flash-preview overlay's data-duration must cover the full
  // visible window (FLASH_DURATION + FLASH_FADE). Tag wraps across
  // lines, so we anchor on the unique id and seek to data-duration.
  { anchor: 'id="flash-preview"', attr: 'data-duration', value: FLASH_TOTAL },
  // The voiceover <audio> starts at FLASH_DURATION. Tag wraps
  // across lines so we anchor on the unique id and seek to
  // data-start on the same tag (no `>` in between).
  { anchor: 'id="vo"', attr: 'data-start', value: FLASH_DURATION },
  // The body, #root, and #page-bg all span the entire composition.
  { anchor: '<body data-duration="', value: COMPOSITION_DURATION },
  { anchor: 'id="root"', attr: 'data-duration', value: COMPOSITION_DURATION },
  { anchor: 'id="page-bg"', attr: 'data-duration', value: COMPOSITION_DURATION },
];

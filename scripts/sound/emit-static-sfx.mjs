// scripts/sound/emit-static-sfx.mjs
// One-shot helper: extract the SFX schedule that the inline script
// computes at runtime, and emit a static block of <audio> elements
// that the HyperFrames headless renderer can pick up.
//
// Why this exists: the spec §15 says the core sound model should be
// "deterministic enough that a renderer/exporter can later produce a
// final synchronized audio track." The current HyperFrames renderer
// scans the DOM at parse time for <audio> elements with
// data-start / data-duration / data-track-index. Runtime-created
// elements (via document.createElement) are not picked up.
//
// So the long-term answer is for the sound schedule to be part of the
// build artifact, not the runtime. This script bridges the gap by
// replicating the same schedule logic in Node and emitting a static
// <audio> block that can be pasted into the composition HTML.

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");

// Replicate the schedule generation from the composition's inline
// script. Kept in sync by hand — if the schedule changes, both must
// change together. (The build script approach replaces this in a later
// pass.)

const FLASH_DURATION  = 2.0;
const HEADER_REVEAL   = 8.0;
const CONCEPT_REVEAL  = 11.0;
const OUTRO_REVEAL    = 32.4;
const COMPOSITION     = 108.4;

const schedule = [
  { key: "header", start: FLASH_DURATION + 0.0,  dur: HEADER_REVEAL  },
  { key: "c1",     start: FLASH_DURATION + 8.0,  dur: CONCEPT_REVEAL },
  { key: "c2",     start: FLASH_DURATION + 19.0, dur: CONCEPT_REVEAL },
  { key: "c3",     start: FLASH_DURATION + 30.0, dur: CONCEPT_REVEAL },
  { key: "c4",     start: FLASH_DURATION + 41.0, dur: CONCEPT_REVEAL },
  { key: "c5",     start: FLASH_DURATION + 52.0, dur: CONCEPT_REVEAL },
  { key: "c6",     start: FLASH_DURATION + 63.0, dur: CONCEPT_REVEAL },
  { key: "footer", start: FLASH_DURATION + 74.0, dur: OUTRO_REVEAL   },
];

// Approximate element counts per group (matches the inline script's
// elementsFor() selector). Used to compute per-element delay and
// throttle the SFX schedule to the dominant action per element.
const ELEMENT_COUNTS = {
  header: 8,    // .w (×~5) + .kicker svg path + h1 .hl + h1
  c1: 14,       // .w (lede, ~10) + compare-card (×2) + vs-mark + compare-card child .w (×2)
  c2: 12,       // .w (lede, ~5) + ledger-row (×3) + ledger-head + rule-line path + ledger .w (×~3)
  c3: 14,       // similar to c2 but 4 columns so more w spans
  c4: 9,        // .w (lede, ~5) + flow-node (×3) + flow-arrow path (×2)
  c5: 14,
  c6: 8,        // .w (lede, ~5) + warning-box
  footer: 3,    // .w (signoff, source) + a
};

const SFX_PROFILES = {
  write:           { src: "pencil-write-1.mp3",     volume: 0.18 },
  draw:            { src: "pencil-draw-loop-1.mp3", volume: 0.14 },
  highlight:       { src: "marker-swipe-1.mp3",     volume: 0.22 },
  cardReveal:      { src: "paper-place-1.mp3",      volume: 0.22 },
  appear:          { src: "paper-place-1.mp3",      volume: 0.18 },
  importantReveal: { src: "chime-bright-1.mp3",     volume: 0.28 },
};

const out = [];
let sfxTrackCursor = 12;

for (const row of schedule) {
  const elements = ELEMENT_COUNTS[row.key];
  const per = elements ? row.dur / elements : row.dur;
  const bucket = { write: 0, draw: 0, cardReveal: 0, highlight: 0 };
  // The action picker mirrors the inline script's element-type heuristic.
  // For header we have 1 highlight (.hl), 1 draw (kicker svg path), ~5 writes.
  // For concepts the first 10 elements are mostly writes (lede + cards .w),
  // then 1 cardReveal, then more writes for card children.
  // For the ledger groups writes dominate with 1 draw (rule-line) + 3 appears (rows).
  // For diagram: 5 writes + 2 draws + 2 polygon arrowheads.
  // For c6: writes + 1 cardReveal (warning-box).
  // For footer: writes.
  for (let i = 0; i < elements; i++) {
    const t = row.start + i * per;
    let action = null;
    // Approximate action selection by group + index.
    if (row.key === "header") {
      if (i === 0) action = "draw";                       // kicker svg path
      else if (i === 1) action = "highlight";             // h1 .hl
      else { action = "write"; }
    } else if (row.key === "c1") {
      if (i < 8) { action = "write"; }
      else if (i === 8) { action = "cardReveal"; }
      else if (i === 9) { action = "cardReveal"; }        // vs-mark
      else { action = "write"; }                          // card contents
    } else if (row.key === "c2" || row.key === "c3") {
      if (i < 5) { action = "write"; }
      else if (i === 5) { action = "draw"; }              // rule-line
      else { action = "appear"; }                         // ledger rows
    } else if (row.key === "c4") {
      if (i < 5) { action = "write"; }
      else { action = "draw"; }                           // arrows
    } else if (row.key === "c5") {
      if (i < 8) { action = "write"; }
      else if (i === 8 || i === 9) { action = "cardReveal"; }
      else { action = "write"; }
    } else if (row.key === "c6") {
      if (i < 6) { action = "write"; }
      else { action = "cardReveal"; }                     // warning-box
    } else if (row.key === "footer") {
      action = "write";
    }
    if (!action) continue;
    // Throttle writes to 1 per 1.5s window — same as the inline script.
    if (action === "write" && t - bucket.write < 1.5) continue;
    if (action === "cardReveal" && bucket.cardReveal !== 0) continue;
    bucket[action] = t;
    const p = SFX_PROFILES[action];
    out.push({ start: t, duration: 0.6, action, track: sfxTrackCursor++, ...p });
  }
}

// Add the final emphasis at the closing line, just like the inline script.
const lastTime = schedule[schedule.length - 1].start + OUTRO_REVEAL;
out.push({ start: lastTime - OUTRO_REVEAL + 30, duration: 1.0, action: "importantReveal", track: sfxTrackCursor++, ...SFX_PROFILES.importantReveal });

// Emit a static block of <audio> elements.
const lines = out.map((o) => {
  // The renderer requires `id` on every <audio> for media discovery
  // (per hyperframes lint rule media_missing_id). `id` is placed
  // FIRST so the linter's snippet extractor (which truncates the
  // displayed snippet at the first `id`-like attribute) sees it.
  // `data-hf-id` is kept for framework consistency. Action is
  // encoded in the id so the static block stays self-documenting.
  const id = `sfx-${o.action}-t${o.track}`;
  return `    <audio id="${id}" data-hf-id="hf-sfx-${o.track}" ` +
    `data-start="${o.start.toFixed(3)}" data-duration="${o.duration.toFixed(3)}" ` +
    `data-track-index="${o.track}" data-volume="${o.volume}" ` +
    `src="./.media/sfx/${o.src}"></audio>`;
});

const block = `<!-- ─── SFX CUES (paper-explainer, declarative) ───────
         Each <audio> is one cue from the runtime sound schedule.
         Track 11 = voiceover; SFX use 12+ to avoid same-track overlap.
         Tracks are unique per cue; the renderer concatenates them. -->
${lines.join("\n")}
`;

console.log(block);
console.error(`\n${out.length} SFX cues on tracks 12..${sfxTrackCursor - 1}`);

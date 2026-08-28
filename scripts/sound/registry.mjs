// scripts/sound/registry.mjs
// Centralized sound registry for the paper-explainer style.
//
// The animation engine and composition code reference semantic effect names
// (e.g. "write", "drawLoop", "marker"). The registry owns the asset list,
// default volume, loop behavior, variation policy, intensity mapping, and
// concurrent throttle per effect. The rest of the sound system MUST NOT
// touch audio filenames directly — go through the registry.
//
// Per-effect shape:
//   {
//     effect:      string  — semantic key, also the profile mapping target
//     assets:      string[] — file basenames, resolved against SFX_BASE_DIR
//     defaultVolume: number — 0..1, applied to the audio element's .volume
//     loop:        boolean — whether playback is one-shot (false) or
//                            continuous (true). For looped playback during
//                            "during" timing, the session pairs this with
//                            an explicit stop call at clip-end.
//     variation:   { enabled, playbackRateRange: {min,max} } — playback-rate
//                            jitter per spec §12. Range is narrow on purpose.
//     intensity:   "ambient"|"subtle"|"normal"|"emphasis"|"strong"
//                            — default firing intensity (spec §7).
//     timing:      "start"|"during"|"end" — default firing window.
//     maxConcurrent: number — throttle per effect (spec §8).
//   }
//
// Missing assets degrade silently: the resolver returns null and the session
// no-ops the play() call. Animation continues normally (spec §14).

export const SFX_BASE_DIR = "templates/audio/sfx";

/** Eight core paper-explainer effects, generated via audioldm-s-full-v2.
 *  Order matches the planned cue list. assets[] length determines variation
 *  selection at play time (random pick per call, seeded by call site — see
 *  session.mjs). */
export const REGISTRY = {
  // ─── Writing ───────────────────────────────────────────────────────
  write: {
    effect: "write",
    assets: ["pencil-write-1.wav"],
    defaultVolume: 0.18,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.97, max: 1.03 } },
    intensity: "subtle",
    timing: "during",
    maxConcurrent: 2,
  },
  writeShort: {
    effect: "writeShort",
    assets: ["pencil-write-1.wav"],     // same source, different playback
    defaultVolume: 0.16,
    loop: false,
    variation: { enabled: true, playbackRateRate: 0, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "subtle",
    timing: "start",
    maxConcurrent: 3,
  },
  writeLoop: {
    effect: "writeLoop",
    assets: ["pencil-write-loop-1.wav"],
    defaultVolume: 0.15,
    loop: true,                          // loop for the duration of the write
    variation: { enabled: false, playbackRateRange: { min: 1.0, max: 1.0 } },
    intensity: "subtle",
    timing: "during",
    maxConcurrent: 1,
  },

  // ─── Drawing ───────────────────────────────────────────────────────
  drawStart: {
    effect: "drawStart",
    assets: ["pencil-draw-loop-1.wav"],
    defaultVolume: 0.16,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.97, max: 1.03 } },
    intensity: "subtle",
    timing: "start",
    maxConcurrent: 3,
  },
  drawLoop: {
    effect: "drawLoop",
    assets: ["pencil-draw-loop-1.wav"],
    defaultVolume: 0.14,                 // quieter than write: drawing is
    loop: true,                          // a background texture most of the time
    variation: { enabled: false, playbackRateRange: { min: 1.0, max: 1.0 } },
    intensity: "subtle",
    timing: "during",
    maxConcurrent: 2,
  },
  drawEnd: {
    effect: "drawEnd",
    assets: ["pencil-draw-loop-1.wav"],
    defaultVolume: 0.12,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "subtle",
    timing: "end",
    maxConcurrent: 3,
  },

  // ─── Marker ────────────────────────────────────────────────────────
  marker: {
    effect: "marker",
    assets: ["marker-swipe-1.wav"],
    defaultVolume: 0.22,                 // louder than write: this directs
    loop: false,                          // attention
    variation: { enabled: true, playbackRateRange: { min: 0.96, max: 1.04 } },
    intensity: "normal",
    timing: "during",
    maxConcurrent: 1,
  },
  highlight: {
    effect: "highlight",
    assets: ["marker-swipe-1.wav"],
    defaultVolume: 0.20,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.98, max: 1.02 } },
    intensity: "normal",
    timing: "during",
    maxConcurrent: 1,
  },
  underline: {
    effect: "underline",
    assets: ["marker-swipe-1.wav"],
    defaultVolume: 0.14,                 // quieter than highlight
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "subtle",
    timing: "during",
    maxConcurrent: 1,
  },

  // ─── Placement ─────────────────────────────────────────────────────
  softPop: {
    effect: "softPop",
    assets: ["paper-place-1.wav"],
    defaultVolume: 0.18,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "subtle",
    timing: "start",
    maxConcurrent: 3,
  },
  paperPlace: {
    effect: "paperPlace",
    assets: ["paper-place-1.wav"],
    defaultVolume: 0.20,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.96, max: 1.04 } },
    intensity: "normal",
    timing: "start",
    maxConcurrent: 2,
  },
  cardPlace: {
    effect: "cardPlace",
    assets: ["paper-place-1.wav"],
    defaultVolume: 0.22,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "normal",
    timing: "start",
    maxConcurrent: 2,
  },

  // ─── Movement ──────────────────────────────────────────────────────
  penMove: {
    effect: "penMove",
    assets: ["soft-whoosh-1.wav"],
    defaultVolume: 0.10,                 // ambient; almost inaudible
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.9, max: 1.1 } },
    intensity: "ambient",
    timing: "start",
    maxConcurrent: 1,
  },
  softWhoosh: {
    effect: "softWhoosh",
    assets: ["soft-whoosh-1.wav"],
    defaultVolume: 0.18,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "subtle",
    timing: "start",
    maxConcurrent: 2,
  },

  // ─── Emphasis ──────────────────────────────────────────────────────
  emphasis: {
    effect: "emphasis",
    assets: ["soft-impact-1.wav"],
    defaultVolume: 0.24,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.97, max: 1.03 } },
    intensity: "emphasis",
    timing: "end",
    maxConcurrent: 1,
  },
  impact: {
    effect: "impact",
    assets: ["soft-impact-1.wav"],
    defaultVolume: 0.28,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.96, max: 1.04 } },
    intensity: "emphasis",
    timing: "end",
    maxConcurrent: 1,
  },
  chime: {
    effect: "chime",
    assets: ["chime-bright-1.wav"],
    defaultVolume: 0.22,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.98, max: 1.02 } },
    intensity: "normal",
    timing: "end",
    maxConcurrent: 1,
  },

  // ─── Scene ─────────────────────────────────────────────────────────
  sectionReveal: {
    effect: "sectionReveal",
    assets: ["soft-whoosh-1.wav"],
    defaultVolume: 0.16,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.95, max: 1.05 } },
    intensity: "subtle",
    timing: "start",
    maxConcurrent: 1,
  },
  transition: {
    effect: "transition",
    assets: ["soft-whoosh-1.wav"],
    defaultVolume: 0.20,
    loop: false,
    variation: { enabled: true, playbackRateRange: { min: 0.94, max: 1.06 } },
    intensity: "normal",
    timing: "start",
    maxConcurrent: 1,
  },
};

/** Look up an effect definition. Returns null if the effect is not in the
 *  registry — the resolver treats this as a silent miss, never a throw. */
export function getEffect(effectName) {
  return REGISTRY[effectName] ?? null;
}

/** Pick an asset variation deterministically. `seed` is a per-call site
 *  integer (e.g. clipIndex) so the same scene produces the same variation
 *  on every render — no Math.random(), no Date.now() (spec §11). */
export function pickAsset(effect, seed = 0) {
  if (!effect || !effect.assets || effect.assets.length === 0) return null;
  const idx = ((seed % effect.assets.length) + effect.assets.length) % effect.assets.length;
  return effect.assets[idx];
}

/** Compute the playback rate for a call, deterministic from `seed`. */
export function pickPlaybackRate(effect, seed = 0) {
  if (!effect || !effect.variation?.enabled) return 1.0;
  const { min, max } = effect.variation.playbackRateRange;
  if (min === max) return min;
  // Deterministic LCG-ish lerp on a 0..1 range, then scale.
  const u = ((seed * 2654435761) % 1000) / 1000;
  return min + u * (max - min);
}

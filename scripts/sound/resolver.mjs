// scripts/sound/resolver.mjs
// Animation action → SoundEvent[] resolver.
//
// Precedence (per the spec §6, this is the most important thing this module
// does, so it gets the longest comment):
//
//   explicit sound config  >  action-specific default  >  profile default  >  silence
//
// The author can attach a `sound` field to a clip in one of three forms:
//   1. sound: false                       — disable sound for this clip
//   2. sound: { effect: "marker", ... }   — single SoundEvent (shorthand)
//   3. sound: [ { effect, timing, ... },  — explicit list of SoundEvents
//              { effect, timing, ... } ]
//
// If `sound` is absent, the resolver consults the profile's `actions` map
// keyed by the clip's `action` (e.g. "write", "draw", "highlight"). The
// profile supplies a default SoundEvent[] per action; the resolver expands
// compound actions (e.g. "drawBox" → 1× drawStart + 1× drawLoop + 1× drawEnd
// with a shared group id) per the spec §9 grouping rule.
//
// If the action is not in the profile, the resolver returns [] and the
// session plays nothing. This is the "silence" fallback.
//
// SoundEvent shape (the canonical, serialization-friendly form):
//   {
//     effect:     "drawLoop",
//     timing:     { at: "during" } | { at: "start" } | { at: "end" } |
//                 { at: "absolute", time: 4.2 } | { at: "during", offset: 0.05 },
//     volume?:    number  — override the registry default
//     intensity?: "subtle"|"normal"|"emphasis"|... — override the registry default
//     loop?:      boolean — override the registry default
//     group?:     string  — shared group id for multi-segment grouped sounds
//     fadeIn?:    number  — seconds
//     fadeOut?:   number  — seconds
//   }

import { getEffect } from "./registry.mjs";

/** Expand a shorthand `sound: { effect: "X" }` into a single-event list,
 *  pulling registry defaults for everything the author didn't specify. */
function expandShorthand(s, defaults) {
  if (s === false) return [];
  if (s == null) return null;             // "no explicit config, fall through"
  // Array form
  if (Array.isArray(s)) return s;
  // Object form
  return [{
    effect: s.effect,
    timing: s.timing ?? { at: defaults?.timing ?? "during" },
    volume: s.volume,
    intensity: s.intensity,
    loop: s.loop,
    group: s.group,
    fadeIn: s.fadeIn,
    fadeOut: s.fadeOut,
  }];
}

/** Apply per-effect defaults from the registry to any SoundEvent that
 *  doesn't override them. Returns a new array — does not mutate input. */
function applyRegistryDefaults(events) {
  return events
    .map((e) => {
      const def = getEffect(e.effect);
      if (!def) return null;             // unknown effect → drop
      return {
        ...e,
        volume:   e.volume   ?? def.defaultVolume,
        intensity:e.intensity ?? def.intensity,
        loop:     e.loop     ?? def.loop,
      };
    })
    .filter(Boolean);
}

/** Group-aware expansion: a single logical "draw" action becomes three
 *  events sharing a group id, so the session can coalesce them. */
function expandGroupedAction(action, baseEvent) {
  if (action === "drawBox" || action === "drawCard") {
    return [
      { ...baseEvent, effect: "drawStart", timing: { at: "start" }, group: `${baseEvent.group ?? action}` },
      { ...baseEvent, effect: "drawLoop",  timing: { at: "during" }, loop: true, group: `${baseEvent.group ?? action}` },
      { ...baseEvent, effect: "drawEnd",   timing: { at: "end" }, group: `${baseEvent.group ?? action}` },
    ];
  }
  if (action === "drawCircle") {
    return [
      { ...baseEvent, effect: "drawStart", timing: { at: "start" }, group: `${baseEvent.group ?? action}` },
      { ...baseEvent, effect: "drawLoop",  timing: { at: "during" }, loop: true, group: `${baseEvent.group ?? action}` },
      { ...baseEvent, effect: "drawEnd",   timing: { at: "end" }, group: `${baseEvent.group ?? action}` },
      { ...baseEvent, effect: "emphasis",  timing: { at: "end", offset: 0.05 } },
    ];
  }
  if (action === "draw") {
    return [
      { ...baseEvent, effect: "drawStart", timing: { at: "start" } },
      { ...baseEvent, effect: "drawLoop",  timing: { at: "during" }, loop: true },
      { ...baseEvent, effect: "drawEnd",   timing: { at: "end" } },
    ];
  }
  if (action === "write") {
    return [
      { ...baseEvent, effect: "writeShort", timing: { at: "start" } },
      { ...baseEvent, effect: "writeLoop",  timing: { at: "during" }, loop: true },
    ];
  }
  if (action === "highlight") {
    return [
      { ...baseEvent, effect: "marker", timing: { at: "during" } },
    ];
  }
  if (action === "underline") {
    return [
      { ...baseEvent, effect: "underline", timing: { at: "during" } },
    ];
  }
  if (action === "appear") {
    return [
      { ...baseEvent, effect: "softPop", timing: { at: "start" } },
    ];
  }
  if (action === "place" || action === "cardReveal") {
    return [
      { ...baseEvent, effect: "cardPlace", timing: { at: "start" } },
    ];
  }
  if (action === "sectionReveal") {
    return [
      { ...baseEvent, effect: "sectionReveal", timing: { at: "start" } },
    ];
  }
  if (action === "importantReveal") {
    return [
      { ...baseEvent, effect: "impact", timing: { at: "end" } },
    ];
  }
  if (action === "transition") {
    return [
      { ...baseEvent, effect: "transition", timing: { at: "start" } },
    ];
  }
  // Unknown action — single-effect default pass-through, caller decides.
  return [baseEvent];
}

/** Resolve the SoundEvent[] for one clip.
 *
 *  @param clip  { action?: string, sound?: false|SoundEvent|SoundEvent[] }
 *  @param profile  { actions: Record<string, SoundEvent|SoundEvent[]> }
 *  @returns SoundEvent[]  — possibly empty; never null
 */
export function resolve(clip, profile) {
  // 1) explicit `sound: false` short-circuits everything.
  if (clip && clip.sound === false) return [];

  // 2) explicit sound config (shorthand or array) wins over the profile.
  const explicit = clip ? expandShorthand(clip.sound, null) : null;
  if (explicit !== null) {
    return applyRegistryDefaults(explicit);
  }

  // 3) profile-driven default for this action.
  const action = clip?.action;
  if (!action || !profile?.actions) return [];
  const profileDefault = profile.actions[action];
  if (profileDefault == null) return [];

  const expanded = expandGroupedAction(action, { ...profileDefault });
  return applyRegistryDefaults(expanded);
}

/** Resolve every clip in a list. Returns a list of `{ clip, events }`
 *  pairs, preserving order. Clips with no resolved events are still
 *  included (events: []) so the caller can iterate uniformly. */
export function resolveAll(clips, profile) {
  return clips.map((clip) => ({ clip, events: resolve(clip, profile) }));
}

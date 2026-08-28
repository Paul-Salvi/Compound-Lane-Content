// scripts/sound/bundle.template.mjs
// Browser-side entry point for the sound system. This file is the template
// the build copies into each project as `sound.js` — it is the bridge
// between the engine modules (DOM-free) and the live DOM/audio.
//
// Responsibilities (in order of importance):
//   1. Create a SoundController bound to the project-relative asset URL.
//   2. Create a SoundSession that wraps the browser's <audio> playback.
//   3. Walk the composition root (#root) for elements with `data-sound`.
//   4. For each data-sound, schedule tl.call() entries on the existing
//      GSAP timeline. The timeline is the source of truth for timing
//      (spec §10), not setTimeout / setInterval.
//   5. Expose `window.__sound` for Studio editing / mute toggle.
//   6. Stop everything on timeline restart, scene change, and unmount
//      (spec §11 hard requirements 5–7).
//
// `data-sound` attribute format (parse on element-read):
//   data-sound="action:write"
//   data-sound="action:draw,group:drawBox-1,seed:2"
//   data-sound="action:highlight,intensity:emphasis"
//   data-sound="action:none"   (silence)
//
// For authoring convenience, the build script can also emit fully-expanded
// JSON via data-sound-events="[ {...}, {...} ]" — this bypasses the
// resolver and lets the author hand-curate an event list.
//
// Audio playback strategy:
//   - For loop=false effects, the runtime creates an <audio> element, sets
//     volume from controller.effectiveVolume(), calls .play(), and lets it
//     play to completion. If autoplay is rejected, we don't retry (spec
//     §14: audio failure never breaks the visual timeline).
//   - For loop=true effects, the runtime creates an <audio loop> and stops
//     it via the session when the timeline reaches the clip end (or
//     sooner on cancel).
//   - The same <audio> element is reused per effect across calls (a small
//     pool), so we don't spawn hundreds of elements.

import { SoundController, SoundSession, paperExplainerProfile, resolve, getEffect, pickPlaybackRate } from "./sound-engine.mjs";

const root = document.getElementById("root");
const compositionId = root?.getAttribute("data-composition-id");

function tryBoot() {
  if (!root) {
    console.warn("[sound] no #root; sound system disabled");
    return;
  }
  if (typeof gsap === "undefined") {
    console.warn("[sound] no GSAP on window; sound system disabled");
    return;
  }
  const timeline = (window.__timelines && window.__timelines[compositionId]) ||
                   (window.__timelines && Object.values(window.__timelines)[0]);
  if (!timeline) {
    // Timeline isn't registered yet — the composition script may run
    // after this one. Poll for up to ~1s, then give up.
    if (tryBoot._tries == null) tryBoot._tries = 0;
    tryBoot._tries += 1;
    if (tryBoot._tries < 60) {
      requestAnimationFrame(tryBoot);
    } else {
      console.warn("[sound] no timeline registered on window.__timelines within 1s; sound system disabled");
    }
    return;
  }
  boot(root, timeline);
}

tryBoot();

function boot(root, timeline) {
  const controller = new SoundController({
    assetBaseURL: "./.media/sfx/",
    assetExtension: ".mp3",
  });
  const session = new SoundSession({ controller, onPlay: playOne });

  // Element pool: one <audio> per effect, reused. Keeps DOM small and
  // browser autoplay policies happy (one user gesture can unlock them all).
  const pool = new Map();
  function getOrCreate(effect) {
    let a = pool.get(effect);
    if (a) return a;
    const def = getEffect(effect);
    if (!def) return null;
    const url = controller.resolveAssetURL(def.assets[0]);
    a = new Audio(url);
    a.preload = "auto";
    a.loop = !!def.loop;
    a.addEventListener("error", () => controller.missingAssets.add(def.assets[0]));
    pool.set(effect, a);
    return a;
  }

  // The actual play() callback passed to the session. The session wraps
  // this in try/catch (spec §14) so we don't need to.
  function playOne({ event, ctx, handle }) {
    const def = getEffect(event.effect);
    if (!def) return null;
    const url = controller.resolveAssetURL(def.assets[0]);
    const vol = controller.effectiveVolume(event.volume, event.intensity);
    if (vol <= 0) return null;

    // For loop=false: create a fresh Audio each call. Cheap, and it
    // guarantees no overlap of the same one-shot.
    if (!event.loop && !def.loop) {
      const a = new Audio(url);
      a.volume = vol;
      a.playbackRate = pickPlaybackRate(def, ctx.seed ?? 0);
      a.preload = "auto";
      a.play().catch(() => { /* autoplay blocked — silent miss */ });
      return { stop: () => { try { a.pause(); a.currentTime = 0; } catch {} } };
    }
    // For loop=true: use the pooled element; bind the session to it.
    const a = getOrCreate(event.effect);
    if (!a) return null;
    a.volume = vol;
    a.currentTime = 0;
    a.play().catch(() => {});
    return { stop: () => { try { a.pause(); a.currentTime = 0; } catch {} } };
  }

  // Walk the root for elements with data-sound. For each clip, resolve
  // its SoundEvent[] via the profile-driven resolver, then schedule
  // tl.call() for each event.
  const clips = Array.from(root.querySelectorAll("[data-sound]"));
  for (const el of clips) {
    const start = parseFloat(el.getAttribute("data-start") ?? "0") || 0;
    const duration = parseFloat(el.getAttribute("data-duration") ?? "0") || 0;
    const action = el.getAttribute("data-action") || undefined;
    const explicit = el.getAttribute("data-sound-events");
    const seed = parseInt(el.getAttribute("data-sound-seed") ?? "0", 10) || 0;

    let events;
    if (explicit) {
      // Hand-authored event list (authored in the build step)
      try { events = JSON.parse(explicit); }
      catch { events = []; }
    } else {
      events = resolve({ action, sound: false }, paperExplainerProfile);
      // sound: false above ensures we ONLY get the profile-driven defaults;
      // if the user wanted to override, they would have used data-sound-events.
    }

    if (!events || events.length === 0) continue;

    for (const ev of events) {
      const at = ev.timing?.at ?? def(ev).timing ?? "during";
      const offset = ev.timing?.offset ?? 0;
      const absTime = (at === "start") ? start
                    : (at === "end")   ? (start + duration)
                    : (at === "absolute") ? (ev.timing.time ?? 0)
                    :  start;            // "during" — fire at start, loop runs till end
      const when = absTime + offset;
      timeline.call(() => {
        const h = session.play(ev, { clipStart: start, clipDuration: duration, seed });
        if (at === "during" && ev.loop !== false) {
          // For looped during-effects, schedule a stop at clip end.
          const stopAt = start + duration;
          if (stopAt > when) {
            timeline.call(() => h.stop(), [], stopAt);
          }
        }
      }, [], when);
    }
  }

  // Alternative: a hand-authored schedule on window.__soundSchedule.
  // The composition's existing timeline script can push entries to
  // this array before sound.js boots (or even after — the array is
  // read once at boot time, then the timeline calls are made).
  //   window.__soundSchedule = [
  //     { start: 2.0, duration: 8.0, action: "write", seed: 0 },
  //     { start: 10.0, duration: 11.0, action: "cardReveal", seed: 1 },
  //     ...
  //   ];
  if (Array.isArray(window.__soundSchedule)) {
    for (const row of window.__soundSchedule) {
      const { start, duration, action, seed } = row;
      const events = resolve({ action }, paperExplainerProfile);
      if (!events || events.length === 0) continue;
      for (const ev of events) {
        const at = ev.timing?.at ?? def(ev).timing ?? "during";
        const offset = ev.timing?.offset ?? 0;
        const absTime = (at === "start") ? start
                      : (at === "end")   ? (start + duration)
                      : (at === "absolute") ? (ev.timing.time ?? 0)
                      :  start;
        const when = absTime + offset;
        timeline.call(() => {
          const h = session.play(ev, { clipStart: start, clipDuration: duration, seed: seed ?? 0 });
          if (at === "during" && ev.loop !== false) {
            const stopAt = start + duration;
            if (stopAt > when) {
              timeline.call(() => h.stop(), [], stopAt);
            }
          }
        }, [], when);
      }
    }
  }

  // Spec §11 hard requirements 5–7: scene change, restart, unmount.
  // GSAP doesn't fire a "restart" event we can listen to, but the
  // timeline's onComplete fires at end-of-playback — at which point the
  // session is already empty (each handle stopped itself via tl.call).
  // The remaining case is "user clicks replay": that's just tl.restart()
  // from outside, and we expose a stopAll() helper for that.
  window.__sound = {
    controller,
    session,
    mute:        () => controller.mute(),
    unmute:      () => controller.unmute(),
    setMuted:    (m) => controller.setMuted(m),
    setVolume:   (v) => controller.setMasterVolume(v),
    stopAll:     () => session.stopAll(),
    size:        () => session.size(),
  };
}

// Small helper used above. The `def(ev)` call sites need the registry
// default timing if the event doesn't carry one. Kept inline so we don't
// need a separate import.
function def(ev) {
  const d = getEffect(ev.effect);
  return d || { timing: "during" };
}

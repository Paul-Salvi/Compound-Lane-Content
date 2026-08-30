// scripts/sound/session.mjs
// SoundSession — owns the lifecycle of all currently-playing SFX on one
// timeline. This is where the spec's §11 hard requirements live:
//
//   1. Loops start exactly with the animation
//   2. Loops continue only while the visual action is active
//   3. Loops stop or fade when the animation completes
//   4. Loops stop immediately if the animation is cancelled
//   5. Loops stop when the scene changes
//   6. Loops stop when playback restarts
//   7. Loops never survive component unmounting
//
// The session exposes a small imperative API the timeline can call:
//   session.play(event, { clipStart, clipDuration, seed }) → handle
//   session.stop(handle)
//   session.stopGroup(groupId)
//   session.stopAll()
//
// Handles are tiny: { stop: () => void, effect: string, group?: string }.
// The timeline stores handles returned from `play()` so it can stop them
// in teardown or on restart.
//
// This module is pure ESM and DOM-free — the actual `<audio>` element
// creation lives in sound.js (the browser bundle). The session just
// tracks an array of handle-shaped objects and calls their stop().

const NOOP = () => {};
const NOOP_HANDLE = Object.freeze({ stop: NOOP, effect: null });

export class SoundSession {
  constructor({ controller, onPlay } = {}) {
    this.controller = controller;        // may be null in tests
    this.onPlay = onPlay || null;        // browser-only: (event, handle) => void
    this.handles = [];                   // active handles
    this.counts = new Map();             // effect → active count (for throttle)
  }

  /** Start a sound for one event at a specific timeline position.
   *  Returns a handle. The handle's stop() is idempotent. */
  play(event, ctx = {}) {
    const { effect, timing, group, loop, volume, intensity, fadeIn, fadeOut } = event;
    if (!effect) return NOOP_HANDLE;

    // Throttle per spec §8 — if maxConcurrent exceeded, drop the lowest-intensity
    // event. (We just drop this one if the effect is already at max.)
    const def = this.controller?.getEffect?.(effect);
    const max = def?.maxConcurrent ?? Infinity;
    const cur = this.counts.get(effect) ?? 0;
    if (cur >= max) {
      // console.warn would be the spec's behavior; we just no-op.
      return NOOP_HANDLE;
    }
    this.counts.set(effect, cur + 1);

    // Build the handle up-front so stop() works even if onPlay is sync/async.
    const handle = {
      effect,
      group: group ?? null,
      _stopped: false,
      stop: () => {
        if (handle._stopped) return;
        handle._stopped = true;
        const c = this.counts.get(effect) ?? 0;
        this.counts.set(effect, Math.max(0, c - 1));
        const i = this.handles.indexOf(handle);
        if (i >= 0) this.handles.splice(i, 1);
        if (handle._realStop) handle._realStop();
      },
    };
    this.handles.push(handle);

    // Hand off to the browser-side player (no-op in tests).
    if (this.onPlay) {
      try {
        const real = this.onPlay({ event, ctx, handle });
        if (real && typeof real.stop === "function") handle._realStop = real.stop;
      } catch {
        // Spec §14: audio failure never breaks the visual timeline.
      }
    }
    return handle;
  }

  stop(handle) {
    if (handle && typeof handle.stop === "function") handle.stop();
  }

  /** Stop every active handle in a group. Used by drawBox/drawCard expansion. */
  stopGroup(groupId) {
    if (!groupId) return;
    // Snapshot — stop() mutates this.handles.
    const matches = this.handles.filter((h) => h.group === groupId);
    for (const h of matches) h.stop();
  }

  /** Stop every active handle. Called on scene change, restart, unmount. */
  stopAll() {
    // Snapshot — stop() mutates this.handles.
    const all = this.handles.slice();
    for (const h of all) h.stop();
  }

  /** Number of currently-active handles. Exposed for tests + debug. */
  size() {
    return this.handles.length;
  }
}

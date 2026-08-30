// scripts/sound/controller.mjs
// Global SoundController — master mute, master volume, intensity mix,
// and the central asset resolution layer. One controller per composition.
//
// The browser bundle (sound.js) creates the controller and wires its
// `resolveAssetURL(name)` to the actual project-relative path. The engine
// modules (registry, resolver, session) never see URLs.

import { REGISTRY, SFX_BASE_DIR, getEffect } from "./registry.mjs";

/** Map an intensity label to a linear volume multiplier (spec §7).
 *  Kept as a small multiplicative mix on top of the per-effect defaultVolume. */
const INTENSITY_MIX = {
  ambient:   0.50,
  subtle:    0.75,
  normal:    1.00,
  emphasis:  1.20,
  strong:    1.40,
};

export class SoundController {
  constructor(opts = {}) {
    this.assetBaseURL = opts.assetBaseURL ?? "./.media/sfx/";
    this.assetExtension = opts.assetExtension ?? ".mp3";
    this.masterVolume = opts.masterVolume ?? 1.0;
    this.muted = opts.muted ?? false;
    // List of asset basenames known to be missing on disk — populated
    // lazily as the browser attempts to load them. Playback of a missing
    // asset is silently skipped (spec §14).
    this.missingAssets = new Set();
    this.onMuteChange = opts.onMuteChange || null;
    this.onVolumeChange = opts.onVolumeChange || null;
  }

  mute()       { this.muted = true;  if (this.onMuteChange)   this.onMuteChange(true); }
  unmute()     { this.muted = false; if (this.onMuteChange)   this.onMuteChange(false); }
  setMuted(m)  { m ? this.mute() : this.unmute(); }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.onVolumeChange) this.onVolumeChange(this.masterVolume);
  }

  /** Resolve a registry asset basename to a URL the browser can load. */
  resolveAssetURL(basename) {
    return this.assetBaseURL + basename.replace(/\.[^.]+$/, "") + this.assetExtension;
  }

  /** The effective volume for one effect + intensity combination, after
   *  master volume is applied. Returns 0 if muted. */
  effectiveVolume(perEffectVolume, intensity) {
    if (this.muted) return 0;
    const mix = INTENSITY_MIX[intensity] ?? 1.0;
    const raw = (perEffectVolume ?? 0) * mix * this.masterVolume;
    return Math.max(0, Math.min(1, raw));
  }

  /** Expose the registry helpers (so the session can read maxConcurrent
   *  without an extra import). */
  getEffect(name) { return getEffect(name); }
  getRegistry()   { return REGISTRY; }
  getBaseDir()    { return SFX_BASE_DIR; }
}

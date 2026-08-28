// scripts/sound/index.mjs
// Barrel re-export for the sound engine. The browser bundle (sound.js)
// imports from here; tests import from the individual modules.

export { REGISTRY, SFX_BASE_DIR, getEffect, pickAsset, pickPlaybackRate } from "./registry.mjs";
export { resolve, resolveAll } from "./resolver.mjs";
export { paperExplainerProfile } from "./profile-paper-explainer.mjs";
export { SoundSession } from "./session.mjs";
export { SoundController } from "./controller.mjs";

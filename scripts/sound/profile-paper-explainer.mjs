// scripts/sound/profile-paper-explainer.mjs
// The paper-explainer sound profile. Maps animation actions to default
// SoundEvent templates — the per-effect registry fields (volume, loop,
// intensity, timing) are applied by the resolver.
//
// The author can still override any of this with an explicit `sound:`
// field on the clip (per the spec §6 precedence).

export const paperExplainerProfile = {
  style: "paper-explainer",
  description: "Hand-drawn notebook explainer. Warm paper, pencil + marker, restrained emphasis.",

  // Default timing per action: when the sound fires within a clip. The
  // resolver's expandGroupedAction overrides these for compound actions.
  actions: {
    // Writing
    write:           { effect: "write" },         // resolver expands to writeShort+writeLoop
    writeShort:      { effect: "writeShort" },
    writeLoop:       { effect: "writeLoop" },

    // Drawing
    draw:            { effect: "drawLoop" },      // resolver expands to start/loop/end
    drawLine:        { effect: "drawLoop" },
    drawArrow:       { effect: "drawLoop" },
    drawBox:         { effect: "drawLoop" },      // resolver adds grouping
    drawCard:        { effect: "drawLoop" },      // resolver adds grouping
    drawCircle:      { effect: "drawLoop" },      // resolver adds emphasis at end
    drawStart:       { effect: "drawStart" },
    drawEnd:         { effect: "drawEnd" },

    // Marker
    highlight:       { effect: "marker" },
    underline:       { effect: "underline" },
    marker:          { effect: "marker" },

    // Placement
    appear:          { effect: "softPop" },
    place:           { effect: "cardPlace" },
    cardReveal:      { effect: "cardPlace" },
    softPop:         { effect: "softPop" },
    paperPlace:      { effect: "paperPlace" },
    cardPlace:       { effect: "cardPlace" },

    // Movement
    penMove:         { effect: "penMove" },
    softWhoosh:      { effect: "softWhoosh" },

    // Emphasis
    emphasis:        { effect: "emphasis" },
    impact:          { effect: "impact" },
    chime:           { effect: "chime" },
    importantReveal: { effect: "impact" },

    // Scene
    sectionReveal:   { effect: "sectionReveal" },
    transition:      { effect: "transition" },
  },
};

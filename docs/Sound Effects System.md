# Implement a First-Class Sound Effects System for the Hand-Drawn Educational Video Engine

## Context

We have an existing video/animation engine that generates vertical educational explainer videos.

The visual style is intentionally similar to a person progressively explaining a concept on a sheet of paper.

The videos use:

- warm off-white paper backgrounds
- subtle horizontal notebook/rule lines
- handwritten and document-style typography
- blue, red, and green annotations
- progressively revealed sections
- comparison boxes and information cards
- arrows and connector lines
- circles around important values
- underlines and marker/highlight effects
- handwritten calculations
- tables
- a visible pen/pencil or drawing cursor
- step-by-step construction of the explanation

The visual experience should feel like:

> Someone is actively building an explanation in front of the viewer.

The current videos have the visual animation system, but the sound design is missing or not integrated as part of the animation architecture.

We now need to implement a **first-class sound effects system**.

This should not be treated as a simple collection of audio files added at the end of rendering.

Sound must become part of the animation language.

---

# Primary Goal

Every meaningful visual action should have the ability to produce a synchronized sound event.

For this style of video, sound should reinforce the feeling that the page is being actively constructed.

For example:

```text id="4p7k2m"
Text is written
→ subtle pen/pencil writing sound

A line is drawn
→ pencil stroke sound

A box is constructed
→ drawing sound while the border is being created

A comparison card appears
→ soft paper/place/pop sound

An arrow is drawn
→ continuous drawing sound

An important number is circled
→ pen/marker circle sound

A value is highlighted
→ marker swipe sound

A calculation is written
→ handwriting sound

A section becomes active
→ subtle emphasis sound

A major conclusion appears
→ slightly stronger impact/accent

The pen moves to another area
→ optional subtle movement/whoosh
```

The result should feel natural, subtle, tactile, and synchronized.

Avoid making the video sound like a mobile game, presentation template, or generic UI animation.

---

# Important Design Principle

The animation and the sound should be treated as one coordinated event.

Instead of:

```text id="6kl8c7"
Animation
    ↓
Finish animation
    ↓
Some unrelated code plays sound
```

The architecture should support:

```text id="5jux7r"
Timeline Event
│
├── Visual action
│     └── draw / write / reveal / highlight / place
│
└── Sound action
      └── synchronized sound event
```

The same timeline or scheduling system should control both.

Do not scatter:

```ts id="6q4frx"
setTimeout(() => playSound(...), 500);
```

throughout components.

Audio timing must be declarative and timeline-driven.

---

# 1. Understand the Existing Architecture First

Before implementing anything:

1. Inspect the existing project structure.
2. Understand how scenes are defined.
3. Understand how animations are scheduled.
4. Identify the animation timeline or equivalent scheduling mechanism.
5. Identify the lifecycle of scenes, animations, playback, restart, and rendering.
6. Identify where visual events such as `write`, `draw`, `reveal`, `highlight`, and `transition` are represented.

Do not create a parallel audio architecture without understanding the current system.

The sound system should integrate naturally into the existing animation engine.

Before coding, provide a concise implementation plan describing:

- the existing integration points
- proposed sound architecture
- new types/interfaces
- files/modules to create or modify
- timeline integration strategy
- cleanup strategy

Then implement incrementally.

---

# 2. Create a Semantic Sound Vocabulary

Do not expose raw audio filenames throughout the animation code.

Animation definitions should describe **what is happening**, not which MP3 file should play.

Create a semantic vocabulary similar to:

```ts id="ysgxzb"
export type SoundEffect =
  // Writing
  | "write"
  | "writeShort"
  | "writeLong"

  // Drawing
  | "drawStart"
  | "drawLoop"
  | "drawEnd"
  | "lineDraw"
  | "arrowDraw"
  | "boxDraw"
  | "circleDraw"

  // Marker / emphasis
  | "highlight"
  | "underline"
  | "marker"

  // Object appearance
  | "softPop"
  | "paperPlace"
  | "cardPlace"
  | "softTap"

  // Movement
  | "penMove"
  | "softWhoosh"

  // Emphasis
  | "emphasis"
  | "impact"

  // Scene
  | "sectionReveal"
  | "transition";
```

The exact names may change based on the existing architecture, but maintain the same semantic approach.

Example animation code should look like:

```ts id="j3xv3c"
animate({
  target: "tax-deferred-heading",

  action: "write",

  duration: 900,

  sound: {
    effect: "write",
    timing: {
      at: "during"
    }
  }
});
```

Not:

```ts id="t4j8i3"
sound: {
  file: "/assets/audio/pencil-writing-03.mp3"
}
```

---

# 3. Build a Centralized Sound Registry

Create a centralized registry that maps semantic effects to actual assets and playback defaults.

Conceptually:

```ts id="wzbklb"
interface SoundDefinition {
  effect: SoundEffect;

  assets: string[];

  defaultVolume: number;

  loop?: boolean;

  variation?: {
    enabled: boolean;
    playbackRateRange?: {
      min: number;
      max: number;
    };
  };
}

const soundRegistry: Record<SoundEffect, SoundDefinition> = {
  write: {
    effect: "write",
    assets: [
      "/sounds/write-01.mp3",
      "/sounds/write-02.mp3",
      "/sounds/write-03.mp3"
    ],
    defaultVolume: 0.15,
    variation: {
      enabled: true,
      playbackRateRange: {
        min: 0.97,
        max: 1.03
      }
    }
  }

  // ...
};
```

The rest of the animation engine should not know or care about the actual audio filenames.

The registry should handle:

- asset lookup
- sound variations
- default volume
- loop behavior
- playback-rate variation
- metadata
- future extensibility

---

# 4. Support Declarative Sound Events

Create a reusable sound event model.

Conceptually:

```ts id="0ceh44"
interface SoundEvent {
  id?: string;

  effect: SoundEffect;

  timing?: {
    at: "start" | "end" | "during" | "absolute";
    offset?: number;
  };

  volume?: number;

  intensity?: SoundIntensity;

  playbackRate?: number;

  variation?: boolean;

  loop?: boolean;

  fadeIn?: number;

  fadeOut?: number;
}
```

The implementation may evolve, but the developer experience should remain declarative.

Example:

```ts id="0o5x70"
animate({
  target: "comparison-box",

  action: "draw",

  duration: 800,

  sounds: [
    {
      effect: "drawStart",
      timing: {
        at: "start"
      }
    },
    {
      effect: "drawLoop",
      timing: {
        at: "during"
      },
      loop: true,
      intensity: "subtle"
    },
    {
      effect: "drawEnd",
      timing: {
        at: "end"
      }
    }
  ]
});
```

---

# 5. Create Sound Profiles Specifically for This Video Style

The engine should understand that different visual actions have different sound characteristics.

## A. Handwriting

When text is progressively handwritten:

```text id="1db4gc"
Text begins
→ optional subtle write start

Text is being written
→ continuous or repeated handwriting texture

Text completes
→ naturally fade or stop
```

The sound should correspond to the duration of the writing animation.

Do not simply play a short "pen sound" once for a 3-second writing animation.

The audio duration should adapt to the visual writing duration.

---

## B. Drawing Lines, Arrows, and Boxes

For:

- horizontal rules
- arrows
- circles
- rectangles
- borders
- connectors
- hand-drawn diagrams

Use:

```text id="asbme9"
Drawing starts
→ subtle draw start

Stroke is visible
→ drawing loop or stroke texture

Drawing completes
→ stop/fade
```

The audio lifecycle must match the drawing lifecycle.

If the drawing takes 1.2 seconds, the sound should occupy approximately that same visual interval.

---

## C. Highlighting and Underlining

When a marker or highlight moves across text:

```text id="0ccrb8"
highlight begins
→ marker swipe

highlight continues
→ subtle continuous marker texture

highlight ends
→ fade naturally
```

Underlines should generally be quieter and shorter.

Avoid loud swooshes.

---

## D. Cards, Boxes, and Information Blocks

When a completed visual object appears:

```text id="y1srac"
card appears
→ soft pop or paper placement

comparison box settles
→ subtle placement

important box
→ slightly stronger emphasis
```

These sounds should feel tactile and lightweight.

Think:

- paper
- pen
- subtle physical placement

Do not use aggressive UI clicks.

---

## E. Circling Important Values

When an important number is circled:

```text id="b4q8a5"
circle starts
→ pen stroke

circle continues
→ drawing texture

circle completes
→ optional subtle emphasis
```

This is one of the places where the sound can help direct attention.

---

## F. Important Conclusions

When the video reveals a major conclusion or final answer:

```text id="0yrf1u"
Important value appears
→ soft emphasis

Final result settles
→ gentle impact/accent
```

This should be stronger than ordinary object placement, but still consistent with the paper-based educational style.

No explosive cinematic impacts.

---

# 6. Automatic Sound Mapping

Where appropriate, create intelligent default mappings.

For example:

```text id="yrnppt"
Visual Action                 Default Sound
------------------------------------------------
write                         write
draw                          drawLoop
drawLine                      lineDraw
drawArrow                     arrowDraw
drawBox                       boxDraw
drawCircle                    circleDraw
highlight                     highlight
underline                     underline
appear                        softPop
place                         paperPlace
cardReveal                    cardPlace
sectionReveal                 sectionReveal
transition                    softWhoosh
importantReveal               emphasis
```

The animation author should not need to explicitly define every sound.

For example:

```ts id="p7rv0s"
animate({
  target: "roth-ira-box",
  action: "draw",
  duration: 900
});
```

may automatically receive the appropriate drawing sound.

However, explicit configuration must override defaults.

Example:

```ts id="kwp2o8"
animate({
  target: "roth-ira-box",

  action: "draw",

  duration: 900,

  sound: false
});
```

Or:

```ts id="ah9ugm"
animate({
  target: "roth-ira-box",

  action: "draw",

  duration: 900,

  sound: {
    effect: "boxDraw",
    intensity: "normal"
  }
});
```

Priority should be:

```text id="xl3m4n"
Explicit sound configuration
        ↓
Action-specific default
        ↓
Global style default
        ↓
Silence
```

---

# 7. Add a Sound Intensity System

This video style requires restraint.

Create a semantic intensity system:

```ts id="qh6fcg"
type SoundIntensity =
  | "ambient"
  | "subtle"
  | "normal"
  | "emphasis"
  | "strong";
```

Suggested behavior:

```text id="d8ljf7"
ambient
→ nearly imperceptible texture

subtle
→ handwriting, minor drawing, small movements

normal
→ card placement, normal reveal

emphasis
→ important number, conclusion, key concept

strong
→ major scene transition only
```

Avoid requiring every animation definition to manually specify volume.

The engine should map intensity to sensible defaults.

---

# 8. Prevent Sound Overload

This is extremely important.

The visual style contains many small actions.

If every:

- letter
- line
- box
- movement
- cursor adjustment

produces sound, the video will become exhausting.

The engine should support intentional silence and sound throttling.

For example:

```text id="x0mwl6"
Writing a heading
→ sound

Writing several small supporting lines immediately after
→ possibly one continuous writing texture

Three cards appearing simultaneously
→ one grouped placement sound

Drawing multiple connected lines
→ one continuous drawing session

Small cursor movement
→ usually silent

Important circle or highlight
→ sound
```

Consider introducing:

```ts id="b26byb"
soundGroup?: string;
soundThrottle?: number;
```

or another appropriate abstraction if useful.

The goal is to prevent repetitive sound spam.

---

# 9. Support Sound Grouping

A sequence of related visual actions should be able to behave like one audio event.

Example:

```text id="xf0om9"
Draw left border
Draw top border
Draw right border
Draw bottom border
```

Instead of:

```text id="jydn7c"
draw sound
stop

draw sound
stop

draw sound
stop

draw sound
stop
```

Support:

```text id="g7dg31"
start drawing sound
        ↓
draw all connected borders
        ↓
stop drawing sound
```

This is especially important for:

- boxes
- tables
- connected diagrams
- handwriting sequences
- multi-line calculations

The system should make the audio feel continuous when the visual action is continuous.

---

# 10. Timeline Synchronization

Sound must use the same conceptual timing system as animation.

Support:

```text id="4fck49"
start
→ animation begins

during
→ active throughout animation

end
→ animation completes

offset
→ relative timing adjustment

absolute
→ explicit timeline timestamp if supported
```

Example:

```ts id="nx6rk3"
sound: {
  effect: "emphasis",

  timing: {
    at: "end",
    offset: 50
  }
}
```

Avoid arbitrary component-level timers.

The timeline should remain the source of truth.

---

# 11. Looping Sound Lifecycle

For long-running visual actions:

- handwriting
- drawing
- highlighting
- marker strokes

the system may use loops.

Looping sounds must:

1. start exactly with the animation
2. continue only while the visual action is active
3. stop or fade when the animation completes
4. stop immediately if the animation is cancelled
5. stop when the scene changes
6. stop when playback restarts
7. never survive component unmounting

Prevent:

- orphaned loops
- duplicate playback after restart
- overlapping stale audio
- memory leaks

---

# 12. Sound Variation

Repeated actions should not sound identical.

The centralized sound registry should support multiple variations.

For example:

```text id="7kj5ah"
write
├── write-01
├── write-02
└── write-03

softPop
├── pop-01
├── pop-02
└── pop-03

paperPlace
├── place-01
└── place-02
```

The engine can select a variation automatically.

Allow subtle playback-rate variation:

```text id="f2xudq"
0.97x – 1.03x
```

Keep variation subtle.

The goal is to avoid robotic repetition, not create obvious randomness.

---

# 13. Create a Global Sound Controller

Implement a global sound controller with an API conceptually similar to:

```ts id="wivgfm"
soundController.enable();

soundController.disable();

soundController.mute();

soundController.unmute();

soundController.setMasterVolume(0.8);

soundController.stopAll();
```

Support independent volume categories if appropriate:

```ts id="1w6ul5"
master
effects
ambient
```

Do not over-engineer music support unless it already exists.

The current priority is synchronized sound effects.

---

# 14. Browser and Rendering Safety

The sound system must not break the visual animation system.

Handle gracefully:

- autoplay restrictions
- muted environments
- failed audio loading
- unavailable audio APIs
- preview environments
- server-side rendering, if applicable
- headless rendering environments
- video export workflows

If audio cannot play:

```text id="7w6ixp"
Visual animation continues normally.
```

Audio failure must never stop or corrupt rendering.

---

# 15. Separate Runtime Playback From Video Export

The architecture should support both:

```text id="hw4rmh"
Interactive Preview
        ↓
Visual timeline + real-time audio playback
```

and eventually:

```text id="bh8gza"
Video Export
        ↓
Visual timeline + deterministic audio timeline
        ↓
Final video with synchronized sound effects
```

Do not tightly couple the implementation to only browser playback.

The core sound event model should be deterministic enough that a renderer/exporter can later produce a final synchronized audio track.

If the existing project already has an export/render pipeline, integrate with it rather than inventing a second timeline.

---

# 16. Suggested Architecture

Adapt this to the existing project rather than blindly using these exact filenames.

Conceptually:

```text id="pgkwab"
src/

  audio/
    sound.types.ts
    SoundRegistry.ts
    SoundPlayer.ts
    SoundScheduler.ts
    SoundController.ts
    SoundSession.ts

  animation/
    Timeline.ts
    AnimationEvent.ts
    AnimationScheduler.ts
    AnimationSoundResolver.ts

  scenes/
    ...
```

Responsibilities:

```text id="e7n3m1"
SoundRegistry
→ knows which assets belong to each semantic sound

AnimationSoundResolver
→ converts animation actions into default sound events

SoundScheduler
→ schedules events against the animation timeline

SoundPlayer
→ performs actual audio playback

SoundSession
→ tracks active loops and scene-specific sounds

SoundController
→ manages global mute, volume, enable/disable, cleanup

Animation Engine
→ owns the timeline and emits meaningful animation events
```

Keep concerns separated.

Do not put audio playback logic directly inside every UI component.

---

# 17. Create a Style-Specific Default Sound Profile

Create a named sound profile for this video style.

For example:

```ts id="xhjcnp"
const paperExplainerSoundProfile = {
  style: "paper-explainer"
};
```

This profile should define sensible defaults for:

```text id="ztpxbz"
write
→ pencil/pen texture

draw
→ pencil stroke

box
→ continuous drawing

arrow
→ quick drawing stroke

circle
→ pen stroke + subtle emphasis

highlight
→ marker swipe

card reveal
→ paper placement / soft pop

section reveal
→ subtle emphasis

important number
→ emphasis

major transition
→ soft whoosh
```

The architecture should eventually support other visual styles with different sound profiles.

For example:

```text id="tfdp7l"
paper-explainer
whiteboard
ui-demo
cinematic
minimal
```

But implement only what is needed now.

Do not over-generalize prematurely.

---

# 18. Example Scene

Create a small demonstration using the existing rendering system.

The sequence should look conceptually like:

```text id="s27y5e"
Scene starts

↓

Title is written
→ handwriting sound

↓

Comparison boxes are drawn
→ continuous drawing sound

↓

Labels are written
→ subtle writing texture

↓

Arrow is drawn between sections
→ drawing sound

↓

Important value is circled
→ pen circle + subtle emphasis

↓

A result is highlighted
→ marker swipe

↓

Final conclusion appears
→ soft impact/emphasis

↓

Scene ends
```

The demo should make synchronization easy to visually and audibly verify.

---

# 19. Testing Requirements

Add tests for:

### Timeline

- sound triggers at animation start
- sound triggers at animation end
- sound triggers during an animation
- offset timing works
- multiple sound events work

### Lifecycle

- drawing loop stops when animation completes
- drawing loop stops when animation is cancelled
- scene change cleans up active sounds
- restart does not duplicate old sounds
- unmount cleans up active audio

### Configuration

- explicit sound overrides defaults
- `sound: false` disables automatic sound
- semantic sound resolves through registry
- sound variations can be selected
- global mute prevents playback

### Resilience

- audio load failure does not break animation
- disabled audio does not break animation
- unsupported audio environment fails gracefully

Mock actual audio playback where necessary.

Do not make tests depend on physical speakers or real audio output.

---

# Acceptance Criteria

The implementation is complete when:

- Sound is part of the animation model, not an afterthought.
- Meaningful visual actions can declaratively produce sound.
- The system understands the paper/hand-drawn educational video style.
- Writing, drawing, highlighting, circling, placing, and revealing can have appropriate default sounds.
- Sound timing is synchronized with the animation timeline.
- Long visual actions support continuous/looping audio.
- Related drawing actions can be grouped into one continuous sound session.
- Semantic sound names are mapped through a centralized registry.
- Repeated sounds support subtle variations.
- Sound intensity can be controlled semantically.
- The system prevents sound overload.
- Explicit sound configuration can override or disable defaults.
- Global mute and master volume work.
- Audio failures never break the visual animation.
- Active sounds are cleaned up correctly.
- The architecture can support deterministic video export later.
- Tests cover synchronization, overrides, cleanup, and failure cases.
- A demonstration scene proves that the visual and sound timelines feel like one coordinated experience.

---

# Final Design Principle

The desired authoring experience should eventually be as simple as:

```ts id="vf6kac"
animate({
  target: "final-answer",

  action: "highlight",

  duration: 700,

  sound: {
    effect: "highlight",
    timing: {
      at: "during"
    },
    intensity: "normal"
  }
});
```

Or, ideally:

```ts id="p0u3kz"
animate({
  target: "final-answer",
  action: "highlight",
  duration: 700
});
```

Where the engine understands the visual action and automatically applies the correct sound profile.

The objective is not:

> Add sounds to animations.

The objective is:

> Build a sound-aware animation engine where the act of writing, drawing, placing, highlighting, revealing, and emphasizing information has an equivalent audio language.

The final result should make these educational videos feel as if a real person is physically constructing the explanation on paper, with sound subtly reinforcing every important action without becoming distracting or repetitive.
// scripts/sound/inject-static-sfx.mjs
// One-shot build: emit the static <audio> SFX block (from
// emit-static-sfx.mjs) and splice it into the composition HTML, while
// removing the runtime DOM-append code that's redundant once the
// static block exists.
//
// Usage: node scripts/sound/inject-static-sfx.mjs <path/to/index.html>
//
// Why this exists: HyperFrames' headless renderer scans the DOM at
// parse time for <audio data-start data-duration data-track-index>
// elements. Runtime-created elements (via document.createElement) are
// not picked up, so SFX cues need to live in the static HTML source.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  FLASH_DURATION,
  FLASH_FADE,
  INLINE_PATCH_FIELDS,
  MARKUP_PATCH_RULES,
} from "./timing.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/sound/inject-static-sfx.mjs <path/to/index.html>");
  process.exit(1);
}

const htmlPath = resolve(target);
let html = await readFile(htmlPath, "utf8");

// Step 0: patch the inline <script>'s var declarations so the tween
// code uses the same values as timing.mjs. We only touch the constants
// listed in INLINE_PATCH_FIELDS; everything else in the inline script
// is left alone. The schedule array is built from these vars
// downstream, so the cascade flows through it.
{
  let patched = 0;
  for (const name of INLINE_PATCH_FIELDS) {
    // Match:   var <NAME> = <number>;
    // Tolerate optional trailing comment and whitespace.
    const re = new RegExp(`(var\\s+${name}\\s*=\\s*)([0-9]+(?:\\.[0-9]+)?)(\\s*;)`);
    const value = { FLASH_DURATION, FLASH_FADE }[name];
    // Format the number so 1.0 stays "1.0" (JS Number(1.0).toString() === "1").
    // One decimal place is enough for second-level timing precision.
    const formatted = Number.isInteger(value) ? `${value}.0` : String(value);
    if (value === undefined) {
      console.error(`[sound] timing.mjs: INLINE_PATCH_FIELDS includes ${name} but no value exported`);
      process.exit(2);
    }
    if (re.test(html)) {
      html = html.replace(re, `$1${formatted}$3`);
      patched += 1;
    } else {
      console.error(`[sound] could not find \`var ${name} = ...\` to patch in HTML`);
      process.exit(2);
    }
  }
  if (patched > 0) console.error(`[sound] patched ${patched} inline var(s) from timing.mjs`);
}

// Step 0b: patch static-HTML attributes (data-duration on body/#root/
// #page-bg/.flash-preview, data-start on the voiceover <audio>) so the
// static markup matches the timing constants. This is what closes the
// cascade: without it, changing FLASH_DURATION in timing.mjs would
// shift the tweens but leave the page-bg clip and the body data-
// duration stuck on the old value, desyncing the render.
//
// Each rule's `anchor` is a unique substring that ends RIGHT BEFORE
// the attribute value (i.e. it includes the attribute name, the `=`,
// and the opening `"`). The patcher rewrites the next number and
// closing `"`. For tags that wrap across lines, the rule may set
// `attr` instead: the patcher then looks for `attr="N"` AFTER the
// anchor on the same tag (forbidding `>` in between) and rewrites
// that. Either way the rule is matched against the raw HTML text.
{
  let patched = 0;
  for (const rule of MARKUP_PATCH_RULES) {
    let re;
    if (rule.attr) {
      // Anchor on a unique part of the tag, then walk forward (across
      // newlines) to `attr="` on the same tag. The `(?:(?!>).)*?`
      // forbids a closing `>` in between, keeping us on the same tag.
      re = new RegExp(
        `(${escapeForRegex(rule.anchor)}(?:(?!>)[\\s\\S])*?${escapeForRegex(rule.attr)}=")([0-9]+(?:\\.[0-9]+)?)(")`
      );
    } else {
      // Anchor ends right before the value.
      re = new RegExp(
        `(${escapeForRegex(rule.anchor)})([0-9]+(?:\\.[0-9]+)?)(")`
      );
    }
    if (re.test(html)) {
      // Format the number so 1.0 stays "1.0" (JS Number(1.0).toString() === "1").
      const formatted = Number.isInteger(rule.value) ? `${rule.value}.0` : String(rule.value);
      html = html.replace(re, `$1${formatted}$3`);
      patched += 1;
    } else {
      console.error(`[sound] could not find markup matching ${rule.anchor}${rule.attr ? ` ... ${rule.attr}` : ''} to patch`);
      process.exit(2);
    }
  }
  if (patched > 0) console.error(`[sound] patched ${patched} markup attribute(s) from timing.mjs`);
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Step 1: compute the static block by running emit-static-sfx.mjs
// through node and capturing stdout. Self-bootstraps — keeps the
// single source of truth (the schedule table) in one place.
const block = execSync(
  `node "${join(__dirname, "emit-static-sfx.mjs")}"`,
  { encoding: "utf8" }
);
const cleaned = block.trim();

// Step 2: find and remove the runtime emit block in the HTML. The
// block is delimited by two comments inside the inline <script>:
//
//   // Emit declarative <audio> elements for each SFX event ...
//   ... (through) ...
//   if (window.console && console.log) { ... }
//
// If the runtime block has already been removed (a prior run), this
// is a no-op.
{
  const startMarker = "// Emit declarative <audio> elements for each SFX event so the";
  const endMarker   = "if (window.console && console.log) {";
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const closeIdx = html.indexOf("}", endIdx);
    const sliceEnd = closeIdx === -1 ? endIdx : closeIdx + 1;
    html = html.slice(0, startIdx) + html.slice(sliceEnd);
    console.error("[sound] removed runtime emit block");
  } else {
    console.error("[sound] runtime emit block not found — assuming already-removed");
  }
}

// Step 2b: remove ALL prior static SFX blocks (idempotent re-runs).
// Identified by the marker comment we emit above the block. We loop
// to handle cases where prior runs accumulated duplicates.
{
  const staticMarker = "<!-- ─── SFX CUES (paper-explainer, declarative) ───────";
  let removed = 0;
  // Hard cap so a buggy removal can't loop forever.
  while (html.indexOf(staticMarker) !== -1 && removed < 100) {
    const staticStart = html.indexOf(staticMarker);
    // Walk back to the start of the line so we don't leave a stray blank.
    const lineStart = html.lastIndexOf("\n", staticStart) + 1;
    // The block ends with the LAST </audio> in the SFX block, followed
    // by a blank line. We identify the end by scanning forward for
    // "</audio>" and checking whether more SFX cues follow. The
    // simplest robust approach: find ALL </audio> from `staticStart`
    // forward, take the LAST one (which is the closing tag of the last
    // cue), then drop one trailing newline.
    let lastCueEnd = -1;
    let searchFrom = staticStart;
    while (true) {
      const next = html.indexOf("</audio>", searchFrom);
      if (next === -1) break;
      lastCueEnd = next + "</audio>".length;
      searchFrom = lastCueEnd;
    }
    if (lastCueEnd === -1) {
      console.error("[sound] could not find end of SFX block; aborting");
      break;
    }
    let cutEnd = lastCueEnd;
    if (html[cutEnd] === "\n") cutEnd += 1;
    html = html.slice(0, lineStart) + html.slice(cutEnd);
    removed += 1;
  }
  if (removed > 0) console.error(`[sound] removed ${removed} prior static block(s)`);
}

// Step 3: insert the static audio block right after the existing
// voiceover <audio> (track 11) so all declarative audio lives in one
// place.
const voMarker = '<audio data-hf-id="hf-vo1" id="vo"';
const voIdx = html.indexOf(voMarker);
if (voIdx === -1) {
  console.error("could not find voiceover <audio> anchor in", target);
  process.exit(3);
}
const voCloseIdx = html.indexOf("</audio>", voIdx) + "</audio>".length;
const withStatic =
  html.slice(0, voCloseIdx) +
  "\n\n    " + cleaned + "\n  " +
  html.slice(voCloseIdx);

await writeFile(htmlPath, withStatic, "utf8");
console.log(`wrote ${target} (${withStatic.length} bytes; static SFX block inserted)`);

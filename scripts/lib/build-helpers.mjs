// scripts/lib/build-helpers.mjs
// Shared helpers for the build scripts in scripts/. Currently used by
// build-animate.mjs (03-Video-animate lane) and build-video.mjs (04-video
// lane). Pure ESM, zero deps.
//
// Why these are shared: both lanes fork the same JSON spec
// (projects/{slug}/01-content/{slug}.json) into a per-project HTML
// composition, and both need the same H1 split, callout color rules,
// and HTML-escape behavior. Duplicating these was a drift hazard; the
// v2 build-video.mjs plan moves them here.
//
// What is NOT shared:
//   - buildSectionHtml() — the two lanes have different signatures
//     (animate adds data-draw-delay + per-section top offset, video
//     uses GSAP timeline ordering). Sharing would force a parameter
//     shape that touches both call sites without removing any real
//     complexity.
//   - discoverSlugs(), renderPackageJson() — they read from different
//     per-lane sources (e.g., DCA's 04-video for hyperframes.json vs
//     DCA's 03-Video for the hyperframes pin) and the sharing would
//     just be a wrapper.

/** Escape user-supplied text for safe inclusion in HTML. */
export function htmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Derive the H1 with highlight split from the JSON's title.
 * Mirrors scripts/stage2-render.ps1 Get-H1 — kept identical so the
 * visual notes, whiteboard-animation, and 04-video lanes render the
 * same H1. Strategy:
 *   1. If title contains ":", split on it; left = the topic, right = the question.
 *   2. Else if title has 4+ words, split in half.
 *   3. Else, use the title as-is.
 * Trailing " 6 THINGS TO KNOW" is stripped before splitting.
 */
export function deriveH1(slug, json) {
  const title = String(json.title ?? slug);
  const cleaned = title.replace(/\s+6\s+THINGS\s+TO\s+KNOW\s*$/i, "");
  if (cleaned.match(/^(.+?):\s*(.+)$/)) {
    const left = cleaned.replace(/^(.+?):\s*.+$/, "$1").toLowerCase();
    const right = cleaned.replace(/^.+?:\s*(.+)$/, "$1").toLowerCase();
    return `${htmlEscape(left)}<br><span class="hl">${htmlEscape(right)}</span>`;
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 4) {
    const half = Math.floor(parts.length / 2);
    const left = parts.slice(0, half).join(" ").toLowerCase();
    const right = parts.slice(half).join(" ").toLowerCase();
    return `${htmlEscape(left)}<br><span class="hl">${htmlEscape(right)}</span>`;
  }
  return htmlEscape(cleaned.toLowerCase());
}

/**
 * Per-callout color modifier (num-blob border + h2 class).
 * Mirrors scripts/stage2-render.ps1 lines 28-40 + the matching rules
 * in build-animate.mjs:101 and build-video.mjs:144. Heuristic by
 * callout heading text:
 *   - green for tips, start-here, formulas, bottom-line
 *   - maroon for warnings, watch-outs, reality-checks
 *   - navy (default) for anything else
 * Returns { blobColor, h2Class } — the empty string for "no override".
 */
export function calloutColorModifiers(heading) {
  if (!heading) return { blobColor: "", h2Class: "" };
  if (/TIP|START HERE|ONE-LINE|FORMULA|THE BOTTOM LINE/i.test(heading)) {
    return { blobColor: ' style="color:var(--ink-green)"', h2Class: "c-green" };
  }
  if (/WATCH|WARNING|SOURCE|DON'T FORGET|REMEMBER|FYI|RMD RULE|60-DAY|ALWAYS|DEFAULT ANSWER|REALITY CHECK/i.test(heading)) {
    return { blobColor: ' style="color:var(--ink-maroon)"', h2Class: "c-maroon" };
  }
  return { blobColor: "", h2Class: "" };
}

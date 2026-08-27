// build-animate.mjs
// Build the whiteboard-animation lane for one or more articles.
//
// Inputs:  projects/{slug}/01-content/{slug}.json
//          templates/notebook-v2-animate.html
//          projects/dollar-cost-averaging/03-Video/package.json  (for the hyperframes pin)
//          templates/audio/whiteboard-bgm.mp3                    (BGM bed, copied per project)
//          templates/audio/sfx/scribble-1.mp3                    (SFX, copied per project)
//
// Outputs: projects/{slug}/03-Video-animate/{slug}.html
//          projects/{slug}/03-Video-animate/package.json
//          projects/{slug}/03-Video-animate/meta.json
//          projects/{slug}/03-Video-animate/.media/music/bed.mp3
//          projects/{slug}/03-Video-animate/.media/sfx/scribble-1.mp3
//          projects/{slug}/03-Video-animate/compositions/  (empty placeholder)
//          projects/{slug}/03-Video-animate/renders/       (output MP4s land here)
//
// CLI:  node scripts/build-animate.mjs [slug ...]
//       node scripts/build-animate.mjs                    (auto-discovers all slugs with 01-content/*.json)
//
// Pure ESM, zero npm deps. Node 18+.

import { readFile, writeFile, mkdir, copyFile, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const TEMPLATE_PATH = join(REPO, "templates", "notebook-v2-animate.html");
const PIN_SOURCE = join(REPO, "projects", "dollar-cost-averaging", "03-Video", "package.json");
const BGM_SRC = join(REPO, "templates", "audio", "whiteboard-bgm.mp3");
const SFX_SRC = join(REPO, "templates", "audio", "sfx", "scribble-1.mp3");

// Timing defaults — see plan §A.4
const DEFAULTS = { intro_s: 2.0, concept_s: 4.5, outro_s: 2.0 };

// SFX track allocation: 12..(12+N-1), one per section
const SFX_TRACK_BASE = 12;
const SFX_DURATION = 0.8;
const SFX_VOLUME = 0.35;

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt1(n) { return n.toFixed(1); }

function htmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Per-element stagger offsets within a single section.
// 0.00 — num-blob pop
// 0.00 — SVG strokes (draw first, fastest — see plan §A.3)
// 0.05 — heading fade
// 0.15 — lede fade
// 0.25 — visual block (table/comparison/callout/diagram) fade
// 0.30 — arrowhead pop (after the path draws)
const STAGGER = { num: 0.00, svg: 0.00, h2: 0.05, lede: 0.15, visual: 0.25, arrow: 0.30 };

// Per-visual_type estimated height in px — drives the vertical stack offset
// for each section so the whiteboard ends with all sections visible in a
// column (no overlap, no scroll). The first section's `top` is `START_TOP`
// (clearing the header); each subsequent section starts `priorHeight + GAP`
// below the previous one. Heights are conservative; the page is 1920px
// total, so 6 sections of ~260px each = 1560 + 210 (header) + 100 (footer)
// ≈ 1870px, fitting comfortably.
const SECTION_HEIGHTS = {
  none: 200,
  table: 260,
  comparison: 260,
  callout: 220,
  diagram: 240,
};
const SECTION_GAP = 15;
const START_TOP = 210;

// Reuse the same Heuristic from scripts/stage2-render.ps1 Get-H1
function deriveH1(slug, json) {
  const title = String(json.title ?? slug);
  const cleaned = title.replace(/\s+6\s+THINGS\s+TO\s+KNOW\s*$/i, "");
  if (cleaned.match(/^(.+?):\s*(.+)$/)) {
    const left = cleaned.replace(/^(.+?):\s*.+$/, "$1").toLowerCase();
    const right = cleaned.replace(/^.+?:\s*(.+)$/, "$1").toLowerCase();
    return `${left}<br><span class="hl">${htmlEscape(right)}</span>`;
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

// Heuristic from stage2-render.ps1 lines 28-40 — for callouts, color the num-blob + h2
// maroon for warnings, green for "tip"-style headings, navy default.
function calloutColorModifiers(heading) {
  if (!heading) return { blobColor: "", h2Class: "" };
  if (/TIP|START HERE|ONE-LINE|FORMULA|THE BOTTOM LINE/i.test(heading)) {
    return { blobColor: ' style="color:var(--ink-green)"', h2Class: "c-green" };
  }
  if (/WATCH|WARNING|SOURCE|DON'T FORGET|REMEMBER|FYI|RMD RULE|60-DAY|ALWAYS|DEFAULT ANSWER|REALITY CHECK/i.test(heading)) {
    return { blobColor: ' style="color:var(--ink-maroon)"', h2Class: "c-maroon" };
  }
  return { blobColor: "", h2Class: "" };
}

// Build the per-section HTML — the same four-case switch as stage2-render.ps1 Build-Section,
// but emitting a clip-attribute section with data-start/data-duration/data-track-index and
// the new animation classes/data-draw-delay attributes.
function buildSectionHtml(concept, i, start, duration, top, compositionId) {
  const n = concept.number;
  const title = htmlEscape(concept.title);
  const body = htmlEscape(concept.body);
  const vt = concept.visual_type;
  const vs = concept.visual_spec ?? {};

  // Per-section start time, so each element's animation begins at
  // (section start) + (intra-section offset), not at t=0. Without this,
  // every section's elements all reveal in the first second and then sit
  // visible while the timeline plays out.
  const s = Number(start);
  const numDelay    = (s + STAGGER.num).toFixed(2);
  const svgDelay    = (s + STAGGER.svg).toFixed(2);
  const h2Delay     = (s + STAGGER.h2).toFixed(2);
  const ledeDelay   = (s + STAGGER.lede).toFixed(2);
  const visualDelay = (s + STAGGER.visual).toFixed(2);
  const arrowDelay  = (s + STAGGER.arrow).toFixed(2);

  // Section head (num-blob + h2) — color modifiers per callout heuristic.
  const { blobColor, h2Class } = vt === "callout"
    ? calloutColorModifiers(vs.callout_heading)
    : { blobColor: "", h2Class: "" };

  const h2Cls = `draw-fade${h2Class ? " " + h2Class : ""}`;
  const head = `<div class="section-head">`
    + `<span class="num-blob b${n} rough draw-pop"${blobColor} data-draw-delay="${numDelay}">${n}</span>`
    + `<h2 class="${h2Cls}" data-draw-delay="${h2Delay}">${title}</h2>`
    + `</div>`;

  const lede = `<p class="lede draw-fade" data-draw-delay="${ledeDelay}">${body}</p>`;

  let visual = "";
  if (vt === "table") {
    const cols = vs.columns ?? [];
    const rows = vs.rows ?? [];
    const colCount = cols.length;
    let ledgerClass = "ledger";
    if (colCount === 4) ledgerClass = "ledger four-col";
    else if (colCount === 2) ledgerClass = "ledger two-col";
    const colSpans = cols.map((c) => `<span>${htmlEscape(c)}</span>`).join("");
    const rowsHtml = rows.map((r) => {
      const cells = r.map((v, j) => (j === 0 ? `<b>${htmlEscape(v)}</b>` : `<span>${htmlEscape(v)}</span>`)).join("");
      return `<div class="ledger-row">${cells}</div>`;
    }).join("");
    visual = `<div class="${ledgerClass} draw-fade" data-draw-delay="${visualDelay}">`
      + `<div class="ledger-head">${colSpans}</div>`
      + `<svg class="rule-line rough2 ink-stroke" data-draw-delay="${svgDelay}" viewBox="0 0 916 8" preserveAspectRatio="none" pathLength="1">`
      + `<path d="M0,4 Q220,1 450,4 T916,3" fill="none" stroke="var(--ink-navy)" stroke-width="2"/>`
      + `</svg>${rowsHtml}</div>`;
  } else if (vt === "comparison") {
    const leftLabel = htmlEscape(vs.left_label ?? "");
    const rightLabel = htmlEscape(vs.right_label ?? "");
    const leftLis = (vs.left_points ?? []).map((p) => `<li>${htmlEscape(p)}</li>`).join("");
    const rightLis = (vs.right_points ?? []).map((p) => `<li>${htmlEscape(p)}</li>`).join("");
    visual = `<div class="compare-row draw-fade" data-draw-delay="${visualDelay}">`
      + `<div class="compare-card direct rough2"><h4>${leftLabel}</h4><ul>${leftLis}</ul></div>`
      + `<div class="vs-mark">vs</div>`
      + `<div class="compare-card indirect rough2"><h4>${rightLabel}</h4><ul>${rightLis}</ul></div>`
      + `</div>`;
  } else if (vt === "callout") {
    const heading = htmlEscape(vs.callout_heading ?? "");
    const text = htmlEscape(vs.callout_text ?? "");
    let cls = "warning-box rough";
    if (/TIP|START HERE|ONE-LINE|FORMULA|THE BOTTOM LINE/i.test(vs.callout_heading ?? "")) {
      cls = "warning-box tip rough";
    }
    // The warning-box is `transform: rotate(-.45deg)`, which the layout
    // linter's bbox math sometimes flags as the .heading being "inside" the
    // .text. The static 02-visual page renders this content correctly; the
    // rotation is intentional and the bbox is fine in the browser. Mark
    // intentional layering so the linter doesn't block the build.
    visual = `<div class="${cls} draw-fade" data-draw-delay="${visualDelay}" data-layout-allow-overlap>`
      + `<div class="heading">${heading}</div>`
      + `<div class="text">${text}</div>`
      + `</div>`;
  } else if (vt === "diagram") {
    const nodes = vs.nodes ?? [];
    const arrows = vs.arrow_labels ?? [];
    const n1 = htmlEscape(nodes[0] ?? "");
    const n2 = htmlEscape(nodes[1] ?? "");
    const n3 = htmlEscape(nodes[2] ?? "");
    const a1 = htmlEscape(arrows[0] ?? "");
    const a2 = htmlEscape(arrows[1] ?? "");
    visual = `<div class="flow-row draw-fade" data-draw-delay="${visualDelay}">`
      + `<div class="flow-node n1 rough2">${n1}</div>`
      + `<svg class="flow-arrow rough2" data-draw-delay="${svgDelay}" width="48" height="30" viewBox="0 0 48 30" pathLength="1">`
      + `<path d="M0,15 Q13,20 24,12 Q34,17 41,14" fill="none" stroke-width="3" stroke-linecap="round"/>`
      + `<polygon class="arrow-head-pop" points="39,8 48,15 39,22" data-draw-delay="${arrowDelay}"/>`
      + `</svg>`
      + `<div class="flow-node n2 rough2">${n2}</div>`
      + `<div class="flow-label">${a1}<br>${a2}</div>`
      + `<svg class="flow-arrow rough2" data-draw-delay="${svgDelay}" width="48" height="30" viewBox="0 0 48 30" pathLength="1">`
      + `<path d="M0,15 Q13,10 24,17 Q34,11 41,15" fill="none" stroke-width="3" stroke-linecap="round"/>`
      + `<polygon class="arrow-head-pop" points="39,8 48,15 39,22" data-draw-delay="${arrowDelay}"/>`
      + `</svg>`
      + `<div class="flow-node n3 rough2">${n3}</div>`
      + `</div>`;
  } else {
    // "none" or unknown — no visual block.
    visual = "";
  }

  // The section itself is the clip. class includes "clip" so HyperFrames picks it up.
  // It's a direct child of #root in the rendered template.
  // data-hf-id gives Studio a stable edit target (silences the studio_missing_editable_id warning).
  // The inline `style="top: NNNpx;"` is the per-section vertical offset computed in buildOne
  // (cumulative sum of estimated prior-section heights). This is what gives the whiteboard
  // effect: each section sits at a distinct position in the notebook page, so the rendered
  // video ends with all six sections stacked vertically — same as the static 02-visual PNG.
  return `<section data-hf-id="hf-${compositionId}-scene-${i}" id="scene-${i}" `
    + `class="clip ink section clip-section" data-i="${i}" `
    + `data-start="${start}" data-duration="${duration}" data-track-index="${i}" `
    + `style="top: ${top}px;">`
    + head + lede + visual
    + `</section>`;
}

function computeTimings(json) {
  const ov = json.animate ?? {};
  const intro_s = typeof ov.intro_s === "number" ? ov.intro_s : DEFAULTS.intro_s;
  const concept_s = typeof ov.concept_s === "number" ? ov.concept_s : DEFAULTS.concept_s;
  const outro_s = typeof ov.outro_s === "number" ? ov.outro_s : DEFAULTS.outro_s;
  const N = (json.concepts ?? []).length;
  if (N === 0) throw new Error("concepts[] is empty");
  const total = intro_s + N * concept_s + outro_s;
  const sections = (json.concepts ?? []).map((_c, i) => ({
    i: i + 1,
    start: fmt1(intro_s + i * concept_s),
    duration: fmt1(concept_s),
    track: i + 1,
  }));
  return {
    intro_s, concept_s, outro_s,
    total: fmt1(total),
    sections,
  };
}

async function renderPackageJson(slug) {
  const pin = JSON.parse(await readFile(PIN_SOURCE, "utf8"));
  return {
    name: `${slug}-animate`,
    private: true,
    type: "module",
    scripts: {
      dev: pin.scripts?.dev,
      check: pin.scripts?.check,
      render: pin.scripts?.render,
      publish: pin.scripts?.publish,
    },
  };
}

async function buildOne(slug, opts) {
  const jsonPath = join(REPO, "projects", slug, "01-content", `${slug}.json`);
  const json = JSON.parse(await readFile(jsonPath, "utf8"));
  const tpl = await readFile(TEMPLATE_PATH, "utf8");
  const timings = computeTimings(json);
  const compositionId = `${slug}-animate`;

  // Per-section vertical `top` offset — each section's estimated height plus
  // the gap from the previous one, summed cumulatively so all six sections
  // stack into the notebook page without overlap. Heights come from
  // SECTION_HEIGHTS, keyed by the concept's visual_type.
  let cumulative = 0;
  const sectionsHtml = (json.concepts ?? []).map((c, i) => {
    const top = START_TOP + cumulative;
    const vt = c.visual_type ?? "none";
    const h = SECTION_HEIGHTS[vt] ?? SECTION_HEIGHTS.none;
    cumulative += h + SECTION_GAP;
    return buildSectionHtml(c, i + 1, timings.sections[i].start, timings.sections[i].duration, top, compositionId);
  }).join("\n");

  // Audio handling: emit <audio> tags only when source files exist (or --with-audio is set).
  // --with-audio is the explicit opt-in (will fail if files missing). Default is to detect.
  const wantAudio = opts.withAudio === true;     // explicit opt-in
  const haveAudio = opts.skipAudio !== true;     // anything but --skip-audio
  let includeAudio = false;
  if (wantAudio) includeAudio = true;
  else if (haveAudio) {
    try {
      await readFile(BGM_SRC, "utf8");
      await readFile(SFX_SRC, "utf8");
      includeAudio = true;
    } catch {
      includeAudio = false;
    }
  }

  // BGM bed — emitted only when audio is included.
  const bedHtml = includeAudio
    ? `  <audio id="bed" data-start="0" data-duration="${timings.total}" `
      + `data-track-index="10" data-volume="0.4" src=".media/music/bed.mp3"></audio>`
    : "";

  // SFX <audio> tags — one per section, no overlap, tracks 12..(12+N-1).
  // Empty string when no audio (so the placeholder becomes whitespace and the
  // #root still has only the sections as direct children, satisfying HyperFrames).
  const sfxHtml = includeAudio
    ? (json.concepts ?? []).map((_c, i) => {
      const track = SFX_TRACK_BASE + i;
      return `  <audio data-start="${timings.sections[i].start}" `
        + `data-duration="${SFX_DURATION}" data-track-index="${track}" `
        + `data-volume="${SFX_VOLUME}" src=".media/sfx/scribble-1.mp3"></audio>`;
    }).join("\n")
    : "";

  const h1 = deriveH1(slug, json);
  const kicker = String(json.series_label ?? "").toLowerCase();
  const sourceFooter = htmlEscape(json.sources_footer ?? "");
  const title = htmlEscape(json.title ?? slug);
  const pageTitle = `${title} - Compound Lane`;

  const html = tpl
    .replaceAll("{{COMPOSITION_ID}}", compositionId)
    .replaceAll("{{TITLE}}", pageTitle)
    .replaceAll("{{H1}}", h1)
    .replaceAll("{{KICKER}}", kicker)
    .replaceAll("{{SOURCE_FOOTER}}", sourceFooter)
    .replaceAll("{{INTRO_S}}", String(timings.intro_s))
    .replaceAll("{{OUTRO_S}}", String(timings.outro_s))
    .replaceAll("{{TOTAL_DURATION}}", timings.total)
    .replaceAll("{{SECTIONS}}", sectionsHtml)
    .replaceAll("{{BED_AUDIO}}", bedHtml)
    .replaceAll("{{SFX_AUDIO}}", sfxHtml);

  const outDir = join(REPO, "projects", slug, "03-Video-animate");
  await mkdir(join(outDir, ".media", "music"), { recursive: true });
  await mkdir(join(outDir, ".media", "sfx"), { recursive: true });
  await mkdir(join(outDir, "compositions"), { recursive: true });
  await mkdir(join(outDir, "renders"), { recursive: true });

  // HyperFrames requires the entry file be named index.html (the framework looks
  // for that filename explicitly). We do NOT also write a {slug}.html copy — the
  // linter flags it as a duplicate root composition.
  await writeFile(join(outDir, "index.html"), html);
  await writeFile(join(outDir, "meta.json"), JSON.stringify({
    id: compositionId,
    name: compositionId,
    slug,
    timings: {
      intro_s: timings.intro_s,
      concept_s: timings.concept_s,
      outro_s: timings.outro_s,
      total: Number(timings.total),
    },
    sections: timings.sections,
    has_audio: includeAudio,
  }, null, 2));
  await writeFile(join(outDir, "package.json"), JSON.stringify(await renderPackageJson(slug), null, 2));

  // Copy BGM + SFX (idempotent) when audio is included. --with-audio fails loudly
  // if the source files are missing; default behavior is to silently skip.
  if (includeAudio) {
    await copyFile(BGM_SRC, join(outDir, ".media", "music", "bed.mp3"));
    await copyFile(SFX_SRC, join(outDir, ".media", "sfx", "scribble-1.mp3"));
  }

  return { slug, compositionId, total: timings.total, sections: timings.sections.length, has_audio: includeAudio };
}

async function discoverSlugs() {
  const projectsDir = join(REPO, "projects");
  const out = [];
  for (const d of await readdir(projectsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const jsonPath = join(projectsDir, d.name, "01-content", `${d.name}.json`);
    try {
      await readFile(jsonPath, "utf8");
      out.push(d.name);
    } catch {
      // no JSON, skip
    }
  }
  return out.sort();
}

async function main() {
  const argv = process.argv.slice(2);
  const skipAudio = argv.includes("--skip-audio");
  const withAudio = argv.includes("--with-audio");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const slugs = positional.length > 0 ? positional : await discoverSlugs();
  if (slugs.length === 0) {
    console.error("no slugs to build");
    process.exit(1);
  }
  const results = [];
  for (const s of slugs) {
    try {
      const r = await buildOne(s, { skipAudio, withAudio });
      results.push(r);
      const audioTag = r.has_audio ? "audio=on " : "audio=off";
      console.log(`built  ${s.padEnd(56)}  total=${r.total}s  sections=${r.sections}  ${audioTag}`);
    } catch (err) {
      console.error(`FAIL   ${s}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${results.length}/${slugs.length} project(s) built.`);
}

main();

// scripts/build-video.mjs
// Build the 04-video promo-reel lane for one or more articles.
//
// Inputs:  projects/{slug}/01-content/{slug}.json
//          templates/video/composition.html
//          templates/video/regen.sh.tpl
//          templates/video/regen.ps1.tpl
//          projects/dollar-cost-averaging/04-video/public/flash-preview.png
//          projects/dollar-cost-averaging/04-video/hyperframes.json
//          scripts/sound/timing.mjs                       (template for per-project timing)
//
// Outputs: projects/{slug}/04-video/index.html
//          projects/{slug}/04-video/package.json
//          projects/{slug}/04-video/meta.json
//          projects/{slug}/04-video/hyperframes.json
//          projects/{slug}/04-video/tts_script.txt
//          projects/{slug}/04-video/regen.sh
//          projects/{slug}/04-video/regen.ps1
//          projects/{slug}/04-video/timing.mjs
//          projects/{slug}/04-video/public/flash-preview.png
//          projects/{slug}/04-video/compositions/  (empty placeholder)
//          projects/{slug}/04-video/renders/       (output MP4s land here)
//          projects/{slug}/04-video/.media/voiceover/  (regen.sh writes voiceover.mp3 here)
//
// CLI:  node scripts/build-video.mjs [slug ...]
//       node scripts/build-video.mjs                    (auto-discovers all slugs with 01-content/*.json)
//
// Pure ESM, zero npm deps. Node 18+.

import { readFile, writeFile, mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { htmlEscape, deriveH1, calloutColorModifiers } from "./lib/build-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const TEMPLATE_DIR = join(REPO, "templates", "video");
const TEMPLATE_HTML = join(TEMPLATE_DIR, "composition.html");
const REGEN_SH_TPL = join(TEMPLATE_DIR, "regen.sh.tpl");
const REGEN_PS1_TPL = join(TEMPLATE_DIR, "regen.ps1.tpl");
const DCA_PROJECT = join(REPO, "projects", "dollar-cost-averaging", "04-video");
const DCA_FLASH_PREVIEW = join(DCA_PROJECT, "public", "flash-preview.png");
const DCA_HYPERFRAMES_JSON = join(DCA_PROJECT, "hyperframes.json");
const DCA_TIMING_MJS = join(REPO, "scripts", "sound", "timing.mjs");

// Defaults — measured for the DCA project (VibeVoice/Paul, 136.0s VO).
// The build script emits these as initial placeholders; the human is
// expected to re-measure per-concept REVEAL durations after the first
// VO regen (faster-whisper + silence detect per the audio-visual-sync
// rule in MEMORY.md) and update timing.mjs before rendering.
const DEFAULTS = {
  FLASH_DURATION: 1.0,
  FLASH_FADE: 0.2,
  VO_DURATION: 136.0,
  HEADER_REVEAL: 5.0,
  C_REVEAL: [18.0, 19.0, 21.0, 17.0, 20.0, 24.0],
  OUTRO_REVEAL: 12.0,
  COMPOSITION_ID_SUFFIX: "-video",
};

// Per-visual_type element counts. Mirrors the heuristic in
// scripts/sound/emit-static-sfx.mjs:34. The build script emits these
// as the per-section "element budget" used by the inline schedule
// (one .w span per word, plus ledger rows, plus flow arrows, etc.).
// The numbers aren't critical — they just throttle the per-section
// reveal pacing so the visible hand-paced writes don't all bunch up
// in the first second.
const ELEMENT_COUNTS = {
  none: 6,
  callout: 8,
  diagram: 9,
  table: 12,       // 3 columns
  comparison: 14,  // direct/indirect cards
};
function elementCountFor(concept) {
  const vt = concept.visual_type ?? "none";
  if (vt === "table") {
    const cols = concept.visual_spec?.columns?.length ?? 3;
    return cols >= 4 ? 14 : 12;
  }
  return ELEMENT_COUNTS[vt] ?? ELEMENT_COUNTS.none;
}

// ─── helpers ───────────────────────────────────────────────────────

// htmlEscape, deriveH1, calloutColorModifiers are imported from
// scripts/lib/build-helpers.mjs (shared with build-animate.mjs).
// Keeping them in one place ensures both lanes derive the same H1
// and callout color rules; otherwise drift is inevitable.

// Headless screenshot of an HTML file → PNG, used to render the
// per-project flash-preview.png from projects/{slug}/02-visual/{slug}.html.
// Mirrors the pattern in scripts/stage2-png.ps1: msedge.exe --headless
// with a per-run --user-data-dir so concurrent builds don't collide,
// poll for the PNG to exist + stop growing before resolving. Zero npm
// deps — spawns msedge directly, same as the existing screenshot
// pipeline. Windows-only (the .ps1 sibling it mirrors is Windows-only).
async function screenshotFlashPreview(htmlPath, outPath) {
  const edgeCandidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  let edge = null;
  for (const p of edgeCandidates) {
    try { await stat(p); edge = p; break; } catch {}
  }
  if (!edge) {
    throw new Error("msedge.exe not found in standard locations; cannot screenshot flash-preview");
  }

  const tmpProfile = `C:\\Users\\${process.env.USERNAME || process.env.USER}\\AppData\\Local\\Temp\\edge-flash-${Date.now()}`;
  const url = "file:///" + htmlPath.replace(/\\/g, "/");

  await new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${tmpProfile}`,
      "--window-size=1080,1920",
      `--screenshot=${outPath}`,
      url,
    ];
    const child = spawn(edge, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (b) => { stderr += b.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`msedge exited ${code}: ${stderr.slice(0, 500)}`));
      else resolve();
    });
  });

  // Wait for the PNG to materialize + stop growing (Edge sometimes
  // returns before the file is fully written).
  const deadline = Date.now() + 30_000;
  let lastSize = -1;
  while (Date.now() < deadline) {
    let size = 0;
    try { size = (await stat(outPath)).size; } catch {}
    if (size > 0 && size === lastSize) return; // stable
    lastSize = size;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`flash-preview screenshot did not stabilize within 30s: ${outPath}`);
}

// Auto-derive the footer CTA from the title: "Dollar-Cost Averaging: Does It Work?"
// → "That's dollar-cost averaging." (lowercased subject, after the
// ":"). Heuristic; the human can edit.
function deriveFooterCta(json) {
  const title = String(json.title ?? "");
  // Prefer the part before ":" as the topic noun phrase.
  const m = title.match(/^([^:]+?):\s*(.+)$/);
  let topic;
  if (m) {
    topic = m[1];
  } else {
    // No colon — use the whole title, lowercased.
    topic = title;
  }
  // Drop any trailing " 6 THINGS TO KNOW" / " — ..." / similar decorations.
  topic = topic.replace(/\s*—.*$/, "").replace(/\s+\d+\s+THINGS\s+TO\s+KNOW.*$/i, "");
  return `That's ${topic.trim().toLowerCase()}.`;
}

// Stable 4-hex-char id namespace per build, so every data-hf-id in the
// rendered output is project-specific and editable in HyperFrames
// Studio without colliding across builds. 16^4 = 65k combinations.
function makeIdGen() {
  const ns = "hf-" + randomBytes(2).toString("hex");
  let n = 0;
  return () => `${ns}-${(n++).toString(16).padStart(3, "0")}`;
}

// Build one <section class="ink"> block. Mirrors the four-case switch
// in build-animate.mjs:115. The DCA visual_types are: table,
// comparison, callout, diagram, none. No data-track-index / data-start /
// data-duration on the section itself — those are set at the inner
// element level (or in the inline script for word-by-word reveal).
function buildSectionHtml(concept, i, idGen) {
  const n = concept.number;
  const title = htmlEscape(concept.title);
  const body = htmlEscape(concept.body);
  const vt = concept.visual_type;
  const vs = concept.visual_spec ?? {};

  const head = (() => {
    if (vt === "callout") {
      const { blobColor, h2Class } = calloutColorModifiers(vs.callout_heading);
      const h2Cls = h2Class ? ` class="${h2Class}"` : "";
      return `<div data-hf-id="${idGen()}" class="section-head">`
        + `<span data-hf-id="${idGen()}" class="num-blob b${n} rough"${blobColor}>${n}</span>`
        + `<h2 data-hf-id="${idGen()}"${h2Cls}>${title}</h2>`
        + `</div>`;
    }
    return `<div data-hf-id="${idGen()}" class="section-head">`
      + `<span data-hf-id="${idGen()}" class="num-blob b${n} rough">${n}</span>`
      + `<h2 data-hf-id="${idGen()}">${title}</h2>`
      + `</div>`;
  })();

  const lede = `<p data-hf-id="${idGen()}" class="lede">${body}</p>`;

  let visual = "";
  if (vt === "table") {
    const cols = vs.columns ?? [];
    const rows = vs.rows ?? [];
    const colCount = cols.length;
    let ledgerClass = "ledger";
    if (colCount === 4) ledgerClass = "ledger four-col";
    else if (colCount === 2) ledgerClass = "ledger two-col";
    const colSpans = cols.map((c) => `<span data-hf-id="${idGen()}">${htmlEscape(c)}</span>`).join("");
    const rowsHtml = rows.map((r) => {
      const cells = r.map((v, j) => {
        const tag = j === 0 ? "b" : "span";
        return `<${tag} data-hf-id="${idGen()}">${htmlEscape(v)}</${tag}>`;
      }).join("");
      return `<div data-hf-id="${idGen()}" class="ledger-row">${cells}</div>`;
    }).join("");
    visual = `<div data-hf-id="${idGen()}" class="${ledgerClass}">`
      + `<div data-hf-id="${idGen()}" class="ledger-head">${colSpans}</div>`
      + `<svg data-hf-id="${idGen()}" class="rule-line rough2" viewBox="0 0 916 8" preserveAspectRatio="none">`
      + `<path data-hf-id="${idGen()}" d="M0,4 Q220,1 450,4 T916,3" fill="none" stroke="var(--ink-navy)" stroke-width="2"/>`
      + `</svg>${rowsHtml}</div>`;
  } else if (vt === "comparison") {
    const leftLabel = htmlEscape(vs.left_label ?? "");
    const rightLabel = htmlEscape(vs.right_label ?? "");
    const leftLis = (vs.left_points ?? []).map((p) => `<li data-hf-id="${idGen()}">${htmlEscape(p)}</li>`).join("");
    const rightLis = (vs.right_points ?? []).map((p) => `<li data-hf-id="${idGen()}">${htmlEscape(p)}</li>`).join("");
    visual = `<div data-hf-id="${idGen()}" class="compare-row">`
      + `<div data-hf-id="${idGen()}" class="compare-card direct rough2">`
      + `<h4 data-hf-id="${idGen()}">${leftLabel}</h4>`
      + `<ul data-hf-id="${idGen()}">${leftLis}</ul>`
      + `</div>`
      + `<div data-hf-id="${idGen()}" class="vs-mark">vs</div>`
      + `<div data-hf-id="${idGen()}" class="compare-card indirect rough2">`
      + `<h4 data-hf-id="${idGen()}">${rightLabel}</h4>`
      + `<ul data-hf-id="${idGen()}">${rightLis}</ul>`
      + `</div>`
      + `</div>`;
  } else if (vt === "callout") {
    const heading = htmlEscape(vs.callout_heading ?? "");
    const text = htmlEscape(vs.callout_text ?? "");
    let cls = "warning-box rough";
    if (/TIP|START HERE|ONE-LINE|FORMULA|THE BOTTOM LINE/i.test(vs.callout_heading ?? "")) {
      cls = "warning-box tip rough";
    }
    visual = `<div data-hf-id="${idGen()}" class="${cls}">`
      + `<div data-hf-id="${idGen()}" class="heading">${heading}</div>`
      + `<div data-hf-id="${idGen()}" class="text">${text}</div>`
      + `</div>`;
  } else if (vt === "diagram") {
    const nodes = vs.nodes ?? [];
    const arrows = vs.arrow_labels ?? [];
    const n1 = htmlEscape(nodes[0] ?? "");
    const n2 = htmlEscape(nodes[1] ?? "");
    const n3 = htmlEscape(nodes[2] ?? "");
    const a1 = htmlEscape(arrows[0] ?? "");
    const a2 = htmlEscape(arrows[1] ?? "");
    visual = `<div data-hf-id="${idGen()}" class="flow-row">`
      + `<div data-hf-id="${idGen()}" class="flow-node n1 rough2">${n1}</div>`
      + `<svg data-hf-id="${idGen()}" class="flow-arrow rough2" width="48" height="30" viewBox="0 0 48 30">`
      + `<path data-hf-id="${idGen()}" d="M0,15 Q13,20 24,12 Q34,17 41,14" fill="none" stroke-width="3" stroke-linecap="round"/>`
      + `<polygon data-hf-id="${idGen()}" points="39,8 48,15 39,22"/>`
      + `</svg>`
      + `<div data-hf-id="${idGen()}" class="flow-node n2 rough2">${n2}</div>`
      + `<div data-hf-id="${idGen()}" class="flow-label">${a1}<br>${a2}</div>`
      + `<svg data-hf-id="${idGen()}" class="flow-arrow rough2" width="48" height="30" viewBox="0 0 48 30">`
      + `<path data-hf-id="${idGen()}" d="M0,15 Q13,10 24,17 Q34,11 41,15" fill="none" stroke-width="3" stroke-linecap="round"/>`
      + `<polygon data-hf-id="${idGen()}" points="39,8 48,15 39,22"/>`
      + `</svg>`
      + `<div data-hf-id="${idGen()}" class="flow-node n3 rough2">${n3}</div>`
      + `</div>`;
  }

  return `<section data-hf-id="${idGen()}" class="ink">`
    + head + lede + visual
    + `</section>`;
}

function buildSectionsHtml(json, idGen) {
  return (json.concepts ?? []).map((c, i) => buildSectionHtml(c, i + 1, idGen)).join("\n        ");
}

// Build the inline-script block that drives the GSAP timeline. The
// template contains {{SCHEDULE_AND_GROUPS}}; this is the replacement.
// Mirrors DCA's original inline script (templates/video/composition.html
// lines 778–832 in the original; the templated file has the whole block
// collapsed into a single placeholder).
function buildScheduleAndGroups(json) {
  const N = (json.concepts ?? []).length;
  const durations = [
    DEFAULTS.HEADER_REVEAL,
    ...DEFAULTS.C_REVEAL.slice(0, Math.max(0, N - (DEFAULTS.C_REVEAL.length - 1))).slice(0, N),
    DEFAULTS.OUTRO_REVEAL,
  ];
  // Pad with the last C_REVEAL value if concepts.length > C_REVEAL.length+1.
  while (durations.length < N + 2) {
    durations.splice(-1, 0, DEFAULTS.C_REVEAL[DEFAULTS.C_REVEAL.length - 1]);
  }
  // Truncate if concepts.length is small.
  const trimmedDurations = durations.slice(0, N + 2);
  const [headerDur, ...conceptAndOutro] = trimmedDurations;
  const conceptDurs = conceptAndOutro.slice(0, N);
  const outroDur = conceptAndOutro[N];

  const revealLines = [];
  revealLines.push(`      var FLASH_DURATION = ${DEFAULTS.FLASH_DURATION.toFixed(1)};   // flash visible 0–${DEFAULTS.FLASH_DURATION.toFixed(1)}s`);
  revealLines.push(`      var FLASH_FADE     = ${DEFAULTS.FLASH_FADE.toFixed(1)};   // flash fades ${DEFAULTS.FLASH_DURATION.toFixed(1)}–${(DEFAULTS.FLASH_DURATION + DEFAULTS.FLASH_FADE).toFixed(1)}s`);
  revealLines.push(`      var VO_DURATION    = ${DEFAULTS.VO_DURATION.toFixed(1)}; // voiceover.mp3 length — must match the actual MP3`);
  revealLines.push(`      var HEADER_REVEAL  = ${headerDur.toFixed(1)};   // intro section reveal duration`);
  for (let i = 0; i < N; i++) {
    revealLines.push(`      var C${i + 1}_REVEAL      = ${conceptDurs[i].toFixed(1)};  // c${i + 1} reveal duration`);
  }
  revealLines.push(`      var OUTRO_REVEAL   = ${outroDur.toFixed(1)};   // outro section reveal duration`);
  revealLines.push(`      var COMPOSITION_DURATION = FLASH_DURATION + HEADER_REVEAL + ` + Array.from({ length: N }, (_, i) => `C${i + 1}_REVEAL`).join(" + ") + ` + OUTRO_REVEAL;`);

  const groupEntries = [];
  groupEntries.push(`        header: (function () {`);
  groupEntries.push(`          var hs = 'header';`);
  groupEntries.push(`          return Array.from(document.querySelectorAll(`);
  groupEntries.push(`            hs + ' .w, ' + hs + ' .num-blob, ' + hs + ' .kicker svg path, ' + hs + ' h1, ' + hs + ' h1 *'`);
  groupEntries.push(`          ));`);
  groupEntries.push(`        })(),`);
  for (let i = 0; i < N; i++) {
    groupEntries.push(`        c${i + 1}:     elementsFor('main > section:nth-of-type(${i + 1})'),`);
  }
  groupEntries.push(`        footer: Array.from(document.querySelectorAll('footer .w, footer a'))`);

  const scheduleKeys = ['header', ...Array.from({ length: N }, (_, i) => `c${i + 1}`), 'footer'];
  const scheduleDurs = ['HEADER_REVEAL', ...Array.from({ length: N }, (_, i) => `C${i + 1}_REVEAL`), 'OUTRO_REVEAL'];

  return [
    `      var groups = {`,
    ...groupEntries,
    `      };`,
    ``,
    `      ${revealLines.join("\n      ")}`,
    `      var schedule = (function () {`,
    `        var keys = [${scheduleKeys.map((k) => `'${k}'`).join(",")}];`,
    `        var durs = [${scheduleDurs.join(", ")}];`,
    `        var t = FLASH_DURATION, out = [];`,
    `        for (var i = 0; i < keys.length; i++) {`,
    `          out.push({ key: keys[i], start: t, dur: durs[i] });`,
    `          t += durs[i];`,
    `        }`,
    `        return out;`,
    `      })();`,
  ].join("\n");
}

async function renderPackageJson(slug) {
  return {
    name: `${slug}${DEFAULTS.COMPOSITION_ID_SUFFIX}`,
    private: true,
    type: "module",
    scripts: {
      dev: "npx --yes hyperframes@0.8.11 preview",
      check: "npx --yes hyperframes@0.8.11 check",
      render: "npx --yes hyperframes@0.8.11 render",
      publish: "npx --yes hyperframes@0.8.11 publish",
    },
  };
}

function renderMetaJson(compositionId) {
  return {
    id: compositionId,
    name: compositionId,
    createdAt: new Date().toISOString(),
  };
}

// Build the auto-generated TTS script. Mirrors the structure of
// projects/dollar-cost-averaging/04-video/tts_script.txt: 8 sections
// (header + 6 concepts + outro) separated by blank lines, with a
// `# TODO: rewrite for TTS — see AUDIO_STYLE.md` comment above each
// non-header section. The human edits the per-section body for TTS
// prosody (numbers-as-words, punctuation, paragraph breaks) before
// running ./regen.sh.
function renderTtsScript(json) {
  const title = String(json.title ?? "");
  const N = (json.concepts ?? []).length;

  // Header: kicker + title. DCA-style intro line.
  const header = [
    `# intro`,
    `# TODO: rewrite for TTS (numbers-as-words, punctuation for prosody) — see AUDIO_STYLE.md`,
    `Six things to know about ${title.split(":")[0].toLowerCase().trim()}.`,
    ``,
  ].join("\n");

  const conceptBlocks = (json.concepts ?? []).map((c, i) => {
    return [
      `# concept${i + 1}`,
      `# TODO: rewrite for TTS — see AUDIO_STYLE.md`,
      c.body,
      ``,
    ].join("\n");
  });

  // Outro: closing CTA + engagement prompts. Mirrors DCA's 3 lines.
  const outro = [
    `# outro`,
    `# TODO: rewrite for TTS — see AUDIO_STYLE.md`,
    `That's ${title.split(":")[0].toLowerCase().trim()}.`,
    `Did you know about this? Let me know in the comments.`,
    `And if this was useful, hit save so you can come back to it.`,
    ``,
  ].join("\n");

  return [
    header,
    ...conceptBlocks,
    outro,
    `# ─────────────────────────────────────────────────────────────────────`,
    `# TTS-ready script for VibeVoice/Paul. The build-video.mjs script`,
    `# generated this from projects/{slug}/01-content/{slug}.json. The body`,
    `# text is the JSON's body verbatim — apply the AUDIO_STYLE.md rules`,
    `# (numbers-as-words, punctuation for prosody) before running regen.sh.`,
    `# Worked example: projects/dollar-cost-averaging/04-video/tts_script.txt`,
  ].join("\n");
}

async function renderRegen(slug, srcTpl) {
  const tpl = await readFile(srcTpl, "utf8");
  return tpl.replaceAll("{{SLUG}}", slug);
}

async function renderTimingMjs(slug) {
  // Copy the repo-wide timing.mjs and prepend a TODO header so the
  // human knows to re-measure after the first VO regen. The
  // const numbers below are DCA's measured defaults and serve as
  // first-pass placeholders; the human should re-measure per-concept
  // durations with faster-whisper per the audio-visual-sync rule in
  // MEMORY.md before the first clean render.
  const base = await readFile(DCA_TIMING_MJS, "utf8");
  const header = `// projects/${slug}/04-video/timing.mjs
// Per-project copy of scripts/sound/timing.mjs. Generated by
// scripts/build-video.mjs. The REVEAL constants below are DCA's
// measured defaults as a first-pass placeholder; re-measure with
// faster-whisper after the first VO regen and update the per-concept
// C1_REVEAL..CN_REVEAL constants to match the actual MP3, then
// re-run ./regen.sh to cascade the new values into index.html.

`;
  return header + base;
}

async function buildOne(slug, opts) {
  const jsonPath = join(REPO, "projects", slug, "01-content", `${slug}.json`);
  const json = JSON.parse(await readFile(jsonPath, "utf8"));
  const tpl = await readFile(TEMPLATE_HTML, "utf8");
  const compositionId = `${slug}${DEFAULTS.COMPOSITION_ID_SUFFIX}`;
  const idGen = makeIdGen();
  const N = (json.concepts ?? []).length;
  if (N === 0) throw new Error(`${slug}: concepts[] is empty`);

  const sectionsHtml = buildSectionsHtml(json, idGen);
  const scheduleAndGroups = buildScheduleAndGroups(json);
  const h1 = deriveH1(slug, json);
  const kicker = String(json.series_label ?? "").toLowerCase();
  const sourceFooter = htmlEscape(json.sources_footer ?? "");
  const title = String(json.title ?? slug);
  const pageTitle = `${title} - Compound Lane`;
  const footerCta = deriveFooterCta(json);
  const flashTotal = (DEFAULTS.FLASH_DURATION + DEFAULTS.FLASH_FADE).toFixed(1);
  const compositionDuration = (DEFAULTS.FLASH_DURATION + DEFAULTS.HEADER_REVEAL
    + DEFAULTS.C_REVEAL.slice(0, N).reduce((a, b) => a + b, 0)
    + DEFAULTS.OUTRO_REVEAL).toFixed(1);

  const tokens = {
    COMPOSITION_ID: compositionId,
    COMPOSITION_DURATION: compositionDuration,
    PAGE_TITLE: pageTitle,
    KICKER: kicker,
    H1: h1,
    SECTIONS: sectionsHtml,
    FOOTER_CTA: footerCta,
    FOOTER_SOURCE: sourceFooter,
    VO_SRC: ".media/voiceover/voiceover.mp3",
    VO_START: DEFAULTS.FLASH_DURATION.toFixed(1),
    VO_DURATION: DEFAULTS.VO_DURATION.toFixed(1),
    FLASH_TOTAL: flashTotal,
    SFX_AUDIO_BLOCK: "",   // SFX disabled by default (matches DCA)
    SCHEDULE_AND_GROUPS: scheduleAndGroups,
  };

  let html = tpl;
  for (const [k, v] of Object.entries(tokens)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  // Refuse to emit a build with unfilled placeholders — catches missing
  // token mappings loudly instead of silently leaving a broken {{...}}
  // in the output.
  const unfilled = html.match(/\{\{[A-Z_]+\}\}/g);
  if (unfilled && unfilled.length > 0) {
    throw new Error(`${slug}: template still has unfilled placeholders: ${[...new Set(unfilled)].join(", ")}`);
  }

  const outDir = join(REPO, "projects", slug, "04-video");
  await mkdir(join(outDir, "public"), { recursive: true });
  await mkdir(join(outDir, "compositions"), { recursive: true });
  await mkdir(join(outDir, "renders"), { recursive: true });
  await mkdir(join(outDir, ".media", "voiceover"), { recursive: true });

  // Per-project flash-preview: screenshot the static 02-visual page
  // (which is the canonical finished-page raster) so the 0–1.0s
  // pre-roll shows THIS project's page, not DCA's. If 02-visual
  // hasn't been rendered yet, fall back to DCA's PNG + warn loudly
  // so the human knows to re-run build-video.mjs after rendering
  // the visual.
  const visualHtml = join(REPO, "projects", slug, "02-visual", `${slug}.html`);
  const outFlashPng = join(outDir, "public", "flash-preview.png");
  let usedFallback = false;
  if (await stat(visualHtml).then(() => true).catch(() => false)) {
    try {
      await screenshotFlashPreview(visualHtml, outFlashPng);
    } catch (err) {
      console.warn(`!! ${slug}: headless screenshot of 02-visual/${slug}.html failed (${err.message}). Falling back to DCA's flash-preview.png. Re-run build-video.mjs after rendering the visual.`);
      await copyFile(DCA_FLASH_PREVIEW, outFlashPng);
      usedFallback = true;
    }
  } else {
    console.warn(`!! ${slug}: 02-visual/${slug}.html not found — using DCA's flash-preview.png as placeholder. Re-run build-video.mjs after rendering the visual.`);
    await copyFile(DCA_FLASH_PREVIEW, outFlashPng);
    usedFallback = true;
  }

  // Copy the hyperframes config verbatim — it's identical across
  // projects and not per-project.
  await copyFile(DCA_HYPERFRAMES_JSON, join(outDir, "hyperframes.json"));

  await writeFile(join(outDir, "index.html"), html);
  await writeFile(join(outDir, "package.json"), JSON.stringify(await renderPackageJson(slug), null, 2));
  await writeFile(join(outDir, "meta.json"), JSON.stringify(renderMetaJson(compositionId), null, 2) + "\n");
  await writeFile(join(outDir, "tts_script.txt"), renderTtsScript(json));
  await writeFile(join(outDir, "regen.sh"), await renderRegen(slug, REGEN_SH_TPL));
  await writeFile(join(outDir, "regen.ps1"), await renderRegen(slug, REGEN_PS1_TPL));
  await writeFile(join(outDir, "timing.mjs"), await renderTimingMjs(slug));

  return { slug, compositionId, total: compositionDuration, sections: N, flashFallback: usedFallback };
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
  const positional = argv.filter((a) => !a.startsWith("--"));
  const slugs = positional.length > 0 ? positional : await discoverSlugs();
  if (slugs.length === 0) {
    console.error("no slugs to build");
    process.exit(1);
  }
  const results = [];
  for (const s of slugs) {
    try {
      const r = await buildOne(s, {});
      results.push(r);
      const flashTag = r.flashFallback ? "  flash=fallback" : "  flash=per-project";
      console.log(`built  ${s.padEnd(56)}  total=${r.total}s  sections=${r.sections}${flashTag}`);
    } catch (err) {
      console.error(`FAIL   ${s}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${results.length}/${slugs.length} project(s) built.`);
}

main();

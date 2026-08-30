// scripts/build-text.mjs
// Build the 01-text/ social-copy lane for one or more articles.
//
// Inputs:  projects/{slug}/01-content/{slug}.json     (locked numbers — every figure in the copy must trace here)
//          projects/{slug}/01-source/                 (the saved article; humans run the prompt against this)
//          docs/text-prompt-engine-v2.md              (the prompt humans paste into Claude)
//
// Outputs: projects/{slug}/01-text/keywords.txt        (Stage 1: keyword research)
//          projects/{slug}/01-text/youtube.txt        (Stage 2: YT title/description/tags + Category/Type)
//          projects/{slug}/01-text/instagram.txt      (Stage 2: IG hook/caption/alt text)
//          projects/{slug}/01-text/twitter.txt        (Stage 2: tweet + reply link note)
//          projects/{slug}/01-text/youtube-problems.txt (Stage 3: post-render timecoded Q&A — pre-created with TODO)
//          projects/{slug}/01-text/spanish-subs.srt   (Stage 4: post-render Spanish SRT — pre-created with TODO)
//          projects/{slug}/01-text/README.md          (one-page pointer to the doc + checklist)
//
// CLI:  node scripts/build-text.mjs [slug ...]
//       node scripts/build-text.mjs                   (auto-discovers all slugs with 01-content/*.json)
//
// Pure ESM, zero npm deps. Node 18+.
//
// Idempotent: re-running on a project that already has 01-text/ does NOT
// clobber human-edited copy. Only missing files are written; existing files
// are left alone so the human's drafting work is preserved. Run with
// `--force` to overwrite existing files (e.g., to pick up doc updates after
// a Text Prompt Engine revision).

import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// ─── template content (mirrors docs/text-prompt-engine-v2.md) ────────────────
// Each txt file is pre-populated with section headers + the per-platform
// checklist from the doc, so the human just fills in the body under each
// header. The same pattern build-video.mjs uses for tts_script.txt: render
// structure + TODO comments, human fills in the prose.

const KEYWORDS_TXT = `# 01-text/keywords.txt — Stage 1: keyword research
# Source: docs/text-prompt-engine-v2.md (Stage 1 prompt)
# Paste the Stage 1 prompt into Claude against projects/{slug}/01-source/
# (Variant B — preferred) or the live URL (Variant A). Fill the result below.
# Every number in the platform copy (youtube/instagram/twitter) must trace
# back to the PRIMARY KEYWORD's topic and to projects/{slug}/01-content/{slug}.json.

PRIMARY KEYWORD:
[the core term this reel targets — must be a phrase people actually search,
not a headline. e.g. "index fund vs ETF" not "Understanding Investment Vehicles"]

SECONDARY KEYWORDS (3-5):
- [related search term]
- [related search term]
- [long-tail variant, 4+ words]
- ...

SEARCH INTENT:
[one of: "what is X" (definitional) / "X vs Y" (comparison) / "how to X"
(procedural) / "should I X" (decision-support)]

HASHTAG CANDIDATES (tagged by specificity):
- Niche: [3-5 highly specific tags matching this exact topic]
- Broad: [1-2 category-level tags, use sparingly]
`;

const YOUTUBE_TXT = `# 01-text/youtube.txt — Stage 2: YouTube title + description
# Critical rule: PRIMARY KEYWORD from keywords.txt must appear in the TITLE.
# Every number must trace to projects/{slug}/01-content/{slug}.json — no fabrication.
# See docs/text-prompt-engine-v2.md §2a for full per-field guidance.

TITLE (target 50-60 chars, hard cap 100):
[keyword near the front, natural phrasing, no keyword stuffing]

DESCRIPTION HOOK (first 100-150 chars — what shows before "more"):
[does NOT restate the title. Use this space for something additive: the
stakes, the number, the hook]

DESCRIPTION FULL (200-500 words):
[hook + context + the disclaimer line + link/CTA]

Educational content, not financial advice.

HASHTAGS (3-5, placed at end of description; first 3 will auto-display
above the title — order accordingly, most important first.
#Shorts is for categorization, doesn't count against the content-relevance 3-5):
# [your first 3-4 content hashtags here]
#Shorts

TAGS (backend Studio field, 5-10 short phrases, comma-separated):
[minor SEO weight in 2026 — don't over-invest time here]

CATEGORY / TYPE (Studio upload field — note for uploader, not the description text):
Category: Education
Type: Problem walkthrough
(matches Compound Lane's step-by-step format — see Stage 3 below for the
structured data this unlocks; paste the contents of youtube-problems.txt
into the Studio "Problems" field at upload time)
`;

const INSTAGRAM_TXT = `# 01-text/instagram.txt — Stage 2: Instagram caption + alt text
# Critical rule: PRIMARY KEYWORD from keywords.txt must appear in the HOOK.
# Every number must trace to projects/{slug}/01-content/{slug}.json — no fabrication.
# See docs/text-prompt-engine-v2.md §2b for full per-field guidance.

HOOK (125 chars max — this is the ENTIRE caption most viewers will see):
[primary keyword + the core value prop; must stand alone as a complete thought]

FULL CAPTION (extend to ~300-500 chars total — Compound Lane's "study notes"
format earns the extra read; this isn't a pure hook-and-scroll account):
[hook] + [teaching content — the actual substance, worth screenshotting] +
[disclaimer line]

Educational content, not financial advice.

ALT TEXT (1-2 sentences, descriptive):
[what's visually on screen — now indexed alongside caption + hashtags]

HASHTAGS (3-5, niche-specific, placed in-caption not first comment):
[broad tags like #investing are close to useless now — go specific]
`;

const TWITTER_TXT = `# 01-text/twitter.txt — Stage 2: tweet (and reply link note)
# Critical rule: PRIMARY KEYWORD from keywords.txt must lead the POST.
# Every number must trace to projects/{slug}/01-content/{slug}.json — no fabrication.
# See docs/text-prompt-engine-v2.md §2c for full per-field guidance.

POST (target 70-100 chars, hard cap 280):
[keyword-led hook, no stuffing — X's algorithm reads semantic meaning,
not tag density]

HASHTAGS (0-1, only if genuinely relevant — skip by default for evergreen
educational content, this isn't event/trend-based):
[leave blank unless there's a real reason]

LINK PLACEMENT NOTE:
Do not put the article link in the main post — links in the first tweet
cut reach ~50%. Put it in a reply.
`;

const YOUTUBE_PROBLEMS_TXT = `# 01-text/youtube-problems.txt — Stage 3: YouTube Learning structured data
# Source: docs/text-prompt-engine-v2.md §Stage 3
#
# ─────────────────────────────────────────────────────────────────────
# STATUS: BLOCKED — depends on video render.
#
# This file can only be filled after projects/{slug}/04-video/ has rendered
# and produced section timecodes. The schema is Google's LearningVideo
# structured data: one timecoded question/answer pair per narrative section.
# Each question should match how a beginner would actually search, same
# standard as the Stage 1 primary keyword.
#
# One question per distinct section/beat — align to the same boundaries as
# the narrative arc (Orient → Frame → Warn → Quantify → Opportunity cost →
# Closing edge case). The standard v2 doc example:
#
#   0:14 Should you keep cash or invest it first?
#   0:38 Should you pay off debt before investing?
#   1:05 How much can a Roth IRA save you in taxes?
#   1:48 When should you use a taxable brokerage account?
#
# How to unblock:
#   1. Wait for projects/{slug}/04-video/renders/ to produce a final MP4 +
#      a section timecode map (per-concept start times).
#   2. Open docs/text-prompt-engine-v2.md, paste the Stage 3 prompt into
#      Claude with the timecode map + locked JSON as inputs.
#   3. Replace the TODO block below with the generated timecoded Q&A pairs.
#   4. At upload, set Studio Category: Education, Type: Problem walkthrough,
#      and paste this file's contents into the "Problems" field.
# ─────────────────────────────────────────────────────────────────────

[TIMECODE] [QUESTION]
# 0:00  [TODO: replace with actual timecode + question once the video renders]
# 0:30  [TODO]
# 1:00  [TODO]
# 1:30  [TODO]
# 2:00  [TODO]
# 2:30  [TODO]
# 3:00  [TODO] (add or remove lines to match the actual number of sections)
`;

const SPANISH_SUBS_SRT = `# 01-text/spanish-subs.srt — Stage 4: Spanish subtitles for YouTube Studio
# Source: docs/text-prompt-engine-v2.md §Stage 4
#
# ─────────────────────────────────────────────────────────────────────
# STATUS: BLOCKED — depends on Spanish translation + voiceover.json.
#
# This file can only be filled after:
#   1. projects/{slug}/04-video/tts_script.txt has been translated to
#      Spanish and saved as projects/{slug}/04-video/tts_script.es.txt
#      (use the Stage 4 translation prompt from
#      docs/text-prompt-engine-v2.md, pasted into Claude).
#   2. projects/{slug}/04-video/.media/voiceover/voiceover.json exists
#      (produced by node scripts/measure-vo-timing.mjs {slug}).
#
# Then run:
#   node scripts/build-subs.mjs {slug}
#
# The build script consumes tts_script.es.txt + voiceover.json, aligns
# each Spanish sentence to the matching English word timings (clause
# level, not word level — Spanish word order drifts), and writes the
# real .srt below this comment block. At upload, drop the .srt into
# YouTube Studio → Subtitles → upload, set language to "Spanish",
# publish.
#
# How to unblock:
#   1. Paste projects/{slug}/04-video/tts_script.txt into Claude with
#      the Stage 4 translation prompt (see docs/text-prompt-engine-v2.md).
#   2. Save the Spanish output as
#      projects/{slug}/04-video/tts_script.es.txt (keep the
#      \`# intro\` / \`# conceptN\` / \`# outro\` markers).
#   3. Run: node scripts/build-subs.mjs {slug}
#   4. This file is replaced with a real SubRip file. The TODO block
#      below is gone — what's left is the uploadable SRT.
# ─────────────────────────────────────────────────────────────────────

1
00:00:00,000 --> 00:00:01,000
[TODO: replace with real Spanish SRT — run scripts/build-subs.mjs {slug}]

2
00:00:01,000 --> 00:00:02,000
[after running build-subs.mjs, each cue becomes one Spanish sentence]
`;

const README_TXT = `# 01-text/ — Platform copy for {slug}

This directory holds the YouTube / Instagram / Twitter copy that ships with
the {slug} project, ready to paste into each platform at upload time.

## Files (fill in this order)

1. **keywords.txt** — keyword research (Stage 1). Drives the primary keyword
   that every platform's copy must lead with.
2. **youtube.txt** — title + description + tags + Category/Type for Studio.
3. **instagram.txt** — hook + caption + alt text.
4. **twitter.txt** — main post + reply-link note.
5. **youtube-problems.txt** — (Stage 3, post-render only) timecoded Q&A
   pairs for YouTube's LearningVideo structured data. This file is
   pre-created with a TODO block and stays blocked until
   \`projects/{slug}/04-video/\` has rendered with section timecodes.
6. **spanish-subs.srt** — (Stage 4, post-render only, optional) Spanish
   SubRip subtitle file uploaded to YouTube Studio → Subtitles. Pre-created
   with a TODO block; filled by \`node scripts/build-subs.mjs {slug}\` after
   the human translates \`04-video/tts_script.txt\` to
   \`04-video/tts_script.es.txt\`.

## How these were generated

Each file is pre-populated with section headers and the per-platform
checklist from [docs/text-prompt-engine-v2.md](../../docs/text-prompt-engine-v2.md).
Run \`node scripts/build-text.mjs {slug}\` to regenerate the scaffolding
(idempotent — won't clobber your edits). Run with \`--force\` to overwrite
an existing file (e.g., after a doc revision).

## Authoring

1. Open [docs/text-prompt-engine-v2.md](../../docs/text-prompt-engine-v2.md).
2. Paste the Stage 1 prompt into Claude against
   \`projects/{slug}/01-source/\` (Variant B — preferred, no web fetch) or
   the live article URL (Variant A).
3. Save the keyword-research output to **keywords.txt**.
4. Run the Stage 2 prompt (keywords + locked JSON as inputs) and save the
   three platform blocks to **youtube.txt / instagram.txt / twitter.txt**.
5. Run the output checklist (Stage 1-2 section) at the bottom of the doc
   before considering pre-render work complete.
6. After the video renders with section timecodes: run the Stage 3 prompt,
   fill **youtube-problems.txt**, and apply the Category: Education /
   Type: Problem walkthrough fields at upload.
7. (Optional, Stage 4) After the voiceover timings are measured
   (faster-whisper output in \`04-video/.media/voiceover/voiceover.json\`),
   translate \`04-video/tts_script.txt\` to Spanish and save as
   \`04-video/tts_script.es.txt\`. Then run
   \`node scripts/build-subs.mjs {slug}\` to fill **spanish-subs.srt** with
   a real .srt aligned to the English word timings. Upload via
   YouTube Studio → Subtitles → upload → set language "Spanish" → publish.

## Fact-check discipline

Every number in these six files must trace to
\`projects/{slug}/01-content/{slug}.json\` — the same "every number sourced"
promise that gates the visual-notes PNG also gates the platform copy. If a
number appears in your draft that isn't in the JSON, delete it or trace it
to a cited source in the article and add that source to \`sources_footer\`
in the JSON first. Do not invent statistics, even plausible ones. See
[GUIDE.md §17.2](../../GUIDE.md) (visual-notes fact-check gate).

## Pipeline position

\`01-source/\` → \`01-content/\` (Stage 1 JSON — locked) → **\`01-text/\` (this dir)**
→ \`02-visual/\` → \`04-video/\`. Stages 1-2 of \`01-text/\` run alongside
\`02-visual/\`; Stage 3 (\`youtube-problems.txt\`) is gated on the
\`04-video/\` render; Stage 4 (\`spanish-subs.srt\`) is also gated on the
\`04-video/\` render (needs the faster-whisper \`voiceover.json\` output)
plus a human-translated \`tts_script.es.txt\`. \`01-text/\` is otherwise a
terminal artifact: nothing downstream reads from it. The copy is pasted
manually at upload time on each platform; the SRT is uploaded as a file
via YouTube Studio → Subtitles.
`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtOutputLine(slug, status, files) {
  return `built  ${slug.padEnd(56)}  files=${files.join(",") || "(none)"}  status=${status}`;
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

// Render the README for a specific slug (the {slug} placeholder is per-project).
function renderReadme(slug) {
  return README_TXT.replaceAll("{slug}", slug);
}

// ─── main per-slug build ─────────────────────────────────────────────────────

async function buildOne(slug, { force }) {
  const jsonPath = join(REPO, "projects", slug, "01-content", `${slug}.json`);
  const sourceDir = join(REPO, "projects", slug, "01-source");
  const outDir = join(REPO, "projects", slug, "01-text");

  // Gate: 01-content/{slug}.json must exist with a non-empty concepts[].
  // Mirrors the build-video.mjs:460 guard — we don't want to scaffold 01-text/
  // for a project whose content spec hasn't been written yet (the prompt
  // can't produce numbers without it).
  let json;
  try {
    json = JSON.parse(await readFile(jsonPath, "utf8"));
  } catch (err) {
    throw new Error(`01-content/${slug}.json not found or invalid: ${err.message}`);
  }
  const N = (json.concepts ?? []).length;
  if (N === 0) {
    throw new Error(`${slug}: concepts[] is empty in 01-content/${slug}.json — run Stage 1 first`);
  }

  // Soft check: 01-source/ should exist too. Warn but don't fail — humans
  // sometimes run this against a project that has JSON but no saved source
  // (e.g., the JSON was hand-rolled). The prompt's Variant A path covers it.
  if (!(await fileExists(sourceDir))) {
    console.warn(`!! ${slug}: 01-source/ not found. The keyword prompt will need to use Variant A (URL) or the source will need to be saved.`);
  }

  await ensureDir(outDir);

  const targets = [
    { name: "keywords.txt", content: KEYWORDS_TXT },
    { name: "youtube.txt", content: YOUTUBE_TXT },
    { name: "instagram.txt", content: INSTAGRAM_TXT },
    { name: "twitter.txt", content: TWITTER_TXT },
    { name: "youtube-problems.txt", content: YOUTUBE_PROBLEMS_TXT },
    { name: "spanish-subs.srt", content: SPANISH_SUBS_SRT },
    { name: "README.md", content: renderReadme(slug) },
  ];

  const written = [];
  const skipped = [];
  for (const t of targets) {
    const p = join(outDir, t.name);
    if (!force && (await fileExists(p))) {
      skipped.push(t.name);
      continue;
    }
    await writeFile(p, t.content, "utf8");
    written.push(t.name);
  }

  // No-clobber guard: refuse to emit a build that overwrote real copy.
  // If --force was passed, written will include the previously-existing
  // files — that's expected. Without --force, skipped files are preserved.
  const status = written.length === 0 ? "no-op" : (skipped.length > 0 ? "partial" : "fresh");
  return { slug, written, skipped, status, concepts: N };
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
  const force = argv.includes("--force");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const slugs = positional.length > 0 ? positional : await discoverSlugs();
  if (slugs.length === 0) {
    console.error("no slugs to build");
    process.exit(1);
  }
  const results = [];
  for (const s of slugs) {
    try {
      const r = await buildOne(s, { force });
      results.push(r);
      const allFiles = [...r.written, ...r.skipped];
      console.log(fmtOutputLine(s, r.status, allFiles));
    } catch (err) {
      console.error(`FAIL   ${s}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  const ok = results.filter((r) => r.status !== "no-op").length;
  console.log(`\n${ok}/${results.length} project(s) built (force=${force}).`);
}

main();

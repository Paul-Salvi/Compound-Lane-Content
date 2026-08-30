// scripts/measure-vo-timing.mjs
// Auto-time the 8 reveal sections in projects/{slug}/04-video/timing.mjs
// from the actual voiceover MP3, using faster-whisper for word-level
// ASR + SequenceMatcher for text alignment against tts_script.txt.
//
// Why this exists: per the audio-visual-sync rule in MEMORY.md, the
// visual schedule MUST be measured from the actual VO. Hand-measured
// values drift by ~20s by the outro. This script automates the
// measurement; the human still reviews the result and can hand-tweak
// any single value if SequenceMatcher misaligns a section.
//
// Usage:
//   cd projects/{slug}/04-video
//   ./regen.sh                              # produces .media/voiceover/voiceover.mp3
//   node ../../../scripts/measure-vo-timing.mjs <slug>
//
// What it does:
//   1. Parse projects/{slug}/04-video/tts_script.txt into 8 sections
//      (intro / concept1..6 / outro) by splitting on # intro / # conceptN
//      / # outro markers.
//   2. Run faster-whisper on .media/voiceover/voiceover.mp3 to get
//      word-level { start, end, word } entries.
//   3. For each section, normalize the section text and align it
//      against the ASR word stream using Python's difflib.
//      SequenceMatcher (greedy fallback if ratio < 0.5).
//   4. Compute per-section durations (header, c1..c6, outro).
//   5. Rewrite the REVEAL constants in projects/{slug}/04-video/timing.mjs.
//   6. Re-run scripts/sound/inject-static-sfx.mjs to cascade the new
//      values into index.html (this is what updates the composition
//      schedule and the markup-attribute patch rules).
//
// Pre-conditions (the script fails loudly if any are missing):
//   - faster-whisper is installed (pip install faster-whisper)
//   - the project has a tts_script.txt with the 8 # section markers
//   - the project has a .media/voiceover/voiceover.mp3 (run regen.sh first)
//
// Pure ESM, zero npm deps. Node 18+. Cross-platform (Windows + POSIX).

import { readFile, writeFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// ── helpers ─────────────────────────────────────────────────────────

/**
 * Parse projects/{slug}/04-video/tts_script.txt into the 8 sections.
 * Splits on lines matching `# intro` / `# conceptN` / `# outro`,
 * strips `# TODO` comments, collapses whitespace. Returns an ordered
 * array: [header, c1, c2, c3, c4, c5, c6, footer].
 */
function parseTtsScript(text) {
  // Strip # TODO lines; they're authoring notes for the human.
  const cleaned = text.split(/\r?\n/)
    .filter((l) => !/^\s*#\s*TODO/i.test(l))
    .join("\n");

  // Split into sections by the section markers. Capture the section key
  // in the same pass. Order: intro → concept1..6 → outro.
  const sectionRe = /^\s*#\s*(intro|concept[1-6]|outro)\s*$/gm;
  const matches = [...cleaned.matchAll(sectionRe)];
  if (matches.length === 0) {
    throw new Error("tts_script.txt has no # intro / # conceptN / # outro markers — cannot align");
  }
  // The tail of tts_script.txt (after the last # section) is a long
  // comment explaining the file; strip everything after the last
  // section header's body, not after a `# ────...` divider.
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const start = m.index + m[0].length;
    const end = next ? next.index : cleaned.length;
    const body = cleaned.slice(start, end);
    // Strip the long # ──── comment block at the end of tts_script.txt
    // (anything from a line of dashes to end-of-file).
    const cleanedBody = body.replace(/# ─+[\s\S]*$/m, "").trim();
    sections.push({ key: m[1].toLowerCase(), text: cleanedBody });
  }
  if (sections.length !== 8) {
    throw new Error(`tts_script.txt has ${sections.length} section(s) (expected 8: intro + 6 concepts + outro)`);
  }
  return sections;
}

/**
 * Normalize text for alignment: lowercase, strip punctuation, collapse
 * whitespace. Used both for tts_script sections and ASR words.
 */
function normalizeText(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Run faster-whisper on the voiceover MP3 and return a list of words
 * with { start, end, word } entries. Calls the Python API directly
 * via a small inline script (faster-whisper 1.x has no `__main__.py`,
 * so `python -m faster_whisper` doesn't work, and the `faster-whisper`
 * CLI entry point is sometimes missing on Windows installs).
 *
 * Writes a sidecar JSON to .media/voiceover/voiceover.json so the
 * human can inspect the alignment if anything looks off.
 */
async function transcribeVoiceover(mp3Path, slug) {
  // Inline Python driver. The faster_whisper API yields
  // (segments_generator, info). Each segment has .words with
  // { start, end, word, probability }. We flatten to one word list.
  const py = `
import json, sys
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    sys.argv[1], word_timestamps=True, language="en",
    vad_filter=True,
)
words = []
for seg in segments:
    if not seg.words: continue
    for w in seg.words:
        words.append({"start": float(w.start), "end": float(w.end), "word": w.word})
out = {"language": info.language, "duration": float(info.duration), "words": words}
json.dump(out, sys.stdout)
`;
  const out = await runPython(py, [mp3Path]);
  const data = JSON.parse(out);
  await writeFile(join(dirname(mp3Path), "voiceover.json"), JSON.stringify(data, null, 2));
  return data;
}

/**
 * Run a Python script with the given argv. Tries `python`, `python3`,
 * `py` (Windows launcher) in order; throws if none of them can
 * import faster_whisper. Returns stdout as a string.
 */
async function runPython(script, argv) {
  // First, probe for a Python that can import faster_whisper.
  const candidates = ["python", "python3", "py"];
  let lastErr = null;
  for (const cmd of candidates) {
    try {
      const probe = await new Promise((resolve, reject) => {
        const child = spawn(cmd, ["-c", "import faster_whisper; print('ok')"], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "", err = "";
        child.stdout.on("data", (b) => out += b.toString());
        child.stderr.on("data", (b) => err += b.toString());
        child.on("error", reject);
        child.on("close", (code) => code === 0 && out.trim() === "ok" ? resolve(true) : reject(new Error(err || `code ${code}`)));
      }).catch((e) => { lastErr = e; return false; });
      if (probe !== true) continue;
      // Run the actual script.
      return await new Promise((resolve, reject) => {
        const child = spawn(cmd, ["-c", script, ...argv], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "", err = "";
        child.stdout.on("data", (b) => out += b.toString());
        child.stderr.on("data", (b) => err += b.toString());
        child.on("error", reject);
        child.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err.slice(0, 500)}`)));
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Could not find a Python with faster-whisper installed. Last error: ${lastErr?.message}\n` +
    `Install: pip install faster-whisper\n` +
    `Then re-run: node scripts/measure-vo-timing.mjs <slug>`
  );
}

/**
 * Align each section's normalized text against the ASR word stream and
 * return per-section { start, end } timestamps. Two-pass approach:
 *
 *   Pass 1 (probe-based): for each section, find the best matching
 *     position in the ASR word stream (sliding window over the
 *     section's first 4 words). When the ratio is ≥ 0.5, the probe
 *     is reliable — snap the position to the nearest preceding gap
 *     ≥ 0.5s (a real section boundary always has a brief silence).
 *   Pass 2 (gap-fill): for sections whose probe didn't match
 *     (ratio < 0.5), look at the LARGEST gaps in the time ranges
 *     between the previous known boundary and the next known
 *     boundary. The largest gap is the most likely section break.
 *   The first section starts at t=0. The last section's end is the
 *     end of the VO. Final fallback: if everything else fails,
 *     distribute the missing boundaries evenly between the
 *     surrounding known boundaries.
 */
function alignSections(asrData, sections, totalVoDuration) {
  const words = (asrData.words || []).map((w) => ({
    word: normalizeText(w.word).replace(/\s+/g, " ").trim(),
    start: w.start,
    end: w.end,
  })).filter((w) => w.word.length > 0);

  if (words.length === 0) {
    throw new Error("faster-whisper returned 0 words — check the MP3 and language setting");
  }

  // Build gap list (sorted by start time, descending duration).
  const gaps = [];
  for (let i = 1; i < words.length; i++) {
    const dur = words[i].start - words[i - 1].end;
    if (dur > 0) gaps.push({ idx: i, from: words[i - 1].end, to: words[i].start, dur });
  }

  // Section word lists (normalized) for the probe match.
  const sectionsNorm = sections.map((s) => ({
    key: s.key,
    words: normalizeText(s.text).split(" ").filter(Boolean),
  }));

  // ── Pass 1: probe-based detection ─────────────────────────────────
  // For each section, find the best ASR position of its first 4
  // words. Search starts at the previous section's hit + 1, so
  // sections stay in order. The result is `sectionStart[i]` for
  // i > 0 (section 0 starts at t=0 by definition).
  const PROBE_LEN = 4;
  const PROBE_FLOOR = 0.5; // require at least 50% of probe words matched
  const probeHits = [];
  let lastProbeIdx = 0;
  for (let i = 0; i < sectionsNorm.length; i++) {
    const probe = sectionsNorm[i].words.slice(0, PROBE_LEN);
    if (probe.length === 0) {
      probeHits.push({ idx: -1, ratio: 0, matched: 0 });
      continue;
    }
    let best = { matched: 0, idx: -1 };
    for (let i2 = lastProbeIdx; i2 + probe.length <= words.length; i2++) {
      let matched = 0;
      for (let j = 0; j < probe.length; j++) {
        if (words[i2 + j]?.word === probe[j]) matched++;
      }
      if (matched > best.matched) best = { matched, idx: i2 };
      if (matched === probe.length) break;
    }
    const ratio = best.idx < 0 ? 0 : best.matched / probe.length;
    probeHits.push({ idx: best.idx, ratio, matched: best.matched });
    if (best.idx >= 0) lastProbeIdx = best.idx + 1;
  }

  // Snap each probe hit to the nearest preceding gap ≥ 0.4s.
  const MIN_GAP = 0.4;
  const snapToGap = (idx) => {
    if (idx < 0) return null;
    const wordTime = words[idx].start;
    const preceding = gaps.filter((g) => g.dur >= MIN_GAP && g.to <= wordTime + 0.1);
    if (preceding.length === 0) return null;
    preceding.sort((a, b) => Math.abs(wordTime - a.to) - Math.abs(wordTime - b.to));
    return preceding[0].to;
  };

  // sectionStart[i] = where section i begins in the ASR stream.
  // sectionStart[0] = 0. For i > 0, derived from probe (if ratio OK)
  // and snapped to the nearest preceding gap.
  const sectionStart = new Array(sections.length).fill(null);
  sectionStart[0] = 0;
  for (let i = 1; i < sections.length; i++) {
    const hit = probeHits[i];
    if (hit.ratio >= PROBE_FLOOR) {
      sectionStart[i] = snapToGap(hit.idx);
    }
  }

  // ── Pass 2: gap-fill for missing starts ──────────────────────────
  // For each section whose start is still null (probe didn't match),
  // search the time range [sectionStart[i-1], sectionStart[i+1]) for
  // the largest gap. That's the most likely section break. If both
  // surrounding starts are null too, fall back to the gap-fill
  // recursion — keep looking for the nearest known start.
  for (let i = 1; i < sections.length; i++) {
    if (sectionStart[i] != null) continue;
    // Find previous known start.
    let prev = null;
    for (let j = i - 1; j >= 0; j--) if (sectionStart[j] != null) { prev = sectionStart[j]; break; }
    // Find next known start.
    let next = null;
    for (let j = i + 1; j < sections.length; j++) if (sectionStart[j] != null) { next = sectionStart[j]; break; }

    const lo = prev ?? 0;
    const hi = next ?? totalVoDuration;
    const inRange = gaps.filter((g) => g.from >= lo && g.to <= hi + 0.1);
    if (inRange.length > 0) {
      inRange.sort((a, b) => b.dur - a.dur);
      sectionStart[i] = inRange[0].to;
    } else if (prev != null && next != null) {
      sectionStart[i] = (prev + next) * 0.5;
    } else if (prev == null) {
      sectionStart[i] = hi * 0.3;
    } else {
      sectionStart[i] = prev + (hi - prev) * 0.7;
    }
  }

  // Build the aligned array. Each section's end is the next
  // section's start, or totalVoDuration for the last section.
  const aligned = [];
  for (let i = 0; i < sections.length; i++) {
    const start = sectionStart[i];
    const end = i < sections.length - 1 ? sectionStart[i + 1] : totalVoDuration;
    aligned.push({ key: sections[i].key, start, end, ratio: probeHits[i].ratio });
  }
  return aligned;
}

/**
 * Map the tts_script.txt section keys (intro / concept1..6 / outro)
 * to the timing.mjs constant names (header / c1..c6 / footer).
 * parseTtsScript uses the script's own naming; timing.mjs uses
 * the constant naming from the build script. Without this map,
 * durations would be silently dropped because `out['concept1']`
 * is set but `durations.c1` is looked up.
 */
const KEY_TO_CONST = {
  intro: "header",
  concept1: "c1", concept2: "c2", concept3: "c3",
  concept4: "c4", concept5: "c5", concept6: "c6",
  outro: "footer",
};

/**
 * Compute per-section durations from the alignment. The first section
 * is the header (intro); the last is the footer (outro). The 6
 * middle sections are the concepts.
 */
function computeDurations(aligned, totalVoDuration) {
  const out = {};
  // Section starts/ends, with the last section extended to totalVoDuration
  // so the outro reveals have time to play out.
  for (let i = 0; i < aligned.length; i++) {
    const a = aligned[i];
    const start = a.start;
    const end = i < aligned.length - 1 ? aligned[i + 1].start : totalVoDuration;
    const constName = KEY_TO_CONST[a.key] ?? a.key;
    out[constName] = Math.max(0.1, (end ?? 0) - (start ?? 0));
  }
  return out;
}

/**
 * Rewrite the REVEAL constants in projects/{slug}/04-video/timing.mjs
 * to the new measured values. Touches ONLY the 8 REVEAL lines
 * (HEADER_REVEAL, C1..C6_REVEAL, OUTRO_REVEAL) and VO_DURATION; leaves
 * everything else (FLASH_*, INLINE_PATCH_FIELDS, MARKUP_PATCH_RULES)
 * intact, since the cascade handles them.
 */
async function rewriteTimingMjs(timingPath, durations, voDuration) {
  let src = await readFile(timingPath, "utf8");
  const replacements = [
    { name: "HEADER_REVEAL", value: durations.header },
    { name: "C1_REVEAL",     value: durations.c1 },
    { name: "C2_REVEAL",     value: durations.c2 },
    { name: "C3_REVEAL",     value: durations.c3 },
    { name: "C4_REVEAL",     value: durations.c4 },
    { name: "C5_REVEAL",     value: durations.c5 },
    { name: "C6_REVEAL",     value: durations.c6 },
    { name: "OUTRO_REVEAL",  value: durations.footer },
    { name: "VO_DURATION",   value: voDuration },
  ];
  for (const { name, value } of replacements) {
    const re = new RegExp(`(export const ${name}\\s*=\\s*)[\\d.]+`);
    if (!re.test(src)) {
      throw new Error(`timing.mjs is missing line for ${name} — was the file hand-edited?`);
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`timing.mjs value for ${name} is NaN/undefined — alignment must have failed`);
    }
    src = src.replace(re, `$1${value.toFixed(1)}`);
  }
  await writeFile(timingPath, src);
}

// ── main ────────────────────────────────────────────────────────────

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("usage: node scripts/measure-vo-timing.mjs <slug>");
    console.error("  e.g. node scripts/measure-vo-timing.mjs dollar-cost-averaging");
    process.exit(1);
  }
  const projectDir = join(REPO, "projects", slug, "04-video");
  const ttsPath = join(projectDir, "tts_script.txt");
  const voPath = join(projectDir, ".media", "voiceover", "voiceover.mp3");
  const timingPath = join(projectDir, "timing.mjs");
  const indexPath = join(projectDir, "index.html");

  // Pre-conditions
  for (const [label, p] of [["tts_script.txt", ttsPath], ["voiceover.mp3", voPath], ["timing.mjs", timingPath], ["index.html", indexPath]]) {
    if (!(await stat(p).then(() => true).catch(() => false))) {
      console.error(`!! ${label} not found at ${p}`);
      if (label === "voiceover.mp3") console.error("   Run ./regen.sh first to generate the voiceover.");
      if (label === "tts_script.txt") console.error("   Run: node scripts/build-video.mjs " + slug);
      process.exit(1);
    }
  }

  console.log(`[1/5] parsing tts_script.txt…`);
  const tts = await readFile(ttsPath, "utf8");
  const sections = parseTtsScript(tts);
  console.log(`      found ${sections.length} sections: ${sections.map((s) => s.key).join(", ")}`);

  console.log(`[2/5] running faster-whisper on voiceover.mp3…`);
  const asr = await transcribeVoiceover(voPath, slug);
  const wordCount = (asr.words || []).length;
  if (wordCount === 0) {
    throw new Error("faster-whisper returned 0 words — check the MP3");
  }
  // Total VO duration = last word's end (more reliable than container duration).
  const voDuration = (asr.words || []).reduce((m, w) => Math.max(m, w.end || 0), 0);
  console.log(`      ${wordCount} words, ${voDuration.toFixed(1)}s total`);

  console.log(`[3/5] aligning sections against ASR word stream…`);
  const aligned = alignSections(asr, sections, voDuration);
  for (const a of aligned) {
    const dur = a.end - a.start;
    console.log(`      ${a.key.padEnd(8)}  start=${a.start.toFixed(2)}s  end=${a.end.toFixed(2)}s  dur=${dur.toFixed(2)}s  ratio=${a.ratio.toFixed(2)}`);
  }
  if (aligned.some((a) => a.ratio < 0.5)) {
    console.warn(`      !! at least one section has ratio < 0.5 — the alignment is a fallback. Hand-tweak timing.mjs after this runs.`);
  }

  console.log(`[4/5] rewriting timing.mjs…`);
  const durations = computeDurations(aligned, voDuration);
  await rewriteTimingMjs(timingPath, durations, voDuration);
  console.log(`      HEADER_REVEAL=${durations.header.toFixed(1)} C1..C6=${durations.c1.toFixed(1)},${durations.c2.toFixed(1)},${durations.c3.toFixed(1)},${durations.c4.toFixed(1)},${durations.c5.toFixed(1)},${durations.c6.toFixed(1)} OUTRO_REVEAL=${durations.footer.toFixed(1)} VO_DURATION=${voDuration.toFixed(1)}`);

  console.log(`[5/5] cascading to index.html via inject-static-sfx.mjs…`);
  await new Promise((resolve, reject) => {
    const child = spawn("node", [join(REPO, "scripts", "sound", "inject-static-sfx.mjs"), indexPath], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`inject-static-sfx exited ${code}`)));
  });

  console.log(`\nDone. Review timing.mjs and run: cd ${projectDir} && npm run check && npm run render`);
}

main().catch((err) => {
  console.error(`\nFAIL: ${err.message}`);
  process.exit(1);
});

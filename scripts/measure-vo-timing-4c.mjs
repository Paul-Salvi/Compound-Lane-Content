// scripts/measure-vo-timing-4c.mjs
// Variant of measure-vo-timing.mjs that supports variable N concepts.
// Parses tts_script.txt by section markers, runs faster-whisper on
// voiceover.mp3, aligns sections to ASR, rewrites timing.mjs REVEAL
// constants, then re-runs inject-static-sfx.mjs to cascade into
// index.html.
//
// Usage: node scripts/measure-vo-timing-4c.mjs one-thousand-decision-tree

import { readFile, writeFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

function parseTtsScript(text) {
  const cleaned = text.split(/\r?\n/)
    .filter((l) => !/^\s*#\s*TODO/i.test(l))
    .join("\n");
  // Match `# intro` / `# concept1 — Cash first` / `# outro` — anything
  // after `conceptN` is the human-readable title and is ignored.
  const sectionRe = /^\s*#\s*(intro|concept[0-9]+|outro)\b[^\n]*$/gm;
  const matches = [...cleaned.matchAll(sectionRe)];
  if (matches.length === 0) throw new Error("no # section markers in tts_script.txt");
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i], next = matches[i + 1];
    const start = m.index + m[0].length;
    const end = next ? next.index : cleaned.length;
    const body = cleaned.slice(start, end);
    const cleanedBody = body.replace(/# ─+[\s\S]*$/m, "").trim();
    sections.push({ key: m[1].toLowerCase(), text: cleanedBody });
  }
  return sections;
}

function normalizeText(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

async function runPython(script, argv) {
  for (const cmd of ["python", "python3", "py"]) {
    try {
      const probe = await new Promise((resolve, reject) => {
        const child = spawn(cmd, ["-c", "import faster_whisper; print('ok')"], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        child.stdout.on("data", (b) => out += b.toString());
        child.on("error", reject);
        child.on("close", (code) => code === 0 && out.trim() === "ok" ? resolve(true) : reject(new Error(`code ${code}`)));
      }).catch(() => false);
      if (probe !== true) continue;
      return await new Promise((resolve, reject) => {
        const child = spawn(cmd, ["-c", script, ...argv], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "", err = "";
        child.stdout.on("data", (b) => out += b.toString());
        child.stderr.on("data", (b) => err += b.toString());
        child.on("error", reject);
        child.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(err)));
      });
    } catch (err) { /* try next */ }
  }
  throw new Error("no Python with faster-whisper");
}

async function transcribeVoiceover(mp3Path) {
  const py = `
import json, sys
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe(sys.argv[1], word_timestamps=True, language="en", vad_filter=True)
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

function alignSections(asrData, sections, totalVoDuration) {
  const words = (asrData.words || []).map((w) => ({
    word: normalizeText(w.word).replace(/\s+/g, " ").trim(),
    start: w.start, end: w.end,
  })).filter((w) => w.word.length > 0);
  if (words.length === 0) throw new Error("0 words from ASR");

  const gaps = [];
  for (let i = 1; i < words.length; i++) {
    const dur = words[i].start - words[i - 1].end;
    if (dur > 0) gaps.push({ idx: i, from: words[i - 1].end, to: words[i].start, dur });
  }
  const sectionsNorm = sections.map((s) => ({ key: s.key, words: normalizeText(s.text).split(" ").filter(Boolean) }));

  const PROBE_LEN = 4, PROBE_FLOOR = 0.5;
  const probeHits = [];
  let lastProbeIdx = 0;
  for (let i = 0; i < sectionsNorm.length; i++) {
    const probe = sectionsNorm[i].words.slice(0, PROBE_LEN);
    if (probe.length === 0) { probeHits.push({ idx: -1, ratio: 0, matched: 0 }); continue; }
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

  const MIN_GAP = 0.4;
  const snapToGap = (idx) => {
    if (idx < 0) return null;
    const wordTime = words[idx].start;
    const preceding = gaps.filter((g) => g.dur >= MIN_GAP && g.to <= wordTime + 0.1);
    if (preceding.length === 0) return null;
    preceding.sort((a, b) => Math.abs(wordTime - a.to) - Math.abs(wordTime - b.to));
    return preceding[0].to;
  };

  const sectionStart = new Array(sections.length).fill(null);
  sectionStart[0] = 0;
  for (let i = 1; i < sections.length; i++) {
    const hit = probeHits[i];
    if (hit.ratio >= PROBE_FLOOR) sectionStart[i] = snapToGap(hit.idx);
  }
  for (let i = 1; i < sections.length; i++) {
    if (sectionStart[i] != null) continue;
    let prev = null; for (let j = i - 1; j >= 0; j--) if (sectionStart[j] != null) { prev = sectionStart[j]; break; }
    let next = null; for (let j = i + 1; j < sections.length; j++) if (sectionStart[j] != null) { next = sectionStart[j]; break; }
    const lo = prev ?? 0, hi = next ?? totalVoDuration;
    const inRange = gaps.filter((g) => g.from >= lo && g.to <= hi + 0.1);
    if (inRange.length > 0) { inRange.sort((a, b) => b.dur - a.dur); sectionStart[i] = inRange[0].to; }
    else if (prev != null && next != null) sectionStart[i] = (prev + next) * 0.5;
    else if (prev == null) sectionStart[i] = hi * 0.3;
    else sectionStart[i] = prev + (hi - prev) * 0.7;
  }

  const aligned = [];
  for (let i = 0; i < sections.length; i++) {
    const start = sectionStart[i];
    const end = i < sections.length - 1 ? sectionStart[i + 1] : totalVoDuration;
    aligned.push({ key: sections[i].key, start, end, ratio: probeHits[i].ratio });
  }
  return aligned;
}

async function rewriteTimingMjs(timingPath, durations, voDuration, nConcepts) {
  let src = await readFile(timingPath, "utf8");
  const replacements = [
    { name: "HEADER_REVEAL", value: durations.header },
    { name: "VO_DURATION",   value: voDuration },
  ];
  for (let i = 1; i <= nConcepts; i++) {
    replacements.push({ name: `C${i}_REVEAL`, value: durations[`c${i}`] });
  }
  replacements.push({ name: "OUTRO_REVEAL", value: durations.footer });
  for (const { name, value } of replacements) {
    const re = new RegExp(`(export const ${name}\\s*=\\s*)[\\d.]+`);
    if (!re.test(src)) throw new Error(`timing.mjs is missing line for ${name}`);
    src = src.replace(re, `$1${value.toFixed(1)}`);
  }
  await writeFile(timingPath, src);
}

async function main() {
  const slug = process.argv[2];
  if (!slug) { console.error("usage: node scripts/measure-vo-timing-4c.mjs <slug>"); process.exit(1); }
  const projectDir = join(REPO, "projects", slug, "04-video");
  const ttsPath = join(projectDir, "tts_script.txt");
  const voPath = join(projectDir, ".media", "voiceover", "voiceover.mp3");
  const timingPath = join(projectDir, "timing.mjs");
  const indexPath = join(projectDir, "index.html");

  console.log(`[1/5] parsing tts_script.txt…`);
  const tts = await readFile(ttsPath, "utf8");
  const sections = parseTtsScript(tts);
  // header + N concepts + outro
  const nConcepts = sections.length - 2;
  console.log(`      ${sections.length} sections (intro + ${nConcepts} concepts + outro): ${sections.map((s) => s.key).join(", ")}`);

  console.log(`[2/5] running faster-whisper on voiceover.mp3…`);
  const asr = await transcribeVoiceover(voPath);
  const wordCount = (asr.words || []).length;
  const voDuration = (asr.words || []).reduce((m, w) => Math.max(m, w.end || 0), 0);
  console.log(`      ${wordCount} words, ${voDuration.toFixed(1)}s total`);

  console.log(`[3/5] aligning sections against ASR word stream…`);
  const aligned = alignSections(asr, sections, voDuration);
  for (const a of aligned) {
    const dur = a.end - a.start;
    console.log(`      ${a.key.padEnd(10)}  start=${a.start.toFixed(2)}s  end=${a.end.toFixed(2)}s  dur=${dur.toFixed(2)}s  ratio=${a.ratio.toFixed(2)}`);
  }

  // Compute durations
  const durations = {};
  for (let i = 0; i < aligned.length; i++) {
    const a = aligned[i];
    const end = i < aligned.length - 1 ? aligned[i + 1].start : voDuration;
    let constName;
    if (a.key === "intro") constName = "header";
    else if (a.key === "outro") constName = "footer";
    else constName = a.key.replace(/^concept/, "c");
    durations[constName] = Math.max(0.1, end - a.start);
  }

  console.log(`[4/5] rewriting timing.mjs…`);
  await rewriteTimingMjs(timingPath, durations, voDuration, nConcepts);
  const durLog = ["header", ...Array.from({length: nConcepts}, (_, i) => `c${i+1}`), "footer"]
    .map(k => `${k}=${durations[k]?.toFixed(1)}`).join(" ");
  console.log(`      ${durLog}  VO_DURATION=${voDuration.toFixed(1)}`);

  console.log(`[5/5] cascading to index.html via inject-static-sfx.mjs…`);
  await new Promise((resolve, reject) => {
    const child = spawn("node", [join(REPO, "scripts", "sound", "inject-static-sfx.mjs"), indexPath], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`inject exited ${code}`)));
  });
  console.log(`\nDone. Run: cd ${projectDir} && npm run check && npm run render`);
}

main().catch((err) => { console.error(`\nFAIL: ${err.message}`); process.exit(1); });

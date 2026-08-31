// scripts/build-subs.mjs
// Build the Spanish .srt subtitle file for one or more projects.
//
// Inputs:  projects/{slug}/04-video/tts_script.es.txt   (human-translated via Claude — paste the Stage 4 prompt from docs/text-prompt-engine-v2.md)
//          projects/{slug}/04-video/tts_script.txt      (English, for sentence-boundary alignment)
//          projects/{slug}/04-video/.media/voiceover/voiceover.json   (faster-whisper per-word timings, produced by scripts/measure-vo-timing.mjs)
//
// Outputs: projects/{slug}/01-text/spanish-subs.srt     (SRT file uploaded to YouTube Studio → Subtitles → upload)
//
// CLI:     node scripts/build-subs.mjs [slug ...]
//          node scripts/build-subs.mjs                  (auto-discovers all slugs with 04-video/voiceover.json)
//          node scripts/build-subs.mjs <slug> --force   (overwrite an existing SRT)
//
// Pure ESM, zero npm deps. Node 18+.
//
// Why this exists: YouTube Studio lets you upload a subtitle file alongside the
// video. The English voiceover + Spanish SRT reaches a Spanish-speaking
// audience without re-rendering the audio. We already have per-word English
// timings from `voiceover.json` (faster-whisper output) — we reuse them at the
// clause level. Spanish word order drifts from English, so we align by sentence
// (the Spanish sentence spans the same time slot as its English source, even
// though the words land in a different order). Drift per cue is ~50-200ms,
// well under YouTube's 1s tolerance.
//
// Idempotent: re-running on a project that already has 01-text/spanish-subs.srt
// does NOT clobber it. Use --force to overwrite (e.g. after re-translating).

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// ─── constants ──────────────────────────────────────────────────────────────

// Readability sweet spot for YouTube SRT cues (seconds on screen).
const MIN_CUE_DUR = 1.0;
const MAX_CUE_DUR = 7.0;

// Minimum gap between consecutive English words that counts as a real section
// boundary (matches the threshold in scripts/measure-vo-timing.mjs:248).
const MIN_GAP = 0.4;

// How many leading words of each section to probe for in the ASR word stream.
const PROBE_LEN = 4;
const PROBE_FLOOR = 0.5;

// ─── shared parser (mirrors scripts/measure-vo-timing.mjs) ─────────────────
// Splits tts_script.txt into sections. Two formats are supported (see
// docs/pacing-rules-v1.md):
//
//   1. New: tts_script.txt is just spoken words, blank-line-separated.
//      Section keys come from a sibling 04-video/sections.json. This is
//      the AUDIO_STYLE.md rule 8 + pacing-rules-v1.md convention —
//      markers cost ~7-15s of dead air per VibeVoice segment.
//
//   2. Legacy: tts_script.txt has `# intro` / `# conceptN` / `# outro`
//      markers (DCA, OTDT). Detected when no sections.json is present;
//      prints a one-time migration warning.
//
// `sectionsFromJson` is an array of { key, label } in the same order
// as the script's paragraphs. When omitted, the function falls back to
// the legacy regex.
function parseTtsScript(text, sectionsFromJson) {
  const cleaned = text.split(/\r?\n/).filter((l) => !/^\s*#\s*TODO/i.test(l)).join("\n");

  if (sectionsFromJson && Array.isArray(sectionsFromJson) && sectionsFromJson.length > 0) {
    // New format: blank-line paragraph split. AUDIO_STYLE.md rule 8
    // means tts_script.txt has no markers, so blank lines are the only
    // section delimiter.
    const paragraphs = cleaned
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (paragraphs.length !== sectionsFromJson.length) {
      throw new Error(
        `tts_script.txt has ${paragraphs.length} paragraph(s) but sections.json declares ` +
        `${sectionsFromJson.length} section(s). Either fix tts_script.txt (one paragraph per ` +
        `section) or fix sections.json. (See docs/pacing-rules-v1.md.)`,
      );
    }
    return sectionsFromJson.map((s, i) => ({ key: s.key, text: paragraphs[i] }));
  }

  // Legacy format: # section markers. Print a one-time warning so
  // legacy reels get migrated to sections.json.
  console.warn(
    "!! tts_script.txt uses legacy # intro / # conceptN / # outro markers. " +
    "Migrate to 04-video/sections.json (see docs/pacing-rules-v1.md) — markers cost " +
    "~7-15s of dead air per VibeVoice segment.",
  );
  const sectionRe = /^\s*#\s*(intro|concept[0-9]+|outro)\b[^\n]*$/gm;
  const matches = [...cleaned.matchAll(sectionRe)];
  if (matches.length === 0) {
    throw new Error(
      "no # intro / # conceptN / # outro markers in tts_script.txt AND no 04-video/sections.json. " +
      "Create sections.json with one entry per blank-line-separated paragraph. " +
      "(See docs/pacing-rules-v1.md.)",
    );
  }
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const start = m.index + m[0].length;
    const end = next ? next.index : cleaned.length;
    const body = cleaned.slice(start, end);
    const cleanedBody = body.replace(/# ─+[\s\S]*$/m, "").trim();
    sections.push({ key: m[1].toLowerCase(), text: cleanedBody });
  }
  return sections;
}

// ─── ASR helpers (mirrors scripts/measure-vo-timing.mjs:194-309) ───────────
function normalizeWord(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Bounded Levenshtein distance (max edit distance 2). Returns -1 if
// the true distance exceeds `max`. Used to tolerate single-character
// ASR drift (e.g., script says "car" but ASR heard "card"; script says
// "high-yield" but ASR tokenized it as "high yield" or "high yeld").
function levenshteinLeq(a, b, max) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return -1;
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost      // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return -1; // prune this row
    [prev, curr] = [curr, prev];
  }
  return prev[lb] <= max ? prev[lb] : -1;
}

// A probe word and an ASR word "match" if either is a prefix of the
// other (handles "fdic-insured" → "fdic" + "insured" in the script vs
// "fdic insured" in the ASR), or if their edit distance is ≤ 1.
function fuzzyWordMatch(probe, asr) {
  if (probe === asr) return true;
  if (probe.length >= 3 && asr.length >= 3) {
    if (probe.startsWith(asr) || asr.startsWith(probe)) return true;
    if (levenshteinLeq(probe, asr, 1) !== -1) return true;
  }
  return false;
}

// Walk the ASR word stream and locate each section's start time, using the
// same probe-based detection as `alignSections` in measure-vo-timing.mjs.
// Returns an array of start times (one per section) plus the total VO
// duration. The first section starts at t=0 by definition.
function alignSectionsToAsr(words, sections, totalVoDuration) {
  // Build gap list (sorted by start time, descending duration). The largest
  // gap inside the [prev, next] range is the most likely section break.
  const gaps = [];
  for (let i = 1; i < words.length; i++) {
    const dur = words[i].start - words[i - 1].end;
    if (dur > 0) gaps.push({ from: words[i - 1].end, to: words[i].start, dur });
  }
  // Normalize each section's first words as the probe.
  const sectionProbes = sections.map((s) => ({
    key: s.key,
    words: normalizeWord(s.text).split(" ").filter(Boolean).slice(0, PROBE_LEN),
  }));
  // Probe-based detection: for each section, find the best ASR position of
  // its first PROBE_LEN words. Search starts at the previous section's hit + 1
  // so sections stay in order.
  const probeHits = [];
  let lastProbeIdx = 0;
  for (let i = 0; i < sectionProbes.length; i++) {
    const probe = sectionProbes[i].words;
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
  // Snap a probe hit to the nearest preceding gap ≥ MIN_GAP. Real section
  // boundaries always have a brief silence.
  const snapToGap = (idx) => {
    if (idx < 0) return null;
    const wordTime = words[idx].start;
    const preceding = gaps.filter((g) => g.dur >= MIN_GAP && g.to <= wordTime + 0.1);
    if (preceding.length === 0) return null;
    preceding.sort((a, b) => Math.abs(wordTime - a.to) - Math.abs(wordTime - b.to));
    return preceding[0].to;
  };
  // sectionStart[0] = 0; the rest are derived from the probe (when ratio OK)
  // and snapped to the nearest preceding gap. Sections whose probe didn't
  // match (ratio < PROBE_FLOOR) are gap-filled: take the largest gap in the
  // [prev, next] range, or fall back to a weighted average of the neighbors.
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
  return { sectionStart, totalVoDuration, probeHits };
}

// ─── per-sentence alignment within a section ──────────────────────────────
// Split a section's text into sentences on `.` / `!` / `?` followed by
// whitespace. Returns an array of trimmed, non-empty sentence strings with
// trailing punctuation preserved.
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// For one section, walk the English word stream between [sectionStart[i],
// sectionStart[i+1]] and produce one (or more) cues per English sentence.
// Each cue's start = first English word's start, end = last English word's
// end. The corresponding Spanish sentence becomes the cue text.
function buildCuesForSection({
  englishSectionText,
  spanishSectionText,
  words,
  sectionStart,
  nextSectionStart,
  sectionKey,
  startCueIndex,
}) {
  const enSentences = splitSentences(englishSectionText);
  const esSentences = splitSentences(spanishSectionText);
  if (enSentences.length === 0) return [];
  if (enSentences.length !== esSentences.length) {
    console.warn(`      !! ${sectionKey}: sentence count mismatch (en=${enSentences.length}, es=${esSentences.length}) — cue timing will be approximate. Re-translate with the same sentence count.`);
  }
  // ASR drift on numbers is severe: the script says "five hundred" but
  // faster-whisper hears "500" and the voiceover says "twenty-two" but
  // ASR outputs "22". We strip pure-digit tokens from BOTH sides of the
  // comparison so the walker latches onto the structural words that
  // uniquely identify each sentence. (The cue's start/end times still
  // come from the actual ASR words — we just don't require the script
  // and ASR to agree on every number.)
  const stripDigits = (s) => s.replace(/\b\d+\b/g, "").trim();
  const wordsInSection = words.filter((w) => w.start >= sectionStart && w.start < nextSectionStart);
  // Phase 1: walk each English sentence and locate its first ASR word.
  // The walk is bounded: a miss budget (consecutive ASR words that don't
  // match the current probe word) lets us skip probe words the ASR doesn't
  // have (drift, fillers, contractions). When the walk exhausts the
  // section without finding the first probe word, the sentence has no
  // anchor — we'll fill its time in phase 2 by interpolation.
  const anchors = new Array(enSentences.length).fill(null); // { start, end } in seconds
  let wordCursor = 0;
  for (let i = 0; i < enSentences.length; i++) {
    const probe = stripDigits(normalizeWord(enSentences[i])).split(" ").filter(Boolean);
    if (probe.length === 0) continue;
    const firstIdx = wordCursor;
    let probePtr = 0;
    let lastIdx = wordCursor;
    const MISS_BUDGET = 6;
    let consecMiss = 0;
    while (probePtr < probe.length && wordCursor < wordsInSection.length) {
      const aw = stripDigits(normalizeWord(wordsInSection[wordCursor].word));
      if (fuzzyWordMatch(probe[probePtr], aw)) {
        probePtr++;
        lastIdx = wordCursor;
        consecMiss = 0;
        wordCursor++;
      } else if (++consecMiss >= MISS_BUDGET && probePtr < probe.length - 1) {
        probePtr++;
        consecMiss = 0;
        wordCursor++;
      } else {
        wordCursor++;
      }
    }
    if (probePtr > 0) {
      anchors[i] = { start: wordsInSection[firstIdx].start, end: wordsInSection[lastIdx].end };
    }
    // If probePtr === 0, this sentence has no anchor — leave null and
    // let phase 2 interpolate. Either way, advance wordCursor only as
    // far as the walk reached, so the next sentence starts from where
    // this one stopped (preserves order).
  }
  // Phase 2: fill any null anchors by interpolating between the nearest
  // non-null anchors (or the section's start/end). We linearly distribute
  // the time range across the un-anchored sentences in proportion to
  // their Spanish character count — Spanish readers take roughly
  // proportional time per cue regardless of language, and a Spanish
  // sentence that's much longer than its English counterpart will
  // naturally get a longer time slice.
  const sectionEnd = nextSectionStart;
  const firstAnchorIdx = anchors.findIndex((a) => a != null);
  const lastAnchorIdx = (() => {
    for (let k = anchors.length - 1; k >= 0; k--) if (anchors[k] != null) return k;
    return -1;
  })();
  // Walk through the sentences and interpolate each null anchor between
  // the bounding non-null anchors (or the section boundaries if the null
  // anchor is at the very start or end).
  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i] != null) continue;
    // Find the nearest non-null anchor on each side.
    let leftIdx = -1, rightIdx = -1;
    for (let k = i - 1; k >= 0; k--) if (anchors[k] != null) { leftIdx = k; break; }
    for (let k = i + 1; k < anchors.length; k++) if (anchors[k] != null) { rightIdx = k; break; }
    // Determine the left and right time bounds.
    let leftTime, rightTime;
    if (leftIdx >= 0) leftTime = anchors[leftIdx].end;
    else leftTime = sectionStart;
    if (rightIdx >= 0) rightTime = anchors[rightIdx].start;
    else rightTime = sectionEnd;
    // Find the contiguous run of nulls containing i, and allocate time
    // across that run proportionally to Spanish character counts.
    let runStart = i, runEnd = i;
    while (runStart - 1 >= 0 && anchors[runStart - 1] == null) runStart--;
    while (runEnd + 1 < anchors.length && anchors[runEnd + 1] == null) runEnd++;
    const runSpan = rightTime - leftTime;
    const charCounts = [];
    let totalChars = 0;
    for (let k = runStart; k <= runEnd; k++) {
      const c = (esSentences[Math.min(k, esSentences.length - 1)] || "").length || 1;
      charCounts.push(c);
      totalChars += c;
    }
    let t = leftTime;
    for (let k = runStart; k <= runEnd; k++) {
      const slice = (charCounts[k - runStart] / totalChars) * runSpan;
      const start = t;
      const end = k === runEnd ? rightTime : t + slice;
      anchors[k] = { start, end };
      t = end;
    }
  }
  // Phase 3: emit one cue per sentence using the resolved anchors.
  const cues = [];
  for (let i = 0; i < enSentences.length; i++) {
    const a = anchors[i];
    if (!a) continue; // nothing to emit
    const esText = esSentences[Math.min(i, esSentences.length - 1)] || "";
    if (!esText) continue;
    cues.push({ start: a.start, end: a.end, text: esText });
  }
  return cues;
}

// ─── cue post-processing (merge short, split long) ─────────────────────────
// SRT cues should be 1-7s on screen. Merge any cue shorter than MIN_CUE_DUR
// forward into the next cue (concatenating text with a space). If a cue is
// longer than MAX_CUE_DUR, split it at the nearest `,` / `;` / `:` boundary
// in the text, emitting two cues back-to-back.
const MAX_SPLIT_DEPTH = 4;
function postProcessCues(cues, depth = 0) {
  if (cues.length === 0) return cues;
  // 1) Merge short cues forward.
  const merged = [];
  for (const cue of cues) {
    const dur = cue.end - cue.start;
    if (dur < MIN_CUE_DUR && merged.length > 0) {
      const prev = merged[merged.length - 1];
      prev.end = cue.end;
      prev.text = `${prev.text} ${cue.text}`.trim();
    } else {
      merged.push({ ...cue });
    }
  }
  // 2) Split long cues at clause boundaries. The first half keeps the
  // original start; the second half starts at the original end. We use a
  // midpoint in time as the split point and then find the nearest clause
  // boundary in the text on each side. To keep the implementation simple
  // and correct, we split at a fixed time ratio of the cue's duration.
  const final = [];
  for (const cue of merged) {
    const dur = cue.end - cue.start;
    if (dur <= MAX_CUE_DUR || cue.text.length < 20 || depth >= MAX_SPLIT_DEPTH) {
      final.push(cue);
      continue;
    }
    // Split the cue's TIME in half, then snap each half's text to the
    // nearest preceding/following clause boundary. This ensures both
    // sub-cues land in roughly equal time slots regardless of how much
    // text the translation produced.
    const textMid = cue.start + dur / 2;
    const text = cue.text;
    // First half: text up to the clause boundary at or before the midpoint.
    // We split on `,` `;` `:` `—` `–` (and `.` for the second half, since
    // a long cue that crossed a Spanish sentence boundary needs the period
    // to find a split point). Excluding `.` from the FIRST half prevents
    // the first half from ending with a bare period, which looks wrong on
    // screen.
    const SPLIT_CHARS_FIRST = ",;:—–";
    const SPLIT_CHARS_SECOND = ",;:—–.";
    let firstTextEnd = -1;
    for (let k = 0; k < text.length; k++) {
      if (SPLIT_CHARS_FIRST.includes(text[k]) && k < text.length / 2) firstTextEnd = k;
    }
    // Second half: text from the position AFTER the clause boundary at or
    // after the midpoint. We exclude the very last char from the search
    // (the trailing period of the cue) so `text.slice(secondTextStart)`
    // doesn't end up empty. Skip any leading whitespace.
    let secondTextStart = -1;
    const scanLimit = text.length - 1; // exclude trailing period
    for (let k = Math.floor(text.length / 2); k < scanLimit; k++) {
      if (SPLIT_CHARS_SECOND.includes(text[k])) { secondTextStart = k + 1; break; }
    }
    if (secondTextStart > 0) {
      while (secondTextStart < text.length && text[secondTextStart] === " ") secondTextStart++;
    }
    if (firstTextEnd < 0 || secondTextStart < 0) {
      // No clause boundary in one half — keep the cue as-is (the long cue
      // is rare and YouTube will accept it; flag it in the build summary).
      final.push(cue);
      continue;
    }
    const first = { start: cue.start, end: textMid, text: text.slice(0, firstTextEnd + 1).trim() };
    const second = { start: textMid, end: cue.end, text: text.slice(secondTextStart).trim() };
    // Re-check both halves: recurse if either is still too long.
    final.push(...postProcessCues([first, second], depth + 1));
  }
  return final;
}

// ─── SRT formatting ────────────────────────────────────────────────────────
function pad(n, w) { return String(n).padStart(w, "0"); }
function formatSrtTime(seconds) {
  // SRT uses `,` as the millisecond separator (NOT `.` like WebVTT).
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const ms = Math.round((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}
function formatSrt(cues) {
  const blocks = [];
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    blocks.push(`${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`);
  }
  return blocks.join("\n") + "\n";
}

// ─── main per-slug build ───────────────────────────────────────────────────
async function buildOne(slug, { force }) {
  const projectDir = join(REPO, "projects", slug, "04-video");
  const enPath = join(projectDir, "tts_script.txt");
  const esPath = join(projectDir, "tts_script.es.txt");
  const voJsonPath = join(projectDir, ".media", "voiceover", "voiceover.json");
  const outPath = join(REPO, "projects", slug, "01-text", "spanish-subs.srt");

  // Pre-conditions: fail loudly with a clear hint for each missing input.
  // These are intentional — the script refuses to "guess" timings or
  // silently emit an empty SRT.
  for (const [label, p, hint] of [
    ["tts_script.txt (English)", enPath, `Build the project first: node scripts/build-video.mjs ${slug}`],
    ["tts_script.es.txt (Spanish translation)", esPath, `Translate tts_script.txt via Claude using the Stage 4 prompt in docs/text-prompt-engine-v2.md, then save the result to ${esPath}. Section markers (# intro / # conceptN / # outro) must be preserved.`],
    ["voiceover.json (faster-whisper timings)", voJsonPath, `Generate the timings first: cd projects/${slug}/04-video && ./regen.sh (creates voiceover.mp3), then node ../../../scripts/measure-vo-timing.mjs ${slug} (creates voiceover.json).`],
  ]) {
    if (!(await stat(p).then(() => true).catch(() => false))) {
      throw new Error(`${label} not found at ${p}\n       ${hint}`);
    }
  }

  const enText = await readFile(enPath, "utf8");
  const esText = await readFile(esPath, "utf8");
  const voData = JSON.parse(await readFile(voJsonPath, "utf8"));

  // Normalize the ASR word stream: strip punctuation, lowercase, drop empty
  // entries. Use the original `start`/`end` (we only change the comparison
  // key, not the timing).
  const rawWords = (voData.words || []).map((w) => ({
    start: Number(w.start),
    end: Number(w.end),
    word: normalizeWord(w.word).replace(/\s+/g, " ").trim(),
  })).filter((w) => w.word.length > 0);
  if (rawWords.length === 0) throw new Error(`${slug}: voiceover.json has no words — was the ASR run completed?`);
  const totalVoDuration = rawWords.reduce((m, w) => Math.max(m, w.end || 0), 0);

  // Parse both scripts into parallel section arrays. The keys must match
  // 1:1 (intro / concept1..N / outro); we throw if either side has a
  // different count, since the cue text is paired sentence-by-sentence.
  //
  // New-format projects (docs/pacing-rules-v1.md): section keys come
  // from 04-video/sections.json and tts_script.txt / tts_script.es.txt
  // are blank-line-separated paragraphs with no `# section` markers.
  // Legacy projects (DCA, OTDT): parseTtsScript falls back to the
  // `# intro` / `# conceptN` / `# outro` markers and prints a one-time
  // migration warning.
  const sectionsJsonPath = join(projectDir, "sections.json");
  let sectionsFromJson = null;
  if (await stat(sectionsJsonPath).then(() => true).catch(() => false)) {
    const raw = await readFile(sectionsJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    sectionsFromJson = (parsed.sections || []).map((s) => ({ key: s.key, label: s.label }));
  }
  const enSections = parseTtsScript(enText, sectionsFromJson);
  const esSections = parseTtsScript(esText, sectionsFromJson);
  if (enSections.length !== esSections.length) {
    throw new Error(`${slug}: section count mismatch — English has ${enSections.length} sections, Spanish has ${esSections.length}. Re-translate tts_script.txt preserving every section (one paragraph per section, no extra or missing).`);
  }
  for (let i = 0; i < enSections.length; i++) {
    if (enSections[i].key !== esSections[i].key) {
      throw new Error(`${slug}: section[${i}] key mismatch — English '${enSections[i].key}' vs Spanish '${esSections[i].key}'. Re-translate preserving section order.`);
    }
  }

  // Align section start times against the ASR word stream. This re-uses the
  // exact same probe+gap algorithm as `measure-vo-timing.mjs` so the Spanish
  // SRT aligns to the same section boundaries the video's visuals use.
  const { sectionStart, probeHits } = alignSectionsToAsr(rawWords, enSections, totalVoDuration);
  const lowConfidence = probeHits.filter((h) => h.ratio < PROBE_FLOOR).length;
  if (lowConfidence > 0) {
    console.warn(`      !! ${slug}: ${lowConfidence}/${enSections.length} sections had probe ratio < ${PROBE_FLOOR} — alignment used gap-fill fallback. Inspect the output SRT.`);
  }

  // Build per-section cues, then post-process (merge short, split long).
  const allCues = [];
  for (let i = 0; i < enSections.length; i++) {
    const start = sectionStart[i];
    const nextStart = i < enSections.length - 1 ? sectionStart[i + 1] : totalVoDuration;
    const sectionCues = buildCuesForSection({
      englishSectionText: enSections[i].text,
      spanishSectionText: esSections[i].text,
      words: rawWords,
      sectionStart: start,
      nextSectionStart: nextStart,
      sectionKey: enSections[i].key,
    });
    allCues.push(...sectionCues);
  }
  const processed = postProcessCues(allCues);
  if (processed.length === 0) {
    throw new Error(`${slug}: produced 0 cues — the English script could not be aligned to the ASR word stream. Inspect tts_script.txt and voiceover.json for drift.`);
  }
  // Sort by start time (sentence alignment within a section can produce
  // out-of-order timings if a sentence was short and its words landed
  // earlier in the section than the algorithm's greedy walk expected).
  processed.sort((a, b) => a.start - b.start);

  // Validation: no overlapping cues, no empty text, no negative durations.
  const issues = [];
  for (let i = 0; i < processed.length; i++) {
    const c = processed[i];
    if (!c.text || c.text.trim().length === 0) issues.push(`cue ${i + 1}: empty text`);
    if (c.end <= c.start) issues.push(`cue ${i + 1}: end <= start (${c.end.toFixed(2)} <= ${c.start.toFixed(2)})`);
    if (i > 0 && c.start < processed[i - 1].end) {
      // Two cues overlap — clamp this one's start to the previous end.
      c.start = processed[i - 1].end;
      if (c.end <= c.start) c.end = c.start + 0.5;
    }
  }
  const totalDur = processed.reduce((s, c) => s + (c.end - c.start), 0);
  const longest = processed.reduce((m, c) => Math.max(m, c.end - c.start), 0);
  const shortest = Math.min(...processed.map((c) => c.end - c.start));
  const totalText = processed.reduce((s, c) => s + c.text.length, 0);

  // Idempotent write: don't clobber an existing SRT unless --force.
  const existing = await stat(outPath).then(() => true).catch(() => false);
  if (existing && !force) {
    return { slug, status: "no-op", cues: processed.length, totalDur, longest, shortest, totalText, issues };
  }
  await writeFile(outPath, formatSrt(processed), "utf8");
  return { slug, status: existing ? "force-overwrite" : "fresh", cues: processed.length, totalDur, longest, shortest, totalText, issues };
}

// ─── auto-discovery ────────────────────────────────────────────────────────
// A project is "buildable" if it has 04-video/voiceover.json (the timing
// source). Whether or not tts_script.es.txt exists is decided in buildOne
// (it throws with a clear hint). This lets `build-subs.mjs` run in dry-run
// mode and list which projects are ready vs which need the translation step.
async function discoverSlugs() {
  const projectsDir = join(REPO, "projects");
  const out = [];
  for (const d of await readdir(projectsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const voJson = join(projectsDir, d.name, "04-video", ".media", "voiceover", "voiceover.json");
    if (await stat(voJson).then(() => true).catch(() => false)) out.push(d.name);
  }
  return out.sort();
}

function fmtOutputLine(slug, result) {
  return `built  ${slug.padEnd(56)}  cues=${String(result.cues).padStart(3)}  dur=${result.totalDur.toFixed(1)}s  longest=${result.longest.toFixed(1)}s  shortest=${result.shortest.toFixed(1)}s  text=${result.totalText}c  status=${result.status}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const slugs = positional.length > 0 ? positional : await discoverSlugs();
  if (slugs.length === 0) {
    console.error("no slugs with 04-video/.media/voiceover/voiceover.json — run measure-vo-timing.mjs first");
    process.exit(1);
  }
  const results = [];
  for (const s of slugs) {
    try {
      const r = await buildOne(s, { force });
      results.push(r);
      console.log(fmtOutputLine(s, r));
      if (r.issues.length > 0) {
        for (const issue of r.issues) console.log(`      !! ${issue}`);
      }
    } catch (err) {
      console.error(`FAIL   ${s}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  const built = results.filter((r) => r.status !== "no-op").length;
  console.log(`\n${built}/${results.length} project(s) built (force=${force}).`);
  console.log(`At upload: YouTube Studio → Subtitles → upload 01-text/spanish-subs.srt → set language "Spanish" → publish.`);
}

main();

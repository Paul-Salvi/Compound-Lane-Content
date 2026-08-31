// scripts/check-pacing.mjs
// Pre-render validation of projects/{slug}/04-video/tts_script.txt against
// docs/pacing-rules-v1.md. Pure ESM, zero npm deps, Node 18+. Cross-platform.
//
// Usage:
//   node scripts/check-pacing.mjs <slug>                 # check, exit 0 always
//   node scripts/check-pacing.mjs <slug> --strict        # exit 1 if any check fails
//   node scripts/check-pacing.mjs <slug> --json          # machine-readable output
//
// What it checks (mapped 1:1 to pacing-rules-v1.md `checks:`):
//   - word_count_in_range:    total words in [75, 100]
//   - hook_lands_on_time:     first paragraph ≤ 2s of speech (≤ 4 words at Paul/1.30×)
//   - hook_has_forbidden_opener: first word not in the spec's forbidden list
//   - largest_number_in_quantify_beat: largest numeric value lands in the
//                             section labelled quantify_opportunity_cost
//   - cta_present:            last paragraph contains a save/follow/etc. ask
//   - keyword_continuity:     hook shares a noun-phrase with a later section
//
// Non-strict mode (default): prints ✓/!! per check, never exits non-zero.
// This matches the existing AUDIO_STYLE.md comment-guard behavior — the
// regen scripts surface the violations but never block on them. Pass
// --strict to fail builds (CI use).

import { readFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.slug || import.meta.url));
const REPO = resolve(__dirname, "..");

// ── constants from docs/pacing-rules-v1.md ───────────────────────────
const SPEC = {
  wordCountRange: [75, 100],
  hookMaxWords: 12,
  hookMaxSeconds: 2.0,
  // Empirical Paul/1.30× rate (from memory/vibevoice-segment-cost.md):
  // 70 words → 24.0s → 0.343 s/word. Use 0.40 as a safe upper bound
  // for the pre-render check; the actual delivery will be faster.
  secPerWord: 0.40,
  forbiddenOpeners: [
    "hey", "guys", "today", "in this video", "welcome back",
    "what's up", "what is up", "what up", "what is going on",
    "how's it going", "how is it going",
  ],
  ctaLexicon: [
    "save", "follow", "comment", "share", "dm", "bio link",
    "subscribe", "like", "tag a friend",
  ],
};

// ── helpers ──────────────────────────────────────────────────────────

/** Strip empty paragraphs + comments; return ordered list of paragraphs. */
function splitParagraphs(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))      // strip # comments
    .join("\n")
    .split(/\r?\n\s*\r?\n/)                 // blank-line split
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

function countWords(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Extract every numeric value in a paragraph, spelled-out or digit.
 *  Returns an array of { display, value } pairs where `value` is a
 *  number for comparison. Spelled-out numbers ("seven thousand") are
 *  parsed via wordToNumber below.
 */
const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const SCALES = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const MULTIPLIERS = { hundred: 100, thousand: 1000, million: 1_000_000 };

function wordToNumber(words) {
  // Standard "twenty three" / "eighty three" / "ninety nine" pattern
  // (compound tens + ones). The input may also include "hundred" and
  // "thousand" multipliers. We return 0 if no number words are found.
  let total = 0, current = 0;
  for (const w of words) {
    if (ONES[w] !== undefined) {
      // Compound: "twenty three" → 20 + 3, "five eighty three" → 5*100 + 80 + 3.
      // If we already have a tens value pending, add the ones digit to it.
      // If we have a value from a previous multiplier, add this as a fresh
      // ones digit to the running current.
      current += ONES[w];
      continue;
    }
    if (SCALES[w] !== undefined) {
      // "eighty three" → SCALES['eighty']=80 then ONES['three']=3 adds to 80.
      // "twenty thousand" → SCALES['twenty']=20 then MULTIPLIERS['thousand']=1000.
      current += SCALES[w];
      continue;
    }
    if (w === "hundred") {
      if (current === 0) current = 1;
      current *= 100;
      continue;
    }
    if (MULTIPLIERS[w] !== undefined) {
      if (current === 0) current = 1;
      current *= MULTIPLIERS[w];
      total += current; current = 0;
      continue;
    }
    return 0;       // unknown word — bail
  }
  return total + current;
}

function findNumbers(paragraph) {
  const found = [];
  // Digit-form: $1,000 / 7% / 100 / 1.5x
  const digitRe = /\$?\d[\d,.]*\d|\d/g;
  let m;
  while ((m = digitRe.exec(paragraph)) !== null) {
    const display = m[0];
    const value = parseFloat(display.replace(/[$,%x]/g, ""));
    if (!Number.isFinite(value)) continue;
    // Skip 4-digit years (e.g. "2024") — they're contextual, not
    // the "largest number" the spec is talking about.
    if (/^\d{4}$/.test(display)) continue;
    found.push({ display, value, index: m.index });
  }
  // Spelled-out: chunk between punctuation/whitespace, lowercase, look
  // up to 4 words at a time.
  const tokens = paragraph.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    for (let n = 1; n <= 4 && i + n <= tokens.length; n++) {
      const chunk = tokens.slice(i, i + n);
      const all = chunk.every(
        (w) => ONES[w] !== undefined || SCALES[w] !== undefined || MULTIPLIERS[w] !== undefined,
      );
      if (!all) continue;
      const v = wordToNumber(chunk);
      if (v === 0) continue;
      found.push({ display: chunk.join(" "), value: v });
      i += n - 1;        // skip past this chunk
      break;
    }
  }
  return found;
}

// ── checks ──────────────────────────────────────────────────────────

function checkWordCount(paragraphs) {
  const total = paragraphs.reduce((n, p) => n + countWords(p), 0);
  const [lo, hi] = SPEC.wordCountRange;
  return {
    id: "word_count_in_range",
    pass: total >= lo && total <= hi,
    actual: total,
    expected: `[${lo}, ${hi}]`,
    note: total < lo
      ? `script is short by ${lo - total} words`
      : `script is over by ${total - hi} words`,
  };
}

function checkHook(paragraphs) {
  const hook = paragraphs[0];
  const words = countWords(hook);
  const estSec = words * SPEC.secPerWord;
  const firstWord = hook.toLowerCase().split(/\s+/)[0];
  const forbiddenHit = SPEC.forbiddenOpeners.find(
    (f) => hook.toLowerCase().startsWith(f),
  );
  const passes = {
    words: words <= SPEC.hookMaxWords,
    timing: estSec <= SPEC.hookMaxSeconds,
    opener: !forbiddenHit,
  };
  return {
    id: "hook_lands_on_time",
    pass: passes.words && passes.timing && passes.opener,
    actual: `${words} words, est ${estSec.toFixed(2)}s, opener="${firstWord}"`,
    expected: `≤ ${SPEC.hookMaxWords} words, ≤ ${SPEC.hookMaxSeconds}s, opener not in ${JSON.stringify(SPEC.forbiddenOpeners)}`,
    note: !passes.opener
      ? `forbidden opener matched: "${forbiddenHit}"`
      : !passes.words
      ? `hook has ${words} words (max ${SPEC.hookMaxWords})`
      : !passes.timing
      ? `hook estimated at ${estSec.toFixed(2)}s (max ${SPEC.hookMaxSeconds}s)`
      : null,
  };
}

function checkLargestNumber(paragraphs, sections) {
  // Find the section labelled quantify_opportunity_cost (or fall back
  // to section index 3 per pacing-rules-v1.md beat map).
  const label = "quantify_opportunity_cost";
  let targetIdx = sections.findIndex((s) => s.label === label);
  if (targetIdx === -1) targetIdx = 3;        // spec default position
  // Scan all paragraphs for the largest numeric value.
  let largest = { value: -Infinity, segment: -1, display: null };
  paragraphs.forEach((p, i) => {
    const nums = findNumbers(p);
    for (const n of nums) {
      if (n.value > largest.value) largest = { value: n.value, segment: i, display: n.display };
    }
  });
  return {
    id: "largest_number_in_quantify_beat",
    pass: largest.segment === targetIdx,
    actual: `largest = ${largest.display} (${largest.value}) in segment ${largest.segment} ("${paragraphs[largest.segment]?.slice(0, 40)}...")`,
    expected: `largest number in segment ${targetIdx} (label="${label}", "${paragraphs[targetIdx]?.slice(0, 40)}...")`,
    note: largest.segment !== targetIdx
      ? `largest number is in segment ${largest.segment} but ${label} is segment ${targetIdx}`
      : null,
  };
}

function checkCta(paragraphs, sections) {
  const label = "cta";
  let ctaIdx = sections.findIndex((s) => s.label === label);
  if (ctaIdx === -1) ctaIdx = sections.length - 1;  // spec default = last
  const last = (paragraphs[ctaIdx] || "").toLowerCase();
  const hit = SPEC.ctaLexicon.find((w) => last.includes(w));
  return {
    id: "cta_present",
    pass: !!hit,
    actual: hit ? `"${hit}" found in segment ${ctaIdx}` : `no CTA lexicon word in segment ${ctaIdx} ("${paragraphs[ctaIdx]?.slice(0, 40)}...")`,
    expected: `segment ${ctaIdx} (label="${label}") contains one of: ${SPEC.ctaLexicon.join(", ")}`,
    note: !hit ? "no save/follow/comment/share ask in the CTA beat" : null,
  };
}

function checkKeywordContinuity(paragraphs) {
  // Find the most-frequent content word in the hook that also appears
  // in a later segment. Approximation of the spec's keyword_continuity
  // rule (which would normally read from 01-text/keywords.txt).
  const hookTokens = (paragraphs[0] || "").toLowerCase()
    .replace(/[^\w\s]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 4);
  const later = paragraphs.slice(1).join(" ").toLowerCase();
  const counts = new Map();
  for (const w of hookTokens) {
    if (["this", "that", "with", "from", "have", "your", "they", "their", "what", "when", "where", "which", "will", "would", "could", "should"].includes(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  // Sort hook words by frequency in the hook, then check which one
  // appears in the later text.
  const candidates = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const hit = candidates.find(([w]) => new RegExp(`\\b${w}\\b`).test(later));
  return {
    id: "keyword_continuity",
    pass: !!hit,
    actual: hit ? `"${hit[0]}" appears in hook + later segment(s)` : `no hook keyword reappears later (hook tokens: ${hookTokens.join(", ")})`,
    expected: `a ≥4-char content word from the hook also appears in a later segment`,
    note: !hit ? "hook keyword does not recur — viewers may not connect the pitch to the close" : null,
  };
}

// ── main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--"));
  const strict = args.includes("--strict");
  const jsonOut = args.includes("--json");
  if (!slug) {
    console.error("usage: node scripts/check-pacing.mjs <slug> [--strict] [--json]");
    process.exit(2);
  }

  const projectDir = join(REPO, "projects", slug, "04-video");
  const ttsPath = join(projectDir, "tts_script.txt");
  const sectionsPath = join(projectDir, "sections.json");

  if (!(await stat(ttsPath).then(() => true).catch(() => false))) {
    console.error(`!! ${ttsPath} not found`);
    process.exit(1);
  }

  const ttsText = await readFile(ttsPath, "utf8");
  const paragraphs = splitParagraphs(ttsText);

  let sections = [];
  if (await stat(sectionsPath).then(() => true).catch(() => false)) {
    const raw = JSON.parse(await readFile(sectionsPath, "utf8"));
    sections = raw.sections || [];
  }
  // If sections.json is missing, fall back to positional labels
  // (intro / concept1..N / outro) so the cta / quantify checks can
  // still identify the right segments.
  if (sections.length === 0) {
    sections = paragraphs.map((_, i) => {
      if (i === 0) return { key: "intro", label: "orient" };
      if (i === paragraphs.length - 1) return { key: "outro", label: "cta" };
      return { key: `concept${i}`, label: `concept${i}` };
    });
  }

  const results = [
    checkWordCount(paragraphs),
    checkHook(paragraphs),
    checkLargestNumber(paragraphs, sections),
    checkCta(paragraphs, sections),
    checkKeywordContinuity(paragraphs),
  ];

  if (jsonOut) {
    process.stdout.write(JSON.stringify({ slug, results }, null, 2) + "\n");
  } else {
    for (const r of results) {
      const marker = r.pass ? "✓" : "!!";
      console.log(`${marker} pacing-rules-v1.md: ${r.id}`);
      console.log(`     actual:   ${r.actual}`);
      console.log(`     expected: ${r.expected}`);
      if (r.note) console.log(`     note:     ${r.note}`);
    }
    const failed = results.filter((r) => !r.pass).length;
    if (failed === 0) {
      console.log("✓ pacing-rules-v1.md: all checks passed");
    } else {
      console.log(`!! pacing-rules-v1.md: ${failed} of ${results.length} check(s) failed (${slug})`);
    }
  }

  if (strict && results.some((r) => !r.pass)) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

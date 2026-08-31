#!/usr/bin/env bash
# regen.sh — Regenerate the combined voiceover.mp3 from tts_script.txt
# (POSIX / Git Bash).
#
# Mirrors the per-project regen pattern. The single source of truth
# for the VO is tts_script.txt. This script wires the script into
# VibeVoice (1.5B, Paul voice), applies ffmpeg atempo=1.50, and
# writes .media/voiceover/voiceover.mp3.
#
# NOTE — AUDIO-ONLY PROJECT: this folder has no 04-video/index.html
# yet, so the SFX-inject step from templates/video/regen.sh.tpl is
# intentionally OMITTED. When a composition is added later, restore
# the inject block from the template (or copy it from
# projects/dollar-cost-averaging/04-video/regen.sh).
#
# Usage:   ./regen.sh
# Env:     VIBEVOICE_DIR      (default: D:/Projects/Compound-Lande/Voice-Over/VibeVoice)
#          TTS_VOICE          (default: Paul — VibeVoice speaker name;
#                             must match a file in $VIBEVOICE_DIR/demo/voices/)
#          TTS_BACKEND        (default: vibevoice — set to "kokoro" to fall
#                             back to the legacy `npx hyperframes tts` path
#                             using the old TTS_VOICE / TTS_SPEED env vars)
#          TTS_SPEED          (default: 1.50 — calibrated for 6-segment VibeVoice
#                             scripts to land at the 35-40s ceiling of
#                             pacing-rules-v1.md. With 5-6 VibeVoice segments
#                             each costing ~7-10s base, 1.20× under-runs at
#                             ~46s; 1.50× lands at ~37s.)
#
# Project: roth-limits-2026/reel-14 (04-video/, audio-only)

set -euo pipefail

cd "$(dirname "$0")"
# 04-video/ is at projects/{parent}/{slug}/04-video/, so repo root is
# 4 levels up. (reel-5 sits one folder deeper than the canonical DCA layout.)
REPO_ROOT="$(cd ../../../.. && pwd)"

# ── PACING-RULES-V1.MD VALIDATION (pre-render, non-blocking) ────────
# Check tts_script.txt against docs/pacing-rules-v1.md before calling
# VibeVoice. Surfaces word count, hook deadline, largest-number
# placement, CTA, and keyword continuity. Non-strict by default; the
# regen still produces a voiceover.mp3 if checks fail.
# 04-video/ lives at projects/{parent}/{slug}/04-video/. check-pacing
# expects "projects/{slug}/04-video/tts_script.txt", so the slug arg is
# the relative path from projects/ down to this folder.
SLUG="roth-limits-2026/reel-14"
echo "→ checking tts_script.txt against docs/pacing-rules-v1.md"
node "$REPO_ROOT/scripts/check-pacing.mjs" "$SLUG" || echo "  (validation failed but proceeding — pass --strict to fail builds)"

# ── CONFIG ───────────────────────────────────────────────────────────
BACKEND="${TTS_BACKEND:-vibevoice}"
VOICE="${TTS_VOICE:-Paul}"
# TTS_SPEED: ffmpeg atempo applied to the VibeVoice output. Default 1.50
# is calibrated for 6-segment VibeVoice scripts (~94-100 words). Each
# VibeVoice segment carries ~7-10s of base cost, so the per-word cost
# is dominated by segments, not by word count. Empirical ladder
# (Roth, 94-99 words, 5-6 segments):
#   1.20× → 46-47s (over 40s ceiling)
#   1.30× → 42-43s (still over)
#   1.40× → 40.1s (right at the ceiling)
#   1.50× → 37s ← current default (mid-range, well-paced)
# Valid range: 0.5–2.0 (single atempo filter); chain `atempo=A,atempo=B`
# for higher. Set TTS_SPEED=1.0 to disable speed-up entirely.
: "${TTS_SPEED:=1.50}"
: "${HYPERFRAMES_PYTHON:=C:\\Users\\plslv\\AppData\\Local\\Programs\\Python\\Python311\\python.exe}"
export HYPERFRAMES_PYTHON

mkdir -p .media/voiceover

# ── GENERATE VO ─────────────────────────────────────────────────────
if [ "$BACKEND" = "vibevoice" ]; then
  # VibeVoice (1.5B, local). Default install lives outside this repo at
  # D:/Projects/Compound-Lande/Voice-Over/VibeVoice — override with
  # VIBEVOICE_DIR if you move it.
  : "${VIBEVOICE_DIR:=D:/Projects/Compound-Lande/Voice-Over/VibeVoice}"
  VIBEVOICE_PY="$VIBEVOICE_DIR/.venv/Scripts/python.exe"
  if [ ! -x "$VIBEVOICE_PY" ]; then
    echo "!! VibeVoice venv not found at $VIBEVOICE_PY"
    echo "   Set VIBEVOICE_DIR or run \`uv sync\` inside VibeVoice."
    exit 1
  fi
  if [ ! -f "$VIBEVOICE_DIR/demo/voices/en-${VOICE}_man.wav" ] \
     && [ ! -f "$VIBEVOICE_DIR/demo/voices/en-${VOICE}_woman.wav" ]; then
    echo "!! Speaker '$VOICE' not found in $VIBEVOICE_DIR/demo/voices/"
    echo "   Available voices:"
    ls "$VIBEVOICE_DIR/demo/voices/" 2>/dev/null | sed 's/^/     /'
    exit 1
  fi
  # VibeVoice expects `Speaker N:` line prefixes; add `Speaker 1:` to every
  # non-empty line in the script so it parses as a single-speaker script.
  # NOTE: tts_script.txt must contain ONLY the spoken words. Comments
  # (`# intro`, audit checklists, etc.) become segments of dead air —
  # see script-notes.md and memory/vibevoice-segment-cost.md. Warn loudly
  # if any `#`-prefixed or comment-like lines are present so this isn't
  # silent.
  COMMENT_LINES=$(grep -cE '^\s*#' tts_script.txt || true)
  if [ "${COMMENT_LINES:-0}" -gt 0 ]; then
    echo "!! tts_script.txt contains $COMMENT_LINES comment line(s) — VibeVoice will treat each as a 'Speaker 1:' segment of dead air."
    echo "   Move editor's notes to script-notes.md and strip these from tts_script.txt."
    grep -nE '^\s*#' tts_script.txt | sed 's/^/     | /'
  fi
  TMP_SCRIPT="$(mktemp --suffix=.txt)"
  awk 'NF { print "Speaker 1: " $0 }' tts_script.txt > "$TMP_SCRIPT"
  echo "→ tts_script.txt (Paul via VibeVoice) → .media/voiceover/voiceover.mp3"
  # Run from inside VibeVoice so relative paths (model_path, voices/, etc.)
  # resolve correctly. The CLI writes <basename>_generated.wav into outputs/.
  (
    cd "$VIBEVOICE_DIR" && \
    PYTHONIOENCODING=utf-8 PYTHONUTF8=1 "$VIBEVOICE_PY" -X utf8 \
      demo/inference_from_file.py \
      --model_path vibevoice/VibeVoice-1.5B \
      --device cuda --dtype bfloat16 \
      --txt_path "$TMP_SCRIPT" \
      --speaker_names "$VOICE" \
      --output_dir outputs
  )
  rm -f "$TMP_SCRIPT"
  # VibeVoice writes WAV into $VIBEVOICE_DIR/outputs/. The basename
  # doesn't match our mktemp name (which is random), so pick the most
  # recent WAV in outputs/ — that's the one we just generated.
  GENERATED_WAV="$(ls -1t "$VIBEVOICE_DIR"/outputs/*_generated.wav 2>/dev/null | head -n 1)"
  if [ -z "$GENERATED_WAV" ] || [ ! -f "$GENERATED_WAV" ]; then
    echo "!! VibeVoice did not produce a WAV in $VIBEVOICE_DIR/outputs/"
    exit 1
  fi
  ffmpeg -y -loglevel error -i "$GENERATED_WAV" \
    -filter:a "atempo=$TTS_SPEED" -codec:a libmp3lame -qscale:a 4 \
    .media/voiceover/voiceover.mp3
else
  # Legacy Kokoro path (`npx hyperframes tts`). Kept for reference / fallback.
  # TTS_SPEED default is 1.30 (matches the VibeVoice/Paul default; the
  # Kokoro engine's --speed maps to the same playback-rate intent).
  : "${TTS_SPEED:-1.30}"
  echo "→ tts_script.txt (Kokoro $Voice) → .media/voiceover/voiceover.mp3"
  npx --yes hyperframes@0.8.11 tts tts_script.txt \
    --voice "$VOICE" --speed "$TTS_SPEED" \
    -o .media/voiceover/voiceover.mp3
fi

# ── REPORT VO ───────────────────────────────────────────────────────
echo
echo "✓ Generated .media/voiceover/voiceover.mp3"
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media/voiceover/voiceover.mp3 2>/dev/null || echo "?")
printf "  duration: %.2fs\n" "$DUR" 2>/dev/null || echo "  duration: $DUR"
echo "  (timing.mjs VO_DURATION = $(node --input-type=module -e "import('./timing.mjs').then(m => console.log(m.VO_DURATION))" 2>/dev/null || echo "?")s)"
echo "  if the two differ by more than 1s, trim the script or update VO_DURATION."

# ── SFX INJECT (intentionally skipped) ──────────────────────────────
# This project is audio-only — no 04-video/index.html to patch.
# When a composition is added, restore the inject block from
# templates/video/regen.sh.tpl (or copy from
# projects/dollar-cost-averaging/04-video/regen.sh).
echo
echo "→ SFX inject step skipped (no index.html in this audio-only project)"

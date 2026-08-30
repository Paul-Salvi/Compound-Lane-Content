#!/usr/bin/env bash
# regen.sh — Regenerate the combined voiceover.mp3 from tts_script.txt
# AND re-emit the declarative SFX <audio> block so timing cascades
# from this project's timing.mjs.
#
# Mirrors the per-project regen pattern. The single source of truth
# for the VO is tts_script.txt; the single source of truth for
# composition timing is ./timing.mjs (per-project copy of
# scripts/sound/timing.mjs). This script just wires the two together
# — the TTS CLI turns the script into audio, the inject step turns
# timing.mjs into the SFX block.
#
# Usage:   ./regen.sh
# Env:     VIBEVOICE_DIR      (default: D:/Projects/Compound-Lande/Voice-Over/VibeVoice)
#          TTS_VOICE          (default: Paul — VibeVoice speaker name;
#                             must match a file in $VIBEVOICE_DIR/demo/voices/)
#          TTS_BACKEND        (default: vibevoice — set to "kokoro" to fall
#                             back to the legacy `npx hyperframes tts` path
#                             using the old TTS_VOICE / TTS_SPEED env vars)
#
# Project: one-thousand-decision-tree (04-video composition)

set -euo pipefail

cd "$(dirname "$0")"
# 04-video/ is at projects/{slug}/04-video/, so repo root is 3 levels up.
# We don't actually need the repo root here — timing.mjs is per-project.

# ── CONFIG ───────────────────────────────────────────────────────────
BACKEND="${TTS_BACKEND:-vibevoice}"
VOICE="${TTS_VOICE:-Paul}"
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
    -codec:a libmp3lame -qscale:a 4 \
    .media/voiceover/voiceover.mp3
else
  # Legacy Kokoro path (`npx hyperframes tts`). Kept for reference / fallback.
  : "${TTS_SPEED:-0.97}"
  echo "→ tts_script.txt (Kokoro $VOICE) → .media/voiceover/voiceover.mp3"
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
echo "  if the two don't match, re-tune the script or update VO_DURATION."

# ── REGENERATE SFX FROM timing.mjs ──────────────────────────────────
# This closes the cascade: every change to FLASH_DURATION,
# FLASH_FADE, or COMPOSITION_DURATION in ./timing.mjs propagates
# into the inline <script> var declarations, the static
# data-duration / data-start attributes on the page-bg / vo / etc.
# tags, AND the declarative SFX <audio> cues.
# The inject step is invoked with the index.html path and reads
# ./timing.mjs relative to it (one-line patch in inject-static-sfx.mjs).
echo
echo "→ ./timing.mjs → index.html (SFX + timing patch)"
# 04-video/ is at projects/{slug}/04-video/, so the repo root is 3 levels up
# and scripts/sound/inject-static-sfx.mjs is at <repo>/scripts/sound/.
REPO_ROOT="$(cd ../../.. && pwd)"
node "$REPO_ROOT/scripts/sound/inject-static-sfx.mjs" "$PWD/index.html" || {
  echo "  !! inject-static-sfx.mjs failed — index.html may be inconsistent with the VO"; exit 1;
}

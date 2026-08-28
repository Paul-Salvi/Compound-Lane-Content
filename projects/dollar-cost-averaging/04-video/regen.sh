#!/usr/bin/env bash
# regen.sh — Regenerate the combined voiceover.mp3 from tts_script.txt.
#
# Mirrors 02-audio/regen.sh. The single source of truth is
# tts_script.txt in this folder. Lines starting with `#` are TTS
# comments and are auto-stripped by the CLI, so the file can keep
# its section headers for readability.
#
# Usage:   ./regen.sh
# Env:     HYPERFRAMES_PYTHON (defaults to Windows Python 3.11 path)
#          TTS_VOICE          (default: am_michael)
#          TTS_SPEED          (default: 1.3 — tuned for ~82s combined VO
#                             so the whiteboard reveal fits under 90s)

set -euo pipefail

cd "$(dirname "$0")"

# ── CONFIG ───────────────────────────────────────────────────────────
VOICE="${TTS_VOICE:-am_michael}"
SPEED="${TTS_SPEED:-1.3}"
: "${HYPERFRAMES_PYTHON:=C:\\Users\\plslv\\AppData\\Local\\Programs\\Python\\Python311\\python.exe}"
export HYPERFRAMES_PYTHON

mkdir -p .media/voiceover

# ── GENERATE ────────────────────────────────────────────────────────
echo "→ tts_script.txt → .media/voiceover/voiceover.mp3"
npx --yes hyperframes@0.8.11 tts tts_script.txt \
  --voice "$VOICE" --speed "$SPEED" \
  -o .media/voiceover/voiceover.mp3

# ── REPORT ─────────────────────────────────────────────────────────
echo
echo "✓ Generated .media/voiceover/voiceover.mp3"
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media/voiceover/voiceover.mp3 2>/dev/null || echo "?")
printf "  duration: %.2fs\n" "$DUR" 2>/dev/null || echo "  duration: $DUR"

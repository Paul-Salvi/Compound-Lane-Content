#!/usr/bin/env bash
# regen.sh — Regenerate the combined voiceover.mp3 from tts_script.txt
# AND re-emit the declarative SFX <audio> block so timing cascades
# from scripts/sound/timing.mjs.
#
# Mirrors 02-audio/regen.sh. The single source of truth for the VO
# is tts_script.txt; the single source of truth for composition
# timing is scripts/sound/timing.mjs. This script just wires the
# two together — the TTS CLI turns the script into audio, the
# inject step turns timing.mjs into the SFX block.
#
# Usage:   ./regen.sh
# Env:     HYPERFRAMES_PYTHON (defaults to Windows Python 3.11 path)
#          TTS_VOICE          (default: am_michael)
#          TTS_SPEED          (default: 0.97 — tuned to produce a
#                             106.4s voiceover that matches the
#                             schedule's VO_DURATION in timing.mjs)

set -euo pipefail

cd "$(dirname "$0")"
# 04-video/ is at projects/{slug}/04-video/, so repo root is 3 levels up
REPO_ROOT="$(cd ../../.. && pwd)"

# ── CONFIG ───────────────────────────────────────────────────────────
VOICE="${TTS_VOICE:-am_michael}"
SPEED="${TTS_SPEED:-0.97}"
: "${HYPERFRAMES_PYTHON:=C:\\Users\\plslv\\AppData\\Local\\Programs\\Python\\Python311\\python.exe}"
export HYPERFRAMES_PYTHON

mkdir -p .media/voiceover

# ── GENERATE VO ─────────────────────────────────────────────────────
echo "→ tts_script.txt → .media/voiceover/voiceover.mp3"
npx --yes hyperframes@0.8.11 tts tts_script.txt \
  --voice "$VOICE" --speed "$SPEED" \
  -o .media/voiceover/voiceover.mp3

# ── REPORT VO ───────────────────────────────────────────────────────
echo
echo "✓ Generated .media/voiceover/voiceover.mp3"
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media/voiceover/voiceover.mp3 2>/dev/null || echo "?")
printf "  duration: %.2fs\n" "$DUR" 2>/dev/null || echo "  duration: $DUR"

# ── REGENERATE SFX FROM timing.mjs ──────────────────────────────────
# This closes the cascade: every change to FLASH_DURATION,
# FLASH_FADE, or COMPOSITION_DURATION in scripts/sound/timing.mjs
# propagates into the inline <script> var declarations, the static
# data-duration / data-start attributes on the page-bg / vo / etc.
# tags, AND the 56 declarative SFX <audio> cues.
echo
echo "→ scripts/sound/timing.mjs → index.html (SFX + timing patch)"
node "$REPO_ROOT/scripts/sound/inject-static-sfx.mjs" "$PWD/index.html" || {
  echo "  !! inject-static-sfx.mjs failed — index.html may be inconsistent with the VO"; exit 1;
}

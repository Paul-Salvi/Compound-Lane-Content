# regen.ps1 — Regenerate the combined voiceover.mp3 from tts_script.txt
# AND re-emit the declarative SFX <audio> block so timing cascades from
# scripts/sound/timing.mjs (Windows PowerShell).
#
# Mirrors 02-audio/regen.sh. The single source of truth for the VO
# is tts_script.txt; the single source of truth for composition
# timing is scripts/sound/timing.mjs. This script just wires the
# two together — the TTS CLI turns the script into audio, the
# inject step turns timing.mjs into the SFX block.
#
# Usage:   .\regen.ps1
# Env:     TTS_VOICE  (default: am_michael)
#          TTS_SPEED  (default: 0.97 — tuned to produce a 106.4s
#                     voiceover that matches the schedule's
#                     VO_DURATION in scripts/sound/timing.mjs)

$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot
$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path

# ── CONFIG ───────────────────────────────────────────────────────────
$Voice = if ($env:TTS_VOICE) { $env:TTS_VOICE } else { 'am_michael' }
$Speed = if ($env:TTS_SPEED) { $env:TTS_SPEED } else { '0.97' }
$env:HYPERFRAMES_PYTHON = 'C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe'

New-Item -ItemType Directory -Force -Path .media\voiceover | Out-Null

# ── GENERATE VO ─────────────────────────────────────────────────────
Write-Host "→ tts_script.txt → .media\voiceover\voiceover.mp3"
npx --yes hyperframes@0.8.11 tts tts_script.txt --voice $Voice --speed $Speed -o .media\voiceover\voiceover.mp3 | Out-Null

# ── REPORT VO ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "✓ Generated .media\voiceover\voiceover.mp3"
$dur = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media\voiceover\voiceover.mp3 2>$null
if (-not $dur) { $dur = '?' }
Write-Host "  duration: $dur s"

# ── REGENERATE SFX FROM timing.mjs ──────────────────────────────────
# This closes the cascade: every change to FLASH_DURATION,
# FLASH_FADE, or COMPOSITION_DURATION in scripts/sound/timing.mjs
# propagates into the inline <script> var declarations, the static
# data-duration / data-start attributes on the page-bg / vo / etc.
# tags, AND the 56 declarative SFX <audio> cues.
Write-Host ""
Write-Host "→ scripts\sound\timing.mjs → index.html (SFX + timing patch)"
$inject = Join-Path $RepoRoot 'scripts\sound\inject-static-sfx.mjs'
node $inject "$PWD\index.html"
if ($LASTEXITCODE -ne 0) {
  Write-Error "  !! inject-static-sfx.mjs failed — index.html may be inconsistent with the VO"
  exit 1
}

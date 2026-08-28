# regen.ps1 — Regenerate the combined voiceover.mp3 from tts_script.txt (Windows PowerShell).
#
# Mirrors 02-audio/regen.sh. The single source of truth is
# tts_script.txt in this folder.
#
# Usage:   .\regen.ps1
# Env:     TTS_VOICE  (default: am_michael)
#          TTS_SPEED  (default: 1.3 — tuned for ~82s combined VO)

$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot

# ── CONFIG ───────────────────────────────────────────────────────────
$Voice = if ($env:TTS_VOICE) { $env:TTS_VOICE } else { 'am_michael' }
$Speed = if ($env:TTS_SPEED) { $env:TTS_SPEED } else { '1.3' }
$env:HYPERFRAMES_PYTHON = 'C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe'

New-Item -ItemType Directory -Force -Path .media\voiceover | Out-Null

# ── GENERATE ────────────────────────────────────────────────────────
Write-Host "→ tts_script.txt → .media\voiceover\voiceover.mp3"
npx --yes hyperframes@0.8.11 tts tts_script.txt --voice $Voice --speed $Speed -o .media\voiceover\voiceover.mp3 | Out-Null

# ── REPORT ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✓ Generated .media\voiceover\voiceover.mp3"
$dur = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media\voiceover\voiceover.mp3 2>$null
if (-not $dur) { $dur = '?' }
Write-Host "  duration: $dur s"

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
# Env:     VIBEVOICE_DIR  (default: D:\Projects\Compound-Lande\Voice-Over\VibeVoice)
#          TTS_VOICE      (default: Paul — VibeVoice speaker name;
#                          must match a file in $VIBEVOICE_DIR\demo\voices\)
#          TTS_BACKEND    (default: vibevoice — set to "kokoro" to fall
#                          back to the legacy `npx hyperframes tts` path
#                          using the old TTS_VOICE / TTS_SPEED env vars)

$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot
$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path

# ── CONFIG ───────────────────────────────────────────────────────────
$Backend = if ($env:TTS_BACKEND) { $env:TTS_BACKEND } else { 'vibevoice' }
$Voice = if ($env:TTS_VOICE) { $env:TTS_VOICE } else { 'Paul' }
$env:HYPERFRAMES_PYTHON = 'C:\Users\plslv\AppData\Local\Programs\Python\Python311\python.exe'

New-Item -ItemType Directory -Force -Path .media\voiceover | Out-Null

# ── GENERATE VO ─────────────────────────────────────────────────────
if ($Backend -eq 'vibevoice') {
  # VibeVoice (1.5B, local). Default install lives outside this repo at
  # D:\Projects\Compound-Lande\Voice-Over\VibeVoice — override with
  # VIBEVOICE_DIR if you move it.
  if ($env:VIBEVOICE_DIR) {
    $VibeVoiceDir = $env:VIBEVOICE_DIR
  } else {
    $VibeVoiceDir = 'D:\Projects\Compound-Lande\Voice-Over\VibeVoice'
  }
  $VibeVoicePy = Join-Path $VibeVoiceDir '.venv\Scripts\python.exe'
  if (-not (Test-Path $VibeVoicePy)) {
    Write-Error "!! VibeVoice venv not found at $VibeVoicePy`n   Set VIBEVOICE_DIR or run \`uv sync\` inside VibeVoice."
    exit 1
  }
  $voiceMan = Join-Path $VibeVoiceDir "demo\voices\en-${Voice}_man.wav"
  $voiceWoman = Join-Path $VibeVoiceDir "demo\voices\en-${Voice}_woman.wav"
  if (-not (Test-Path $voiceMan) -and -not (Test-Path $voiceWoman)) {
    Write-Error "!! Speaker '$Voice' not found in $VibeVoiceDir\demo\voices\`n   Available voices:"
    Get-ChildItem (Join-Path $VibeVoiceDir 'demo\voices') -Filter '*.wav' | ForEach-Object { Write-Error ("     " + $_.Name) }
    exit 1
  }
  # VibeVoice expects `Speaker N:` line prefixes; add `Speaker 1:` to every
  # non-empty line in the script so it parses as a single-speaker script.
  $tmpScript = [System.IO.Path]::GetTempFileName() + '.txt'
  $lines = Get-Content 'tts_script.txt'
  $sb = [System.Text.StringBuilder]::new()
  foreach ($line in $lines) {
    if ($line.Trim()) { [void]$sb.AppendLine("Speaker 1: $line") }
  }
  Set-Content -Path $tmpScript -Value $sb.ToString() -NoNewline
  Write-Host "→ tts_script.txt (Paul via VibeVoice) → .media\voiceover\voiceover.mp3"
  # Run from inside VibeVoice so relative paths (model_path, voices/, etc.)
  # resolve correctly.
  Push-Location $VibeVoiceDir
  try {
    $env:PYTHONIOENCODING = 'utf-8'
    $env:PYTHONUTF8 = '1'
    & $VibeVoicePy -X utf8 demo\inference_from_file.py `
      --model_path vibevoice/VibeVoice-1.5B `
      --device cuda --dtype bfloat16 `
      --txt_path $tmpScript `
      --speaker_names $Voice `
      --output_dir outputs | Out-Null
  } finally {
    Pop-Location
    Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue
  }
  # VibeVoice writes WAV; convert to MP3 for the project (smaller, same audio).
  $generatedWav = Get-ChildItem (Join-Path $VibeVoiceDir 'outputs') -Filter '*_generated.wav' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $generatedWav) {
    Write-Error "!! VibeVoice did not produce a WAV in $VibeVoiceDir\outputs\"
    exit 1
  }
  ffmpeg -y -loglevel error -i $generatedWav.FullName -codec:a libmp3lame -qscale:a 4 .media\voiceover\voiceover.mp3
} else {
  # Legacy Kokoro path (`npx hyperframes tts`). Kept for reference / fallback.
  $Speed = if ($env:TTS_SPEED) { $env:TTS_SPEED } else { '0.97' }
  Write-Host "→ tts_script.txt (Kokoro $Voice) → .media\voiceover\voiceover.mp3"
  npx --yes hyperframes@0.8.11 tts tts_script.txt --voice $Voice --speed $Speed -o .media\voiceover\voiceover.mp3 | Out-Null
}

# ── REPORT VO ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "✓ Generated .media\voiceover\voiceover.mp3"
$dur = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media\voiceover\voiceover.mp3 2>$null
if (-not $dur) { $dur = '?' }
Write-Host "  duration: $dur s"
$voDuration = Push-Location $RepoRoot; node --input-type=module -e "import('./scripts/sound/timing.mjs').then(m => console.log(m.VO_DURATION))" 2>$null; Pop-Location
$voDuration = $voDuration.Trim()
if (-not $voDuration) { $voDuration = '?' }
Write-Host "  (timing.mjs VO_DURATION = $voDuration s)"
Write-Host "  if the two don't match, re-tune the script or update VO_DURATION."

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

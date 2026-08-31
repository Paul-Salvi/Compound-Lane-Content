# regen.ps1 — Regenerate the combined voiceover.mp3 from tts_script.txt
# (Windows PowerShell).
#
# Mirrors the per-project regen pattern. The single source of truth
# for the VO is tts_script.txt. This script wires the script into
# VibeVoice (1.5B, Paul voice), applies ffmpeg atempo=1.30, and
# writes .media/voiceover/voiceover.mp3.
#
# NOTE — AUDIO-ONLY PROJECT: this folder has no 04-video/index.html
# yet, so the SFX-inject step from templates/video/regen.ps1.tpl is
# intentionally OMITTED. When a composition is added later, restore
# the inject block from the template (or copy it from
# projects/dollar-cost-averaging/04-video/regen.ps1).
#
# Usage:   .\regen.ps1
# Env:     VIBEVOICE_DIR  (default: D:\Projects\Compound-Lande\Voice-Over\VibeVoice)
#          TTS_VOICE      (default: Paul — VibeVoice speaker name;
#                          must match a file in $VIBEVOICE_DIR\demo\voices\)
#          TTS_BACKEND    (default: vibevoice — set to "kokoro" to fall
#                          back to the legacy `npx hyperframes tts` path
#                          using the old TTS_VOICE / TTS_SPEED env vars)
#          TTS_SPEED      (default: 1.20 — calibrated for ~93-word scripts to
#                          land at the 30s floor of pacing-rules-v1.md. Earlier
#                          default 1.30 was 4–5s under-floor on the Roth reel
#                          (32.0s → 25.5s); 1.20× measures 29.8s, 1.15× 27.3s.)
#
# Project: roth-ira-sp500 (04-video/, audio-only)

$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot
# 04-video/ is at projects/{slug}/04-video/, so repo root is 3 levels up.
# (Not strictly needed here — the audio-only project doesn't call
# scripts/sound/inject-static-sfx.mjs — but kept for future parity
# when index.html is added.)
$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path

# ── PACING-RULES-V1.MD VALIDATION (pre-render, non-blocking) ────────
# Check tts_script.txt against docs/pacing-rules-v1.md before calling
# VibeVoice. Surfaces word count, hook deadline, largest-number
# placement, CTA, and keyword continuity. Non-strict by default; the
# regen still produces a voiceover.mp3 if checks fail.
$Slug = Split-Path -Leaf (Split-Path -Parent $PSScriptRoot)
Write-Host "→ checking tts_script.txt against docs/pacing-rules-v1.md"
node "$RepoRoot/scripts/check-pacing.mjs" $Slug
if ($LASTEXITCODE -ne 0) {
  Write-Host "  (validation failed but proceeding — pass --strict to fail builds)"
}

# ── CONFIG ───────────────────────────────────────────────────────────
$Backend = if ($env:TTS_BACKEND) { $env:TTS_BACKEND } else { 'vibevoice' }
$Voice = if ($env:TTS_VOICE) { $env:TTS_VOICE } else { 'Paul' }
# TTS_SPEED: ffmpeg atempo applied to the VibeVoice output. Default 1.20
# is the empirical sweet spot for ~90-word scripts (lands at 30s — the floor
# of pacing-rules-v1.md). Measured ladder (Roth, 93 words, 6 segments):
#   1.15× → 27.3s (under floor)
#   1.20× → 29.8s ← current default (right at 30s floor)
#   1.30× → 25.5s (was the old default; over-fast for 30s target)
# Valid range: 0.5–2.0 (single atempo filter); chain `atempo=A,atempo=B`
# for higher. Set TTS_SPEED=1.0 to disable speed-up entirely.
$Speed = if ($env:TTS_SPEED) { $env:TTS_SPEED } else { '1.20' }
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
    Write-Error "!! VibeVoice venv not found at $VibeVoicePy`n   Set VIBEVOICE_DIR or run 'uv sync' inside VibeVoice."
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
  # NOTE: tts_script.txt must contain ONLY the spoken words. Comments
  # (`# intro`, audit checklists, etc.) become segments of dead air —
  # see script-notes.md and memory/vibevoice-segment-cost.md. Warn loudly
  # if any `#`-prefixed or comment-like lines are present so this isn't
  # silent.
  $lines = Get-Content 'tts_script.txt'
  $commentLines = $lines | Where-Object { $_.Trim() -match '^\s*#' }
  if ($commentLines) {
    Write-Warning "!! tts_script.txt contains $($commentLines.Count) comment line(s) — VibeVoice will treat each as a 'Speaker 1:' segment of dead air. Move editor's notes to script-notes.md and strip these from tts_script.txt."
    $commentLines | ForEach-Object { Write-Warning "     | $_" }
  }
  $tmpScript = [System.IO.Path]::GetTempFileName() + '.txt'
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
  ffmpeg -y -loglevel error -i $generatedWav.FullName -filter:a "atempo=$Speed" -codec:a libmp3lame -qscale:a 4 .media\voiceover\voiceover.mp3
} else {
  # Legacy Kokoro path (`npx hyperframes tts`). Kept for reference / fallback.
  # TTS_SPEED default is 1.30 (matches the VibeVoice/Paul default; the
  # Kokoro engine's --speed maps to the same playback-rate intent).
  $Speed = if ($env:TTS_SPEED) { $env:TTS_SPEED } else { '1.30' }
  Write-Host "→ tts_script.txt (Kokoro $Voice) → .media\voiceover\voiceover.mp3"
  npx --yes hyperframes@0.8.11 tts tts_script.txt --voice $Voice --speed $Speed -o .media\voiceover\voiceover.mp3 | Out-Null
}

# ── REPORT VO ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "✓ Generated .media\voiceover\voiceover.mp3"
$dur = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 .media\voiceover\voiceover.mp3 2>$null
if (-not $dur) { $dur = '?' }
Write-Host "  duration: $dur s"
$voDuration = node --input-type=module -e "import('./timing.mjs').then(m => console.log(m.VO_DURATION))" 2>$null
if ($voDuration) { $voDuration = $voDuration.Trim() } else { $voDuration = '?' }
Write-Host "  (timing.mjs VO_DURATION = $voDuration s)"
Write-Host "  if the two differ by more than 1s, trim the script or update VO_DURATION."

# ── SFX INJECT (intentionally skipped) ──────────────────────────────
# This project is audio-only — no 04-video\index.html to patch.
# When a composition is added, restore the inject block from
# templates/video/regen.ps1.tpl (or copy from
# projects/dollar-cost-averaging/04-video/regen.ps1).
Write-Host ""
Write-Host "→ SFX inject step skipped (no index.html in this audio-only project)"

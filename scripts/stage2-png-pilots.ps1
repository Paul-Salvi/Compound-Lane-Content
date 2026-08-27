# One-shot: render the 2 pilot PNGs that are still missing.
$root = "D:\Projects\Compound-Lande\Compound-Lane-Content\projects"
$pilotSlugs = @(
  "how-do-roth-ira-income-limits-work",
  "how-much-should-i-save-for-retirement"
)

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$tmpDir = Join-Path $env:TEMP ("edge-headless-pilot-" + (Get-Date -Format 'HHmmss'))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

function Wait-ForPng($path, $timeoutSec = 45) {
  $elapsed = 0
  while ($elapsed -lt $timeoutSec) {
    if (Test-Path $path) {
      $size1 = (Get-Item $path).Length
      Start-Sleep -Milliseconds 500
      $size2 = (Get-Item $path).Length
      if ($size1 -eq $size2 -and $size1 -gt 100000) { return $true }
    }
    Start-Sleep -Seconds 1
    $elapsed++
  }
  return $false
}

foreach ($s in $pilotSlugs) {
  $html = "$root\$s\02-visual\$s.html"
  $png  = "$root\$s\02-visual\$s.png"
  if (Test-Path $png) { Write-Host "[SKIP] $s (already has png)"; continue }
  $url = "file:///" + ($html -replace '\\', '/')
  Write-Host "[RENDER] $s"
  $proc = Start-Process -FilePath $edge `
    -ArgumentList @(
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=`"$tmpDir`"",
      "--window-size=1080,1920",
      "--screenshot=`"$png`"",
      $url
    ) -PassThru -WindowStyle Hidden
  $ok = Wait-ForPng -path $png -timeoutSec 45
  if (-not $proc.HasExited) {
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
  if ($ok) {
    Write-Host "  -> $png ($([math]::Round((Get-Item $png).Length/1KB,0)) KB)"
  } else {
    Write-Host "  !! FAILED: $s"
  }
}

Get-Process -Name msedge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "DONE"

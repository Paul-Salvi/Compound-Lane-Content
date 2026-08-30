# Stage 2 PNG generator: headless Edge screenshot of each {slug}.html to {slug}.png
# --headless=new writes the PNG asynchronously; we must wait for the file to exist
# after launching Edge, with a timeout, before moving on.

$root = "D:\Projects\Compound-Lande\Compound-Lane-Content\projects"
$slugs = @(
  "how-does-401k-vesting-work-if-i-leave-my-job",
  "how-much-does-a-1-percent-expense-ratio-cost-over-30-years",
  "how-to-invest-first-1000-index-funds",
  "how-to-open-a-roth-ira-step-by-step",
  "should-i-max-out-my-401k-or-invest-in-a-brokerage-account",
  "traditional-ira-vs-roth-ira-which-is-better-for-me",
  "what-happens-to-my-401k-when-i-change-jobs",
  "what-is-an-expense-ratio-and-how-does-it-eat-returns"
)

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$tmpDir = "D:\Users\plslv\AppData\Local\Temp\edge-headless-$(Get-Date -Format 'HHmmss')"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

function Wait-ForPng($path, $timeoutSec = 45) {
  $elapsed = 0
  while ($elapsed -lt $timeoutSec) {
    if (Test-Path $path) {
      # Also wait for the file to stop growing (Edge may still be flushing)
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

foreach ($s in $slugs) {
  $html = "$root\$s\02-visual\$s.html"
  $png  = "$root\$s\02-visual\$s.png"
  if (-not (Test-Path $html)) {
    Write-Host "[SKIP] $s (html missing)"
    continue
  }
  if (Test-Path $png) {
    $existing = (Get-Item $png).Length
    if ($existing -gt 100000) {
      Write-Host "[SKIP] $s (png already exists, $existing bytes)"
      continue
    }
  }

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
  # Edge may have already exited; that's fine — the file is on disk
  if (-not $proc.HasExited) {
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
  if ($ok) {
    $size = (Get-Item $png).Length
    Write-Host "  -> $png ($([math]::Round($size/1KB, 0)) KB)"
  } else {
    Write-Host "  !! FAILED: $s (no png after 45s)"
  }
}

# Cleanup
Get-Process -Name msedge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
Write-Host "DONE"

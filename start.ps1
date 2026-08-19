# Aakash Watch — start / stop / status helper
# Usage:
#   .\start.ps1            start both servers (kills stale ones on :8006 / :3006)
#   .\start.ps1 -Stop      stop both servers
#   .\start.ps1 -Status    show which ports are live
param(
  [switch]$Stop,
  [switch]$Status
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Get-PortPid([int]$Port) {
  try {
    (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1).OwningProcess
  } catch { $null }
}

function Stop-Port([int]$Port, [string]$Name) {
  $pidOnPort = Get-PortPid $Port
  if ($pidOnPort) {
    Stop-Process -Id $pidOnPort -Force -ErrorAction SilentlyContinue
    Write-Host "stopped $Name on :$Port (pid $pidOnPort)"
  } else {
    Write-Host "$Name :$Port already free"
  }
}

if ($Status) {
  $b = Get-PortPid 8006; $f = Get-PortPid 3006
  Write-Host ("backend  :8006  " + $(if ($b) { "UP  (pid $b)" } else { "DOWN" }))
  Write-Host ("frontend :3006  " + $(if ($f) { "UP  (pid $f)" } else { "DOWN" }))
  if ($b) { try { $h = Invoke-RestMethod -Uri 'http://localhost:8006/api/health' -TimeoutSec 3; Write-Host ("health: " + $h.status + " · " + $h.region) } catch { Write-Host 'health: unreachable' } }
  exit
}

if ($Stop) {
  Stop-Port 8006 'backend'
  Stop-Port 3006 'frontend'
  Write-Host 'Aakash Watch stopped.'
  exit
}

# ---- start ----
Stop-Port 8006 'backend'
Stop-Port 3006 'frontend'
Start-Sleep -Seconds 1

Write-Host 'starting backend (:8006)...'
Start-Process -FilePath (Join-Path $Backend '.venv\Scripts\python.exe') `
  -ArgumentList '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8006' `
  -WorkingDirectory $Backend -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir 'backend.log') `
  -RedirectStandardError (Join-Path $LogDir 'backend.err.log')

Write-Host 'starting frontend (:3006)...'
Start-Process -FilePath 'node.exe' `
  -ArgumentList 'node_modules\vite\bin\vite.js', '--port', '3006', '--strictPort' `
  -WorkingDirectory $Frontend -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir 'ui.log') `
  -RedirectStandardError (Join-Path $LogDir 'ui.err.log')

# ---- wait for health ----
$ok = $false
foreach ($i in 1..20) {
  Start-Sleep -Milliseconds 500
  if (Get-PortPid 8006) { $ok = $true; break }
}
if (-not $ok) {
  Write-Host 'ERROR: backend failed to start. See logs\backend.err.log' -ForegroundColor Red
  exit 1
}
$ok2 = $false
foreach ($i in 1..20) {
  Start-Sleep -Milliseconds 500
  if (Get-PortPid 3006) { $ok2 = $true; break }
}
if (-not $ok2) {
  Write-Host 'ERROR: frontend failed to start. See logs\ui.err.log' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host 'Aakash Watch is live:' -ForegroundColor Green
Write-Host '  UI   -> http://localhost:3006' -ForegroundColor Cyan
Write-Host '  API  -> http://localhost:8006' -ForegroundColor Cyan
Write-Host '(no API keys needed - all data is simulated locally)'
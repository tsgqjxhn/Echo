param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stdoutLog = Join-Path $projectRoot 'vite-hidden.log'
$stderrLog = Join-Path $projectRoot 'vite-hidden.err.log'

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if ($existing) {
  Write-Output "already-running:$($existing -join ',')"
  exit 0
}

if (Test-Path $stdoutLog) {
  Remove-Item -LiteralPath $stdoutLog -Force
}

if (Test-Path $stderrLog) {
  Remove-Item -LiteralPath $stderrLog -Force
}

$process = Start-Process `
  -FilePath 'npm.cmd' `
  -ArgumentList 'run', 'dev', '--', '--host', '0.0.0.0', '--port', $Port `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

Start-Sleep -Seconds 2

Write-Output "started:$($process.Id)"

$ErrorActionPreference = "Stop"

$base = "C:\Users\EricWeston\AppData\Roaming\io.github.clash-verge-rev.clash-verge-rev"
$backupZip = Join-Path $base "clash-verge-rev-backup\windows-backup-2026-03-30_21-15-22-auto-merge.zip"
$exePath = "C:\Program Files\Clash Verge\clash-verge.exe"
$serviceName = "clash_verge_service"

function Stop-ProcIfExists {
    param([string]$Name)
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        try {
            Stop-Process -Id $p.Id -Force -ErrorAction Stop
        } catch {
            Write-Host "无法结束进程 $Name ($($p.Id))：$($_.Exception.Message)"
        }
    }
}

if (-not (Test-Path -LiteralPath $backupZip)) {
    throw "未找到备份文件：$backupZip"
}

Write-Host "1/4 停止 Clash Verge 相关进程..."
try {
    sc.exe stop $serviceName | Out-Null
} catch {
    Write-Host "停止服务失败（可忽略，后续继续）：$($_.Exception.Message)"
}

Stop-ProcIfExists -Name "clash-verge"
Stop-ProcIfExists -Name "verge-mihomo"
Stop-ProcIfExists -Name "clash-verge-service"
Start-Sleep -Seconds 2

Write-Host "2/4 从备份恢复配置..."
$tmp = Join-Path $env:TEMP ("cvr_restore_" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
Expand-Archive -LiteralPath $backupZip -DestinationPath $tmp -Force

$restoreItems = @(
    "profiles",
    "profiles.yaml",
    "config.yaml",
    "verge.yaml",
    "dns_config.yaml"
)

foreach ($item in $restoreItems) {
    $src = Join-Path $tmp $item
    $dst = Join-Path $base $item
    if (-not (Test-Path -LiteralPath $src)) {
        continue
    }

    if (Test-Path -LiteralPath $dst) {
        Remove-Item -LiteralPath $dst -Recurse -Force
    }
    Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
}

Write-Host "3/4 关闭 Windows 系统代理..."
$reg = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
Set-ItemProperty -Path $reg -Name ProxyEnable -Type DWord -Value 0
Set-ItemProperty -Path $reg -Name ProxyServer -Value ""
Set-ItemProperty -Path $reg -Name AutoConfigURL -Value ""

Write-Host "4/4 启动 Clash Verge..."
try {
    sc.exe start $serviceName | Out-Null
} catch {
    Write-Host "启动服务失败（可忽略，UI 启动后一般会自动拉起）：$($_.Exception.Message)"
}

if (Test-Path -LiteralPath $exePath) {
    Start-Process -FilePath $exePath | Out-Null
}

$proxy = Get-ItemProperty -Path $reg
Write-Host ""
Write-Host "恢复完成。当前系统代理状态：ProxyEnable=$($proxy.ProxyEnable), ProxyServer='$($proxy.ProxyServer)'"

if (Test-Path -LiteralPath $tmp) {
    Remove-Item -LiteralPath $tmp -Recurse -Force
}

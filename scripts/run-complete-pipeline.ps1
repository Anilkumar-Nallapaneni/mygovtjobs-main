# Full RUN.md pipeline — ingest, PDF, details, feeds, export, verify
# Logs to logs/complete-pipeline-YYYY-MM-DD-HHmmss.log (one file per run)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path logs | Out-Null
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logStamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$log = Join-Path $root "logs\complete-pipeline-$logStamp.log"
$lock = Join-Path $root "logs\complete-pipeline.lock"
if (Test-Path $lock) {
    $lockPid = Get-Content $lock -ErrorAction SilentlyContinue
    $alive = $false
    if ($lockPid) {
        $alive = $null -ne (Get-Process -Id $lockPid -ErrorAction SilentlyContinue)
    }
    if ($alive) {
        Write-Host "Another pipeline is already running (PID $lockPid). Stop it first or wait for it to finish."
        Write-Host "Log: logs\complete-pipeline*.log"
        exit 1
    }
    Remove-Item $lock -Force -ErrorAction SilentlyContinue
}
Set-Content -Path $lock -Value $PID
try {
    "=== Complete pipeline started $ts ===" | Tee-Object -FilePath $log

    function Step($label, $cmd) {
        $now = Get-Date -Format "HH:mm:ss"
        "`n=== $label at $now ===" | Tee-Object -FilePath $log -Append
        Invoke-Expression $cmd 2>&1 | Tee-Object -FilePath $log -Append
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            "WARN: $label exited $LASTEXITCODE (continuing)" | Tee-Object -FilePath $log -Append
        }
    }

    Step "Agent 1 daily sync full force" "npm run daily:sync:full -- --force"
    Step "PDF backfill" "npm run pdf:backfill"
    Step "Agent 2 pdf read live" "npm run pdf:read:live"
    Step "Agent 3 job details all" "npm run job:details:all"
    Step "RSS feeds" "npm run fetch:official:feeds"
    Step "Official archives" "npm run build:official-archives"
    Step "Vacancy scrub" "npm run data:scrub-vacancies"
    Step "Rebuild live-jobs-list" "npm run build:live-jobs-list"
    Step "Sitemap" "npm run build:sitemap"
    Step "Verify snapshot" "npm run verify:live-jobs"
    Step "Jobs audit" "npm run jobs:audit"

    $done = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "`n=== Complete pipeline finished $done ===" | Tee-Object -FilePath $log -Append
    Write-Host "`nLog saved: $log"
}
finally {
    Remove-Item $lock -Force -ErrorAction SilentlyContinue
}

# Full RUN.md pipeline — ingest, PDF, details, feeds, export, verify
# Logs to logs/complete-pipeline.log
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path logs | Out-Null
$log = Join-Path $root "logs\complete-pipeline.log"
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"=== Complete pipeline started $ts ===" | Tee-Object -FilePath $log -Append

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

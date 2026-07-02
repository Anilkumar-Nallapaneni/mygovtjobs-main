$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path logs | Out-Null
$log = Join-Path $root "logs\remaining-pipeline.log"
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"=== Remaining pipeline started $ts ===" | Tee-Object -FilePath $log

function Step($label, $cmd) {
    $now = Get-Date -Format "HH:mm:ss"
    "`n=== $label at $now ===" | Tee-Object -FilePath $log -Append
    Invoke-Expression $cmd 2>&1 | Tee-Object -FilePath $log -Append
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        "WARN: $label exited $LASTEXITCODE (continuing)" | Tee-Object -FilePath $log -Append
    }
}

Step "RSS feeds rss-only" "npm run fetch:official:feeds -- --rss-only"
Step "Official archives" "npm run build:official-archives"
Step "Vacancy scrub" "npm run data:scrub-vacancies"
Step "Data scrub and export" "npm run data:scrub"
Step "Rebuild live-jobs-list" "npm run build:live-jobs-list"
Step "Sitemap" "npm run build:sitemap"
Step "Verify snapshot" "npm run verify:live-jobs"
Step "Jobs audit" "npm run jobs:audit"

$done = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"`n=== Remaining pipeline finished $done ===" | Tee-Object -FilePath $log -Append

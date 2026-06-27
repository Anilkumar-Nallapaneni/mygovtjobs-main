# Register Windows Task Scheduler — daily 8:00 AM India Standard Time
# Run once from repo root (PowerShell as Administrator):
#   cd E:\gov-job-alert-Govt-Jobs
#   .\scripts\schedule-daily-8am-windows.ps1
#
# Manual test: npm run daily:sync
# Force same-day re-run: npm run daily:sync -- --force

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TaskName = "MyGovtJobs-Daily-8AM-IST-Sync"
$LogDir = Join-Path $RepoRoot "logs"
$LogFile = Join-Path $LogDir "daily-sync.log"

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "Node.js not found. Install Node 18+ and add to PATH."
}

# Runs full pipeline: ingest → fetch:official → backfill PDFs → enrich → scrub → export
$Action = New-ScheduledTaskAction `
  -Execute $Node.Source `
  -Argument "scripts/run-python.mjs scripts/run-daily-8am-sync.py" `
  -WorkingDirectory $RepoRoot

# 8:00 AM local time — set PC time zone to (UTC+05:30) Chennai/Kolkata for true IST
$Trigger = New-ScheduledTaskTrigger -Daily -At "8:00AM"

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "My Govt Jobs: official India govt jobs sync once daily (8 AM IST)." `
  -Force | Out-Null

Write-Host "Registered scheduled task: $TaskName"
Write-Host "  Runs: node scripts/run-python.mjs scripts/run-daily-8am-sync.py"
Write-Host "  Repo: $RepoRoot"
Write-Host "  Log:  append to $LogFile (redirect in Task Scheduler if needed)"
Write-Host ""
Write-Host "Ensure backend/.env has DATABASE_URL and frontend/.env.local has VITE_SUPABASE_*"
Write-Host "Manual test now: npm run daily:sync"

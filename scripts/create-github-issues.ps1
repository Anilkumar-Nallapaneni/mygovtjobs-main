# Creates labels, milestones, and issues from docs/github-issues/issues.json
# Requires: GITHUB_TOKEN (classic PAT or fine-grained with Issues + Metadata write)
# Usage:
#   $env:GITHUB_TOKEN = "ghp_..."
#   .\scripts\create-github-issues.ps1
# Optional: -DryRun, -Repo "owner/repo" (default from git remote)

param(
    [switch]$DryRun,
    [string]$Repo = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$jsonPath = Join-Path $root "docs\github-issues\issues.json"
if (-not (Test-Path $jsonPath)) {
    throw "Missing $jsonPath — run from repo root."
}
$data = Get-Content $jsonPath -Raw | ConvertFrom-Json

if (-not $Repo) {
    $remote = git -C $root remote get-url origin 2>$null
    if ($remote -match "github\.com[:/](.+?)(?:\.git)?$") {
        $Repo = $Matches[1] -replace "\\", "/"
    } else {
        throw "Could not parse owner/repo from git remote. Pass -Repo owner/name"
    }
}

$token = $env:GITHUB_TOKEN
if (-not $token -and -not $DryRun) {
    throw "Set GITHUB_TOKEN (repo scope: issues, metadata)"
}

$headers = @{
    Authorization = "Bearer $token"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$base = "https://api.github.com/repos/$Repo"

function Invoke-GhApi {
    param([string]$Method, [string]$Uri, $Body = $null)
    if ($DryRun) {
        Write-Host "[dry-run] $Method $Uri" -ForegroundColor DarkGray
        return $null
    }
    $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
        $params.ContentType = "application/json"
    }
    return Invoke-RestMethod @params
}

Write-Host "Repository: $Repo" -ForegroundColor Cyan
Write-Host "Issues to create: $($data.issues.Count)" -ForegroundColor Cyan

foreach ($label in $data.labels) {
    try {
        Invoke-GhApi -Method POST -Uri "$base/labels" -Body @{
            name        = $label.name
            color       = $label.color
            description = $label.description
        } | Out-Null
        Write-Host "Label: $($label.name)" -ForegroundColor Green
    } catch {
        Write-Host "Label $($label.name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

$milestoneIds = @{}
foreach ($ms in $data.milestones) {
    try {
        $created = Invoke-GhApi -Method POST -Uri "$base/milestones" -Body @{
            title       = $ms.title
            description = $ms.description
            state       = "open"
        }
        if ($created) {
            $milestoneIds[$ms.title] = $created.number
            Write-Host "Milestone: $($ms.title) (#$($created.number))" -ForegroundColor Green
        }
    } catch {
        Write-Host "Milestone $($ms.title): $($_.Exception.Message)" -ForegroundColor Yellow
        if (-not $DryRun) {
            $existing = Invoke-RestMethod -Method GET -Uri "$base/milestones?state=open&per_page=100" -Headers $headers
            $match = $existing | Where-Object { $_.title -eq $ms.title } | Select-Object -First 1
            if ($match) { $milestoneIds[$ms.title] = $match.number }
        }
    }
}

$n = 0
foreach ($issue in $data.issues) {
    $n++
    $body = @{
        title  = $issue.title
        body   = $issue.body
        labels = @($issue.labels)
    }
    if ($issue.milestone -and $milestoneIds.ContainsKey($issue.milestone)) {
        $body.milestone = $milestoneIds[$issue.milestone]
    }
    try {
        $created = Invoke-GhApi -Method POST -Uri "$base/issues" -Body $body
        if ($created) {
            Write-Host "[$n/$($data.issues.Count)] #$($created.number) $($issue.title)" -ForegroundColor Green
        }
    } catch {
        Write-Host "[$n] FAILED: $($issue.title) — $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 300
}

Write-Host "`nDone. Open: https://github.com/$Repo/issues" -ForegroundColor Cyan

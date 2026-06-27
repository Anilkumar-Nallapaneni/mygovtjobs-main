# My Govt Jobs - one-time Windows setup (Node, Python, deps, env templates)
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "=== My Govt Jobs - Windows setup ===" -ForegroundColor Cyan
Write-Host "Repo: $Root"
Write-Host ""

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

function Require-Command($name, $installHint) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Host "MISSING: $name" -ForegroundColor Red
        Write-Host "  $installHint" -ForegroundColor Yellow
        return $false
    }
    Write-Host "OK  $name -> $($cmd.Source)" -ForegroundColor Green
    return $true
}

# --- 1. Check / install prerequisites ---
Refresh-Path

$hasNode = Require-Command "node" "Install Node.js LTS: winget install OpenJS.NodeJS.LTS"
$hasNpm = Require-Command "npm" "Comes with Node.js"
$hasPy = (Require-Command "py" "Install Python: winget install Python.Python.3.12") -or (Require-Command "python" "Install Python: winget install Python.Python.3.12")

if (-not ($hasNode -and $hasNpm)) {
    Write-Host ""
    Write-Host "Install Node.js, close this terminal, open a NEW terminal, then re-run this script." -ForegroundColor Yellow
    exit 1
}

if (-not $hasPy) {
    Write-Host ""
    Write-Host "Install Python 3.12, close this terminal, open a NEW terminal, then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Prefer py launcher on Windows
$Python = if (Get-Command py -ErrorAction SilentlyContinue) { "py -3.12" } else { "python" }

Write-Host ""
Write-Host "--- Node version ---" -ForegroundColor Cyan
node --version
npm --version

Write-Host ""
Write-Host "--- Python version ---" -ForegroundColor Cyan
Invoke-Expression "$Python --version"

# --- 2. npm install (root + frontend workspace) ---
Write-Host ""
Write-Host "--- npm install (root + frontend) ---" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

# --- 3. Backend Python venv ---
Write-Host ""
Write-Host "--- Backend Python venv ---" -ForegroundColor Cyan
$venv = Join-Path $Root "backend\.venv"
if (-not (Test-Path $venv)) {
    Invoke-Expression "$Python -m venv `"$venv`""
}
& "$venv\Scripts\python.exe" -m pip install --upgrade pip -q
& "$venv\Scripts\pip.exe" install -r backend\requirements.txt
if ($LASTEXITCODE -ne 0) { throw "backend pip install failed" }

# --- 4. Env file templates ---
Write-Host ""
Write-Host "--- Environment files ---" -ForegroundColor Cyan
$frontendEnv = Join-Path $Root "frontend\.env.local"
$backendEnv = Join-Path $Root "backend\.env"

if (-not (Test-Path $frontendEnv)) {
    Copy-Item (Join-Path $Root "frontend\.env.example") $frontendEnv
    Write-Host "Created frontend\.env.local (edit Supabase keys)" -ForegroundColor Green
} else {
    Write-Host "frontend\.env.local already exists" -ForegroundColor DarkGray
}

if (-not (Test-Path $backendEnv)) {
    Copy-Item (Join-Path $Root "backend\.env.example") $backendEnv
    Write-Host "Created backend\.env (edit DATABASE_URL + keys)" -ForegroundColor Green
} else {
    Write-Host "backend\.env already exists" -ForegroundColor DarkGray
}

# --- 5. Summary ---
Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Project structure:" -ForegroundColor Cyan
Write-Host "  frontend/              Main portal UI (Vite + React)     -> npm run dev (:2222)"
Write-Host "  backend/               FastAPI + Supabase                -> npm run api:dev (:8000)"
Write-Host "  scripts/               Ingest, sync, audit helpers"
Write-Host "  database/              Supabase SQL setup + migrations"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host '  1. Edit frontend\.env.local  (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)'
Write-Host '  2. Edit backend\.env         (DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY)'
Write-Host "  3. Run SQL in Supabase: database\supabase_setup.sql + migrations\002_*.sql"
Write-Host "  4. Terminal A: npm run dev"
Write-Host "  5. Terminal B: npm run api:dev   (optional if VITE_JOBS_SOURCE=supabase)"
Write-Host ""

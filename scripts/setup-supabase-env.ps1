# My Govt Jobs — helper to create frontend/.env.local and backend/.env
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/setup-supabase-env.ps1

$root = Split-Path -Parent $PSScriptRoot
$frontendEnv = Join-Path $root "frontend\.env.local"
$backendEnv = Join-Path $root "backend\.env"

Write-Host ""
Write-Host "=== My Govt Jobs Supabase setup ===" -ForegroundColor Cyan
Write-Host "Schema file: database\supabase_setup.sql" -ForegroundColor Yellow
Write-Host "Paste that file in Supabase → SQL Editor → Run" -ForegroundColor Yellow
Write-Host ""

$supabaseUrl = Read-Host "Supabase Project URL (e.g. https://xxxxx.supabase.co)"
$anonKey = Read-Host "Supabase anon public key"
$dbUrl = Read-Host "Supabase DATABASE_URL (postgresql://... pooler URI)"
$adminKey = Read-Host "ADMIN_API_KEY (any long random string)"

if ($dbUrl -notmatch "asyncpg") {
  $dbUrl = $dbUrl -replace "^postgresql://", "postgresql+asyncpg://"
}

@"
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$anonKey
VITE_API_URL=
"@ | Set-Content -Path $frontendEnv -Encoding UTF8

@"
DATABASE_URL=$dbUrl
SUPABASE_URL=$supabaseUrl
SUPABASE_SERVICE_ROLE_KEY=PASTE_SERVICE_ROLE_KEY_HERE
ADMIN_API_KEY=$adminKey
CORS_ORIGINS=http://localhost:2222,http://localhost:2223,http://127.0.0.1:2222
SQL_ECHO=0
"@ | Set-Content -Path $backendEnv -Encoding UTF8

Write-Host ""
Write-Host "Created: frontend\.env.local" -ForegroundColor Green
Write-Host "Created: backend\.env (add SUPABASE_SERVICE_ROLE_KEY from dashboard)" -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  1. npm run dev"
Write-Host "  2. cd backend && .venv\Scripts\activate && pip install -r requirements.txt"
Write-Host "  3. uvicorn app.main:app --reload --port 8000"
Write-Host "  4. curl -X POST http://localhost:8000/api/ingest/run-all?sync=true -H `"X-Admin-Key: $adminKey`""

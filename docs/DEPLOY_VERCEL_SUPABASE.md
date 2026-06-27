# Deploy My Govt Jobs on Vercel + Supabase

This guide connects your **Supabase** database to the **Vercel** frontend so production loads live jobs from Postgres.

## Architecture (production)

```
Browser (Vercel CDN)
    │
    ├─► Supabase REST (anon key) ──► jobs table (RLS: live rows only)
    │
    └─► Optional: FastAPI backend (Railway/Render/Fly) if VITE_API_URL is set
```

For **frontend-only on Vercel**, use `VITE_JOBS_SOURCE=supabase` (no backend required).

**Full production (admin + API):** see **[GO_LIVE.md](./GO_LIVE.md)** — Railway backend, GA4, Search Console.

---

## Part 1 — Supabase (one-time)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Schema** — from repo root with `backend/.env` set:
   ```bash
   npm run db:migrate
   ```
   (applies `supabase_setup.sql` + migrations `001`–`012`, including FTS, profiles, storage, monetization, title dedupe)
3. **Project Settings → API** — copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY` (never use `service_role` in Vercel)
4. **Project Settings → Database** — copy **Transaction pooler** URI for local/backend ingest (`DATABASE_URL` with `postgresql+asyncpg://`).

Ingest jobs from your machine (not from Vercel):

```bash
npm run supabase:sync-sources
npm run supabase:full-sync
# or: npm run ingest:direct
```

---

## Part 2 — Vercel project

### Option A — Dashboard (recommended)

1. [vercel.com/new](https://vercel.com/new) → Import your Git repo.
2. **Root Directory:** leave as repo root (uses `/vercel.json`).
3. **Framework Preset:** Vite (auto-detected).
4. **Environment variables** (Production + Preview):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key from Supabase |
| `VITE_JOBS_SOURCE` | `supabase` |
| `VITE_API_URL` | leave **empty** unless you host the FastAPI backend |

5. Deploy.

### Option B — Supabase ↔ Vercel integration

1. Vercel Dashboard → **Integrations** → **Supabase** → Add.
2. Link the same Supabase project — Vercel can inject `SUPABASE_URL` and keys.
3. Map or add Vite names manually (integration often sets `NEXT_PUBLIC_*`; this app needs `VITE_*`):

```bash
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
```

4. Set `VITE_JOBS_SOURCE=supabase` yourself.

### Option C — CLI (from repo root)

```bash
vercel login
vercel link
npm run vercel:env:push
vercel --prod
```

---

## Part 3 — Verify production

1. Open your `*.vercel.app` URL.
2. Browser DevTools → Network — requests to `https://YOUR_REF.supabase.co/rest/v1/jobs`.
3. Job grid should show DB rows (not only demo data).
4. From repo: `npm run supabase:test` (uses `frontend/.env.local`).

---

## Optional — Backend API on another host

If you deploy FastAPI (`backend/`) to Railway, Render, or Fly:

| Vercel env | Example |
|------------|---------|
| `VITE_API_URL` | `https://your-api.example.com` |
| `VITE_JOBS_SOURCE` | `api` |

Set `CORS_ORIGINS` on the backend to include your Vercel domain, e.g. `https://mygovtjobs.vercel.app`.

---

## GitHub Actions secrets (scheduled ingest)

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Supabase pooler for Python ingest |
| `VITE_SUPABASE_URL` | Audit workflow |
| `VITE_SUPABASE_ANON_KEY` | Audit workflow |

See `.github/workflows/supabase-auto-ingest.yml`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Site loads but no jobs | Set `VITE_JOBS_SOURCE=supabase` and redeploy; confirm RLS on `jobs` |
| `401` on Supabase REST | Wrong anon key or migration `002` not applied |
| Still demo jobs only | `VITE_JOBS_SOURCE=static` or missing env vars — rebuild after fixing |
| CORS errors to API | Use `supabase` mode or set `VITE_API_URL` + backend `CORS_ORIGINS` |

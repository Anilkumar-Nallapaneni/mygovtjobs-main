# Go live — full production checklist

Everything needed to run **govtjobs.me** with live jobs, admin API, analytics, and Google Search Console.

## What runs where

| Piece | Host | URL |
|-------|------|-----|
| React frontend | **Vercel** | https://www.livegovtjobs.com |
| Postgres + REST | **Supabase** | (behind the scenes) |
| FastAPI admin/ingest | **Railway** or **Render** | https://api.livegovtjobs.com |
| Daily job sync | **GitHub Actions** | (scheduled, no URL) |
| Traffic analytics | **GA4** | (script on Vercel site) |
| Search indexing | **Google Search Console** | (you submit sitemap manually) |

---

## Step 1 — Supabase (already done if jobs load)

```bash
npm run supabase:test
npm run supabase:audit
```

If empty: `npm run supabase:full-sync`

---

## Step 2 — Secure admin key

```bash
npm run admin:key:generate
```

Copy the output into:
- `backend/.env` → `ADMIN_API_KEY=...`
- Railway/Render env vars (Step 3)

Never use `change-me-in-production` in production.

---

## Step 3 — Deploy backend (Railway recommended)

### Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select this repo. Railway reads `railway.toml` and `backend/Dockerfile`.
3. **Variables** → add (copy from `backend/.env`):

| Variable | Value |
|----------|--------|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Supabase **Transaction pooler** (`postgresql+asyncpg://...@...pooler...:6543/postgres`) |
| `SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase Dashboard → API |
| `ADMIN_API_KEY` | from Step 2 |
| `CORS_ORIGINS` | `https://www.livegovtjobs.com,https://www.livegovtjobs.com` |
| `ALLOW_INSECURE_ADMIN` | `0` |
| `ALLOW_FALLBACK_JSON_EXPORT` | `0` |
| `PDF_OCR_ENABLED` | `0` (Tesseract in Docker image; enable only for PDF ingest workloads) |

Do **not** set `DATABASE_SSL_INSECURE` on Railway.

4. **Settings → Networking → Generate Domain** (e.g. `mygovtjobs-api.up.railway.app`).
5. **Custom domain:** add `api.govtjobs.me` → Railway shows a CNAME target.
6. At your domain registrar (where `govtjobs.me` DNS lives), add:

```
Type: CNAME
Name: api
Value: <railway-provided-hostname>
```

7. Wait for TLS (~5–15 min), then test:

```bash
curl https://api.livegovtjobs.com/health
```

Expect: `{"status":"ok","database":{"connected":true}}`

### Render (alternative)

1. [render.com](https://render.com) → **New → Blueprint** → connect repo (`render.yaml`).
2. Set sync=false secrets in dashboard (same table as above).
3. Custom domain `api.govtjobs.me` → follow Render DNS instructions.

---

## Step 4 — Vercel frontend (production env)

After `api.govtjobs.me` responds on `/health`:

```bash
# Optional: add to frontend/.env.local first
# VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

npm run vercel:env:push:live
npm run vercel:deploy
```

`vercel:env:push:live` sets:

| Variable | Production value |
|----------|------------------|
| `VITE_JOBS_SOURCE` | `supabase` |
| `VITE_API_URL` | `https://api.livegovtjobs.com` |
| `VITE_SITE_URL` | `https://www.livegovtjobs.com` |
| `VITE_GA_MEASUREMENT_ID` | from `.env.local` if set |

---

## Step 5 — Google Analytics 4

1. [analytics.google.com](https://analytics.google.com) → **Admin** → **Create property** → **Web stream**.
2. URL: `https://www.livegovtjobs.com`
3. Copy **Measurement ID** (`G-XXXXXXXXXX`).
4. Add to `frontend/.env.local`:

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

5. Push and redeploy:

```bash
npm run vercel:env:push:live
npm run vercel:deploy
```

6. GA4 → **Reports → Realtime** — open govtjobs.me in another tab to confirm hits.

---

## Step 6 — Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console)
2. **Add property** → URL prefix `https://www.livegovtjobs.com` (or Domain property).
3. Verify via DNS TXT or HTML tag (Vercel can serve verification file in `frontend/public/`).
4. **Sitemaps** → submit:

```
https://www.livegovtjobs.com/sitemap.xml
```

Sitemap is rebuilt on each `npm run build` (1456+ job URLs).

---

## Step 7 — Verify everything

```bash
npm run go-live:check
```

Manual checks:

| URL | Expected |
|-----|----------|
| https://www.livegovtjobs.com | Job listings load |
| https://www.livegovtjobs.com/admin | Admin dashboard (enter `ADMIN_API_KEY`) |
| https://api.livegovtjobs.com/health | `"status":"ok"` |
| https://www.livegovtjobs.com/sitemap.xml | XML with job URLs |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Admin page says “Set VITE_API_URL” | Run `vercel:env:push:live` + redeploy |
| Admin 401 / CORS error | Match `ADMIN_API_KEY`; set `CORS_ORIGINS` on Railway |
| API health `degraded` | Wrong `DATABASE_URL` or pooler password |
| No GA data | `VITE_GA_MEASUREMENT_ID` missing on Vercel; redeploy after push |
| Google not indexing | Submit sitemap in Search Console; wait 1–7 days |

---

## Quick command reference

```bash
npm run go-live:check          # full preflight
npm run admin:key:generate     # new admin secret
npm run vercel:env:push:live   # production Vercel env
npm run vercel:deploy          # deploy frontend
npm run daily:sync             # manual ingest (GitHub Actions also runs daily)
```

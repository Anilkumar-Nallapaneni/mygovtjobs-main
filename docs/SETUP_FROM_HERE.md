# Setup from here — GitHub + Supabase + Vercel only

You already have the live site. Follow these steps **in order**. Use **Gmail** for all Google tools — **not** `contact@livegovtjobs.com`.

---

## Step 1 — Confirm site works (1 minute)

Open **https://www.livegovtjobs.com** — you should see job listings.

---

## Step 2 — Auto daily job updates (10 minutes)

### Option A — automatic (recommended)

```powershell
cd c:\Users\ADMIN\Downloads\mygovtjobs-main
winget install GitHub.cli
gh auth login
npm run github:secrets:push
```

Linux/macOS local env setup:

```bash
DATABASE_URL='postgresql+asyncpg://...' \
VITE_SUPABASE_URL='https://YOUR_REF.supabase.co' \
VITE_SUPABASE_ANON_KEY='YOUR_ANON_PUBLIC_KEY' \
npm run setup:supabase-env
```

Then: **GitHub.com** → your repo → **Actions** → **Supabase auto ingest** → **Run workflow**.

### Option B — manual in GitHub website

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets from your local files:

| Secret | Copy from |
|--------|-----------|
| `DATABASE_URL` | `backend/.env` |
| `VITE_SUPABASE_URL` | `frontend/.env.local` |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` (optional for daily ingest; required for weekly PDF detail uploads) |

3. **Actions** → run **Supabase auto ingest** once.

---

## Step 3 — Google Search Console (15 minutes)

### 3a — Sign in with Gmail

1. Open **https://accounts.google.com**
2. Sign in with **yourname@gmail.com** (create one if needed)
3. **Do not** use `contact@livegovtjobs.com` — it is not a Google account

### 3b — Add your website

1. **https://search.google.com/search-console**
2. **Add property** → **URL prefix** → `https://www.livegovtjobs.com`
3. Choose **HTML tag** verification
4. Google shows something like:
   ```html
   <meta name="google-site-verification" content="abc123xyz" />
   ```
5. Copy only the **content** value (`abc123xyz`)

### 3c — Add token to project and deploy

```powershell
cd c:\Users\ADMIN\Downloads\mygovtjobs-main
npm run google:verify -- abc123xyz
npm run vercel:env:push:live
npm run vercel:deploy
```

### 3d — Verify in Search Console

1. Back in Search Console → click **Verify**
2. Should show success ✅

### 3e — Submit sitemap

1. Search Console → **Sitemaps**
2. Enter: `sitemap.xml`
3. **Submit**

---

## Step 4 — Google Analytics (10 minutes, optional)

1. **https://analytics.google.com** (same Gmail)
2. **Admin** → **Create property** → Website URL: `https://www.livegovtjobs.com`
3. Copy **Measurement ID** (`G-XXXXXXXXXX`)
4. Add to `frontend/.env.local`:
   ```env
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
5. Deploy:
   ```powershell
   npm run vercel:env:push:live
   npm run vercel:deploy
   ```
6. **Reports → Realtime** — visit govtjobs.me to see yourself

---

## Step 5 — contact@livegovtjobs.com (optional, later)

| What | Answer |
|------|--------|
| For Google login? | **No** — use Gmail |
| On contact page? | **Yes** — already updated |
| Receive emails there? | Need email hosting (see below) |

**Free option — forward to your Gmail:**

1. Move DNS to **Cloudflare** (or use Cloudflare Email Routing if DNS is there)
2. **Email Routing** → create `contact@livegovtjobs.com` → forward to your Gmail

**Or use Zoho Mail** (free tier) for `contact@livegovtjobs.com`.

Until then, the email on the site is for display; mail won't arrive until you set up forwarding.

---

## One command setup (after Step 3c tokens are in .env.local)

```powershell
npm run setup:production
npm run vercel:deploy
```

---

## What you do NOT need

- ❌ Railway (paid)
- ❌ `contact@livegovtjobs.com` for Google sign-in
- ❌ Backend hosting (GitHub Actions syncs jobs)

---

## Quick reference

| Task | Command |
|------|---------|
| Push GitHub secrets | `npm run github:secrets:push` |
| Google verify token | `npm run google:verify -- TOKEN` |
| Push Vercel env | `npm run vercel:env:push:live` |
| Deploy site | `npm run vercel:deploy` |
| Full preflight | `npm run go-live:check` |

---

## Stuck?

| Problem | Fix |
|---------|-----|
| Google "Couldn't find account" | Use **Gmail**, not contact@livegovtjobs.com |
| Verify fails | Redeploy after `google:verify`, wait 2 min, retry |
| No new jobs | Fix GitHub secrets, run ingest workflow |
| GA no data | Add G- ID to `.env.local`, push env, redeploy |

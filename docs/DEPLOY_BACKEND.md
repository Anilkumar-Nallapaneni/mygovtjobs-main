# Backend Deploy (Render or Railway)

The FastAPI backend is optional for the public site (Vercel serves the static SPA
+ reads Supabase directly). Deploy it when you need:

- Contact form submissions (`POST /api/contact`)
- Signed unsubscribe tokens for one-click email unsubscribe
- Razorpay premium checkout
- Admin ingest triggers via HTTP
- Full-text `/api/jobs` for the `VITE_JOBS_SOURCE=api` mode

## Option A — Render (Blueprint)

1. Push repo to GitHub.
2. [render.com/dashboard](https://dashboard.render.com/) → **New → Blueprint** → connect repo.
3. Render reads `render.yaml` and provisions `mygovtjobs-api`.
4. Fill the `sync: false` secrets in **Environment**:
   - `SUPABASE_URL` — `https://<ref>.supabase.co`
   - `DATABASE_URL` — Supabase **Transaction pooler** URI (port **6543**, prefix `postgresql+asyncpg://`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_API_KEY` — long random string, share with GitHub Actions secrets
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (if using premium)
   - `RESEND_API_KEY` (email alerts)
   - `PUSH_WEBHOOK_URL` (optional — bridge for `useWebPushToken`)
   - `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile, matches `VITE_TURNSTILE_SITE_KEY` on frontend)
5. Wait for deploy → `https://mygovtjobs-api.onrender.com/health` returns `{status: "ok"}`.
6. Add custom domain: **Settings → Custom Domain → api.livegovtjobs.com**.
7. Set frontend `VITE_API_URL=https://api.livegovtjobs.com` in Vercel env, redeploy.

## Option B — Railway

1. [railway.app](https://railway.app/) → **New Project → Deploy from GitHub**.
2. Railway auto-detects Dockerfile at `backend/Dockerfile`.
3. Set the same environment variables listed above.
4. Add custom domain in **Settings → Networking**.

## Post-deploy verification

```bash
# Public
curl https://api.livegovtjobs.com/health
curl https://api.livegovtjobs.com/api/jobs?limit=1

# Admin (needs ADMIN_API_KEY)
curl -H "X-Admin-Key: $ADMIN_API_KEY" https://api.livegovtjobs.com/api/admin/stats
```

## CORS

The `CORS_ORIGINS` env var must include every frontend origin you use. Default in
`render.yaml`:

```
https://www.livegovtjobs.com,https://livegovtjobs.com,https://www.govtjobs.me,https://govtjobs.me
```

Add your Vercel preview URLs and local dev origins when needed.

## Rate limiting

Without `REDIS_URL`, the backend uses an in-process rate limiter — fine for a
single container. When scaling to multiple replicas, set `REDIS_URL` to a
managed Redis instance (Render Key-Value, Upstash free tier, etc.).

## Signed unsubscribe tokens

If you serve email alerts, generate a per-subscription signed token with
`ADMIN_API_KEY` as the HMAC secret and encode it into the unsubscribe URL. The
frontend `/alerts` page already handles the query param — backend just needs to
verify + delete the subscription.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 502 on Render | Check Docker build logs; verify `PORT` env is set (Render sets it automatically) |
| CORS blocked in browser | Add missing origin to `CORS_ORIGINS`, redeploy |
| Rate limiter warns "using in-process" | Set `REDIS_URL` |
| Razorpay 401 | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` mismatch — check Razorpay dashboard |
| Email alerts silent | `RESEND_API_KEY` unset or invalid; check `POST /api/admin/alerts/deliver` logs |

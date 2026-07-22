# Manual ops checklist (cannot be finished from code alone)

Status as of **2026-07-22** (full audit). Dashboard items **1** and **5** still need you. Also see **ops P0** below (code/agent can help).

| # | Task | Where | Status (2026-07-22) |
|---|------|--------|---------------------|
| 1 | Submit sitemap | [Google Search Console](https://search.google.com/search-console) → Sitemaps → enter `sitemap.xml` | ⏳ **You** — asset live: `https://www.livegovtjobs.com/sitemap.xml` → HTTP 200 |
| 2 | Site verification | Vercel env `VITE_GOOGLE_SITE_VERIFICATION` + GSC HTML tag | ✅ Done — meta live on prod |
| 3 | Alert email delivery | GitHub Actions secrets: `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `ALERT_SITE_URL` | ✅ Secrets set — still need one real subscribe + inbox test |
| 4 | Telegram alerts (optional) | `TELEGRAM_BOT_TOKEN` + numeric chat IDs | ➖ Optional |
| 5 | Leaked-password protection | [Supabase → Auth → Password security](https://supabase.com/dashboard/project/lqihbxujvvvzagrfoorf/auth/providers) → enable HaveIBeenPwned | ⏳ **You** — no API/MCP toggle |
| 6 | API host (optional) | Deploy backend + DNS `api.livegovtjobs.com` | ➖ Optional — `/health` unreachable; browse uses static + Supabase |
| 7 | Turnstile (if forms blocked) | Cloudflare + Turnstile keys | ➖ Not needed |

### Ops P0 (from 22 Jul audit — not dashboard-only)

| # | Task | Status |
|---|------|--------|
| A | Get a vacancy-valid `live-jobs.json` onto `main` so Vercel production builds succeed again | ⏳ Re-run ingest / export |
| B | Fix RSS vs daily-ingest race on `official-archives/*` (Jul 22 push failed) | ⏳ Code / workflow |
| C | Restore live `content_sections` (≈ 0% now) via weekly enrich / `pdf:read:live` | ⏳ Enrich run |

**Already done in product / CI (no action):**

- Anonymous alert signup fixed (RLS read-back bug)
- `/alerts` route styles standalone
- Ingest budget + concurrency + socket timeout / watchdog
- Weekly enrich workflow dispatchable
- Browse works without API host
- Local `npm run everything` + `health:website:full` green (API warn only)

See also: [GO_LIVE.md](./GO_LIVE.md) · [ALERTS_SETUP.md](./ALERTS_SETUP.md) · [ROADMAP.md](./ROADMAP.md) · [RUN.md](../RUN.md)

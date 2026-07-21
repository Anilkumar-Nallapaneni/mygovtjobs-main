# Manual ops checklist (cannot be finished from code alone)

Status as of **2026-07-21** (verified live). Only items **1** and **5** still need you; the rest are done or optional.

| # | Task | Where | Status (2026-07-21) |
|---|------|--------|---------------------|
| 1 | Submit sitemap | [Google Search Console](https://search.google.com/search-console) → Sitemaps → enter `sitemap.xml` | ⏳ **You** — asset live: `https://www.livegovtjobs.com/sitemap.xml` → HTTP 200, valid index (static + jobs-1..4) |
| 2 | Site verification | Vercel env `VITE_GOOGLE_SITE_VERIFICATION` + GSC HTML tag | ✅ Done — `<meta name="google-site-verification">` live on prod |
| 3 | Alert email delivery | GitHub Actions secrets: `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `ALERT_SITE_URL` | ✅ Done — all three secrets set |
| 4 | Telegram alerts (optional) | `TELEGRAM_BOT_TOKEN` + numeric chat IDs | ➖ Optional — not configured |
| 5 | Leaked-password protection | [Supabase → Auth → Policies](https://supabase.com/dashboard/project/lqihbxujvvvzagrfoorf/auth/policies) → Password security → enable "Leaked password protection" (HaveIBeenPwned) | ⏳ **You** — advisor still `WARN` (no API/MCP toggle) |
| 6 | API host (optional) | Deploy backend (Railway/Render) + DNS `api.livegovtjobs.com` CNAME | ➖ Optional — frontend uses static + Supabase fallback |
| 7 | Turnstile (if forms blocked) | Cloudflare + Vercel `VITE_TURNSTILE_SITE_KEY` + API `TURNSTILE_SECRET_KEY` | ➖ Not needed — alert/contact/report forms work |

**Already done in product / CI (no action):**

- Anonymous alert signup fixed (RLS read-back bug) — subscribe works on `/alerts`
- `/alerts` route now loads alert-section styles standalone
- Daily sync freshness restored (completedAt 2026-07-20)
- Ingest job timeout = 360 min + hard scrape deadlines
- Weekly enrich workflow can be dispatched (`weekly-enrich.yml`)
- Browse works without API host (static + Supabase)
- Supabase security advisors clear except #5 above

See also: [GO_LIVE.md](./GO_LIVE.md) · [ALERTS_SETUP.md](./ALERTS_SETUP.md) · [ROADMAP.md](./ROADMAP.md)

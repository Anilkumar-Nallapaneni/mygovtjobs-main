# Manual ops checklist (cannot be finished from code alone)

Items left from the Jul 20 2026 full audit that need **your** dashboard / secrets access.

| # | Task | Where | Done when |
|---|------|--------|-----------|
| 1 | Submit sitemap | [Google Search Console](https://search.google.com/search-console) → Sitemaps → `https://www.livegovtjobs.com/sitemap.xml` | GSC shows sitemap success |
| 2 | Site verification (if not done) | Vercel env `VITE_GOOGLE_SITE_VERIFICATION` + GSC HTML tag | Ownership verified |
| 3 | Alert email delivery | GitHub Actions secrets: `RESEND_API_KEY`, `ALERT_FROM_EMAIL` | Subscribe on site → email arrives after ingest |
| 4 | Telegram alerts (optional) | `TELEGRAM_BOT_TOKEN` + numeric chat IDs | Test message delivered |
| 5 | Leaked-password protection | Supabase Dashboard → Authentication → Providers / Password security → enable HaveIBeenPwned | Advisor WARN clears |
| 6 | API host (optional) | Deploy backend (Railway/Render) + DNS `api.livegovtjobs.com` CNAME | `https://api.livegovtjobs.com/health` returns 200 |
| 7 | Turnstile (if forms blocked) | Cloudflare + Vercel `VITE_TURNSTILE_SITE_KEY` + API `TURNSTILE_SECRET_KEY` | Alert/contact/report succeed |

**Already done in product / CI (no action):**

- Daily sync freshness restored (completedAt 2026-07-20)
- Ingest job timeout = 360 min + hard scrape deadlines
- Weekly enrich workflow can be dispatched (`weekly-enrich.yml`)
- Browse works without API host (static + Supabase)

See also: [GO_LIVE.md](./GO_LIVE.md) · [ALERTS_SETUP.md](./ALERTS_SETUP.md) · [ROADMAP.md](./ROADMAP.md)

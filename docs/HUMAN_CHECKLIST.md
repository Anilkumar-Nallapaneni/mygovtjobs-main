# Manual ops checklist (cannot be finished from code alone)

Status as of **2026-07-22** (verified). All required launch items are done.

| # | Task | Where | Status (2026-07-22) |
|---|------|--------|---------------------|
| 1 | Submit sitemap | [Google Search Console](https://search.google.com/search-console) → Sitemaps → enter `sitemap.xml` | ✅ Done — `/sitemap.xml` Success, 3,355 pages discovered |
| 2 | Site verification | Vercel env `VITE_GOOGLE_SITE_VERIFICATION` + GSC HTML tag | ✅ Done — `<meta name="google-site-verification">` live on prod |
| 3 | Alert email delivery | GitHub Actions secrets: `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `ALERT_SITE_URL` | ✅ Done — all three secrets set |
| 4 | Telegram alerts (optional) | `TELEGRAM_BOT_TOKEN` + numeric chat IDs | ➖ Optional — not configured |
| 5 | Leaked-password protection | [Supabase → Auth](https://supabase.com/dashboard/project/lqihbxujvvvzagrfoorf/auth/providers) → Password security | ✅ Done — security advisors clear |
| 6 | API host (optional) | Deploy backend (Railway/Render) + DNS `api.livegovtjobs.com` CNAME | ➖ Optional — frontend uses static + Supabase fallback |
| 7 | Turnstile (if forms blocked) | Cloudflare + Vercel `VITE_TURNSTILE_SITE_KEY` + API `TURNSTILE_SECRET_KEY` | ➖ Not needed — alert/contact/report forms work |

**Already done in product / CI (no action):**

- Anonymous alert signup fixed (RLS read-back bug) — subscribe works on `/alerts`
- `/alerts` route now loads alert-section styles standalone
- Daily sync freshness restored; ingest budget + concurrency tuned
- Weekly enrich workflow can be dispatched (`weekly-enrich.yml`)
- Browse works without API host (static + Supabase)
- JobPosting JSON-LD: Google `credentialCategory` enums, `validThrough`, `addressLocality`; street/PIN/salary only when real data exists

**GSC Job Postings “Improve appearance” notes:**

- Missing `streetAddress` / `postalCode` / `baseSalary` on a few pages is expected when the notification doesn’t publish them — do not invent values.
- After deploy, re-validate the `educationRequirements` issue in GSC (was free-text “Graduate”; now mapped to allowed enums).

See also: [GO_LIVE.md](./GO_LIVE.md) · [ALERTS_SETUP.md](./ALERTS_SETUP.md) · [ROADMAP.md](./ROADMAP.md)

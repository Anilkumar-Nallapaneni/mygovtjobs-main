# Vercel production checklist — Live Govt Jobs

Project: `mygovtjobs-main` (team `anilkumar-nallapanenis-projects`)

Required settings:

- Framework: Vite
- Root directory: repository root (empty / `.`)
- Install: `npm ci`
- Build: `npm run build`
- Output: `frontend/dist`
- Node.js: `24.x`
- Production branch: `main`

Domains that must point at this project:

- `livegovtjobs.com`
- `www.livegovtjobs.com`

As of the fresh restart audit, only `*.vercel.app` aliases were attached. In Vercel → Project → Settings → Domains, add both hosts and complete DNS.

After domain attach:

1. Redeploy the latest READY production deployment (or `npm run vercel:deploy`).
2. Clear service worker / site data on www.livegovtjobs.com and verify in incognito.
3. Confirm `npm run deploy:check` / `go-live:check` against the custom domain.

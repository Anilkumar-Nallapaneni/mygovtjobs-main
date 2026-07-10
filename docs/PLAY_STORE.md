# Publish Live Govt Jobs on Google Play Store

Publish as a **Trusted Web Activity (TWA)** — a native Android shell around your live PWA at [https://www.livegovtjobs.com](https://www.livegovtjobs.com).

**Why TWA?** Web changes deploy instantly on Vercel; users get updates without waiting for Play Store review. Play Store listing improves discovery and trust.

## What you already have

| Item | Status |
|------|--------|
| PWA manifest + service worker | ✅ `vite-plugin-pwa` |
| Icons `/pwa-192.png`, `/pwa-512.png` | ✅ |
| Mobile bottom nav + safe areas | ✅ |
| List/card entrance animations | ✅ `animations.css` |
| Mobile route transitions | ✅ `MobileRouteTransition` |
| Android TWA project | ✅ `android-twa/` |
| Digital Asset Links template | ✅ `frontend/public/.well-known/assetlinks.json` |
| Privacy policy | ✅ `/privacy` |

## Preflight

```bash
npm run play:store:check
```

Fixes any ✗ before building the AAB.

---

## Step 1 — Deploy latest web app

```bash
npm run vercel:deploy
```

Verify production:

- [https://www.livegovtjobs.com/manifest.webmanifest](https://www.livegovtjobs.com/manifest.webmanifest)
- [https://www.livegovtjobs.com/.well-known/assetlinks.json](https://www.livegovtjobs.com/.well-known/assetlinks.json)
- [https://www.livegovtjobs.com/privacy](https://www.livegovtjobs.com/privacy)

---

## Step 2 — Install Bubblewrap (one-time)

```bash
npm install -g @bubblewrap/cli
```

Requires **JDK 17+** and Android SDK (Bubblewrap can install via `bubblewrap doctor`).

---

## Step 3 — Create signing keystore

```bash
cd android-twa
bubblewrap init --manifest=https://www.livegovtjobs.com/manifest.webmanifest
```

Or use the checked-in manifest:

```bash
cd android-twa
bubblewrap update --manifest=twa-manifest.json
bubblewrap build
```

This creates `android.keystore` (keep it secret — never commit).

Get SHA-256 fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias govtjobs
```

---

## Step 4 — Update Digital Asset Links

Edit `frontend/public/.well-known/assetlinks.json`:

- `package_name`: `me.govtjobs.app`
- `sha256_cert_fingerprints`: your release keystore SHA-256 (colons OK)

Redeploy:

```bash
npm run vercel:deploy
```

Validate: [Google Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator)

---

## Step 5 — Build release AAB

```bash
cd android-twa
bubblewrap build
```

Output: `app-release-bundle.aab` (path shown in build log).

---

## Step 6 — Google Play Console

1. [play.google.com/console](https://play.google.com/console) — pay **$25** developer registration (one-time)
2. **Create app** → name: **Live Govt Jobs**
3. **Release → Production → Create release** → upload `.aab`
4. **Store listing:**
   - Short description (80 chars): e.g. *Official government job alerts from verified India sources*
   - Full description: mention jobs, results, admit cards, state filters
   - App icon: 512×512 from `/pwa-512.png`
   - Feature graphic: 1024×500 (create in Canva/Figma)
   - Screenshots: **minimum 2 phone** (1080×1920 or similar) + **1 tablet** (7")
5. **Privacy policy:** `https://www.livegovtjobs.com/privacy`
6. **App category:** News or Business
7. **Data safety** questionnaire — mostly “data collected for analytics” if using GA4
8. **Content rating** — complete IARC questionnaire (likely Everyone)
9. Submit for review (typically **1–7 days**)

---

## Step 7 — After approval

| Change type | Action |
|-------------|--------|
| Web UI, jobs, content | `npm run vercel:deploy` — instant for TWA users |
| Native shell (icons, package) | Bump `appVersionCode` in `twa-manifest.json`, rebuild AAB, new Play release |

---

## Domains

| Domain | Role |
|--------|------|
| `www.livegovtjobs.com` | **TWA host** (canonical) |
| `govtjobs.me` | Redirect alias — same analytics |
| `livegovtjobs.com` | Redirects to www |

TWA opens `www.livegovtjobs.com` in full-screen Chrome (no browser bar) when asset links verify.

---

## Screenshot tips for Play Store

Capture on a real phone or Chrome DevTools (Pixel 7 preset):

1. Home — job listings with stats
2. Job detail — PDF / apply section
3. Results / Admit card page
4. Explore hub or India map
5. (Optional) Dark mode screenshot

Use **no** `?gtm_debug` in URLs when capturing.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| TWA opens in Chrome with URL bar | `assetlinks.json` SHA-256 mismatch — redeploy after fix |
| Stuck loading skeleton | Hard refresh; verify `/data/live-jobs-list.json` returns 200 |
| `bubblewrap build` fails | Run `bubblewrap doctor`, install JDK 17 |
| Play rejects package | Bump `versionCode`; ensure unique `applicationId` |

---

## Checklist before submit

- [ ] `npm run play:store:check` passes
- [ ] `assetlinks.json` SHA-256 matches release keystore
- [ ] Tested on Android phone (Chrome → Install app, or internal test track)
- [ ] No horizontal scroll at 320px width
- [ ] Privacy + contact pages live
- [ ] 512×512 maskable icon looks good on launcher
- [ ] Screenshots uploaded to Play Console

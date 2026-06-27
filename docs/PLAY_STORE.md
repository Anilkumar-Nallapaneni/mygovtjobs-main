# Publish My Govt Jobs on Google Play Store

Yes — you can publish this site on the Play Store. The recommended path is a **Trusted Web Activity (TWA)**: a thin Android wrapper around your live PWA at [https://www.govtjobs.me](https://www.govtjobs.me).

The site already has:

- PWA manifest + service worker (`vite-plugin-pwa`)
- Icons at `/pwa-192.png` and `/pwa-512.png`
- Mobile layout, bottom navigation, and standalone display mode
- Digital Asset Links template at `frontend/public/.well-known/assetlinks.json`

## What you need

| Item | Notes |
|------|--------|
| Google Play Developer account | One-time $25 registration |
| Android signing keystore | Created by Bubblewrap or Android Studio |
| SHA-256 fingerprint | Goes into `assetlinks.json` |
| Privacy policy URL | Already on site (`/privacy`) |
| App content rating | Complete in Play Console |
| Screenshots | Phone + 7-inch tablet (Play Console) |

## Step 1 — Deploy mobile fixes

Push the latest frontend to Vercel so production matches the improved mobile UI:

```bash
npm run build
# deploy via Vercel (git push or `vercel --prod`)
```

Verify:

- [https://www.govtjobs.me/manifest.webmanifest](https://www.govtjobs.me/manifest.webmanifest) loads
- [https://www.govtjobs.me/.well-known/assetlinks.json](https://www.govtjobs.me/.well-known/assetlinks.json) loads (after you add your SHA-256)

## Step 2 — Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
cd android-twa
bubblewrap init --manifest=https://www.govtjobs.me/manifest.webmanifest
```

Or use the checked-in `twa-manifest.json`:

```bash
cd android-twa
bubblewrap init --manifest=twa-manifest.json
bubblewrap build
```

Bubblewrap generates an Android project and `.aab` file for Play Console.

## Step 3 — Digital Asset Links

After Bubblewrap creates your keystore, get the SHA-256 fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias govtjobs
```

Update `frontend/public/.well-known/assetlinks.json`:

1. Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` with your fingerprint (colons OK).
2. Keep `package_name` as `me.govtjobs.app` (or change both manifest + assetlinks to match).

Redeploy to Vercel, then verify:

```bash
curl https://www.govtjobs.me/.well-known/assetlinks.json
```

Google’s [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator) can validate the link.

## Step 4 — Play Console upload

1. Create app → **My Govt Jobs**
2. Upload the `.aab` from `bubblewrap build`
3. Store listing: short/full description, category News or Business
4. Privacy policy: `https://www.govtjobs.me/privacy`
5. Complete Data safety + Content rating questionnaires
6. Submit for review (typically 1–7 days)

## Step 5 — Updates

- **Web changes:** Deploy to Vercel — TWA users get updates instantly
- **Native shell changes:** Bump `appVersionCode` in `twa-manifest.json`, rebuild AAB, upload new release

## Alternative: PWA install only (no Play Store)

Users on Android Chrome can install from the browser. Play Store is optional but improves discovery and trust.

## Checklist before submit

- [ ] `assetlinks.json` has correct SHA-256 + package name
- [ ] Lighthouse PWA audit passes on production
- [ ] No horizontal scroll on 320px width
- [ ] Privacy policy and contact pages live
- [ ] App icon 512×512 maskable looks good on Android launcher

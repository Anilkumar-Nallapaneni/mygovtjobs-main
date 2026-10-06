# Monetization readiness

The repository contains AdSense placement code and a Razorpay premium checkout, but those do not earn revenue until the corresponding accounts, IDs, production environment and approvals are configured.

## AdSense setup

1. Confirm the domain is approved in the AdSense account.
2. Add the publisher ID and three numeric ad-unit IDs to Vercel's **Production** environment:
   - `VITE_ADSENSE_CLIENT`
   - `VITE_ADSENSE_SLOT_RESULTS_HUB`
   - `VITE_ADSENSE_SLOT_JOB_DETAIL`
   - `VITE_ADSENSE_SLOT_DESIGNATION`
3. Add `/ads.txt` to the deployed static site using the exact publisher authorization line shown in AdSense. Do not publish a placeholder publisher ID.
4. Redeploy, then check the browser console and AdSense diagnostics to confirm each placement loads and the account is serving ads.
5. Review ad placement on mobile and keep ads clearly separated from official application links and job facts.

Run `npm run p9:audit` to check local configuration. The audit cannot see Vercel settings, AdSense approval, impressions, invalid-traffic holds or payment status.

## Revenue and product measurement

- Add GA4 events for search, job-detail opens, official apply clicks, notification signups, mock-test starts/completions and premium checkout success. Review funnels by source, device and landing page.
- Track ad impressions, viewability, page RPM and search-console clicks in their respective dashboards. A configured ad unit does not guarantee impressions or earnings.
- Consider clearly disclosed sponsorships for coaching/test providers and affiliate links for relevant books or courses. Label paid placements and keep them separate from editorial verification.
- Keep the free official-notification service useful. A paid tier can offer saved searches, deadline reminders and preparation tools; don't paywall official notices or present paid listings as verified because they paid.
- Validate Razorpay checkout, server-side signature verification, subscription entitlement updates, refunds and support before selling a subscription. Never treat a client-side checkout success callback as proof of payment.

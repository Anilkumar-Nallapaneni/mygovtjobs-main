# Razorpay Premium — setup guide

Enable **Premium** subscriptions on [govtjobs.me](https://www.livegovtjobs.com) via Razorpay (India).

## Architecture

```
Account page → POST /api/billing/create-order (Bearer Supabase JWT)
            → Razorpay Checkout (checkout.js)
            → POST /api/billing/verify (signature check)
            → profiles.subscription_tier = 'premium'

Razorpay webhook → POST /api/billing/webhook (backup path)
```

## 1. Razorpay Dashboard

1. Create account at [dashboard.razorpay.com](https://dashboard.razorpay.com).
2. **Settings → API Keys** — generate **Test** keys first, then **Live** for production.
3. **Settings → Webhooks** — add endpoint:
   ```
   https://api.livegovtjobs.com/api/billing/webhook
   ```
   Events: `payment.captured`  
   Copy the **Webhook Secret**.

## 2. Backend env (Railway / Render)

Add to `backend/.env` and your API host:

| Variable | Value |
|----------|--------|
| `RAZORPAY_KEY_ID` | `rzp_live_...` or `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | secret from dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | webhook signing secret |
| `RAZORPAY_PREMIUM_AMOUNT_PAISE` | `9900` (= ₹99) optional |

Redeploy API after saving env vars.

## 3. Database migration

```bash
npm run db:migrate
```

Applies `013_razorpay_payments.sql` (`payment_orders` table).

## 4. Frontend

No Razorpay secret in frontend. Checkout uses public `key_id` returned from `/api/billing/create-order`.

Ensure Vercel has:

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://api.livegovtjobs.com` |

Users must **sign in** at `/account` before upgrading.

## 5. Test flow (Test mode)

1. Set `RAZORPAY_KEY_ID=rzp_test_...` on API host.
2. Sign in at `/account`.
3. Click **Upgrade — ₹99/month**.
4. Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV.
5. Confirm profile shows Premium badge.

## 6. Go live

1. Switch to **Live** API keys on Railway/Render.
2. Update webhook URL to production API.
3. Complete Razorpay KYC / activation if required.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Payments not configured" | Set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` on API |
| "Invalid session" | User must be signed in; token expires — re-login |
| Webhook 400 | Check `RAZORPAY_WEBHOOK_SECRET` matches dashboard |
| Checkout doesn't open | `VITE_API_URL` must point at API with billing routes |

See also: [GO_LIVE.md](./GO_LIVE.md), [BACKLOG_STATUS.md](./BACKLOG_STATUS.md).

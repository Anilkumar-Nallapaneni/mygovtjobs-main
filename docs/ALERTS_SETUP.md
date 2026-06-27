# Alerts — production setup

Email, Telegram, WhatsApp, and push alerts run after daily ingest (`npm run alerts:deliver`).

## GitHub Actions secrets

| Secret | Channel | Required |
|--------|---------|----------|
| `RESEND_API_KEY` | Email | Yes for email |
| `ALERT_FROM_EMAIL` | Email sender (verified domain on Resend) | Yes for email |
| `TELEGRAM_BOT_TOKEN` | Telegram | Optional |
| `TWILIO_ACCOUNT_SID` | WhatsApp | Optional |
| `TWILIO_AUTH_TOKEN` | WhatsApp | Optional |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` | Optional |
| `PUSH_WEBHOOK_URL` | Web push bridge | Optional |
| `ALERT_SITE_URL` | Links in messages | Recommended (`https://govtjobs.me`) |

Validate locally:

```bash
VERIFY_ALERT_SECRETS=1 RESEND_API_KEY=re_... ALERT_FROM_EMAIL=alerts@yourdomain.com node scripts/check-github-actions-secrets.mjs
```

## Backend `.env` (local delivery test)

```env
RESEND_API_KEY=re_...
ALERT_FROM_EMAIL=alerts@yourdomain.com
TELEGRAM_BOT_TOKEN=123456789:ABC...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PUSH_WEBHOOK_URL=https://your-push-bridge.example/hook
ALERT_SITE_URL=https://govtjobs.me
```

```bash
npm run alerts:deliver
```

## Telegram chat ID

1. User messages your bot `/start`
2. User messages [@userinfobot](https://t.me/userinfobot) to get numeric chat ID
3. Subscribe with that numeric ID (not `@username`)

## Push webhook contract

`POST PUSH_WEBHOOK_URL` with JSON:

```json
{ "token": "<device or PushSubscription JSON>", "title": "...", "body": "..." }
```

Frontend uses a stable device token in `localStorage` unless `VITE_VAPID_PUBLIC_KEY` is set for real Web Push.

## Supabase Auth (Account page)

1. Supabase Dashboard → Authentication → Providers → **Email** ON
2. Run migration: `npm run db:migrate:pending` (includes `011_user_alerts_and_monetization.sql`)
3. Users sign in at `/account` — subscriptions linked via `user_id`

## Unsubscribe

- Homepage subscribe form (active subscriptions updated in place)
- `POST /api/alerts/unsubscribe` with `{ "id": "..." }`
- Account page → **Job alerts** → Unsubscribe

## Freemium / sponsored (Phase 5 foundation)

Migration `011` adds:

- `profiles.subscription_tier` (`free` | `premium`)
- `jobs.is_sponsored` — admin can flag featured official listings later

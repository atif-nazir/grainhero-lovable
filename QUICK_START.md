# Quick Start (5 Minutes)

## Get 5 Credentials

### Supabase (https://supabase.com)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Stripe (https://stripe.com)
```
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET= (after webhook setup)
```

## Add to Vercel Settings → Environment Variables

(Copy paste the 5 values above)

## Run SQL in Supabase SQL Editor

Open: `/scripts/001_init_schema.sql`
Copy entire file → Paste in Supabase SQL Editor → Click Run

## Setup Stripe Webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint

URL: `https://your-domain.com/api/webhooks/stripe`

Events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

Copy signing secret → Add as `STRIPE_WEBHOOK_SECRET` in Vercel

## Done ✅

Push to GitHub, Vercel auto-deploys. Test at your live URL.

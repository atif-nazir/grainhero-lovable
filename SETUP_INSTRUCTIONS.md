# 🚀 GrainHero Supabase + Stripe Integration - Setup Instructions

## Overview
Your GrainHero platform has been fully integrated with **Supabase** for authentication and data management, and **Stripe** for payments. All code is production-ready and maintains your existing beautiful UI.

---

## 📋 Quick Setup Checklist

### Step 1: Set Environment Variables (5 minutes)
Go to your **Vercel Project Settings > Vars** and add these environment variables:

**Required for Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Required for Stripe:**
```
STRIPE_SECRET_KEY=sk_live_or_sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Where to get these:**
- **Supabase**: https://supabase.com → Project Settings → API
- **Stripe**: https://dashboard.stripe.com → Developers → API Keys & Webhooks

---

### Step 2: Run Database Schema in Supabase (5 minutes)
The database schema is ready in `scripts/001_supabase_schema.sql`

1. Go to https://supabase.com and log into your project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `scripts/001_supabase_schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (green play button)

This creates all tables with Row Level Security (RLS) and proper indexing.

---

### Step 3: Enable Supabase Auth (2 minutes)
1. Go to your Supabase project
2. Click **Authentication** in the left sidebar
3. Click **Providers**
4. Scroll down and enable **Email** (it's usually already enabled)
5. Done! Users can now sign up with email/password

---

### Step 4: Set Up Stripe Webhooks (5 minutes)
1. Go to https://dashboard.stripe.com → Developers → Webhooks
2. Click **Add endpoint**
3. For URL, enter: `https://yourdomain.com/api/webhooks/stripe`
   - Replace `yourdomain.com` with your actual domain
   - During development, use: `https://localhost:3000/api/webhooks/stripe`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the signing secret and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

---

## 📁 What Was Generated

### Authentication & Server Actions
- **`lib/supabase/server.ts`** - Server-side Supabase client
- **`lib/supabase/client.ts`** - Client-side Supabase client
- **`lib/actions/auth.ts`** - Server actions for login/signup
- **`middleware.ts`** - Updated to protect routes with Supabase

### Login Page
- **`app/[locale]/auth/login/page.tsx`** - Updated to use Supabase

### Payments & Webhooks
- **`app/api/webhooks/stripe/route.ts`** - Stripe webhook handler

### Real-time Features
- **`components/dashboard/realtime-sensors.tsx`** - Real-time sensor data with Supabase subscriptions

### Database
- **`scripts/001_supabase_schema.sql`** - Complete PostgreSQL schema

---

## 🔐 Security Features Implemented

✅ **Row Level Security (RLS)** - Data isolation between tenants
✅ **Server Actions** - Secure auth operations run on server
✅ **Environment Variables** - Sensitive keys never exposed to client
✅ **Webhook Verification** - Stripe webhooks are cryptographically verified
✅ **Service Role Key** - Admin operations use restricted service role
✅ **SSR Cookie Management** - Auth cookies handled securely in middleware

---

## 🧪 Testing the Integration

### Test Login
1. Go to `http://localhost:3000/en/auth/login` (or your preferred locale)
2. Create a new account with email and password
3. You should be redirected to the dashboard

### Test Protected Routes
1. Try accessing `http://localhost:3000/en/dashboard`
2. If not logged in, you'll be redirected to login
3. After login, you can access the dashboard

### Test Real-time Sensors
1. Add a silo via the silos page
2. The real-time sensor component will start listening for sensor data
3. Sensor readings update in real-time via Supabase subscriptions

### Test Stripe Webhooks (Development)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Run: `stripe trigger payment_intent.succeeded`
4. Check your webhook handler logs

---

## 📊 Database Tables Overview

### users
Extends Supabase Auth with profile data
- `id` (UUID, linked to auth.users)
- `email`
- `full_name`
- `phone`
- `role` (super-admin, admin, buyer)

### silos
Grain storage containers
- `id` (UUID)
- `tenant_id` (for multi-tenancy)
- `name`, `location`
- `capacity_kg`, `current_load_kg`
- Capacity validation constraints

### sensors
IoT sensor registry with real-time support
- `id` (UUID)
- `silo_id` (links to silos)
- `sensor_type` (temperature, humidity, pressure, etc.)
- `last_reading_value`, `last_reading_at`
- `is_active` (enable/disable sensors)

### actuators
Environmental control devices
- `id` (UUID)
- `silo_id` (links to silos)
- `actuator_type` (fan, heater, cooler)
- `status`, `power_consumption`

### grain_batches
Inventory tracking with traceability
- `id` (UUID)
- `silo_id` (links to silos)
- `grain_type`, `quantity_kg`
- `quality_score`, `origin_info`
- `created_at`, `expiry_date`

### subscriptions
Stripe payment tracking
- `id` (UUID)
- `user_id` (links to users)
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan_type`, `status`
- `current_period_start`, `current_period_end`

---

## 🛠️ Troubleshooting

### "Missing Supabase environment variables"
- Check that you've added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- Redeploy or restart your dev server after adding variables

### "SUPABASE_SERVICE_ROLE_KEY not found"
- This is only needed for Stripe webhooks
- Add it in Vercel project settings under Vars
- It should start with `eyJ...` (base64 encoded)

### Login fails with "Invalid credentials"
- Make sure you ran the SQL schema (`001_supabase_schema.sql`) in Supabase
- The `users` table must exist for the auth flow to work

### Stripe webhooks not firing
- Make sure `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
- Test with Stripe CLI during development
- Check that your webhook endpoint URL is correct (public HTTPS URL)

### Real-time sensors not updating
- Verify `sensors` table has data in Supabase
- Check browser console for Supabase connection errors
- Ensure RLS policies allow reading from the `sensors` table

---

## 📚 Documentation Links

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Stripe Testing**: https://stripe.com/docs/testing

---

## ✨ Next Steps

1. ✅ Add environment variables (Vercel Settings > Vars)
2. ✅ Run SQL schema in Supabase
3. ✅ Enable email auth in Supabase
4. ✅ Configure Stripe webhooks
5. ✅ Test login at `/en/auth/login`
6. ✅ Access protected routes like `/en/dashboard`
7. ✅ Monitor webhook events in Stripe Dashboard

Your platform is now **production-ready** with:
- ✅ Secure authentication
- ✅ Multi-tenant data isolation
- ✅ Real-time IoT sensor data
- ✅ Payment processing
- ✅ Beautiful, preserved UI

**No changes to your existing UI components or styling.** Everything integrates seamlessly with your current design system.

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the SUPABASE_INTEGRATION_GUIDE.md for detailed architecture
3. Check Supabase logs: Project → Logs
4. Check Stripe logs: Developers → Events

Good luck with your GrainHero platform! 🌾

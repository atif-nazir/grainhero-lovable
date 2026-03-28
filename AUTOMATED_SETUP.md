# Automated Supabase + Stripe Integration Setup

This guide will walk you through the **complete automated setup** for your GrainHero application. Everything is pre-built—you just need to provide your credentials.

## ✅ What's Already Done

- [x] Supabase client/server utilities (`lib/supabase/`)
- [x] Authentication middleware (`middleware.ts`)
- [x] Auth server actions (`lib/actions/auth.ts`)
- [x] Database schema with RLS (`scripts/001_init_schema.sql`)
- [x] Stripe webhook handler (`app/api/webhooks/stripe/route.ts`)
- [x] Auth callback route (`app/[locale]/auth/callback/route.ts`)
- [x] Auth pages (login, signup, error)
- [x] Realtime sensor dashboard (`components/dashboard/realtime-sensors.tsx`)
- [x] Package dependencies updated

## 🔐 Step 1: Get Your Credentials

### From Supabase (5 minutes)
1. Go to https://supabase.com and log in
2. Create a new project or select existing one
3. Navigate to **Settings → API**
4. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

### From Stripe (5 minutes)
1. Go to https://stripe.com and log in to your dashboard
2. Navigate to **Developers → API Keys**
3. Copy:
   - **Secret Key** → `STRIPE_SECRET_KEY`
   - **Publishable Key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Go to **Webhooks** section
5. Add a webhook endpoint for your app (we'll do this in Step 3)

## 🚀 Step 2: Add Environment Variables to Vercel

1. Open your Vercel project settings
2. Go to **Settings → Environment Variables**
3. Add these 5 variables (you'll provide values from Step 1):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=we_will_get_this_after_webhook_setup
```

4. Click "Save" after adding each variable

## 🗄️ Step 3: Deploy Database Schema

The SQL schema is ready to execute in Supabase. Follow these steps:

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `/vercel/share/v0-project/scripts/001_init_schema.sql` (in this project)
4. Copy the entire SQL content
5. Paste it into the Supabase SQL editor
6. Click **Run**

✅ This creates:
- 9 tables with proper relationships
- Row Level Security (RLS) policies
- Auto-generated indexes for performance
- Triggers for auto-timestamps and user profiles

## 🪝 Step 4: Setup Stripe Webhook

1. Go to your Stripe Dashboard → **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/webhooks/stripe
   ```
   (Replace `your-domain.com` with your actual domain)

4. Select these events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

5. Click **Add endpoint**
6. Copy the **Signing Secret**
7. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## ✨ Step 5: Deploy to Vercel

1. Commit all changes to GitHub
2. Vercel automatically deploys
3. Visit your live app at `https://your-domain.vercel.app`

## 🧪 Step 6: Test Everything

### Test Authentication
1. Go to `/auth/sign-up`
2. Create a test account
3. Confirm email (check your inbox)
4. Login with credentials
5. Verify you can access `/dashboard`

### Test Protected Routes
1. Try accessing `/dashboard` without login
2. Should redirect to login page ✅

### Test Stripe Integration
1. Create a test subscription
2. Check Supabase `subscriptions` table for the record ✅

### Test Realtime Sensors
1. Add a test silo and sensors in dashboard
2. Insert test sensor readings
3. Watch them appear in real-time on dashboard ✅

## 📁 File Structure

```
lib/
  ├── supabase/
  │   ├── client.ts          # Browser client
  │   ├── server.ts          # Server client
  │   └── proxy.ts           # Proxy for cookies
  └── actions/
      └── auth.ts            # Server actions: login, signup, logout
      
app/
  ├── api/
  │   └── webhooks/stripe/
  │       └── route.ts       # Stripe webhook handler
  └── [locale]/auth/
      ├── login/page.tsx     # Login page
      ├── sign-up/page.tsx   # Signup page
      ├── callback/route.ts  # OAuth callback
      └── error/page.tsx     # Error page
      
components/
  └── dashboard/
      └── realtime-sensors.tsx  # Realtime sensor dashboard
      
scripts/
  └── 001_init_schema.sql    # Database schema
  
middleware.ts               # Auth middleware for protected routes
```

## 🔑 Available Functions

### Authentication (in `lib/actions/auth.ts`)

```typescript
// Sign up new user
signUpWithEmail(email, password, fullName, locale)

// Login user
loginWithEmail(email, password, locale)

// Logout
logout(locale)

// Get current user
getCurrentUser()

// Reset password
resetPassword(email, locale)

// Update password
updatePassword(newPassword)
```

### Supabase Queries

```typescript
// Client-side
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data } = await supabase.from('silos').select('*')

// Server-side
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data } = await supabase.from('users').select('*')
```

## 🚨 Troubleshooting

### "Missing Supabase environment variables"
- Check all 3 Supabase variables are set in Vercel
- Redeploy after adding variables

### "Invalid Stripe signature"
- Verify webhook secret matches in Stripe dashboard
- Check webhook URL is correct

### "RLS policy violation"
- Ensure user is logged in and authenticated
- Check RLS policies in Supabase SQL Editor

### "Sensor data not updating in real-time"
- Verify realtime is enabled in Supabase table
- Check browser console for subscription errors

## 📞 Need Help?

1. **Supabase Docs**: https://supabase.com/docs
2. **Stripe Docs**: https://stripe.com/docs/api
3. **Next.js Docs**: https://nextjs.org/docs

## ✅ Completion Checklist

- [ ] Added Supabase credentials to Vercel
- [ ] Added Stripe credentials to Vercel
- [ ] Ran SQL schema in Supabase
- [ ] Setup Stripe webhook endpoint
- [ ] Deployed to Vercel
- [ ] Tested signup/login
- [ ] Tested protected routes
- [ ] Tested Stripe webhook
- [ ] Tested realtime sensors

**You're done! 🎉 Your GrainHero app is live with Supabase auth and Stripe payments.**

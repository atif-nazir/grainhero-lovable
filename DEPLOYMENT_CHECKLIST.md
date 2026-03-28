# 🚀 GrainHero Deployment Checklist

## Phase 1: Environment Setup (15 minutes)

### Supabase Configuration
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy project URL from Settings > API
- [ ] Copy Anon Public Key from Settings > API  
- [ ] Copy Service Role Key from Settings > API
- [ ] Add to Vercel environment as:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Stripe Configuration
- [ ] Create Stripe account at https://stripe.com
- [ ] Go to Developers > API Keys
- [ ] Copy Secret Key (starts with `sk_`)
- [ ] Copy Webhook Secret (starts with `whsec_`)
- [ ] Add to Vercel environment as:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`

### Environment Variables in Vercel
- [ ] Go to Project Settings > Vars
- [ ] Add all 5 environment variables
- [ ] Verify each one is set correctly
- [ ] Redeploy to apply changes

---

## Phase 2: Database Setup (10 minutes)

### Supabase Database Schema
- [ ] Go to your Supabase project
- [ ] Click SQL Editor in left sidebar
- [ ] Click "New Query"
- [ ] Open `scripts/001_supabase_schema.sql` from your project
- [ ] Copy entire file contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click Run (green play button)
- [ ] Wait for query to complete (should see ✓)

### Verify Tables Created
- [ ] Go to Supabase > Tables
- [ ] Verify you see:
  - [ ] `users` table
  - [ ] `silos` table
  - [ ] `sensors` table
  - [ ] `actuators` table
  - [ ] `grain_batches` table
  - [ ] `subscriptions` table

### Enable Authentication
- [ ] Go to Authentication in left sidebar
- [ ] Click Providers
- [ ] Find "Email" provider
- [ ] Verify it's enabled (toggle on)
- [ ] Check "Email/Password" is enabled
- [ ] Confirm email templates are set

---

## Phase 3: Stripe Webhooks (5 minutes)

### Create Webhook Endpoint
- [ ] Go to https://dashboard.stripe.com
- [ ] Click Developers in left menu
- [ ] Click Webhooks
- [ ] Click "Add Endpoint"
- [ ] Enter endpoint URL:
  - **Development:** `http://localhost:3000/api/webhooks/stripe`
  - **Production:** `https://yourdomain.com/api/webhooks/stripe`
- [ ] Select events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
- [ ] Click "Add Endpoint"

### Get Webhook Secret
- [ ] Click the webhook endpoint you just created
- [ ] Copy the Signing Secret (starts with `whsec_`)
- [ ] Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### Test Webhook
- [ ] Back in Stripe, find your webhook
- [ ] Click "Send test event"
- [ ] Select `payment_intent.succeeded`
- [ ] Click "Send event"
- [ ] Check Supabase logs to verify webhook was received

---

## Phase 4: Local Testing (10 minutes)

### Install Dependencies
```bash
cd your-project
npm install
```

### Start Development Server
```bash
npm run dev
```

### Test Authentication
- [ ] Open http://localhost:3000/en/auth/login
- [ ] Create a new account with email and password
- [ ] Verify you can log in
- [ ] Check Supabase > Authentication > Users - new user should appear

### Test Protected Routes
- [ ] Try to access http://localhost:3000/en/dashboard without logging in
- [ ] Should redirect to login page
- [ ] After logging in, should have access to dashboard

### Test Real-time (Optional)
- [ ] Go to Supabase > Tables > sensors
- [ ] Manually insert a test sensor row
- [ ] Check if RealtimeSensors component updates in real-time

### Test Stripe Webhook (Optional)
- [ ] Install Stripe CLI: https://stripe.com/docs/stripe-cli
- [ ] Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Run: `stripe trigger payment_intent.succeeded`
- [ ] Check console for successful webhook processing

---

## Phase 5: Pre-Production Review (5 minutes)

### Code Review
- [ ] Review `lib/supabase/server.ts` - Correct keys used
- [ ] Review `lib/supabase/client.ts` - Public keys only
- [ ] Review `middleware.ts` - Protected routes correct
- [ ] Review `lib/actions/auth.ts` - Password handling secure
- [ ] Review `app/api/webhooks/stripe/route.ts` - Signature verified

### Security Checklist
- [ ] No hardcoded API keys in code
- [ ] All keys in environment variables
- [ ] Service role key only in server code
- [ ] Webhook signature verified
- [ ] RLS policies defined in Supabase
- [ ] CORS properly configured if needed

### Performance Checklist
- [ ] Database indexes created (in SQL schema)
- [ ] Real-time subscriptions properly cleaned up
- [ ] No N+1 queries
- [ ] Webhook handler efficient

---

## Phase 6: Deployment (5 minutes)

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] Environment variables added to Vercel
- [ ] Database schema deployed to Supabase

### Deploy to Vercel
- [ ] Push code to GitHub branch
- [ ] Vercel automatically builds and deploys
- [ ] OR: Click Deploy in Vercel dashboard
- [ ] Wait for build to complete (green checkmark)

### Post-Deployment
- [ ] Update Stripe webhook URL to production domain
- [ ] Test login at your production URL
- [ ] Test protected routes
- [ ] Monitor Supabase logs for errors
- [ ] Monitor Stripe webhook events

---

## Phase 7: Production Verification (10 minutes)

### Production Tests
- [ ] Visit your production domain
- [ ] Test signup/login with new account
- [ ] Test logout
- [ ] Access /dashboard and other protected routes
- [ ] Test real-time sensor updates (if applicable)

### Monitor Logs
- [ ] Supabase > Logs - Check for errors
- [ ] Stripe > Events - Verify webhooks received
- [ ] Vercel > Logs - Check for serverless function errors

### Performance Check
- [ ] Login time < 2 seconds
- [ ] Dashboard loads < 3 seconds
- [ ] Real-time updates appear within 1 second

---

## 🎯 Success Criteria

### ✅ Minimum Viable
- [ ] Users can sign up and log in
- [ ] Protected routes are actually protected
- [ ] Database schema exists with all tables
- [ ] Environment variables are set

### ✅ Full Integration
- [ ] Real-time sensor data works
- [ ] Stripe webhooks are processed
- [ ] All 5 environment variables configured
- [ ] Production deployment successful

### ✅ Production Ready
- [ ] All tests passing
- [ ] No security warnings
- [ ] Performance acceptable
- [ ] Error monitoring in place
- [ ] Monitoring/alerts configured

---

## 📋 Quick Reference

### Critical Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Key Files
```
lib/supabase/server.ts          - Server auth client
lib/supabase/client.ts          - Client auth client
lib/actions/auth.ts             - Login/signup actions
app/api/webhooks/stripe/route.ts - Stripe handler
middleware.ts                    - Route protection
scripts/001_supabase_schema.sql  - Database schema
```

### Important URLs
- Supabase: https://supabase.com
- Stripe: https://dashboard.stripe.com
- Vercel: https://vercel.com/dashboard

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Missing environment variables" | Check Vercel Settings > Vars |
| "Connection refused" | Database not initialized - run SQL schema |
| "Webhook failed" | Check webhook secret matches Stripe |
| "Login redirects to login" | Check Supabase Auth is enabled |
| "Real-time not working" | Check RLS policies allow reads |

---

## 📞 Help Resources

If stuck on any phase:

1. **Setup Issues** → See `SETUP_INSTRUCTIONS.md`
2. **API Questions** → See `API_REFERENCE.md`
3. **Architecture Help** → See `SUPABASE_INTEGRATION_GUIDE.md`
4. **Troubleshooting** → See `IMPLEMENTATION_SUMMARY.md`

---

## ✨ Final Notes

- **UI is completely preserved** - No styling changes made
- **Production ready** - Security best practices implemented
- **Well documented** - 4 comprehensive guides included
- **Type-safe** - Full TypeScript support throughout
- **Scalable** - Built to handle growth

**Estimated Time: 45-60 minutes total**

Good luck with your GrainHero deployment! 🌾🚀

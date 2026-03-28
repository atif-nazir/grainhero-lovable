# GrainHero Supabase Integration Guide

This guide walks you through completing the Supabase integration for your GrainHero platform.

## ✅ What Has Been Generated

### 1. Database Schema (Task 1)
**File:** `scripts/001_supabase_schema.sql`

Contains the complete PostgreSQL schema with:
- `users` table (linked to Supabase Auth)
- `silos` table (grain storage containers)
- `sensors` table (IoT sensor registry with real-time capability)
- `actuators` table (environmental control devices)
- `grain_batches` table (inventory tracking with traceability)
- `subscriptions` table (Stripe integration)
- Row Level Security (RLS) policies for tenant isolation
- Indexes for performance optimization
- Triggers for automatic `updated_at` timestamps

**Action Required:** Copy the entire SQL file and paste it into your Supabase SQL Editor:
1. Go to https://supabase.com and log in
2. Select your GrainHero project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Paste the entire contents of `scripts/001_supabase_schema.sql`
6. Click "Run"

### 2. Dependencies (Task 2)
**File:** `package.json`

Added:
- `@supabase/ssr` - Server-side rendering auth
- `@supabase/supabase-js` - JavaScript client library
- `bcryptjs` - Password hashing (for custom auth if needed)
- `stripe` - Stripe server-side SDK

Dependencies will auto-install on next dev server start.

### 3. Supabase Utilities (Task 3)
**Files:**
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/supabase/client.ts` - Client-side Supabase client
- `middleware.ts` - Updated to protect authenticated routes with Supabase

**Key Features:**
- SSR-safe authentication with cookie management
- Admin client for server actions (Stripe webhooks)
- Middleware redirects unauthenticated users to `/[locale]/auth/login`

### 4. Server Actions (Task 4)
**File:** `lib/actions/auth.ts`

Provides:
- `loginWithEmail()` - Authenticate with email/password
- `signUpWithEmail()` - Create new account with profile
- `logout()` - Sign out user
- `getCurrentUser()` - Fetch current authenticated user
- `resetPassword()` - Send password reset email
- `updatePassword()` - Update user password

All handle Supabase Auth + profile creation automatically.

### 5. Updated Login Page (Task 5)
**File:** `app/[locale]/auth/login/page.tsx`

Migrated from old backend to Supabase:
- Uses `loginWithEmail()` server action
- Maintains existing validation and i18n routing
- Preserves all UI/UX without breaking design
- Handles redirect_to query parameter

### 6. Stripe Webhook Handler (Task 6)
**File:** `app/api/webhooks/stripe/route.ts`

Handles webhook events:
- `checkout.session.completed` - Creates subscription in database
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Marks subscription as canceled

Uses Supabase admin client for secure database updates.

### 7. Realtime Sensor Component (Task 7)
**File:** `components/dashboard/realtime-sensors.tsx`

Features:
- Fetches sensors for a silo
- Subscribes to real-time sensor updates via Supabase
- Renders live chart with Recharts
- Shows sensor status cards
- Auto-updates UI when hardware sends new readings

Usage:
```tsx
import { RealtimeSensors } from '@/components/dashboard/realtime-sensors'

export default function Dashboard() {
  return (
    <RealtimeSensors siloId="uuid-of-silo" />
  )
}
```

## 🚀 Setup Steps

### Step 1: Get Supabase Credentials
1. Create a free project at https://supabase.com
2. Go to **Settings > API**
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Create Database Schema
1. In Supabase, go to **SQL Editor**
2. Create new query
3. Copy entire contents of `scripts/001_supabase_schema.sql`
4. Paste and run

The schema will create all tables with RLS policies automatically.

### Step 3: Set Up Stripe Webhook (Optional, but Recommended)
1. Create account at https://stripe.com
2. Go to **Developers > Webhooks**
3. Click "Add endpoint"
4. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
5. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Copy signing secret → `STRIPE_WEBHOOK_SECRET`
7. Get API keys from **Developers > API Keys**:
   - Publishable key
   - Secret key → `STRIPE_SECRET_KEY`

### Step 4: Add Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in all Supabase and Stripe values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
```

### Step 5: Test the Integration
1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/en/auth/login`
3. Click "Get Started" to signup with a test account
4. Dashboard should redirect after login
5. Use `RealtimeSensors` component to test real-time updates

## 🔐 Security Notes

### Row Level Security (RLS)
All tables are protected with RLS policies:
- **Users** can only read their own profile
- **Silos, Sensors, Actuators, Grain Batches** - Users can only access their tenant's data
- **Subscriptions** - Admin operations use service role key

### Service Role Key
Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code. It's only used:
- Server actions (auth.ts)
- API routes (Stripe webhooks)
- Never sent to the browser

### Stripe Webhook Security
- Webhook signature verified with `STRIPE_WEBHOOK_SECRET`
- Admin client updates database securely
- Tenant ID comes from Stripe metadata (set during checkout)

## 📊 Database Schema Summary

### Users Table
- Links to Supabase auth.users
- Stores profile: full_name, phone, avatar_url
- Roles: super-admin, admin, buyer
- tenant_id for multi-tenancy

### Silos Table
- Grain storage containers
- Capacity tracking (current_load_kg vs capacity_kg)
- Maintenance tracking
- All tenant-isolated via RLS

### Sensors Table
- IoT device registry
- Tracks: sensor_type, is_active, last_reading
- **Real-time capable** - subscribe in components
- Linked to silos

### Actuators Table
- Environmental control devices (fans, heaters, pumps)
- Tracks: actuator_type, current_state
- Linked to silos

### Grain Batches Table
- Inventory tracking
- Metrics: moisture_content, purity_percentage
- Traceability: traceability_hash for blockchain-like tracking
- Linked to silos

### Subscriptions Table
- Stripe integration
- Tracks: stripe_customer_id, plan_name, status
- Updated automatically by webhook

## 🔄 Real-Time Data Flow

### For Hardware/IoT Devices
1. Send sensor reading to Supabase via `sensors` insert/update
   ```sql
   UPDATE sensors
   SET last_reading_value = 72.5,
       last_reading_at = now(),
       is_active = true
   WHERE id = 'sensor-uuid'
   ```

2. Your UI component automatically updates via realtime subscription

### For Dashboard
1. Import `RealtimeSensors` component
2. Subscribe to updates automatically
3. Recharts chart updates in real-time
4. No manual refresh needed

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` has all required keys
- Restart dev server after adding env vars
- Reload browser page

### "RLS policy violation" errors
- Verify user is logged in
- Check user has correct `tenant_id`
- Ensure tenant_id matches data ownership

### "Stripe webhook not triggering"
- Verify webhook endpoint URL is correct
- Check webhook signing secret in code
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### "Real-time updates not showing"
- Check browser console for subscription errors
- Verify sensors table has RLS disabled or correct policies
- Test with Supabase SQL: `SELECT * FROM sensors WHERE silo_id = 'xxx'`

## 📚 Next Steps

### Create Auth Pages
- Sign-up page (similar to login but calls `signUpWithEmail()`)
- Password reset page
- Two-factor authentication (optional)

### Create Dashboard Pages
- Silo management
- Sensor configuration
- Grain batch tracking
- Analytics dashboard

### Create Admin Panel
- User management (for super-admin role)
- Subscription management
- System health monitoring

### Integrate with Hardware
- MQTT client to publish sensor readings
- Use Supabase SDK to insert/update readings
- Or use Supabase Edge Functions for data processing

## 📖 Documentation Links

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions

## ✨ Key Improvements Over Old Backend

| Feature | Old Backend | Supabase |
|---------|------------|----------|
| Auth | Custom implementation | Built-in, production-ready |
| Database | MongoDB | PostgreSQL with RLS |
| Real-time | Socket.io | Native Supabase Realtime |
| Hosting | Self-hosted | Serverless (Vercel + Supabase) |
| Scalability | Limited | Auto-scaling |
| Cost | High (servers) | Pay-as-you-go |
| Security | Basic | Enterprise-grade with RLS |
| Compliance | Manual | GDPR, SOC 2 ready |

---

**Generated by v0 - Vercel's AI Code Generation**  
**Date:** March 28, 2026

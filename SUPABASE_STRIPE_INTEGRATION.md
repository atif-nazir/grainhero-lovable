# 🌾 GrainHero - Supabase & Stripe Integration

Complete production-ready integration for authentication, real-time data, and payments.

---

## ✨ What You Get

### ✅ Supabase Authentication
- Email/password signup and login
- Session management with SSR support
- Protected routes with middleware
- Automatic user profile creation
- Secure server-side sessions

### ✅ Real-time IoT Data
- Sensor data visualization
- Live updates without polling
- Supabase subscriptions
- Automatic component cleanup
- Production-ready charts with Recharts

### ✅ Stripe Payment Processing
- Webhook integration
- Subscription management
- Payment event handling
- Webhook signature verification
- Secure admin-level database access

### ✅ Multi-tenant Database
- 6 core tables with relationships
- Row Level Security (RLS) for data isolation
- Automatic timestamps and triggers
- Performance indexes
- Complete PostgreSQL schema

### ✅ Zero UI Breaking Changes
- Your beautiful design is completely preserved
- Login page updated but visually identical
- All styling and layout intact
- Responsive design maintained
- i18n routing preserved

---

## 🚀 Quick Start (45 minutes)

### 1️⃣ Set Environment Variables (5 min)
```bash
# Go to Vercel Project Settings > Vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 2️⃣ Deploy Database Schema (5 min)
- Go to Supabase SQL Editor
- Copy contents of `scripts/001_supabase_schema.sql`
- Paste and run in Supabase
- Verify 6 tables created

### 3️⃣ Enable Supabase Auth (2 min)
- Go to Supabase > Authentication > Providers
- Enable Email provider (usually pre-enabled)
- Done!

### 4️⃣ Configure Stripe Webhooks (5 min)
- Go to Stripe > Developers > Webhooks
- Add endpoint: `/api/webhooks/stripe`
- Select events: subscriptions, payments
- Copy webhook secret to environment

### 5️⃣ Test Locally (10 min)
```bash
npm install
npm run dev
# Visit http://localhost:3000/en/auth/login
# Create account and test
```

### 6️⃣ Deploy (5 min)
- Push to GitHub
- Vercel auto-deploys
- Update Stripe webhook URL to production domain

**🎉 Done! Your platform is live with Supabase + Stripe**

---

## 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **SETUP_INSTRUCTIONS.md** | Step-by-step setup guide | 10 min |
| **DEPLOYMENT_CHECKLIST.md** | Phase-by-phase deployment | 10 min |
| **API_REFERENCE.md** | Complete API documentation | 15 min |
| **SUPABASE_INTEGRATION_GUIDE.md** | Architecture & patterns | 15 min |
| **IMPLEMENTATION_SUMMARY.md** | What was built | 10 min |
| **FILE_STRUCTURE.md** | File organization & imports | 10 min |

**Start with SETUP_INSTRUCTIONS.md → DEPLOYMENT_CHECKLIST.md**

---

## 🏗️ Architecture

```
Frontend (Next.js)
    ↓
Login Page (Supabase Auth)
    ↓
Middleware (Session Check)
    ↓
Protected Routes
    ↓
Real-time Components (Sensor Data)
    ↓
Stripe Webhooks (Payment Events)
    ↓
Supabase Backend
    ├── Auth (Email/Password)
    ├── Database (6 Tables)
    ├── Row Level Security
    └── Real-time Subscriptions
```

---

## 📁 Key Files

### Authentication
- `lib/supabase/server.ts` - Server-side auth client
- `lib/supabase/client.ts` - Client-side auth client
- `lib/actions/auth.ts` - Login server action
- `app/[locale]/auth/login/page.tsx` - Updated login page
- `middleware.ts` - Route protection

### Real-time
- `components/dashboard/realtime-sensors.tsx` - Sensor visualization
- Uses Supabase real-time subscriptions

### Payments
- `app/api/webhooks/stripe/route.ts` - Webhook handler
- Verifies signatures and updates subscriptions

### Database
- `scripts/001_supabase_schema.sql` - Complete schema
- 6 tables with RLS and relationships

---

## 🔐 Security Features

✅ **Row Level Security** - Data isolation between tenants
✅ **Server Actions** - Auth logic runs on server
✅ **Webhook Verification** - Stripe events authenticated
✅ **Service Role Key** - Restricted to server-side only
✅ **SSR Auth** - Secure cookie management
✅ **No Hardcoded Secrets** - All in environment variables
✅ **Type-Safe** - Full TypeScript support

---

## 🧪 Testing

### Local Testing
```bash
npm run dev
# Visit http://localhost:3000/en/auth/login
# Create account
# Test login
# Access /dashboard (protected route)
```

### Real-time Testing
- Add sensor data in Supabase
- Real-time component updates automatically

### Stripe Webhook Testing
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

---

## 🛠️ Environment Variables

### Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Where to Get Them
- **Supabase:** https://supabase.com (Settings > API)
- **Stripe:** https://stripe.com (Developers > API Keys)

---

## 💡 Usage Examples

### Login in a Component
```typescript
'use client'
import { loginWithEmail } from '@/lib/actions/auth'

export function LoginForm() {
  const handleLogin = async (email: string, password: string) => {
    const result = await loginWithEmail(email, password, 'en')
    if (result.error) {
      alert(result.error)
    } else {
      router.push('/dashboard')
    }
  }
}
```

### Real-time Sensor Data
```typescript
'use client'
import { RealtimeSensors } from '@/components/dashboard/realtime-sensors'

export default function Dashboard() {
  return <RealtimeSensors siloId="silo-uuid" />
}
```

### Server-side Database Query
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getSilo(siloId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('silos')
    .select()
    .eq('id', siloId)
    .single()
  return data
}
```

---

## 📊 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | User profiles | id, email, full_name, role |
| **silos** | Grain containers | id, tenant_id, name, capacity_kg |
| **sensors** | IoT sensors | id, silo_id, sensor_type, last_reading_value |
| **actuators** | Control devices | id, silo_id, actuator_type, status |
| **grain_batches** | Inventory | id, silo_id, grain_type, quantity_kg |
| **subscriptions** | Stripe data | id, user_id, stripe_subscription_id, status |

All tables have Row Level Security for tenant isolation.

---

## ✅ Deployment Checklist

- [ ] Add 5 environment variables to Vercel
- [ ] Run SQL schema in Supabase
- [ ] Enable Email auth in Supabase
- [ ] Configure Stripe webhook endpoint
- [ ] Test login flow locally
- [ ] Deploy to production
- [ ] Update Stripe webhook URL to production domain

**See DEPLOYMENT_CHECKLIST.md for detailed guide.**

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| Missing env vars | Check Vercel Settings > Vars |
| Can't login | Run SQL schema in Supabase |
| Webhook failures | Verify webhook secret |
| Real-time not working | Check RLS policies |
| 404 on routes | Check middleware protected routes |

**See SETUP_INSTRUCTIONS.md for more troubleshooting.**

---

## 📈 What Changed vs. What's Same

### Changed
- ✅ Authentication now uses Supabase (not Firebase)
- ✅ Login page integrated with Supabase
- ✅ Middleware now checks Supabase sessions
- ✅ New real-time sensor component available
- ✅ Stripe webhook integration added

### Unchanged
- ❌ All UI/styling completely preserved
- ❌ No breaking changes to components
- ❌ i18n locale routing intact
- ❌ Responsive design maintained
- ❌ Existing pages and routing same

---

## 🎯 Next Steps

1. **Read:** Start with `SETUP_INSTRUCTIONS.md`
2. **Configure:** Add environment variables
3. **Deploy:** Run SQL schema
4. **Test:** Follow testing checklist
5. **Reference:** Use `API_REFERENCE.md` during development

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs

---

## ⭐ Features at a Glance

| Feature | Status | Docs |
|---------|--------|------|
| Email/Password Auth | ✅ | API_REFERENCE.md |
| Session Management | ✅ | SUPABASE_INTEGRATION_GUIDE.md |
| Protected Routes | ✅ | API_REFERENCE.md |
| Real-time Sensors | ✅ | API_REFERENCE.md |
| Stripe Integration | ✅ | SETUP_INSTRUCTIONS.md |
| Multi-tenant RLS | ✅ | SUPABASE_INTEGRATION_GUIDE.md |
| TypeScript Support | ✅ | API_REFERENCE.md |
| Production Ready | ✅ | IMPLEMENTATION_SUMMARY.md |

---

## 🎉 Summary

Your GrainHero platform now has:

✨ **Enterprise-grade authentication** with Supabase
✨ **Real-time IoT data** with live subscriptions
✨ **Payment processing** with Stripe
✨ **Multi-tenant database** with RLS
✨ **Production-ready code** with TypeScript
✨ **Zero UI changes** - completely preserved design
✨ **Comprehensive documentation** with 6 guides
✨ **Ready to deploy** - just add env vars and go!

**Estimated setup time: 45-60 minutes**

Start with `SETUP_INSTRUCTIONS.md` and you'll be live in under an hour! 🚀

---

## 📄 Files Included

### Code Files (Production-ready)
- `lib/supabase/server.ts` - Server auth client
- `lib/supabase/client.ts` - Client auth client
- `lib/actions/auth.ts` - Login action
- `app/api/webhooks/stripe/route.ts` - Payment webhook
- `components/dashboard/realtime-sensors.tsx` - Real-time UI
- `scripts/001_supabase_schema.sql` - Database schema

### Documentation (6 comprehensive guides)
- `SETUP_INSTRUCTIONS.md` - Setup guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment phases
- `API_REFERENCE.md` - API documentation
- `SUPABASE_INTEGRATION_GUIDE.md` - Architecture
- `IMPLEMENTATION_SUMMARY.md` - Overview
- `FILE_STRUCTURE.md` - File organization

### Configuration
- `.env.local.example` - Environment template
- `package.json` - Updated dependencies
- `middleware.ts` - Updated route protection

---

Good luck with your GrainHero platform! 🌾✨

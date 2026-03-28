# GrainHero API Reference

Complete reference for all Supabase utilities and server actions integrated into your GrainHero platform.

---

## 🔐 Authentication Server Actions

### `loginWithEmail(email, password, locale)`
**File:** `lib/actions/auth.ts`

Authenticates user with email and password via Supabase Auth.

**Parameters:**
- `email` (string) - User's email
- `password` (string) - User's password
- `locale` (string) - User's locale preference (e.g., 'en', 'es')

**Returns:**
```typescript
{
  error: string | null,
  data: { id: string, email: string } | null
}
```

**Usage:**
```typescript
'use client'
import { loginWithEmail } from '@/lib/actions/auth'

const handleLogin = async () => {
  const result = await loginWithEmail(email, password, locale)
  if (result.error) {
    console.error(result.error)
  } else {
    // Login successful
    router.push('/dashboard')
  }
}
```

---

## 🔌 Supabase Utilities

### Server-Side Client
**File:** `lib/supabase/server.ts`

#### `createClient()`
Creates an authenticated Supabase client for server-side operations.

**Returns:** Supabase server client with auth session

**Usage:**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}
```

#### `createAdminClient()`
Creates a Supabase admin client with service role permissions. Use this for operations that bypass RLS (like Stripe webhooks).

**Returns:** Supabase admin client

**Usage:**
```typescript
'use server'
import { createAdminClient } from '@/lib/supabase/server'

export async function createSubscription(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, plan_type: 'premium' })
  return { data, error }
}
```

---

### Client-Side Client
**File:** `lib/supabase/client.ts`

#### `createClient()`
Creates a Supabase client for client-side operations (browser).

**Returns:** Supabase browser client

**Usage:**
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export function MyComponent() {
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to real-time updates
    const subscription = supabase
      .from('sensors')
      .on('*', payload => {
        console.log('Sensor updated:', payload)
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [])
}
```

---

## 📊 Real-time Components

### RealtimeSensors Component
**File:** `components/dashboard/realtime-sensors.tsx`

Real-time sensor data visualization with automatic updates via Supabase subscriptions.

**Props:**
```typescript
{
  siloId: string  // UUID of the silo to monitor
}
```

**Features:**
- Real-time sensor readings from Supabase
- Line chart visualization with Recharts
- Automatic subscription to sensor table changes
- Temperature, humidity, pressure support
- Error handling and loading states

**Usage:**
```typescript
import { RealtimeSensors } from '@/components/dashboard/realtime-sensors'

export default function SiloDashboard() {
  return (
    <RealtimeSensors siloId="your-silo-uuid" />
  )
}
```

---

## 🔐 Middleware & Route Protection

### Middleware
**File:** `middleware.ts`

Protects authenticated routes and handles session validation.

**Protected Routes:**
- `/dashboard`
- `/settings`
- `/silos`
- `/sensors`
- `/analytics`

**Behavior:**
- Checks Supabase session on protected routes
- Redirects unauthenticated users to `/[locale]/auth/login`
- Preserves redirect_to query parameter for post-login navigation
- Works with i18n locale routing

**Customizing Protected Routes:**
Edit the `protectedRoutes` array in `middleware.ts`:
```typescript
const protectedRoutes = ['/dashboard', '/settings', '/silos', '/sensors', '/analytics']
```

---

## 💳 Stripe Webhooks

### Webhook Handler
**File:** `app/api/webhooks/stripe/route.ts`

Handles all Stripe events and updates subscription data in Supabase.

**Endpoint:** `POST /api/webhooks/stripe`

**Supported Events:**
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed

**Webhook Verification:**
All webhooks are cryptographically verified using `STRIPE_WEBHOOK_SECRET`.

**Example Webhook Event Processing:**
```typescript
// Inside webhook handler
if (event.type === 'customer.subscription.created') {
  const subscription = event.data.object
  
  // Update Supabase with subscription info
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      plan_type: subscription.items.data[0].price.nickname,
      status: subscription.status,
    })
}
```

---

## 📝 Database Operations Examples

### Reading Data
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getSilo(siloId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('silos')
    .select('*')
    .eq('id', siloId)
    .single()
  
  return { data, error }
}
```

### Writing Data
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function createSilo(siloData: any) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('silos')
    .insert([siloData])
  
  return { data, error }
}
```

### Real-time Subscriptions
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export function useSensorUpdates(siloId: string) {
  const [sensors, setSensors] = useState([])
  
  useEffect(() => {
    const supabase = createClient()
    
    const subscription = supabase
      .from('sensors')
      .on('*', payload => {
        if (payload.new.silo_id === siloId) {
          setSensors(prev => [
            ...prev.filter(s => s.id !== payload.new.id),
            payload.new
          ])
        }
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [siloId])
  
  return sensors
}
```

---

## 🆔 Environment Variables

All required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_test_51234567890...
STRIPE_WEBHOOK_SECRET=whsec_1234567890...
```

---

## 🚨 Error Handling

All operations return `{ data, error }` tuple pattern:

```typescript
const { data, error } = await supabase
  .from('table')
  .select()

if (error) {
  console.error('Operation failed:', error.message)
  // Handle error
} else {
  console.log('Success:', data)
}
```

---

## 🔍 RLS Policies (Row Level Security)

Data access is controlled by RLS policies:

- **Users** can only see their own profile
- **Silos** are filtered by tenant_id
- **Sensors** are filtered by tenant_id through silo relationship
- **Subscriptions** are scoped to the authenticated user

RLS is enforced at the database level, even for admin clients via service role.

---

## 📚 Related Files

- **Auth Flow:** `app/[locale]/auth/login/page.tsx`
- **Database Schema:** `scripts/001_supabase_schema.sql`
- **Setup Guide:** `SETUP_INSTRUCTIONS.md`
- **Integration Guide:** `SUPABASE_INTEGRATION_GUIDE.md`

---

## 🔗 Quick Links

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript SDK](https://supabase.com/docs/reference/javascript/introduction)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Next.js Server Actions](https://nextjs.org/docs/guides/server-actions)

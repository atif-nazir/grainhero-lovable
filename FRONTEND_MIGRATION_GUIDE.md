# GrainHero Frontend Migration Guide
## Supabase Backend Integration

Your Supabase backend is **LIVE** at:
- **URL**: `https://uhgyeulteciiekxmdcpx.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ3lldWx0ZWNpaWVreG1kY3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODE2NDksImV4cCI6MjA5MDI1NzY0OX0.1XQ9SOynXWl_j_OAWWFY2i-8_jRsSaVKI11z40Gx9r8`

### Edge Function URLs (all deployed & tested ✅)
| Function | URL | Method |
|---|---|---|
| IoT Ingest | `https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/iot-ingest` | POST |
| Stripe Webhook | `https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/stripe-webhook` | POST |
| Predict Spoilage | `https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/predict-spoilage` | POST |
| Fetch Weather | `https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/fetch-weather` | POST |
| Invite User | `https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/invite-user` | POST |
| Actuator Control | `https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/actuator-control` | POST |

---

## 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## 2. Create `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(typeof window !== 'undefined' ? { storage: localStorage } : {}),
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

## 3. Vercel Environment Variables

Add these to your Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://uhgyeulteciiekxmdcpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZ3lldWx0ZWNpaWVreG1kY3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODE2NDksImV4cCI6MjA5MDI1NzY0OX0.1XQ9SOynXWl_j_OAWWFY2i-8_jRsSaVKI11z40Gx9r8
```

---

## 4. Authentication Migration

### Replace Login (`app/[locale]/auth/login/page.tsx`)

**Before (API):**
```typescript
const res = await api.post('/api/auth/login', { email, password });
localStorage.setItem('token', res.data.token);
```

**After (Supabase):**
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
// Session is automatically managed - no token storage needed
```

### Replace Signup (`app/[locale]/auth/signup/page.tsx`)

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name: fullName },
    emailRedirectTo: `${window.location.origin}/auth/login`,
  },
});
```

### Replace Password Reset

```typescript
// Request reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
});

// Apply new password (on reset page)
await supabase.auth.updateUser({ password: newPassword });
```

### Replace AuthGuard (`components/AuthGuard.tsx`)

```typescript
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function AuthGuard({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!user) { redirect('/auth/login'); return null; }
  return children;
}
```

### Get User Profile + Role

```typescript
async function fetchUserProfile(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenant:tenants(*)')
    .eq('id', userId)
    .single();

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return { ...profile, role: roleData?.role || 'pending' };
}
```

### Auth State Provider (`app/[locale]/providers.tsx`)

```typescript
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any;
  role: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      else { setProfile(null); setRole('pending'); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
    setProfile(p);
    setRole(r?.role || 'pending');
    setLoading(false);
  }

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 5. API Call Migration Reference

### Pattern: Replace `api.get()` → `supabase.from().select()`

Every old API call maps to a direct Supabase query. RLS policies handle all authorization automatically.

---

### Dashboard (`app/[locale]/(authenticated)/dashboard/page.tsx`)

**Before:**
```typescript
const res = await api.get('/api/dashboard/stats');
```

**After:**
```typescript
const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
const tenantId = profile?.tenant_id;

// Parallel queries
const [silosRes, batchesRes, alertsRes, predictionsRes] = await Promise.all([
  supabase.from('silos').select('*, warehouse:warehouses!inner(tenant_id)').eq('warehouse.tenant_id', tenantId),
  supabase.from('grain_batches').select('*').in('silo_id', siloIds),
  supabase.from('grain_alerts').select('*').eq('tenant_id', tenantId).eq('status', 'active'),
  supabase.from('spoilage_predictions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
]);
```

---

### Silos Page (`app/[locale]/(authenticated)/silos/page.tsx`)

**Before:**
```typescript
const res = await api.get('/api/silos');
```

**After:**
```typescript
const { data: silos } = await supabase
  .from('silos')
  .select(`
    *,
    warehouse:warehouses(name, tenant_id),
    grain_batches(id, batch_code, grain_type, quantity_kg, status),
    sensor_devices(id, device_id, device_name, status, last_seen)
  `)
  .order('created_at', { ascending: false });
```

**Create Silo:**
```typescript
const { data, error } = await supabase.from('silos').insert({
  warehouse_id: selectedWarehouseId,
  name: siloName,
  capacity_kg: capacity,
}).select().single();
```

---

### Sensors Page (`app/[locale]/(authenticated)/sensors/page.tsx`)

**Before:**
```typescript
const res = await api.get('/api/sensors');
const readings = await api.get('/api/sensors/readings?siloId=...');
```

**After:**
```typescript
// All devices
const { data: devices } = await supabase
  .from('sensor_devices')
  .select('*, silo:silos(name, warehouse_id)')
  .order('last_seen', { ascending: false });

// Recent readings for a silo
const { data: readings } = await supabase
  .from('sensor_readings')
  .select('*')
  .eq('silo_id', siloId)
  .order('timestamp', { ascending: false })
  .limit(100);
```

---

### Alerts Page (`app/[locale]/(authenticated)/alerts/page.tsx`)

**Before:**
```typescript
const res = await api.get('/api/alerts');
```

**After:**
```typescript
const { data: alerts } = await supabase
  .from('grain_alerts')
  .select('*, silo:silos(name)')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

// Acknowledge alert
await supabase.from('grain_alerts').update({
  status: 'acknowledged',
  acknowledged_by: user.id,
  acknowledged_at: new Date().toISOString(),
}).eq('id', alertId);
```

---

### Grain Batches (`app/[locale]/(authenticated)/grain-batches/page.tsx`)

```typescript
const { data: batches } = await supabase
  .from('grain_batches')
  .select('*, silo:silos(name)')
  .order('created_at', { ascending: false });

// Create batch
await supabase.from('grain_batches').insert({
  silo_id: selectedSiloId,
  batch_code: `BATCH-${Date.now()}`,
  grain_type: 'Rice',
  quantity_kg: quantity,
  moisture_content: moisture,
  supplier_name: supplier,
}).select().single();
```

---

### Maintenance Page

```typescript
const { data: records } = await supabase
  .from('maintenance_records')
  .select('*, silo:silos(name)')
  .eq('tenant_id', tenantId)
  .order('scheduled_date', { ascending: false });

// Create maintenance record
await supabase.from('maintenance_records').insert({
  tenant_id: tenantId,
  silo_id: selectedSiloId,
  title: title,
  maintenance_type: 'routine',
  scheduled_date: date,
  description: description,
});
```

---

### Buyers Page

```typescript
const { data: buyers } = await supabase
  .from('buyers')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('name');

await supabase.from('buyers').insert({
  tenant_id: tenantId,
  name: buyerName,
  buyer_type: 'wholesaler',
  company_name: company,
  contact: { phone, email, address },
});
```

---

### Notifications Page

```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('recipient_id', user.id)
  .order('created_at', { ascending: false });

// Mark as read
await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);

// Mark all as read
await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false);
```

---

### Activity Logs

```typescript
const { data: logs } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })
  .limit(50);
```

---

### Insurance

```typescript
// Policies
const { data: policies } = await supabase
  .from('insurance_policies')
  .select('*, claims:insurance_claims(count)')
  .eq('tenant_id', tenantId);

// Claims
const { data: claims } = await supabase
  .from('insurance_claims')
  .select('*, policy:insurance_policies(policy_number, provider)')
  .eq('tenant_id', tenantId);
```

---

### AI Predictions

```typescript
const { data: predictions } = await supabase
  .from('spoilage_predictions')
  .select('*, silo:silos(name)')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

// Trigger new prediction via edge function
const { data, error } = await supabase.functions.invoke('predict-spoilage', {
  body: { silo_id: selectedSiloId },
});
```

---

### Payments / Billing

```typescript
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('status', 'active')
  .single();
```

---

### Super Admin Dashboard

```typescript
// Only works for users with super_admin role (RLS enforced)
const [tenants, users, subscriptions, alerts, batches, silos] = await Promise.all([
  supabase.from('tenants').select('*', { count: 'exact' }),
  supabase.from('profiles').select('*', { count: 'exact' }).eq('status', 'active'),
  supabase.from('subscriptions').select('*').eq('status', 'active'),
  supabase.from('grain_alerts').select('*', { count: 'exact' }).eq('priority', 'critical').eq('status', 'active'),
  supabase.from('grain_batches').select('*', { count: 'exact' }),
  supabase.from('silos').select('*', { count: 'exact' }),
]);

const mrr = subscriptions.data?.reduce((sum, s) => sum + (s.price_per_month || 0), 0) || 0;
```

---

### Warehouses

```typescript
const { data: warehouses } = await supabase
  .from('warehouses')
  .select('*, silos(id, name, status), tenant:tenants(name)')
  .eq('tenant_id', tenantId);
```

---

### Profile Page

```typescript
// Get profile
const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

// Update profile
await supabase.from('profiles').update({
  name: newName,
  phone: newPhone,
}).eq('id', user.id);

// Update password
await supabase.auth.updateUser({ password: newPassword });
```

---

### Actuator Control

```typescript
// Get actuators
const { data: actuators } = await supabase
  .from('actuators')
  .select('*, silo:silos(name)')
  .eq('tenant_id', tenantId);

// Control actuator via edge function
const { data, error } = await supabase.functions.invoke('actuator-control', {
  body: { device_id: deviceId, target_state: { fan: true, speed: 75 } },
});
```

---

### Invite Team Member

```typescript
const { data, error } = await supabase.functions.invoke('invite-user', {
  body: {
    email: inviteEmail,
    role: 'technician', // or 'manager'
    warehouse_id: selectedWarehouseId,
  },
});
```

---

## 6. Real-time IoT Dashboard

Replace Firebase Realtime Database with Supabase Realtime:

```typescript
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function useRealtimeSensorData(siloId: string) {
  const [latestReading, setLatestReading] = useState(null);

  useEffect(() => {
    // Fetch initial data
    supabase
      .from('sensor_readings')
      .select('*')
      .eq('silo_id', siloId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setLatestReading(data));

    // Subscribe to new readings
    const channel = supabase
      .channel(`sensor-${siloId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `silo_id=eq.${siloId}`,
        },
        (payload) => {
          setLatestReading(payload.new);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [siloId]);

  return latestReading;
}

// For alerts
export function useRealtimeAlerts(tenantId: string) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel(`alerts-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'grain_alerts',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          setAlerts(prev => [payload.new, ...prev]);
          // Show toast notification
          toast.warning(payload.new.title);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  return alerts;
}
```

---

## 7. Stripe Webhook URL

**Add this webhook URL in your Stripe Dashboard:**

```
https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/stripe-webhook
```

**Events to subscribe to:**
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## 8. ESP32 Firmware Update

Update your ESP32 firmware to POST to the new endpoint:

```cpp
// OLD:
// const char* serverUrl = "http://192.168.137.1:5000/api/firebase/sensor-data";

// NEW:
const char* serverUrl = "https://uhgyeulteciiekxmdcpx.supabase.co/functions/v1/iot-ingest";
const char* deviceApiKey = "YOUR_IOT_DEVICE_API_KEY"; // same key stored in secrets

// In your HTTP POST:
http.begin(client, serverUrl);
http.addHeader("Content-Type", "application/json");
http.addHeader("x-device-api-key", deviceApiKey);

String payload = "{\"device_id\":\"ESP32_001\",\"temperature\":" + String(temp)
  + ",\"humidity\":" + String(hum) + ",\"co2\":" + String(co2)
  + ",\"voc\":" + String(voc) + ",\"moisture\":" + String(moisture) + "}";

int httpCode = http.POST(payload);
```

---

## 9. Files to DELETE from Frontend

Remove all backend-related files (no longer needed):

```
lib/api.ts                              # Old API wrapper
lib/firebase.ts                         # Firebase client
hooks/useFirebaseSensor.ts              # Firebase sensor hook
hooks/useEnvironmentalData.ts           # Old environmental hook
app/api/                                # All API routes (proxy layer)
config.ts                              # Old backend URL config
farmHomeBackend-main/                   # Entire old backend
SmartBin-RiceSpoilage-main/            # ML training files (now in Lovable AI)
```

---

## 10. Database Schema Reference

### Tables (21 total)
| Table | Purpose |
|---|---|
| `tenants` | Multi-tenant organizations |
| `profiles` | User profiles (auto-created on signup) |
| `user_roles` | Role assignments (super_admin, admin, manager, technician, pending) |
| `warehouses` | Physical warehouse locations |
| `silos` | Grain storage silos within warehouses |
| `grain_batches` | Grain batch tracking |
| `sensor_devices` | IoT device registry |
| `sensor_readings` | Telemetry data (realtime enabled) |
| `actuators` | Fan/ventilation actuators |
| `grain_alerts` | Threshold & spoilage alerts (realtime enabled) |
| `advisories` | AI-generated advisories |
| `spoilage_predictions` | ML risk predictions |
| `notifications` | User notifications (realtime enabled) |
| `subscriptions` | Stripe subscription tracking |
| `payments` | Payment history |
| `buyers` | Buyer management |
| `maintenance_records` | Maintenance scheduling |
| `activity_logs` | Audit trail |
| `insurance_policies` | Insurance tracking |
| `insurance_claims` | Insurance claims |
| `weather_data` | Weather data for ML context |

### RLS Policy Pattern
All tables use Row-Level Security. The pattern is:
- **super_admin** → full access to everything
- **admin** → access only their tenant's data
- **manager/technician** → access only their warehouse's data
- No manual authorization code needed in frontend!

---

## Summary Checklist

- [ ] Add Supabase env vars to Vercel
- [ ] Install `@supabase/supabase-js`
- [ ] Create `lib/supabase.ts`
- [ ] Replace auth logic (login, signup, reset, guard)
- [ ] Create AuthProvider with `onAuthStateChange`
- [ ] Replace all `api.get/post` calls with `supabase.from().select/insert/update`
- [ ] Add realtime subscriptions for IoT dashboard
- [ ] Delete old API routes, Firebase, and backend files
- [ ] Add Stripe webhook URL to Stripe Dashboard
- [ ] Update ESP32 firmware to POST to new edge function URL
- [ ] Create first super_admin user manually (see below)

### Creating Your Super Admin

After deploying, sign up with your email, then run this SQL (via Lovable Cloud):

```sql
-- Replace with your actual user ID after signup
UPDATE public.user_roles SET role = 'super_admin' WHERE user_id = '<your-user-uuid>';
```

Or ask me to do it once you've signed up!

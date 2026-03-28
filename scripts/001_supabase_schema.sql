-- ============================================================================
-- GRAINHERO SUPABASE SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- This schema sets up the complete GrainHero backend for Supabase.
-- Copy and paste this entire block into your Supabase SQL Editor.

-- Drop any partially created tables from previous runs so it's a fresh slate
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.grain_batches CASCADE;
DROP TABLE IF EXISTS public.actuators CASCADE;
DROP TABLE IF EXISTS public.sensors CASCADE;
DROP TABLE IF EXISTS public.silos CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;


-- ============================================================================
-- 1. USERS TABLE (Extended profile linked to auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('super-admin', 'admin', 'buyer')),
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. SILOS TABLE (Grain storage containers with capacity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.silos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  capacity_kg NUMERIC(12, 2) NOT NULL,
  current_load_kg NUMERIC(12, 2) DEFAULT 0,
  grain_type TEXT,
  last_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_capacity CHECK (current_load_kg <= capacity_kg)
);

-- ============================================================================
-- 3. SENSORS TABLE (IoT sensor registry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  silo_id UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  sensor_name TEXT NOT NULL,
  sensor_type TEXT NOT NULL, -- 'temperature', 'humidity', 'pressure', etc.
  is_active BOOLEAN DEFAULT TRUE,
  last_reading_at TIMESTAMP WITH TIME ZONE,
  last_reading_value NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. ACTUATORS TABLE (IoT actuators for environmental control)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.actuators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  silo_id UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  actuator_name TEXT NOT NULL,
  actuator_type TEXT NOT NULL, -- 'fan', 'heater', 'pump', etc.
  is_active BOOLEAN DEFAULT TRUE,
  current_state TEXT, -- 'on', 'off', 'auto'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. GRAIN_BATCHES TABLE (Inventory tracking with traceability)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.grain_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  silo_id UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  grain_type TEXT NOT NULL,
  quantity_kg NUMERIC(12, 2) NOT NULL,
  moisture_content NUMERIC(5, 2),
  purity_percentage NUMERIC(5, 2),
  traceability_hash TEXT UNIQUE, -- SHA256 hash for blockchain-like traceability
  source TEXT,
  harvest_date DATE,
  intake_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. SUBSCRIPTIONS TABLE (Stripe subscription management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_session_id TEXT,
  plan_name TEXT NOT NULL, -- 'starter', 'pro', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'paused'
  current_period_start DATE,
  current_period_end DATE,
  cancel_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actuators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE RLS POLICIES
-- ============================================================================
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Super admin can view all users
CREATE POLICY "Super admin can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super-admin'
    )
  );

-- ============================================================================
-- SILOS TABLE RLS POLICIES (Tenant isolation)
-- ============================================================================
-- Users can only read silos from their tenant
CREATE POLICY "Users can read own tenant silos"
  ON public.silos
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Users can only write to silos in their tenant
CREATE POLICY "Users can write own tenant silos"
  ON public.silos
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Users can update silos in their tenant
CREATE POLICY "Users can update own tenant silos"
  ON public.silos
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- SENSORS TABLE RLS POLICIES (Tenant isolation)
-- ============================================================================
CREATE POLICY "Users can read own tenant sensors"
  ON public.sensors
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can write own tenant sensors"
  ON public.sensors
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant sensors"
  ON public.sensors
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- ACTUATORS TABLE RLS POLICIES (Tenant isolation)
-- ============================================================================
CREATE POLICY "Users can read own tenant actuators"
  ON public.actuators
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can write own tenant actuators"
  ON public.actuators
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant actuators"
  ON public.actuators
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- GRAIN_BATCHES TABLE RLS POLICIES (Tenant isolation)
-- ============================================================================
CREATE POLICY "Users can read own tenant grain batches"
  ON public.grain_batches
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can write own tenant grain batches"
  ON public.grain_batches
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant grain batches"
  ON public.grain_batches
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- SUBSCRIPTIONS TABLE RLS POLICIES (Tenant isolation)
-- ============================================================================
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
  );

-- Service role (for Stripe webhooks) can update subscriptions
CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (true); -- Protected via service role token in webhook handler

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX idx_silos_tenant_id ON public.silos(tenant_id);
CREATE INDEX idx_sensors_tenant_id ON public.sensors(tenant_id);
CREATE INDEX idx_sensors_silo_id ON public.sensors(silo_id);
CREATE INDEX idx_actuators_tenant_id ON public.actuators(tenant_id);
CREATE INDEX idx_actuators_silo_id ON public.actuators(silo_id);
CREATE INDEX idx_grain_batches_tenant_id ON public.grain_batches(tenant_id);
CREATE INDEX idx_grain_batches_silo_id ON public.grain_batches(silo_id);
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_silos_updated_at BEFORE UPDATE ON public.silos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON public.sensors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actuators_updated_at BEFORE UPDATE ON public.actuators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grain_batches_updated_at BEFORE UPDATE ON public.grain_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA SETUP
-- ============================================================================

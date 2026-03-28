-- GrainHero Database Schema for Supabase
-- This migration creates the core tables for the IoT grain management platform

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =======================
-- 1. CUSTOM TYPES
-- =======================
CREATE TYPE user_role_enum AS ENUM ('super-admin', 'admin', 'buyer', 'technician', 'manager');
CREATE TYPE device_status_enum AS ENUM ('active', 'inactive', 'disconnected', 'error', 'maintenance');
CREATE TYPE batch_status_enum AS ENUM ('stored', 'in-transit', 'sold', 'damaged', 'archived');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'paused', 'cancelled', 'expired');

-- =======================
-- 2. USERS TABLE (linked to auth.users)
-- =======================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role_enum NOT NULL DEFAULT 'buyer',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================
-- 3. SILOS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS silos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES users(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  capacity_kg DECIMAL(12, 2) NOT NULL,
  current_grain_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================
-- 4. SENSORS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(tenant_id) ON DELETE CASCADE,
  sensor_code TEXT UNIQUE NOT NULL,
  sensor_name TEXT NOT NULL,
  sensor_type TEXT NOT NULL, -- e.g., 'temperature', 'humidity', 'pressure'
  status device_status_enum NOT NULL DEFAULT 'active',
  last_reading_at TIMESTAMP WITH TIME ZONE,
  last_reading_value DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================
-- 5. ACTUATORS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS actuators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(tenant_id) ON DELETE CASCADE,
  actuator_code TEXT UNIQUE NOT NULL,
  actuator_name TEXT NOT NULL,
  actuator_type TEXT NOT NULL, -- e.g., 'pump', 'valve', 'motor'
  status device_status_enum NOT NULL DEFAULT 'active',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================
-- 6. GRAIN_BATCHES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS grain_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(tenant_id) ON DELETE CASCADE,
  batch_code TEXT UNIQUE NOT NULL,
  batch_name TEXT NOT NULL,
  grain_type TEXT NOT NULL,
  quantity_kg DECIMAL(12, 2) NOT NULL,
  quality_score DECIMAL(5, 2),
  status batch_status_enum DEFAULT 'stored',
  spoilage_risk DECIMAL(5, 2) DEFAULT 0,
  traceability_hash TEXT,
  moisture_content DECIMAL(5, 2),
  temperature DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  harvestDate TIMESTAMP WITH TIME ZONE
);

-- =======================
-- 7. SUBSCRIPTIONS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES users(tenant_id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_type TEXT NOT NULL, -- 'starter', 'professional', 'enterprise'
  status subscription_status_enum DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================
-- 8. ROW LEVEL SECURITY (RLS)
-- =======================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE silos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuators ENABLE ROW LEVEL SECURITY;
ALTER TABLE grain_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- USERS: Can only see their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- USERS: Super-admin can see all users
CREATE POLICY "super_admin_users_all" ON users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'super-admin'
    )
  );

-- SILOS: Tenant can only see their own silos
CREATE POLICY "silos_select_own" ON silos
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "silos_insert_own" ON silos
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "silos_update_own" ON silos
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "silos_delete_own" ON silos
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- SENSORS: Tenant can only see their own sensors
CREATE POLICY "sensors_select_own" ON sensors
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "sensors_insert_own" ON sensors
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "sensors_update_own" ON sensors
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- ACTUATORS: Tenant can only see their own actuators
CREATE POLICY "actuators_select_own" ON actuators
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "actuators_insert_own" ON actuators
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "actuators_update_own" ON actuators
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- GRAIN_BATCHES: Tenant can only see their own batches
CREATE POLICY "grain_batches_select_own" ON grain_batches
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "grain_batches_insert_own" ON grain_batches
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "grain_batches_update_own" ON grain_batches
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- SUBSCRIPTIONS: Tenant can only see their own subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Service role can bypass RLS for webhook operations
CREATE POLICY "subscriptions_service_role" ON subscriptions
  FOR ALL USING (
    (current_setting('request.jwt.claims'::text, true)::json->>'role') = 'service_role'
  );

-- =======================
-- 9. INDEXES
-- =======================
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_silos_tenant_id ON silos(tenant_id);
CREATE INDEX idx_sensors_silo_id ON sensors(silo_id);
CREATE INDEX idx_sensors_tenant_id ON sensors(tenant_id);
CREATE INDEX idx_sensors_status ON sensors(status);
CREATE INDEX idx_actuators_silo_id ON actuators(silo_id);
CREATE INDEX idx_actuators_tenant_id ON actuators(tenant_id);
CREATE INDEX idx_grain_batches_silo_id ON grain_batches(silo_id);
CREATE INDEX idx_grain_batches_tenant_id ON grain_batches(tenant_id);
CREATE INDEX idx_grain_batches_status ON grain_batches(status);
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- =======================
-- 10. CREATED TRIGGER (Auto-update updated_at)
-- =======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_silos_updated_at BEFORE UPDATE ON silos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actuators_updated_at BEFORE UPDATE ON actuators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grain_batches_updated_at BEFORE UPDATE ON grain_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

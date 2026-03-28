-- GrainHero Database Schema with Row Level Security
-- This schema creates all tables needed for the IoT grain management platform

-- 1. USERS TABLE (references Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. SILOS TABLE (grain storage structures)
CREATE TABLE IF NOT EXISTS public.silos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  capacity_tons DECIMAL(10, 2),
  current_grain TEXT,
  grain_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. SENSORS TABLE (IoT sensors)
CREATE TABLE IF NOT EXISTS public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  sensor_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_reading DECIMAL(10, 2),
  reading_unit TEXT,
  battery_level DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_reading_at TIMESTAMP WITH TIME ZONE
);

-- 4. SENSOR READINGS TABLE (time-series data)
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
  reading_value DECIMAL(10, 2) NOT NULL,
  reading_unit TEXT,
  temperature DECIMAL(10, 2),
  humidity DECIMAL(10, 2),
  status TEXT DEFAULT 'ok',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Index for faster time-series queries
  CONSTRAINT check_reading_value CHECK (reading_value >= 0)
);

-- 5. ACTUATORS TABLE (fans, vents, etc.)
CREATE TABLE IF NOT EXISTS public.actuators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  actuator_type TEXT NOT NULL,
  status TEXT DEFAULT 'off' CHECK (status IN ('on', 'off', 'error')),
  last_activated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. GRAIN BATCHES TABLE (grain inventory)
CREATE TABLE IF NOT EXISTS public.grain_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  batch_number TEXT UNIQUE NOT NULL,
  grain_type TEXT NOT NULL,
  quantity_tons DECIMAL(10, 2),
  quality_score DECIMAL(5, 2),
  harvest_date DATE,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SUBSCRIPTIONS TABLE (Stripe subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'canceled', 'past_due')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. ALERTS TABLE (sensor alerts and notifications)
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. AUDIT LOG TABLE (for compliance)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actuators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- USERS RLS Policies
CREATE POLICY "Users can view their own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- SILOS RLS Policies
CREATE POLICY "Users can view their own silos" ON public.silos 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own silos" ON public.silos 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own silos" ON public.silos 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own silos" ON public.silos 
  FOR DELETE USING (auth.uid() = user_id);

-- SENSORS RLS Policies (through silo)
CREATE POLICY "Users can view sensors in their silos" ON public.sensors 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = sensors.silo_id AND silos.user_id = auth.uid())
  );

CREATE POLICY "Users can insert sensors in their silos" ON public.sensors 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = silo_id AND silos.user_id = auth.uid())
  );

CREATE POLICY "Users can update sensors in their silos" ON public.sensors 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = sensors.silo_id AND silos.user_id = auth.uid())
  );

CREATE POLICY "Users can delete sensors in their silos" ON public.sensors 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = sensors.silo_id AND silos.user_id = auth.uid())
  );

-- SENSOR READINGS RLS Policies
CREATE POLICY "Users can view readings for their sensors" ON public.sensor_readings 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sensors 
      JOIN public.silos ON silos.id = sensors.silo_id
      WHERE sensors.id = sensor_readings.sensor_id 
      AND silos.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert readings" ON public.sensor_readings 
  FOR INSERT WITH CHECK (true);

-- ACTUATORS RLS Policies
CREATE POLICY "Users can view actuators in their silos" ON public.actuators 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = actuators.silo_id AND silos.user_id = auth.uid())
  );

CREATE POLICY "Users can manage actuators in their silos" ON public.actuators 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = silo_id AND silos.user_id = auth.uid())
  );

-- GRAIN BATCHES RLS Policies
CREATE POLICY "Users can view their grain batches" ON public.grain_batches 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = grain_batches.silo_id AND silos.user_id = auth.uid())
  );

CREATE POLICY "Users can insert grain batches" ON public.grain_batches 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.silos WHERE silos.id = silo_id AND silos.user_id = auth.uid())
  );

-- SUBSCRIPTIONS RLS Policies
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions 
  FOR UPDATE USING (auth.uid() = user_id);

-- ALERTS RLS Policies
CREATE POLICY "Users can view their own alerts" ON public.alerts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.alerts 
  FOR UPDATE USING (auth.uid() = user_id);

-- AUDIT LOG RLS Policy
CREATE POLICY "Users can view their own audit logs" ON public.audit_log 
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- INDEXES for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_silos_user_id ON public.silos(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_silo_id ON public.sensors(silo_id);
CREATE INDEX IF NOT EXISTS idx_sensors_sensor_id ON public.sensors(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON public.sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at ON public.sensor_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actuators_silo_id ON public.actuators(silo_id);
CREATE INDEX IF NOT EXISTS idx_grain_batches_silo_id ON public.grain_batches(silo_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);

-- ============================================
-- TRIGGERS for Auto-timestamps
-- ============================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_silos_timestamp
BEFORE UPDATE ON public.silos
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_sensors_timestamp
BEFORE UPDATE ON public.sensors
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_actuators_timestamp
BEFORE UPDATE ON public.actuators
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_grain_batches_timestamp
BEFORE UPDATE ON public.grain_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_subscriptions_timestamp
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

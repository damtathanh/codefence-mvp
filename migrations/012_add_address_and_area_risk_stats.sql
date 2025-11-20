-- ============================================================================
-- Migration: Add address_risk_stats and area_risk_stats tables
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor (project database).
-- This migration is idempotent and safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- PART 1: address_risk_stats table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.address_risk_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Normalized key used internally (lowercased, trimmed, simplified address)
  address_key text NOT NULL,
  -- Raw / human friendly address (last seen)
  full_address text,
  province text,
  district text,
  ward text,
  street text,
  total_orders integer NOT NULL DEFAULT 0,
  success_orders integer NOT NULL DEFAULT 0,
  failed_orders integer NOT NULL DEFAULT 0,
  boom_orders integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness per user + normalized address key
ALTER TABLE public.address_risk_stats
ADD CONSTRAINT IF NOT EXISTS address_risk_stats_user_address_key_unique
UNIQUE (user_id, address_key);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_address_risk_stats_user_id ON public.address_risk_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_address_risk_stats_address_key ON public.address_risk_stats(address_key);

-- Enable RLS
ALTER TABLE public.address_risk_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Address risk select own rows" ON public.address_risk_stats;
DROP POLICY IF EXISTS "Address risk insert own rows" ON public.address_risk_stats;
DROP POLICY IF EXISTS "Address risk update own rows" ON public.address_risk_stats;
DROP POLICY IF EXISTS "Address risk delete own rows" ON public.address_risk_stats;

-- Policy: users can SELECT their own address risk stats
CREATE POLICY "Address risk select own rows"
ON public.address_risk_stats
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: users can INSERT their own address risk stats
CREATE POLICY "Address risk insert own rows"
ON public.address_risk_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: users can UPDATE their own address risk stats
CREATE POLICY "Address risk update own rows"
ON public.address_risk_stats
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: users can DELETE their own address risk stats
CREATE POLICY "Address risk delete own rows"
ON public.address_risk_stats
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on row update (reuse public.handle_updated_at)
DROP TRIGGER IF EXISTS handle_address_risk_stats_updated_at ON public.address_risk_stats;
CREATE TRIGGER handle_address_risk_stats_updated_at
BEFORE UPDATE ON public.address_risk_stats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 2: area_risk_stats table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.area_risk_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  province text,
  district text,
  ward text,
  street text,
  total_orders integer NOT NULL DEFAULT 0,
  success_orders integer NOT NULL DEFAULT 0,
  failed_orders integer NOT NULL DEFAULT 0,
  boom_orders integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness per user + area combination
ALTER TABLE public.area_risk_stats
ADD CONSTRAINT IF NOT EXISTS area_risk_stats_user_area_unique
UNIQUE (user_id, province, district, ward, street);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_area_risk_stats_user_id ON public.area_risk_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_area_risk_stats_area ON public.area_risk_stats(province, district, ward, street);

-- Enable RLS
ALTER TABLE public.area_risk_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Area risk select own rows" ON public.area_risk_stats;
DROP POLICY IF EXISTS "Area risk insert own rows" ON public.area_risk_stats;
DROP POLICY IF EXISTS "Area risk update own rows" ON public.area_risk_stats;
DROP POLICY IF EXISTS "Area risk delete own rows" ON public.area_risk_stats;

-- Policy: users can SELECT their own area risk stats
CREATE POLICY "Area risk select own rows"
ON public.area_risk_stats
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: users can INSERT their own area risk stats
CREATE POLICY "Area risk insert own rows"
ON public.area_risk_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: users can UPDATE their own area risk stats
CREATE POLICY "Area risk update own rows"
ON public.area_risk_stats
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: users can DELETE their own area risk stats
CREATE POLICY "Area risk delete own rows"
ON public.area_risk_stats
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on row update
DROP TRIGGER IF EXISTS handle_area_risk_stats_updated_at ON public.area_risk_stats;
CREATE TRIGGER handle_area_risk_stats_updated_at
BEFORE UPDATE ON public.area_risk_stats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 3: Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.address_risk_stats IS 'Aggregated address-level order outcomes per user (for risk and analytics).';
COMMENT ON COLUMN public.address_risk_stats.address_key IS 'Normalized address key used for grouping (lowercased, trimmed, simplified).';
COMMENT ON COLUMN public.address_risk_stats.full_address IS 'Last seen full address string for this address_key.';

COMMENT ON TABLE public.area_risk_stats IS 'Aggregated area-level order outcomes per user (province/district/ward/street).';
COMMENT ON COLUMN public.area_risk_stats.street IS 'Optional street-level dimension; can be NULL for ward-level aggregation.';


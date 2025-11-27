-- Consolidated Migration: Orders Schema, Customer Blacklist, and Risk Stats
-- Combines:
-- 1. 010_update_orders_schema.sql
-- 2. 011_add_customer_blacklist_table.sql
-- 3. 012_add_address_and_area_risk_stats.sql

-- ============================================================================
-- SECTION 1: Update Orders Schema
-- ============================================================================

-- Add order_id column (separate from id uuid)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_id TEXT;

-- Rename customer_phone to phone (if customer_phone exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='orders' AND column_name='customer_phone') THEN
        ALTER TABLE orders RENAME COLUMN customer_phone TO phone;
    END IF;
END $$;

-- Add phone column if it doesn't exist
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add address column (nullable)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add product column if it doesn't exist (legacy text field)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product TEXT;

-- Change status to string type
ALTER TABLE orders
ALTER COLUMN status TYPE TEXT;

-- Change risk_score to string type
ALTER TABLE orders
ALTER COLUMN risk_score TYPE TEXT USING risk_score::TEXT;

-- Set default values
ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'Pending';

ALTER TABLE orders
ALTER COLUMN risk_score SET DEFAULT 'N/A';

-- Add product_id column (nullable initially for migration)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Create index on product_id for performance
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- Migrate existing data (match product names)
UPDATE orders o
SET product_id = p.id
FROM products p
WHERE o.product_id IS NULL
  AND o.product IS NOT NULL
  AND LOWER(TRIM(o.product)) = LOWER(TRIM(p.name))
  AND o.user_id = p.user_id;

-- Comments
COMMENT ON COLUMN orders.order_id IS 'Order ID (string, separate from uuid id)';
COMMENT ON COLUMN orders.phone IS 'Customer phone number';
COMMENT ON COLUMN orders.address IS 'Customer delivery address (optional)';
COMMENT ON COLUMN orders.product IS 'Legacy product name field (deprecated, use product_id instead)';
COMMENT ON COLUMN orders.product_id IS 'Reference to products table (UUID). If NULL, product name is stored in legacy product column.';
COMMENT ON COLUMN orders.status IS 'Order status (default: Pending)';
COMMENT ON COLUMN orders.risk_score IS 'Risk score (default: N/A)';

-- ============================================================================
-- SECTION 2: Customer Blacklist
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_blacklist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  address text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness constraint
ALTER TABLE customer_blacklist
ADD CONSTRAINT customer_blacklist_user_phone_unique
UNIQUE (user_id, phone);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_user_id ON customer_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_phone ON customer_blacklist(phone);

-- RLS
ALTER TABLE customer_blacklist ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_blacklist' AND policyname = 'Users can view their own blacklist entries') THEN
        CREATE POLICY "Users can view their own blacklist entries" ON customer_blacklist FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_blacklist' AND policyname = 'Users can insert their own blacklist entries') THEN
        CREATE POLICY "Users can insert their own blacklist entries" ON customer_blacklist FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_blacklist' AND policyname = 'Users can update their own blacklist entries') THEN
        CREATE POLICY "Users can update their own blacklist entries" ON customer_blacklist FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_blacklist' AND policyname = 'Users can delete their own blacklist entries') THEN
        CREATE POLICY "Users can delete their own blacklist entries" ON customer_blacklist FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Comments
COMMENT ON TABLE customer_blacklist IS 'Customer blacklist entries per user. Blacklisted customers are treated as high risk during order import.';

-- ============================================================================
-- SECTION 3: Address and Area Risk Stats
-- ============================================================================

-- address_risk_stats
CREATE TABLE IF NOT EXISTS public.address_risk_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_key text NOT NULL,
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

ALTER TABLE public.address_risk_stats
ADD CONSTRAINT IF NOT EXISTS address_risk_stats_user_address_key_unique
UNIQUE (user_id, address_key);

CREATE INDEX IF NOT EXISTS idx_address_risk_stats_user_id ON public.address_risk_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_address_risk_stats_address_key ON public.address_risk_stats(address_key);

ALTER TABLE public.address_risk_stats ENABLE ROW LEVEL SECURITY;

-- Policies (Drop and recreate to be safe/idempotent or use DO block)
DROP POLICY IF EXISTS "Address risk select own rows" ON public.address_risk_stats;
DROP POLICY IF EXISTS "Address risk insert own rows" ON public.address_risk_stats;
DROP POLICY IF EXISTS "Address risk update own rows" ON public.address_risk_stats;
DROP POLICY IF EXISTS "Address risk delete own rows" ON public.address_risk_stats;

CREATE POLICY "Address risk select own rows" ON public.address_risk_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Address risk insert own rows" ON public.address_risk_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Address risk update own rows" ON public.address_risk_stats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Address risk delete own rows" ON public.address_risk_stats FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_address_risk_stats_updated_at ON public.address_risk_stats;
CREATE TRIGGER handle_address_risk_stats_updated_at
BEFORE UPDATE ON public.address_risk_stats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- area_risk_stats
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

ALTER TABLE public.area_risk_stats
ADD CONSTRAINT IF NOT EXISTS area_risk_stats_user_area_unique
UNIQUE (user_id, province, district, ward, street);

CREATE INDEX IF NOT EXISTS idx_area_risk_stats_user_id ON public.area_risk_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_area_risk_stats_area ON public.area_risk_stats(province, district, ward, street);

ALTER TABLE public.area_risk_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Area risk select own rows" ON public.area_risk_stats;
DROP POLICY IF EXISTS "Area risk insert own rows" ON public.area_risk_stats;
DROP POLICY IF EXISTS "Area risk update own rows" ON public.area_risk_stats;
DROP POLICY IF EXISTS "Area risk delete own rows" ON public.area_risk_stats;

CREATE POLICY "Area risk select own rows" ON public.area_risk_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Area risk insert own rows" ON public.area_risk_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Area risk update own rows" ON public.area_risk_stats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Area risk delete own rows" ON public.area_risk_stats FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_area_risk_stats_updated_at ON public.area_risk_stats;
CREATE TRIGGER handle_area_risk_stats_updated_at
BEFORE UPDATE ON public.area_risk_stats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.address_risk_stats IS 'Aggregated address-level order outcomes per user (for risk and analytics).';
COMMENT ON TABLE public.area_risk_stats IS 'Aggregated area-level order outcomes per user (province/district/ward/street).';

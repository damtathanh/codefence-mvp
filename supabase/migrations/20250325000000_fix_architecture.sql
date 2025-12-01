-- Migration: Fix Architecture (Consolidated)
-- Includes:
-- 1. import_orders_bulk RPC (Server-side logic)
-- 2. Customer Blacklist Table
-- 3. Risk Stats Tables (Address & Area)
-- 4. Orders Schema Updates

-- ============================================================================
-- SECTION 1: RPC Function (import_orders_bulk)
-- ============================================================================

CREATE OR REPLACE FUNCTION import_orders_bulk(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_item jsonb;
    _user_id uuid;
    _product_id uuid;
    _product_name text;
    _customer_phone text;
    _risk_score int;
    _risk_level text;
    _blacklist_count int;
    _boom_count int;
    _success_count int := 0;
    _error_count int := 0;
    _errors jsonb := '[]'::jsonb;
    _inserted_id uuid;
    _status text;
    _payment_method text;
BEGIN
    -- Get current user ID
    _user_id := auth.uid();
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object('success', 0, 'failed', 0, 'errors', jsonb_build_array('User not authenticated'));
    END IF;

    -- Loop through each order in the payload array
    FOR order_item IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        BEGIN
            -- Extract basic fields
            _customer_phone := TRIM(order_item->>'phone');
            _product_name := TRIM(order_item->>'product');
            _payment_method := COALESCE(order_item->>'payment_method', 'COD');
            
            -- 1. Product Mapping
            _product_id := NULL;
            
            IF _product_name IS NOT NULL AND _product_name != '' THEN
                -- Try exact match first
                SELECT id INTO _product_id
                FROM products
                WHERE user_id = _user_id 
                  AND LOWER(TRIM(name)) = LOWER(TRIM(_product_name))
                LIMIT 1;
                
                -- If not found, try fuzzy match (ILIKE)
                IF _product_id IS NULL THEN
                    SELECT id INTO _product_id
                    FROM products
                    WHERE user_id = _user_id 
                      AND name ILIKE '%' || _product_name || '%'
                    LIMIT 1;
                END IF;
            END IF;

            -- 2. Risk Calculation
            _risk_score := 0;
            _risk_level := 'safe';
            
            -- Check Blacklist
            SELECT COUNT(*) INTO _blacklist_count
            FROM customer_blacklist
            WHERE user_id = _user_id AND phone = _customer_phone;
            
            IF _blacklist_count > 0 THEN
                _risk_score := 100;
                _risk_level := 'danger';
            ELSE
                -- Check Order History (Boom/Returned count)
                SELECT COUNT(*) INTO _boom_count
                FROM orders
                WHERE user_id = _user_id 
                  AND phone = _customer_phone 
                  AND status IN ('Boom', 'Returned', 'Failed');
                  
                IF _boom_count > 0 THEN
                    _risk_score := 50 + (_boom_count * 10);
                    IF _risk_score > 100 THEN _risk_score := 100; END IF;
                    _risk_level := CASE 
                        WHEN _risk_score >= 80 THEN 'danger'
                        WHEN _risk_score >= 50 THEN 'warning'
                        ELSE 'safe'
                    END;
                END IF;
            END IF;

            -- 3. Status Determination
            IF UPPER(_payment_method) != 'COD' THEN
                _status := 'Order Paid';
            ELSE
                -- COD Logic
                IF _risk_score > 70 THEN
                    _status := 'Order Rejected';
                ELSIF _risk_score >= 30 THEN
                    _status := 'Pending Review';
                ELSE
                    _status := 'Order Approved';
                END IF;
            END IF;

            -- 4. Insert Order
            INSERT INTO orders (
                user_id,
                order_id,
                customer_name,
                phone,
                address,
                product_id,
                product,
                amount,
                status,
                risk_score,
                risk_level,
                payment_method,
                address_detail,
                ward,
                district,
                province,
                gender,
                birth_year,
                discount_amount,
                shipping_fee,
                channel,
                source,
                order_date,
                created_at,
                updated_at
            ) VALUES (
                _user_id,
                order_item->>'order_id',
                order_item->>'customer_name',
                _customer_phone,
                order_item->>'address',
                _product_id,
                COALESCE(_product_name, ''),
                (order_item->>'amount')::numeric,
                _status,
                _risk_score,
                _risk_level,
                _payment_method,
                order_item->>'address_detail',
                order_item->>'ward',
                order_item->>'district',
                order_item->>'province',
                order_item->>'gender',
                (order_item->>'birth_year')::int,
                COALESCE((order_item->>'discount_amount')::numeric, 0),
                COALESCE((order_item->>'shipping_fee')::numeric, 0),
                order_item->>'channel',
                order_item->>'source',
                (order_item->>'order_date')::date,
                NOW(),
                NOW()
            ) RETURNING id INTO _inserted_id;

            _success_count := _success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            _error_count := _error_count + 1;
            _errors := _errors || jsonb_build_object(
                'order_id', order_item->>'order_id',
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', _success_count,
        'failed', _error_count,
        'errors', _errors
    );
END;
$$;

-- ============================================================================
-- SECTION 1.1: Approve Medium Risk Order RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_medium_risk_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   
AS $$
BEGIN
    -- 1. Insert Log
    INSERT INTO order_events (order_id, event_type, details)
    VALUES (p_order_id, 'ORDER_APPROVED', 'Shop Owner approved the order (manual)');

    -- 2. Update Status
    UPDATE orders
    SET status = 'Order Confirmation Sent',
        updated_at = NOW()
    WHERE id = p_order_id;
END;
$$;

-- ============================================================================
-- SECTION 2: Customer Blacklist Table
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
ADD CONSTRAINT IF NOT EXISTS customer_blacklist_user_phone_unique
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

-- ============================================================================
-- SECTION 3: Risk Stats Tables
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

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'address_risk_stats' AND policyname = 'Address risk select own rows') THEN
        CREATE POLICY "Address risk select own rows" ON public.address_risk_stats FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'address_risk_stats' AND policyname = 'Address risk insert own rows') THEN
        CREATE POLICY "Address risk insert own rows" ON public.address_risk_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'address_risk_stats' AND policyname = 'Address risk update own rows') THEN
        CREATE POLICY "Address risk update own rows" ON public.address_risk_stats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'address_risk_stats' AND policyname = 'Address risk delete own rows') THEN
        CREATE POLICY "Address risk delete own rows" ON public.address_risk_stats FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

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

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'area_risk_stats' AND policyname = 'Area risk select own rows') THEN
        CREATE POLICY "Area risk select own rows" ON public.area_risk_stats FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'area_risk_stats' AND policyname = 'Area risk insert own rows') THEN
        CREATE POLICY "Area risk insert own rows" ON public.area_risk_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'area_risk_stats' AND policyname = 'Area risk update own rows') THEN
        CREATE POLICY "Area risk update own rows" ON public.area_risk_stats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'area_risk_stats' AND policyname = 'Area risk delete own rows') THEN
        CREATE POLICY "Area risk delete own rows" ON public.area_risk_stats FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: Orders Schema Updates
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Ensure status is text, risk_score is integer
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;
ALTER TABLE orders ALTER COLUMN risk_score TYPE INTEGER USING (CASE WHEN risk_score = 'N/A' THEN NULL ELSE risk_score::INTEGER END);

-- Set defaults
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'Pending';
ALTER TABLE orders ALTER COLUMN risk_score SET DEFAULT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- Migration: Update orders table structure for new schema
-- This migration combines address and product_id additions for orders table
-- Run this SQL in your Supabase SQL Editor
--
-- Note: For existing databases, you may have already run:
-- - add_address_to_orders.sql
-- - add_product_id_to_orders.sql
-- This combined migration is idempotent and safe to run on new databases.

-- ============================================================================
-- PART 1: Add address and basic order columns
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

-- Change status to string type (if it's enum, you may need to drop and recreate)
ALTER TABLE orders
ALTER COLUMN status TYPE TEXT;

-- Change risk_score to string type (if it's numeric, you may need to alter it)
ALTER TABLE orders
ALTER COLUMN risk_score TYPE TEXT USING risk_score::TEXT;

-- Set default values
ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'Pending';

ALTER TABLE orders
ALTER COLUMN risk_score SET DEFAULT 'N/A';

-- ============================================================================
-- PART 2: Add product_id foreign key
-- ============================================================================

-- Add product_id column (nullable initially for migration)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Create index on product_id for performance
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- Migrate existing data (if product column exists and contains product names)
-- This attempts to match product names in orders.product with products.name
UPDATE orders o
SET product_id = p.id
FROM products p
WHERE o.product_id IS NULL
  AND o.product IS NOT NULL
  AND LOWER(TRIM(o.product)) = LOWER(TRIM(p.name))
  AND o.user_id = p.user_id; -- Ensure products belong to the same user

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN orders.order_id IS 'Order ID (string, separate from uuid id)';
COMMENT ON COLUMN orders.phone IS 'Customer phone number';
COMMENT ON COLUMN orders.address IS 'Customer delivery address (optional)';
COMMENT ON COLUMN orders.product IS 'Legacy product name field (deprecated, use product_id instead)';
COMMENT ON COLUMN orders.product_id IS 'Reference to products table (UUID). If NULL, product name is stored in legacy product column.';
COMMENT ON COLUMN orders.status IS 'Order status (default: Pending)';
COMMENT ON COLUMN orders.risk_score IS 'Risk score (default: N/A)';


-- Migration: Update orders table structure for new schema
-- Run this SQL in your Supabase SQL Editor

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

-- Change product_id to product (string instead of foreign key)
-- First, backup data if needed, then drop foreign key constraint if exists
-- Then rename column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='orders' AND column_name='product_id') THEN
        -- Store product names before dropping product_id
        -- This is a simplified migration - you may need to join with products table first
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_temp TEXT;
        -- Update product_temp with product names (you may need to join with products table)
        -- ALTER TABLE orders DROP COLUMN product_id;
        -- ALTER TABLE orders RENAME COLUMN product_temp TO product;
    END IF;
END $$;

-- Add product column if it doesn't exist
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product TEXT;

-- Change status to string type (if it's enum, you may need to drop and recreate)
-- Change risk_score to string type (if it's numeric, you may need to alter it)
ALTER TABLE orders
ALTER COLUMN status TYPE TEXT;

ALTER TABLE orders
ALTER COLUMN risk_score TYPE TEXT USING risk_score::TEXT;

-- Set default values
ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'Pending';

ALTER TABLE orders
ALTER COLUMN risk_score SET DEFAULT 'N/A';

-- Add comments for documentation
COMMENT ON COLUMN orders.order_id IS 'Order ID (string, separate from uuid id)';
COMMENT ON COLUMN orders.phone IS 'Customer phone number';
COMMENT ON COLUMN orders.address IS 'Customer delivery address (optional)';
COMMENT ON COLUMN orders.product IS 'Product name (string)';
COMMENT ON COLUMN orders.status IS 'Order status (default: Pending)';
COMMENT ON COLUMN orders.risk_score IS 'Risk score (default: N/A)';


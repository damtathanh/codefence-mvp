-- Migration: Add product_id column to orders table and migrate existing data
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add product_id column (nullable initially for migration)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Step 2: Create index on product_id for performance
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- Step 3: Migrate existing data (if product column exists and contains product names)
-- This attempts to match product names in orders.product with products.name
-- Update the product_id for orders that have matching product names
UPDATE orders o
SET product_id = p.id
FROM products p
WHERE o.product_id IS NULL
  AND o.product IS NOT NULL
  AND LOWER(TRIM(o.product)) = LOWER(TRIM(p.name))
  AND o.user_id = p.user_id; -- Ensure products belong to the same user

-- Step 4: Add comment for documentation
COMMENT ON COLUMN orders.product_id IS 'Reference to products table (UUID). If NULL, product name is stored in legacy product column.';
COMMENT ON COLUMN orders.product IS 'Legacy product name field (deprecated, use product_id instead).';

-- Note: The product column is kept for backward compatibility
-- You can drop it later after ensuring all orders have product_id set:
-- ALTER TABLE orders DROP COLUMN IF EXISTS product;


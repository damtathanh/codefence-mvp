-- Migration: Enable Row-Level Security (RLS) on products table
-- This ensures users can only access their own products
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Read own products" ON public.products;
DROP POLICY IF EXISTS "Insert own products" ON public.products;
DROP POLICY IF EXISTS "Update own products" ON public.products;
DROP POLICY IF EXISTS "Delete own products" ON public.products;

-- Step 3: Create policy for SELECT (read own products)
CREATE POLICY "Read own products"
ON public.products
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: Create policy for INSERT (insert own products)
CREATE POLICY "Insert own products"
ON public.products
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 5: Create policy for UPDATE (update own products)
CREATE POLICY "Update own products"
ON public.products
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Create policy for DELETE (delete own products)
CREATE POLICY "Delete own products"
ON public.products
FOR DELETE
USING (auth.uid() = user_id);

-- Step 7: Add comments for documentation
COMMENT ON POLICY "Read own products" ON public.products IS 'Users can only read their own products';
COMMENT ON POLICY "Insert own products" ON public.products IS 'Users can only insert products with their own user_id';
COMMENT ON POLICY "Update own products" ON public.products IS 'Users can only update their own products';
COMMENT ON POLICY "Delete own products" ON public.products IS 'Users can only delete their own products';


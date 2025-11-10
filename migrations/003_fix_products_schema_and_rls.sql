-- ============================================================================
-- Migration: Fix Products Table Schema and RLS Policies
-- ============================================================================
-- This migration ensures the products table has all required columns and
-- proper Row-Level Security (RLS) policies for authenticated user operations.
-- 
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Required Columns
-- ============================================================================

-- Add user_id column if missing (references auth.users)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add updated_at column if missing
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add created_at column if missing
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- ============================================================================
-- STEP 2: Handle Existing Data (if any)
-- ============================================================================

-- If you have existing products without user_id, you need to either:
-- Option A: Delete them (if they're test data)
-- DELETE FROM public.products WHERE user_id IS NULL;

-- Option B: Assign them to a specific user (replace 'YOUR_USER_ID_HERE' with actual UUID)
-- UPDATE public.products SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- Set default timestamps for existing rows that don't have them
UPDATE public.products 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE public.products 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- ============================================================================
-- STEP 3: Make user_id NOT NULL (after ensuring all rows have a user_id)
-- ============================================================================

-- Only uncomment this after you've handled existing NULL user_id values:
-- ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;

-- ============================================================================
-- STEP 4: Enable Row-Level Security
-- ============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Drop Existing Policies (for idempotency)
-- ============================================================================

DROP POLICY IF EXISTS "Allow select own products" ON public.products;
DROP POLICY IF EXISTS "Allow insert own products" ON public.products;
DROP POLICY IF EXISTS "Allow update own products" ON public.products;
DROP POLICY IF EXISTS "Allow delete own products" ON public.products;
DROP POLICY IF EXISTS "Read own products" ON public.products;
DROP POLICY IF EXISTS "Insert own products" ON public.products;
DROP POLICY IF EXISTS "Update own products" ON public.products;
DROP POLICY IF EXISTS "Delete own products" ON public.products;

-- ============================================================================
-- STEP 6: Create RLS Policies
-- ============================================================================

-- Policy: Allow users to view their own products
CREATE POLICY "Allow select own products"
ON public.products
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow users to insert their own products
CREATE POLICY "Allow insert own products"
ON public.products
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own products
CREATE POLICY "Allow update own products"
ON public.products
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own products
CREATE POLICY "Allow delete own products"
ON public.products
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN public.products.user_id IS 'Reference to auth.users(id). Products belong to the user who created them.';
COMMENT ON COLUMN public.products.created_at IS 'Timestamp when the product was created.';
COMMENT ON COLUMN public.products.updated_at IS 'Timestamp when the product was last updated.';

COMMENT ON POLICY "Allow select own products" ON public.products IS 'Users can only read their own products';
COMMENT ON POLICY "Allow insert own products" ON public.products IS 'Users can only insert products with their own user_id';
COMMENT ON POLICY "Allow update own products" ON public.products IS 'Users can only update their own products';
COMMENT ON POLICY "Allow delete own products" ON public.products IS 'Users can only delete their own products';

-- ============================================================================
-- STEP 8: Verification Queries (run these to verify the migration)
-- ============================================================================

-- Verify columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' 
-- AND column_name IN ('user_id', 'created_at', 'updated_at');

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'products';
-- Should return: rowsecurity = true

-- Verify policies exist
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'products';
-- Should return 4 policies

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- After running this migration:
-- 1. Products table will have user_id, created_at, and updated_at columns
-- 2. RLS will be enabled with proper policies
-- 3. Users can only access their own products
-- 4. Update and delete operations will work correctly
-- ============================================================================


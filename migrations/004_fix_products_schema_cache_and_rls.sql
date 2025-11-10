-- ============================================================================
-- Migration: Fix Products Table Schema Cache and RLS Issues
-- ============================================================================
-- This migration resolves:
-- 1. "Could not find the 'updated_at' column" schema cache error
-- 2. "Delete operation failed: Item still exists" RLS policy issue
-- 
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure All Required Columns Exist
-- ============================================================================

-- Add user_id column if missing (references auth.users)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add created_at column if missing
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column if missing
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- STEP 2: Set Defaults for Existing Rows
-- ============================================================================

-- Set created_at for existing rows that don't have it
UPDATE public.products 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Set updated_at for existing rows that don't have it
UPDATE public.products 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- ============================================================================
-- STEP 3: Handle Existing Data Without user_id
-- ============================================================================

-- IMPORTANT: If you have existing products without user_id, handle them:
-- Option A: Delete them (if they're test data)
-- DELETE FROM public.products WHERE user_id IS NULL;

-- Option B: Assign them to a specific user (replace 'YOUR_USER_ID_HERE' with actual UUID)
-- To find your user ID: Run `SELECT auth.uid();` in SQL Editor while logged in
-- UPDATE public.products SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- After handling existing data, you can make user_id NOT NULL:
-- ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;

-- ============================================================================
-- STEP 4: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at DESC);

-- ============================================================================
-- STEP 5: Enable Row-Level Security
-- ============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Drop All Existing Policies (for clean slate)
-- ============================================================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow select own products" ON public.products;
DROP POLICY IF EXISTS "Allow insert own products" ON public.products;
DROP POLICY IF EXISTS "Allow update own products" ON public.products;
DROP POLICY IF EXISTS "Allow delete own products" ON public.products;
DROP POLICY IF EXISTS "Read own products" ON public.products;
DROP POLICY IF EXISTS "Insert own products" ON public.products;
DROP POLICY IF EXISTS "Update own products" ON public.products;
DROP POLICY IF EXISTS "Delete own products" ON public.products;

-- ============================================================================
-- STEP 7: Create RLS Policies (using CREATE OR REPLACE where possible)
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
-- STEP 8: Create Function to Auto-Update updated_at Timestamp
-- ============================================================================

-- Create or replace the function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_products_updated_at ON public.products;

-- Create trigger to auto-update updated_at on row update
CREATE TRIGGER handle_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STEP 9: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN public.products.user_id IS 'Reference to auth.users(id). Products belong to the user who created them.';
COMMENT ON COLUMN public.products.created_at IS 'Timestamp when the product was created. Auto-set on insert.';
COMMENT ON COLUMN public.products.updated_at IS 'Timestamp when the product was last updated. Auto-updated by trigger on update.';

COMMENT ON POLICY "Allow select own products" ON public.products IS 'Users can only read their own products';
COMMENT ON POLICY "Allow insert own products" ON public.products IS 'Users can only insert products with their own user_id';
COMMENT ON POLICY "Allow update own products" ON public.products IS 'Users can only update their own products';
COMMENT ON POLICY "Allow delete own products" ON public.products IS 'Users can only delete their own products';

-- ============================================================================
-- STEP 10: Force Schema Cache Refresh
-- ============================================================================

-- Notify PostgREST to reload the schema cache
-- This fixes the "Could not find the 'updated_at' column" error
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STEP 11: Verification Queries
-- ============================================================================

-- Verify columns exist (run these after the migration)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'products' 
-- AND column_name IN ('user_id', 'created_at', 'updated_at')
-- ORDER BY column_name;

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'products';
-- Should return: rowsecurity = true

-- Verify policies exist
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'products'
-- ORDER BY policyname;
-- Should return 4 policies

-- Verify trigger exists
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'products'
-- AND trigger_name = 'handle_products_updated_at';

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- After running this migration:
-- 1. ✅ All required columns (user_id, created_at, updated_at) exist
-- 2. ✅ RLS is enabled with proper policies
-- 3. ✅ updated_at is auto-updated by trigger
-- 4. ✅ Schema cache is refreshed
-- 5. ✅ Update and delete operations will work correctly
-- ============================================================================


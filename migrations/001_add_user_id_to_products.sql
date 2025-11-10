-- Migration: Add user_id column to products table if it doesn't exist
-- This ensures all products are associated with the user who created them
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add user_id column if it doesn't exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- Step 3: If there are existing products without user_id, you may want to:
-- Option A: Delete them (if they're test data)
-- DELETE FROM public.products WHERE user_id IS NULL;

-- Option B: Assign them to a specific user (replace 'USER_UUID_HERE' with actual user ID)
-- UPDATE public.products SET user_id = 'USER_UUID_HERE' WHERE user_id IS NULL;

-- Step 4: Make user_id NOT NULL after ensuring all rows have a user_id
-- ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.products.user_id IS 'Reference to auth.users(id). Products belong to the user who created them.';


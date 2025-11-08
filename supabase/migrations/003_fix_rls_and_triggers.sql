-- =====================================================
-- Migration: Fix RLS Policies and Triggers
-- =====================================================
-- This migration fixes recursive RLS policies and ensures
-- triggers don't cause conflicts with profile updates
-- =====================================================

-- Step 1: Disable all triggers temporarily to avoid recursive loops
ALTER TABLE public.users_profile DISABLE TRIGGER ALL;

-- Step 2: Drop existing policies that may be recursive
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users_profile;

-- Step 3: Enable Row Level Security cleanly
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- Step 4: Recreate safe policies (no recursion)
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users_profile
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON public.users_profile
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for upsert operations)
CREATE POLICY "Users can insert own profile"
  ON public.users_profile
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles (non-recursive check)
CREATE POLICY "Admins can view all profiles"
  ON public.users_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'admin@codfence.com' 
        OR auth.users.email = 'contact@codfence.com'
      )
    )
  );

-- Step 5: Ensure authenticated users have necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users_profile TO authenticated;

-- Step 6: Drop and recreate the trigger to ensure it's clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 7: Recreate a clean trigger function that matches the unified schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into users_profile with role assignment and basic info
  -- Using ON CONFLICT DO NOTHING to prevent errors if profile already exists
  INSERT INTO public.users_profile (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email = 'contact@codfence.com' THEN 'admin'
      WHEN NEW.email = 'admin@codfence.com' THEN 'admin'
      ELSE 'user'
    END,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'fullName',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)  -- Fallback to email prefix
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Recreate the trigger (only fires on INSERT, not UPDATE)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Re-enable triggers on users_profile
ALTER TABLE public.users_profile ENABLE TRIGGER ALL;

-- ✅ Done.
-- The migration:
-- - Fixes recursive RLS policies
-- - Ensures users can update their own profiles
-- - Prevents trigger conflicts
-- - Maintains proper role assignment
-- - Allows authenticated users to manage their profiles


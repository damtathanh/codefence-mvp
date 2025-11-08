-- =====================================================
-- Migration: Fix Profile Loading and RLS Issues
-- =====================================================
-- This migration fixes "Failed to load profile" errors
-- and ensures authenticated users can read & update their profiles
-- =====================================================

-- 1️⃣ Disable recursion triggers temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2️⃣ Recreate clean trigger for new users (no recursion, matches unified schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into users_profile with proper schema (id, email, role, full_name)
  INSERT INTO public.users_profile (id, email, role, full_name, company_name)
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
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'company',
      'CodFence'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3️⃣ Reset policies for users_profile
ALTER TABLE public.users_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users_profile;

-- Create clean, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON public.users_profile
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users_profile
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users_profile
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4️⃣ Ensure authenticated role has read & write permissions
GRANT SELECT, INSERT, UPDATE ON public.users_profile TO authenticated;

-- 5️⃣ Auto-create missing profile records for existing users
INSERT INTO public.users_profile (id, email, role, full_name, company_name)
SELECT 
  id,
  email,
  CASE
    WHEN email = 'contact@codfence.com' THEN 'admin'
    WHEN email = 'admin@codfence.com' THEN 'admin'
    ELSE 'user'
  END as role,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'fullName',
    raw_user_meta_data->>'display_name',
    split_part(email, '@', 1)
  ) as full_name,
  COALESCE(
    raw_user_meta_data->>'company_name',
    raw_user_meta_data->>'company',
    'CodFence'
  ) as company_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users_profile)
ON CONFLICT (id) DO NOTHING;

-- ✅ Done.
-- This migration:
-- - Fixes "Failed to load profile" errors
-- - Ensures authenticated users can read their own profiles
-- - Ensures authenticated users can update their own profiles
-- - Creates missing profiles for existing users
-- - Prevents trigger recursion issues
-- - Uses proper unified schema (email, full_name, role, company_name)


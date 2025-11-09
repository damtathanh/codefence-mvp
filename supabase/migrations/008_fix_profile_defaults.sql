-- =====================================================
-- Migration: Fix Profile Defaults and Field Names
-- =====================================================
-- This migration removes hardcoded 'CodFence' default
-- and ensures user input is properly saved
-- =====================================================

-- Remove default 'CodFence' from company_name column
ALTER TABLE public.users_profile 
ALTER COLUMN company_name DROP DEFAULT;

-- Update the trigger to not use 'CodFence' as fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users_profile with ALL fields from metadata
  -- Role assignment: ANY email ending with @codfence.com = admin, all others = user
  INSERT INTO public.users_profile (
    id, 
    email, 
    role, 
    full_name,
    phone,
    company_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email LIKE '%@codfence.com' THEN 'admin'  -- Domain-based: any @codfence.com email = admin
      ELSE 'user'
    END,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'fullName',
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1)  -- Fallback to email prefix
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'phone',
      NULL
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'company',
      NULL  -- ✅ Use NULL instead of hardcoded 'CodFence'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE
      WHEN EXCLUDED.email LIKE '%@codfence.com' THEN 'admin'  -- Update role based on domain
      ELSE 'user'
    END,
    full_name = COALESCE(
      EXCLUDED.full_name, 
      public.users_profile.full_name,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'fullName'
    ),
    phone = COALESCE(
      EXCLUDED.phone,
      public.users_profile.phone,
      NEW.raw_user_meta_data->>'phone'
    ),
    company_name = COALESCE(
      EXCLUDED.company_name,
      public.users_profile.company_name,
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'company',
      NULL  -- ✅ Use NULL instead of hardcoded 'CodFence'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Done.
-- Changes:
-- - Removed default 'CodFence' from company_name column
-- - Updated trigger to use NULL instead of 'CodFence' as fallback
-- - User input will now be properly saved instead of being overridden


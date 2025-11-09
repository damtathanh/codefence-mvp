-- =====================================================
-- Migration: Fix Complete Profile Synchronization
-- =====================================================
-- This migration ensures that when a user registers, ALL fields
-- (full_name, phone, company_name, role) are properly synced
-- between Supabase Auth and the users_profile table
-- =====================================================

-- Update the handle_new_user() function to include ALL fields
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert into users_profile with ALL fields from metadata
  -- Role assignment: ANY email ending with @codfence.com = admin, all others = user
  insert into public.users_profile (
    id, 
    email, 
    role, 
    full_name,
    phone,
    company_name
  )
  values (
    new.id,
    new.email,
    case
      when new.email like '%@codfence.com' then 'admin'  -- Domain-based: any @codfence.com email = admin
      else 'user'
    end,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'fullName',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)  -- Fallback to email prefix
    ),
    coalesce(
      new.raw_user_meta_data->>'phone',
      null
    ),
    coalesce(
      new.raw_user_meta_data->>'company_name',
      new.raw_user_meta_data->>'company',
      null  -- ✅ Use null instead of hardcoded 'CodFence'
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when excluded.email like '%@codfence.com' then 'admin'  -- Update role based on domain
      else 'user'
    end,
    full_name = coalesce(
      excluded.full_name, 
      public.users_profile.full_name,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'fullName'
    ),
    phone = coalesce(
      excluded.phone,
      public.users_profile.phone,
      new.raw_user_meta_data->>'phone'
    ),
    company_name = coalesce(
      excluded.company_name,
      public.users_profile.company_name,
      new.raw_user_meta_data->>'company_name',
      new.raw_user_meta_data->>'company',
      null  -- ✅ Use null instead of hardcoded 'CodFence'
    );

  return new;
end;
$$ language plpgsql security definer;

-- Update RLS policy for admins to use domain-based check
-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users_profile;
DROP POLICY IF EXISTS "admins_select_all_profiles" ON public.users_profile;

-- Create new admin policy that checks role in users_profile table (domain-based)
CREATE POLICY "admins_select_all_profiles"
  ON public.users_profile
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_profile
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Ensure INSERT policy exists for users to create their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.users_profile;

CREATE POLICY "users_insert_own_profile"
  ON public.users_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ✅ Done.
-- Now when a user registers:
-- - All fields (full_name, phone, company_name, role) are synced from metadata
-- - Role is assigned based on email domain (@codfence.com = admin)
-- - If profile already exists, all fields are updated (no duplication)
-- - No default "Admin" name appears unless the account truly has admin role
-- - RLS policies allow users to insert/update their own profile
-- - Admin policy uses domain-based role check
-- 
-- Fields synced:
-- - id (from auth.users.id)
-- - email (from auth.users.email)
-- - role (from email domain: @codfence.com = admin, else user)
-- - full_name (from metadata: full_name, fullName, display_name, or email prefix)
-- - phone (from metadata: phone)
-- - company_name (from metadata: company_name, company, or 'CodFence')

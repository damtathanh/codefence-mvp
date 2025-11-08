-- =====================================================
-- Migration: Fix Profile Update RLS Policy
-- =====================================================
-- This migration fixes the RLS policy issue that prevents
-- users from updating their own profile
-- =====================================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to start fresh
-- Drop policies with various naming conventions from previous migrations
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users_profile;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users_profile;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users_profile;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.users_profile;
DROP POLICY IF EXISTS "admins_select_all_profiles" ON public.users_profile;

-- Step 3: Create clean, non-recursive policies
-- Policy 1: Users can SELECT their own profile
CREATE POLICY "users_select_own_profile"
  ON public.users_profile
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can UPDATE their own profile
-- USING clause: checks existing rows (must own the row to update it)
-- WITH CHECK clause: checks the updated row (must own the row after update)
CREATE POLICY "users_update_own_profile"
  ON public.users_profile
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can INSERT their own profile
-- WITH CHECK ensures they can only insert a profile with their own user ID
CREATE POLICY "users_insert_own_profile"
  ON public.users_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can SELECT all profiles
-- This policy allows admins to view all user profiles
-- Uses auth.users directly to avoid recursive query on users_profile
CREATE POLICY "admins_select_all_profiles"
  ON public.users_profile
  FOR SELECT
  TO authenticated
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

-- Step 4: Ensure authenticated role has necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users_profile TO authenticated;

-- ✅ Done.
-- This migration ensures:
-- - Users can read their own profile (SELECT)
-- - Users can update their own profile (UPDATE)
-- - Users can create their own profile (INSERT)
-- - Admins can read all profiles (SELECT)
-- - All policies use auth.uid() = id for proper security
-- - No recursive queries that could cause performance issues


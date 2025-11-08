-- =====================================================
-- Migration: Create User Tables and Auto-Sync Triggers
-- =====================================================
-- This migration creates user_roles and users_profile tables
-- and sets up automatic synchronization with auth.users
-- =====================================================

-- 1️⃣ Drop existing tables (optional if already exist)
drop table if exists public.users_profile cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade; -- Drop old profiles table if exists

-- Drop existing function and trigger if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2️⃣ Recreate user_roles table
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster role lookups
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_role on public.user_roles(role);

-- 3️⃣ Recreate users_profile table
-- Note: This table uses display_name, but we'll also support full_name for compatibility
create table public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  full_name text, -- Added for compatibility with codebase
  phone text, -- Added for phone number support
  company_name text default 'CodFence',
  company text, -- Added for compatibility with codebase (aliased to company_name)
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster profile lookups
create index idx_users_profile_id on public.users_profile(id);

-- 4️⃣ Create function to handle new user insert
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role text;
  user_full_name text;
  user_phone text;
  user_company text;
begin
  -- Assign role based on email
  -- Check for admin@codfence.com (matches codebase Login.tsx check)
  if new.email = 'admin@codfence.com' or new.email = 'contact@codfence.com' then
    assigned_role := 'admin';
  else
    assigned_role := 'user';
  end if;

  -- Extract metadata
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'fullName',
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1) -- Fallback to email prefix
  );
  
  user_phone := new.raw_user_meta_data->>'phone';
  user_company := coalesce(
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'company_name',
    'CodFence' -- Default company name
  );

  -- Insert into user_roles
  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role)
  on conflict (user_id) do update set role = excluded.role;

  -- Insert into users_profile
  insert into public.users_profile (id, display_name, full_name, phone, company_name, company)
  values (
    new.id,
    user_full_name,
    user_full_name, -- Set both display_name and full_name for compatibility
    user_phone,
    user_company,
    user_company -- Set both company_name and company for compatibility
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, users_profile.display_name),
    full_name = coalesce(excluded.full_name, users_profile.full_name),
    phone = coalesce(excluded.phone, users_profile.phone),
    company_name = coalesce(excluded.company_name, users_profile.company_name),
    company = coalesce(excluded.company, users_profile.company),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- 5️⃣ Create trigger on auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 6️⃣ Create function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 7️⃣ Create triggers for updated_at on both tables
create trigger update_user_roles_updated_at
before update on public.user_roles
for each row
execute function public.update_updated_at_column();

create trigger update_users_profile_updated_at
before update on public.users_profile
for each row
execute function public.update_updated_at_column();

-- 8️⃣ Enable Row Level Security (RLS)
alter table public.user_roles enable row level security;
alter table public.users_profile enable row level security;

-- 9️⃣ Create RLS policies for user_roles
-- Users can read their own role
create policy "Users can view their own role"
on public.user_roles
for select
using (auth.uid() = user_id);

-- Admins can view all roles
create policy "Admins can view all roles"
on public.user_roles
for select
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
);

-- 🔟 Create RLS policies for users_profile
-- Users can read their own profile
create policy "Users can view their own profile"
on public.users_profile
for select
using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
on public.users_profile
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
on public.users_profile
for select
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
);

-- ✅ Done.
-- Now when a new user signs up through Supabase Auth:
--  - their record will be automatically inserted into users_profile
--  - admin@codfence.com and contact@codfence.com will be assigned as admin
--  - all other users will get role 'user'
--  - Both display_name/full_name and company_name/company are populated for compatibility


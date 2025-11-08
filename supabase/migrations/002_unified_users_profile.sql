-- =====================================================
-- Migration: Unified users_profile Table
-- =====================================================
-- This migration creates a unified users_profile table
-- that includes the role column, replacing the separate user_roles table
-- =====================================================

-- 1️⃣ Drop old user_roles table (no longer needed)
drop table if exists public.user_roles cascade;

-- 2️⃣ Drop existing trigger and function to recreate them
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 3️⃣ Drop and recreate users_profile table with unified schema
drop table if exists public.users_profile cascade;

create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  company_name text default 'CodFence',
  avatar_url text,
  role text check (role in ('admin', 'user')) default 'user',
  created_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index idx_users_profile_email on public.users_profile(email);
create index idx_users_profile_role on public.users_profile(role);

-- 4️⃣ Create function to handle new user insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert into users_profile with role assignment
  insert into public.users_profile (id, email, role, full_name)
  values (
    new.id,
    new.email,
    case
      when new.email = 'contact@codfence.com' then 'admin'
      when new.email = 'admin@codfence.com' then 'admin'  -- Also support admin@codfence.com
      else 'user'
    end,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'fullName',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)  -- Fallback to email prefix
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$ language plpgsql security definer;

-- 5️⃣ Create trigger on auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 6️⃣ Enable Row Level Security (RLS)
alter table public.users_profile enable row level security;

-- 7️⃣ Create RLS policies
-- Users can read their own profile
create policy "Users can view their own profile"
on public.users_profile
for select
using (auth.uid() = id);

-- Users can update their own profile (except role)
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
    select 1 from public.users_profile
    where id = auth.uid() and role = 'admin'
  )
);

-- ✅ Done.
-- Now when a new user signs up through Supabase Auth:
--  - their record will be automatically inserted into users_profile
--  - contact@codfence.com and admin@codfence.com will be assigned as admin
--  - all other users will get role 'user'
--  - The role is stored directly in users_profile table (no separate user_roles table)


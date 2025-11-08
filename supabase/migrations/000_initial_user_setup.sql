-- =====================================================
-- Initial User Tables Setup (Exact Specification)
-- =====================================================
-- This is the exact SQL as specified in the requirements
-- =====================================================

-- 1️⃣ Drop existing tables (optional if already exist)
drop table if exists public.users_profile cascade;
drop table if exists public.user_roles cascade;

-- 2️⃣ Recreate user_roles table
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamp with time zone default now()
);

-- 3️⃣ Recreate users_profile table
create table public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  company_name text default 'CodFence',
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- 4️⃣ Create function to handle new user insert
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role text;
begin
  -- Assign role based on email
  -- Check for both admin@codfence.com (used in codebase) and contact@codfence.com
  if new.email = 'admin@codfence.com' or new.email = 'contact@codfence.com' then
    assigned_role := 'admin';
  else
    assigned_role := 'user';
  end if;

  -- Insert into user_roles
  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role);

  -- Insert into users_profile
  insert into public.users_profile (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  return new;
end;
$$ language plpgsql security definer;

-- 5️⃣ Create trigger on auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ✅ Done.
-- Now when a new user signs up through Supabase Auth:
--  - their record will be automatically inserted into users_profile
--  - contact@codfence.com will be assigned as admin
--  - all other users will get role 'user'


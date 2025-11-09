-- =====================================================
-- Migration: Fix Role Assignment to Domain-Based
-- =====================================================
-- This migration updates the handle_new_user() function
-- to use domain-based role assignment instead of exact email match
-- =====================================================

-- Update the function to use domain-based role assignment
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert into users_profile with role assignment
  -- Role assignment: ANY email ending with @codfence.com = admin, all others = user
  insert into public.users_profile (id, email, role, full_name)
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
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when excluded.email like '%@codfence.com' then 'admin'  -- Update role based on domain
      else 'user'
    end,
    full_name = coalesce(excluded.full_name, public.users_profile.full_name);

  return new;
end;
$$ language plpgsql security definer;

-- Update existing profiles to use domain-based role assignment
update public.users_profile
set role = case
  when email like '%@codfence.com' then 'admin'
  else 'user'
end
where role is not null;

-- ✅ Done.
-- Now role assignment works as follows:
-- - ANY email ending with @codfence.com = admin
-- - All other emails = user
-- - Existing profiles are updated to reflect domain-based assignment


# Supabase Database Migrations

This directory contains SQL migration files for setting up and managing the CodFence database schema.

## Migration Files

### `004_fix_profile_loading.sql` ⭐ **LATEST - RUN THIS**
Fixes "Failed to load profile" errors and ensures authenticated users can read & update their profiles.

**What it does:**
- Fixes profile loading issues in Settings page
- Resets RLS policies cleanly
- Ensures authenticated users can read/update their own profiles
- Auto-creates missing profiles for existing users
- Prevents trigger recursion issues
- Uses proper unified schema

**Run this migration if:**
- Seeing "Failed to load profile" errors
- Profile updates are failing
- Settings page can't load user data
- Existing users don't have profiles

### `003_fix_rls_and_triggers.sql`
Fixes RLS policies and triggers to prevent recursive loops and ensure profile updates work correctly.

**Note:** Migration `004_fix_profile_loading.sql` includes all fixes from this migration, so you can run `004` directly.

### `002_unified_users_profile.sql` ⭐ **CURRENT**
The unified migration that creates a single `users_profile` table with role included.

**Tables Created:**
- `users_profile` - Unified table storing user profile information AND role

**Features:**
- Automatic role assignment based on email (contact@codfence.com or admin@codfence.com = admin)
- Automatic profile creation when a new user signs up
- Trigger-based synchronization with `auth.users`
- Row Level Security (RLS) policies
- Indexes for performance
- Role stored directly in `users_profile` table (no separate `user_roles` table)

**Schema:**
```sql
- id (uuid, primary key, references auth.users)
- email (text, unique, not null)
- full_name (text)
- phone (text)
- company_name (text, default 'CodFence')
- avatar_url (text)
- role (text, check: 'admin' or 'user', default 'user')
- created_at (timestamp)
```

### `000_initial_user_setup.sql` (DEPRECATED)
⚠️ **This migration is deprecated.** Please use `002_unified_users_profile.sql` instead.

### `001_create_user_tables.sql` (DEPRECATED)
⚠️ **This migration is deprecated.** Please use `002_unified_users_profile.sql` instead.

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file you want to run
4. Copy and paste the SQL into the editor
5. Click **Run** to execute the migration

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: psql (Direct Database Connection)

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/000_initial_user_setup.sql
```

## Migration Order

**Recommended:** Run migrations in order:
1. `002_unified_users_profile.sql` ⭐ (creates unified structure)
2. `004_fix_profile_loading.sql` ⭐ **RUN THIS** (fixes profile loading and RLS issues)

**Note:** If you've already run `003_fix_rls_and_triggers.sql`, you can still run `004` - it will cleanly reset everything.

**Note:** Migration `002_unified_users_profile.sql` is standalone and includes everything you need. It will:
- Drop the old `user_roles` table (if it exists)
- Create the new unified `users_profile` table with role included
- Set up automatic triggers for user synchronization

## What Happens After Migration

Once the migration is applied:

1. **New User Signup:**
   - When a user signs up through Supabase Auth, the trigger automatically:
     - Creates a record in `users_profile` table
     - Assigns role based on email (contact@codfence.com or admin@codfence.com = admin, all others = user)
     - Extracts full_name from user metadata

2. **Existing Users:**
   - If you have existing users, you may need to manually create their profile records
   - You can run this SQL to backfill existing users:

```sql
-- Backfill existing users (run after migration)
INSERT INTO public.users_profile (id, email, full_name, role)
SELECT 
  id,
  email,
  coalesce(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'fullName',
    raw_user_meta_data->>'display_name',
    split_part(email, '@', 1)
  ) as full_name,
  CASE 
    WHEN email = 'admin@codfence.com' OR email = 'contact@codfence.com' THEN 'admin'
    ELSE 'user'
  END as role
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  role = excluded.role;
```

## Troubleshooting

### Error: "relation already exists"
If you see this error, the tables already exist. You can either:
1. Drop the tables first (the migration includes DROP statements)
2. Use the enhanced migration which handles this

### Error: "permission denied"
Make sure you're running the migration as a database admin or with the appropriate permissions.

### Trigger not firing
Check that:
1. The trigger was created successfully: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. The function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
3. New user signups are going through Supabase Auth (not direct inserts)

## Schema Reference

### users_profile Table (Unified)
- `id` (uuid, primary key) - References auth.users(id), on delete cascade
- `email` (text, unique, not null) - User's email address
- `full_name` (text) - User's full name
- `phone` (text) - Phone number
- `company_name` (text) - Company name (default: 'CodFence')
- `avatar_url` (text) - Avatar image URL
- `role` (text) - Either 'admin' or 'user' (default: 'user', check constraint)
- `created_at` (timestamp) - When the profile was created

## Security

The enhanced migration includes Row Level Security (RLS) policies:
- Users can only view/update their own profile
- Admins can view all profiles
- All operations are restricted by RLS policies

Make sure RLS is enabled on your Supabase project for production use.


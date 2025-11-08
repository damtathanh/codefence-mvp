# Supabase Database Migrations

This directory contains SQL migration files for setting up and managing the CodFence database schema.

## Migration Files

### `000_initial_user_setup.sql`
The initial migration file that creates the core user tables and auto-sync triggers. This matches the exact specification provided.

**Tables Created:**
- `user_roles` - Stores user roles (admin, user)
- `users_profile` - Stores user profile information

**Features:**
- Automatic role assignment based on email (admin@codfence.com or contact@codfence.com = admin)
- Automatic profile creation when a new user signs up
- Trigger-based synchronization with `auth.users`

### `001_create_user_tables.sql`
An enhanced version of the migration with additional features:

**Additional Features:**
- Support for both `display_name`/`full_name` and `company_name`/`company` columns (backward compatibility)
- `phone` column support
- Row Level Security (RLS) policies
- `updated_at` timestamp triggers
- Indexes for performance

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

Run migrations in this order:
1. `000_initial_user_setup.sql` (basic setup)
2. `001_create_user_tables.sql` (enhanced features, optional)

**Note:** The enhanced migration (`001_create_user_tables.sql`) includes dropping and recreating tables, so it can be used as a standalone migration if you want all features at once.

## What Happens After Migration

Once the migration is applied:

1. **New User Signup:**
   - When a user signs up through Supabase Auth, the trigger automatically:
     - Creates a record in `user_roles` table
     - Creates a record in `users_profile` table
     - Assigns role based on email (admin@codfence.com or contact@codfence.com = admin)

2. **Existing Users:**
   - If you have existing users, you may need to manually create their profile records
   - You can run this SQL to backfill existing users:

```sql
-- Backfill existing users (run after migration)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN email = 'admin@codfence.com' OR email = 'contact@codfence.com' THEN 'admin'
    ELSE 'user'
  END as role
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.users_profile (id, display_name)
SELECT 
  id,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as display_name
FROM auth.users
ON CONFLICT (id) DO NOTHING;
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

### user_roles Table
- `user_id` (uuid, primary key) - References auth.users(id)
- `role` (text) - Either 'admin' or 'user'
- `created_at` (timestamp) - When the role was assigned

### users_profile Table
- `id` (uuid, primary key) - References auth.users(id)
- `display_name` (text) - User's display name
- `full_name` (text, optional) - Full name (for compatibility)
- `phone` (text, optional) - Phone number
- `company_name` (text) - Company name (default: 'CodFence')
- `company` (text, optional) - Company (for compatibility)
- `avatar_url` (text, optional) - Avatar image URL
- `created_at` (timestamp) - When the profile was created
- `updated_at` (timestamp, optional) - When the profile was last updated

## Security

The enhanced migration includes Row Level Security (RLS) policies:
- Users can only view/update their own profile
- Admins can view all profiles
- All operations are restricted by RLS policies

Make sure RLS is enabled on your Supabase project for production use.


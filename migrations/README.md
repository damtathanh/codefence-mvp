# Database Migrations for CodFence MVP

This directory contains SQL migration scripts that need to be run in your Supabase SQL Editor to ensure proper database schema and Row-Level Security (RLS) policies.

## ⚡ Quick Start (Recommended)

### Run the Latest Migration (Fixes Schema Cache + RLS Issues)

**File:** `004_fix_products_schema_cache_and_rls.sql` ⭐ **USE THIS ONE**

**Purpose:** Complete migration that fixes schema cache errors and RLS policy issues.

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `004_fix_products_schema_cache_and_rls.sql`
3. **IMPORTANT:** Before running, if you have existing products without `user_id`:
   - Option A: Delete them (uncomment the DELETE line)
   - Option B: Assign them to your user ID (replace `YOUR_USER_ID_HERE` with your actual UUID)
   - To find your user ID: Run `SELECT auth.uid();` in SQL Editor while logged in
4. Execute the SQL
5. Verify the migration: Run the verification queries at the bottom of the migration file

**What This Does:**
- ✅ Adds `user_id`, `created_at`, and `updated_at` columns if missing
- ✅ Creates indexes for performance
- ✅ Enables Row-Level Security (RLS)
- ✅ Creates all required RLS policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Creates trigger to auto-update `updated_at` timestamp
- ✅ Forces schema cache refresh (fixes "Could not find the 'updated_at' column" error)
- ✅ Handles existing data gracefully
- ✅ Adds documentation comments

### Legacy Migrations

**File:** `003_fix_products_schema_and_rls.sql`

**Note:** This is an older migration. Use `004_fix_products_schema_cache_and_rls.sql` instead, which includes all fixes plus schema cache refresh and auto-update trigger.

## Individual Migrations (Legacy)

### 1. Add user_id Column to Products Table

**File:** `001_add_user_id_to_products.sql`

**Purpose:** Adds the `user_id` column to the `products` table to associate products with users.

**Note:** This is included in `003_fix_products_schema_and_rls.sql`. Only use separately if needed.

### 2. Enable Row-Level Security on Products Table

**File:** `002_enable_rls_on_products.sql`

**Purpose:** Enables RLS and creates policies to ensure users can only access their own products.

**Note:** This is included in `003_fix_products_schema_and_rls.sql`. Only use separately if needed.

## Verification

After running both migrations, verify:

1. **Check user_id column exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'products' AND column_name = 'user_id';
   ```

2. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'products';
   ```
   Should return `rowsecurity = true`

3. **Check policies exist:**
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'products';
   ```
   Should return 4 policies (SELECT, INSERT, UPDATE, DELETE)

## Troubleshooting

### Issue: Products not updating/deleting

**Possible Causes:**
1. RLS policies not set up correctly
2. `user_id` column missing or not populated
3. User authentication issue

**Solutions:**
1. Verify RLS policies are created (see verification steps above)
2. Check that `user_id` column exists and is populated
3. Check browser console for authentication errors
4. Verify user is logged in: `SELECT auth.uid();` in SQL Editor (should return your user ID)

### Issue: "Update returned no rows" error

**Possible Causes:**
1. Product doesn't belong to the current user
2. RLS policy is blocking the update
3. Product doesn't exist

**Solutions:**
1. Verify the product's `user_id` matches the authenticated user's ID
2. Check RLS policies allow updates for the user's own products
3. Verify the product exists in the database

### Issue: Products reappear after deletion

**Possible Causes:**
1. Delete operation is being blocked by RLS
2. `user_id` mismatch
3. RLS DELETE policy missing or incorrect
4. Realtime subscription is re-adding the product

**Solutions:**
1. Run `004_fix_products_schema_cache_and_rls.sql` migration (creates proper DELETE policy)
2. Verify RLS DELETE policy exists (run verification query #3)
3. Check that `user_id` matches authenticated user
4. Check browser console for delete errors
5. Verify deletion in Supabase dashboard directly

### Error: "Could not find the 'updated_at' column" (Schema Cache Error)

**Possible Causes:**
1. Column doesn't exist in database
2. Schema cache is stale
3. Migration wasn't run

**Solutions:**
1. Run `004_fix_products_schema_cache_and_rls.sql` migration (adds column and refreshes cache)
2. The migration includes `NOTIFY pgrst, 'reload schema';` which refreshes the schema cache
3. Wait a few seconds after running the migration for the cache to refresh
4. Verify the column exists (run verification query #1)

## Testing

After running migrations, test the following:

1. **Create a product** - Should succeed and have `user_id` set
2. **Update a product** - Should only update products you own
3. **Delete a product** - Should only delete products you own
4. **View products** - Should only show products you own
5. **Refresh page** - Products should persist correctly

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check Supabase logs for database errors
3. Verify migrations were run correctly
4. Check RLS policies are active


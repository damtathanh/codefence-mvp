# Database Migrations for CodFence MVP

This directory contains **manual SQL migration scripts** that need to be run in your Supabase SQL Editor. These are one-off migrations for fixing schema issues during MVP development.

> **Important:** The official Supabase CLI migrations are located in `/supabase/migrations/` and are managed separately. See the main project README for details.

## 📋 Current Canonical Migrations

These are the migrations you should run for a **new database** or to fix schema issues:

### Products Table

**File:** `004_fix_products_schema_cache_and_rls.sql` ⭐ **USE THIS ONE**

**Purpose:** Complete migration that fixes schema cache errors and RLS policy issues for the products table.

**What it does:**
- ✅ Adds `user_id`, `created_at`, and `updated_at` columns if missing
- ✅ Creates indexes for performance
- ✅ Enables Row-Level Security (RLS)
- ✅ Creates all required RLS policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Creates trigger to auto-update `updated_at` timestamp
- ✅ Forces schema cache refresh (fixes "Could not find the 'updated_at' column" error)

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `004_fix_products_schema_cache_and_rls.sql`
3. **IMPORTANT:** Before running, if you have existing products without `user_id`:
   - Option A: Delete them (uncomment the DELETE line in the migration)
   - Option B: Assign them to your user ID (replace `YOUR_USER_ID_HERE` with your actual UUID)
   - To find your user ID: Run `SELECT auth.uid();` in SQL Editor while logged in
4. Execute the SQL
5. Verify the migration: Run the verification queries at the bottom of the migration file

### Orders Table

**File:** `010_update_orders_schema.sql` ⭐ **USE THIS ONE**

**Purpose:** Combined migration that adds address, product_id, and other order schema updates.

**What it does:**
- ✅ Adds `order_id` column (text, separate from UUID id)
- ✅ Adds `phone` column (renames `customer_phone` if it exists)
- ✅ Adds `address` column (nullable)
- ✅ Adds `product` column (legacy text field for backward compatibility)
- ✅ Adds `product_id` column (UUID foreign key to products table)
- ✅ Converts `status` and `risk_score` to TEXT type
- ✅ Sets default values
- ✅ Creates indexes
- ✅ Migrates existing product names to product_id where possible

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `010_update_orders_schema.sql`
3. Execute the SQL
4. The migration is idempotent (safe to run multiple times)

## 📦 Legacy Migrations (Archived)

The following migrations are kept in `migrations/archive/` for reference only. **Do NOT run these on new databases** as they are superseded by the canonical migrations above:

### Products (Legacy)
- `001_add_user_id_to_products.sql` - Superseded by `004_fix_products_schema_cache_and_rls.sql`
- `002_enable_rls_on_products.sql` - Superseded by `004_fix_products_schema_cache_and_rls.sql`
- `003_fix_products_schema_and_rls.sql` - Superseded by `004_fix_products_schema_cache_and_rls.sql`

### Orders (Legacy)
- `add_address_to_orders.sql` - Superseded by `010_update_orders_schema.sql`
- `add_product_id_to_orders.sql` - Superseded by `010_update_orders_schema.sql`

## 🔍 Verification

After running migrations, verify they worked:

### Products Table
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('user_id', 'created_at', 'updated_at');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';
-- Should return: rowsecurity = true

-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'products';
-- Should return 4 policies
```

### Orders Table
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('order_id', 'phone', 'address', 'product', 'product_id');

-- Check product_id foreign key
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders' AND constraint_type = 'FOREIGN KEY';
```

## 🆘 Troubleshooting

### Error: "Could not find the 'updated_at' column" (Schema Cache Error)
**Solution:** Run `004_fix_products_schema_cache_and_rls.sql` which includes `NOTIFY pgrst, 'reload schema';` to refresh the schema cache. Wait a few seconds after running.

### Error: "column user_id does not exist"
**Solution:** The migration didn't run successfully. Re-run `004_fix_products_schema_cache_and_rls.sql`.

### Error: "new row violates row-level security policy"
**Solution:** Verify:
1. User is authenticated (check browser console)
2. Policies are created (run verification queries)
3. `user_id` matches authenticated user ID

### Products/Orders Still Reappear After Delete
**Solution:**
1. Check browser console for delete errors
2. Verify RLS DELETE policy exists
3. Verify `user_id` matches authenticated user
4. Check if realtime subscription is re-adding it

## 📚 Related Documentation

- **Supabase CLI Migrations:** See `/supabase/migrations/` for the official migration history managed by Supabase CLI
- **Main Migration Guide:** See `MIGRATION_GUIDE.md` in the project root for detailed troubleshooting

## ⚠️ Important Notes

1. **Do NOT run legacy migrations** from `migrations/archive/` on new databases
2. **Do NOT modify** the SQL inside canonical migrations unless you understand the full impact
3. **Always verify** migrations worked using the verification queries
4. **Back up your database** before running migrations on production
5. The migrations in this folder are **idempotent** (safe to run multiple times) using `IF NOT EXISTS` clauses

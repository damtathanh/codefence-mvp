# 🚀 Database Migration Guide for CodFence MVP

This project uses **two separate migration systems**:

1. **Supabase CLI Migrations** (`/supabase/migrations/`) - Official schema history managed by Supabase CLI
2. **Manual SQL Migrations** (`/migrations/`) - One-off manual migrations for MVP fixes

## 📋 Quick Reference

### For New Databases

1. **Apply Supabase CLI migrations** (automatic via `supabase db push` or manual via SQL Editor)
   - Location: `/supabase/migrations/`
   - These are numbered sequentially (000, 001, 002, ...)
   - See `supabase/README.md` for details

2. **Apply manual migrations** (run in Supabase SQL Editor)
   - Products: `migrations/004_fix_products_schema_cache_and_rls.sql`
   - Orders: `migrations/010_update_orders_schema.sql`
   - See `migrations/README.md` for details

### For Existing Production Databases

- **Do NOT** re-run Supabase CLI migrations (they're already applied)
- **Do NOT** re-run manual migrations unless fixing a specific issue
- Check migration history in Supabase dashboard to see what's already applied

---

## 🗂️ Migration Systems Explained

### 1. Supabase CLI Migrations (`/supabase/migrations/`)

**Purpose:** Official schema history managed by Supabase CLI

**Characteristics:**
- ✅ Managed by Supabase CLI (`supabase migration new`, `supabase db push`)
- ✅ Sequential numbering (000, 001, 002, ...)
- ✅ **DO NOT modify, combine, or delete** these files
- ✅ These represent the canonical schema evolution
- ✅ Used to recreate database in new environments

**Current migrations:**
- `000_initial_user_setup.sql` through `015_invoice_foreign_key_and_rls.sql`
- See `supabase/README.md` for full list

**How to use:**
```bash
# Apply all pending migrations
supabase migration up

# Or apply manually via Supabase SQL Editor (copy/paste each file in order)
```

### 2. Manual SQL Migrations (`/migrations/`)

**Purpose:** One-off manual migrations for MVP-specific fixes

**Characteristics:**
- ✅ Run manually in Supabase SQL Editor
- ✅ Idempotent (safe to run multiple times)
- ✅ Focused on specific table fixes (products, orders)
- ✅ Not managed by Supabase CLI

**Current canonical migrations:**
- `004_fix_products_schema_cache_and_rls.sql` - Products table fixes
- `010_update_orders_schema.sql` - Orders table schema updates

**Legacy migrations (archived):**
- All older migrations moved to `migrations/archive/`
- **Do NOT run these on new databases**
- Kept for reference only

**How to use:**
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the migration SQL
3. Execute
4. Verify using queries in the migration file

---

## 🚀 Products Table Migration

### File: `migrations/004_fix_products_schema_cache_and_rls.sql` ⭐

**This is the ONLY products migration you need to run.**

### Step 1: Run the Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to **SQL Editor** (left sidebar)

2. **Copy the Migration Script**
   - Open `migrations/004_fix_products_schema_cache_and_rls.sql` in this project
   - Copy the entire contents

3. **Handle Existing Data (IMPORTANT)**
   - If you have existing products without `user_id`, you need to handle them:
     - **Option A:** Delete test data (uncomment the DELETE line in the migration)
     - **Option B:** Assign to your user (uncomment the UPDATE line and replace `YOUR_USER_ID_HERE` with your actual user UUID)
   - To find your user ID: Run `SELECT auth.uid();` in SQL Editor while logged in

4. **Execute the Migration**
   - Paste the migration script into SQL Editor
   - Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

5. **Verify Success**
   - Check for any errors in the SQL Editor output
   - Run the verification queries at the bottom of the migration file

### ✅ What Gets Fixed

- ✅ Adds `user_id`, `created_at`, and `updated_at` columns if missing
- ✅ Creates indexes for performance
- ✅ Enables Row-Level Security (RLS)
- ✅ Creates all required RLS policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Creates trigger to auto-update `updated_at` timestamp
- ✅ Forces schema cache refresh (fixes "Could not find the 'updated_at' column" error)

### 🔍 Verification

After running the migration, verify everything works:

```sql
-- 1. Check columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('user_id', 'created_at', 'updated_at');

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';
-- Expected: rowsecurity = true

-- 3. Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'products';
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)
```

---

## 📦 Orders Table Migration

### File: `migrations/010_update_orders_schema.sql` ⭐

**This is the ONLY orders migration you need to run.**

### What It Does

- ✅ Adds `order_id` column (text, separate from UUID id)
- ✅ Adds `phone` column (renames `customer_phone` if it exists)
- ✅ Adds `address` column (nullable)
- ✅ Adds `product` column (legacy text field for backward compatibility)
- ✅ Adds `product_id` column (UUID foreign key to products table)
- ✅ Converts `status` and `risk_score` to TEXT type
- ✅ Sets default values
- ✅ Creates indexes
- ✅ Migrates existing product names to product_id where possible

### How to Run

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/010_update_orders_schema.sql`
3. Execute the SQL
4. The migration is idempotent (safe to run multiple times)

---

## 🐛 Troubleshooting

### Error: "Could not find the 'updated_at' column" (Schema Cache Error)
**Solution:** This error is fixed by the `004_fix_products_schema_cache_and_rls.sql` migration, which includes `NOTIFY pgrst, 'reload schema';` to refresh the schema cache. If you still see this error after running the migration, wait a few seconds and try again.

### Error: "column user_id does not exist"
**Solution:** The migration didn't run successfully. Re-run `004_fix_products_schema_cache_and_rls.sql`.

### Error: "new row violates row-level security policy"
**Solution:** RLS policies are blocking the operation. Verify:
1. User is authenticated (check browser console)
2. Policies are created (run verification query #3)
3. `user_id` matches authenticated user ID

### Error: "Update returned no rows"
**Solution:** 
1. Product doesn't belong to you (check `user_id` in database)
2. RLS policy is blocking update
3. Product doesn't exist

### Products Still Reappear After Delete
**Solution:**
1. Check browser console for delete errors
2. Verify RLS DELETE policy exists
3. Verify `user_id` matches authenticated user
4. Check if realtime subscription is re-adding it

---

## 📚 Related Documentation

- **Manual Migrations:** See `migrations/README.md` for detailed manual migration guide
- **Supabase CLI Migrations:** See `supabase/README.md` for Supabase CLI migration management
- **Migration Files:** 
  - Products: `migrations/004_fix_products_schema_cache_and_rls.sql`
  - Orders: `migrations/010_update_orders_schema.sql`

---

## ⚠️ Important Notes

1. **Legacy migrations** in `migrations/archive/` should **NOT** be run on new databases
2. **Supabase CLI migrations** in `/supabase/migrations/` should **NOT** be modified
3. **Always verify** migrations worked using the verification queries
4. **Back up your database** before running migrations on production
5. The manual migrations are **idempotent** (safe to run multiple times)

---

**Last Updated:** 2024

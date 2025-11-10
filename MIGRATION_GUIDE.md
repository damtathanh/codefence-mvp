# 🚀 Products Table Migration Guide

This guide will help you fix the `products` table schema and RLS policies to enable proper update and delete functionality.

## ⚡ Quick Fix (5 Minutes)

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
     - **Option A:** Delete test data (uncomment line 38 in the migration)
     - **Option B:** Assign to your user (uncomment line 41 and replace `YOUR_USER_ID_HERE` with your actual user UUID)
   - To find your user ID: Run `SELECT auth.uid();` in SQL Editor while logged in

4. **Execute the Migration**
   - Paste the migration script into SQL Editor
   - Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

5. **Verify Success**
   - Check for any errors in the SQL Editor output
   - Run the verification queries at the bottom of the migration file

## ✅ What Gets Fixed

### Schema Changes
- ✅ Adds `user_id` column (UUID, references `auth.users`)
- ✅ Adds `updated_at` column (timestamp with time zone)
- ✅ Adds `created_at` column (timestamp with time zone)
- ✅ Creates indexes for performance

### Security Changes
- ✅ Enables Row-Level Security (RLS)
- ✅ Creates SELECT policy (users can read their own products)
- ✅ Creates INSERT policy (users can insert their own products)
- ✅ Creates UPDATE policy (users can update their own products)
- ✅ Creates DELETE policy (users can delete their own products)

### Automation Changes
- ✅ Creates trigger to auto-update `updated_at` timestamp on row update
- ✅ Forces schema cache refresh (fixes "Could not find the 'updated_at' column" error)

## 🔍 Verification

After running the migration, verify everything works:

### 1. Check Columns Exist
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('user_id', 'created_at', 'updated_at');
```

**Expected:** Should return 3 rows showing the columns exist.

### 2. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';
```

**Expected:** `rowsecurity = true`

### 3. Check Policies Exist
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'products';
```

**Expected:** 4 policies:
- `Allow select own products` (SELECT)
- `Allow insert own products` (INSERT)
- `Allow update own products` (UPDATE)
- `Allow delete own products` (DELETE)

### 4. Test in Your App
1. **Create a product** → Should succeed
2. **Update a product** → Should persist after refresh
3. **Delete a product** → Should not reappear after refresh
4. **Check browser console** → Should see operation logs

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

## 📋 Code Verification

The `useSupabaseTable.ts` hook is already configured correctly:

✅ **Authentication:** Uses `getCurrentUserId()` helper  
✅ **Update:** Filters by `.eq('user_id', userId)`  
✅ **Delete:** Filters by `.eq('user_id', userId)`  
✅ **Insert:** Sets `user_id` automatically  
✅ **Timestamps:** Sets `updated_at` on updates, `created_at` on inserts  

## 🎯 Expected Behavior After Migration

### Before Migration ❌
- Update shows success toast but doesn't persist
- Delete shows success toast but item reappears
- Console shows RLS policy errors

### After Migration ✅
- Update persists to database immediately
- Delete removes item permanently
- No RLS errors in console
- Products don't reappear after refresh
- All operations respect user ownership

## 📝 Next Steps

1. ✅ Run the migration (`004_fix_products_schema_cache_and_rls.sql`)
2. ✅ Verify columns and policies exist
3. ✅ Verify trigger exists (auto-updates `updated_at`)
4. ✅ Test create, update, delete operations
5. ✅ Check browser console for any errors
6. ✅ Verify products persist after page refresh
7. ✅ Verify schema cache is refreshed (no "updated_at column" errors)

## 🆘 Still Having Issues?

1. **Check Supabase Logs**
   - Dashboard → Logs → Postgres Logs
   - Look for RLS policy violations

2. **Check Browser Console**
   - Open DevTools → Console
   - Look for operation logs and errors

3. **Verify Authentication**
   - Run `SELECT auth.uid();` in SQL Editor
   - Should return your user UUID

4. **Check Product Ownership**
   - Run `SELECT id, name, user_id FROM products;`
   - Verify `user_id` matches your authenticated user ID

---

**Migration File:** `migrations/004_fix_products_schema_cache_and_rls.sql`  
**Last Updated:** 2024

## 🎯 Key Features of Latest Migration

The `004_fix_products_schema_cache_and_rls.sql` migration includes:

1. **Schema Cache Refresh:** `NOTIFY pgrst, 'reload schema';` fixes the "Could not find the 'updated_at' column" error
2. **Auto-Update Trigger:** Automatically updates `updated_at` timestamp on row updates
3. **Comprehensive RLS Policies:** All 4 policies (SELECT, INSERT, UPDATE, DELETE) with proper permissions
4. **Idempotent:** Can be run multiple times safely (uses `IF NOT EXISTS` and `DROP IF EXISTS`)
5. **Verification Queries:** Includes queries to verify the migration succeeded


# Supabase CLI Migrations

This directory contains the **official Supabase CLI migration history** for the CodFence MVP project.

## ⚠️ Important: Do NOT Modify These Files

**These migrations are the canonical schema history** and must remain unchanged to ensure:
- Database can be recreated in other environments
- Migration history is preserved
- Supabase CLI can track schema changes correctly

## 📋 Current Migration Files

The migrations are numbered sequentially and should be applied in order:

- `000_initial_user_setup.sql` - Initial user authentication setup
- `001_create_user_tables.sql` - User table creation
- `002_unified_users_profile.sql` - Unified user profile schema
- `003_fix_rls_and_triggers.sql` - RLS and trigger fixes
- `004_fix_profile_loading.sql` - Profile loading fixes
- `005_fix_profile_update_rls.sql` - Profile update RLS policies
- `006_fix_role_assignment_domain_based.sql` - Role assignment logic
- `007_fix_profile_sync_complete.sql` - Profile sync completion
- `008_fix_profile_defaults.sql` - Profile default values
- `009_add_message_indexes.sql` - Message table indexes
- `010_create_system_bot.sql` - System bot user creation
- `011_fix_messages_uuid_columns.sql` - Message UUID column fixes
- `012_add_orders_indexes.sql` - Orders table indexes
- `014_add_invoice_order_cascade_delete.sql` - Invoice cascade delete foreign key
- `015_invoice_foreign_key_and_rls.sql` - Invoice foreign key and RLS policies

> **Note:** Migration `013` was removed as it was an empty no-op migration. The migration sequence jumps from `012` to `014` for this reason.

## 🚫 What NOT to Do

- ❌ **Do NOT** combine or squash these migrations
- ❌ **Do NOT** renumber them
- ❌ **Do NOT** rewrite the history
- ❌ **Do NOT** delete old migrations
- ❌ **Do NOT** modify existing migration SQL (except for critical bug fixes with team approval)

## ✅ What TO Do

- ✅ **DO** create new numbered migrations for schema changes
- ✅ **DO** use descriptive names that explain what the migration does
- ✅ **DO** test migrations on a development database first
- ✅ **DO** ensure migrations are idempotent when possible (use `IF NOT EXISTS`, etc.)
- ✅ **DO** document complex migrations with comments

## 🔧 Using Supabase CLI

### Apply Migrations

```bash
# Apply all pending migrations
supabase migration up

# Apply migrations to a specific database
supabase db push
```

### Create New Migration

```bash
# Create a new migration file
supabase migration new your_migration_name

# This will create a file like: 016_your_migration_name.sql
```

### Reset Database

```bash
# Reset database and apply all migrations from scratch
supabase db reset
```

## 📚 Related Documentation

- **Manual Migrations:** See `/migrations/` folder for one-off manual SQL migrations (products, orders fixes)
- **Migration Guide:** See `MIGRATION_GUIDE.md` in project root for detailed troubleshooting

## 🔍 Migration History

These migrations represent the complete schema evolution of the CodFence MVP database. Each migration builds on the previous ones, so they must be applied in sequential order.

For new environments, all migrations will be applied automatically by Supabase CLI when you run `supabase db push` or `supabase migration up`.

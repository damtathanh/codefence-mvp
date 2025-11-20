-- Migration: Add customer_blacklist table
-- This migration creates a table to track blacklisted customers per user
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- PART 1: Create customer_blacklist table
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_blacklist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  address text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PART 2: Add constraints and indexes
-- ============================================================================

-- Uniqueness constraint: same phone cannot be added twice for the same user
ALTER TABLE customer_blacklist
ADD CONSTRAINT customer_blacklist_user_phone_unique
UNIQUE (user_id, phone);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_user_id ON customer_blacklist(user_id);

-- Index for faster lookups by phone
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_phone ON customer_blacklist(phone);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE customer_blacklist ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own blacklist entries
CREATE POLICY "Users can view their own blacklist entries"
ON customer_blacklist
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own blacklist entries
CREATE POLICY "Users can insert their own blacklist entries"
ON customer_blacklist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own blacklist entries
CREATE POLICY "Users can update their own blacklist entries"
ON customer_blacklist
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own blacklist entries
CREATE POLICY "Users can delete their own blacklist entries"
ON customer_blacklist
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE customer_blacklist IS 'Customer blacklist entries per user. Blacklisted customers are treated as high risk during order import.';
COMMENT ON COLUMN customer_blacklist.id IS 'Primary key (UUID)';
COMMENT ON COLUMN customer_blacklist.user_id IS 'Reference to auth.users(id). Each user maintains their own blacklist.';
COMMENT ON COLUMN customer_blacklist.phone IS 'Customer phone number (required, unique per user)';
COMMENT ON COLUMN customer_blacklist.address IS 'Customer address (optional, for reference)';
COMMENT ON COLUMN customer_blacklist.reason IS 'Reason for blacklisting (optional, for reference)';
COMMENT ON COLUMN customer_blacklist.created_at IS 'Timestamp when the entry was created';


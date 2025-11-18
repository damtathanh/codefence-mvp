-- Add indexes for orders table to improve query performance
-- These indexes are safe and additive (no breaking changes)

-- Unique index on user_id + order_id to prevent duplicate order_ids per user
CREATE UNIQUE INDEX IF NOT EXISTS orders_user_order_id_unique
  ON public.orders(user_id, order_id);

-- Index for risk evaluation queries (fetching past orders by phone)
CREATE INDEX IF NOT EXISTS orders_user_phone_idx
  ON public.orders(user_id, phone);

-- Index for common ordering/filtering by created_at
CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON public.orders(user_id, created_at DESC);

-- Index for status filtering (commonly used in UI)
CREATE INDEX IF NOT EXISTS orders_user_status_idx
  ON public.orders(user_id, status);


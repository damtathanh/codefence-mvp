-- Add indexes for messages table to optimize queries
-- These indexes improve performance for:
-- 1. Fetching messages by sender_id
-- 2. Fetching messages by receiver_id
-- 3. Ordering messages by created_at

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc ON messages(created_at DESC);

-- Composite index for common query pattern: receiver_id IS NULL
CREATE INDEX IF NOT EXISTS idx_messages_receiver_null ON messages(receiver_id) WHERE receiver_id IS NULL;

-- Composite index for unread messages query
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(sender_id, receiver_id, read) WHERE read = false;


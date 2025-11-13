-- Create system-bot user profile for automated support messages
-- This allows system-bot messages to appear as admin replies in the UI
-- Run this migration to ensure RLS and foreign key constraints are satisfied

INSERT INTO users_profile (id, email, full_name, role, created_at)
VALUES ('system-bot', 'noreply@codfence.com', 'CodFence Support Bot', 'admin', now())
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;


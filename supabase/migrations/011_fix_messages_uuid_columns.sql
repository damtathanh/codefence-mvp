-- Fix messages table schema: convert sender_id and receiver_id from text to uuid
-- This fixes the type mismatch that prevents proper profile lookups

ALTER TABLE public.messages
ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;

ALTER TABLE public.messages
ALTER COLUMN receiver_id TYPE uuid USING receiver_id::uuid;


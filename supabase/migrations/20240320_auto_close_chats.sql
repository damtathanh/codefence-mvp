-- Migration: Create close_inactive_chats function
-- Automatically closes chats that have been inactive for more than 10 minutes

CREATE OR REPLACE FUNCTION close_inactive_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update chats that are 'active' and haven't been updated in 10 minutes
    UPDATE messages_sessions
    SET 
        status = 'closed',
        updated_at = NOW()
    WHERE 
        status = 'active' 
        AND updated_at < (NOW() - INTERVAL '10 minutes');
        
    -- Note: If pg_cron is available, you can schedule this:
    -- SELECT cron.schedule('*/10 * * * *', 'SELECT close_inactive_chats()');
END;
$$;

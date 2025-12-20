import { supabase } from '../lib/supabaseClient';
/**
 * Logs a user action to the history table in Supabase.
 */
export async function logUserAction({ userId, action, status, orderId = null, details = null }) {
    try {
        const { error } = await supabase.from('history').insert([
            {
                user_id: userId,
                order_id: orderId, // <-- giờ lưu TEXT
                action,
                status,
                details: details || null, // JSONB field for change tracking
            },
        ]);
        if (error) {
            console.error('[History] Failed to log user action:', error.message);
        }
    }
    catch (err) {
        console.error('[History] Unexpected error logging action:', err);
    }
}

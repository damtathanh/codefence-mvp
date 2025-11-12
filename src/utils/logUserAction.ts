import { supabase } from '../lib/supabaseClient';

interface LogParams {
  userId: string;
  action: string;
  status: 'success' | 'failed';
  orderId?: string | null;   // <-- chứa TEXT: B-2025-001 / ORD-1001
  details?: Record<string, string> | null; // Change tracking details
}

/**
 * Logs a user action to the history table in Supabase.
 */
export async function logUserAction({ userId, action, status, orderId = null, details = null }: LogParams): Promise<void> {
  try {
    const { error } = await supabase.from('history').insert([
      {
        user_id: userId,
        order_id: orderId,   // <-- giờ lưu TEXT
        action,
        status,
        details: details || null, // JSONB field for change tracking
      },
    ]);

    if (error) {
      console.error('[History] Failed to log user action:', error.message);
    }
  } catch (err) {
    console.error('[History] Unexpected error logging action:', err);
  }
}

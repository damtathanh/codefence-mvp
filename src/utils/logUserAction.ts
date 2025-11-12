import { supabase } from '../lib/supabaseClient';

interface LogParams {
  userId: string;
  action: string;
  status: 'success' | 'failed';
  orderId?: string | null;
}

/**
 * Logs a user action to the history table in Supabase.
 * This function is non-blocking and will not throw errors to avoid disrupting user workflows.
 * 
 * @param params - The parameters for logging the user action
 */
export async function logUserAction({ userId, action, status, orderId = null }: LogParams): Promise<void> {
  try {
    const { error } = await supabase.from('history').insert([
      {
        user_id: userId,
        order_id: orderId,
        action,
        status,
      },
    ]);

    if (error) {
      console.error('[History] Failed to log user action:', error.message);
    }
  } catch (err) {
    // Silently fail to avoid disrupting user workflows
    console.error('[History] Unexpected error logging action:', err);
  }
}


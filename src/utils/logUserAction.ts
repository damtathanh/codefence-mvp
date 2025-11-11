import { supabase } from '../lib/supabaseClient';

export interface LogUserActionParams {
  userId: string;
  page: 'product' | 'order';
  action: string;
  targetId: string | null;
  targetName: string | null;
  status?: 'success' | 'failed';
  message?: string;
}

/**
 * Logs a user action to the history table in Supabase.
 * This function is non-blocking and will not throw errors to avoid disrupting user workflows.
 * 
 * @param params - The parameters for logging the user action
 */
export async function logUserAction(params: LogUserActionParams): Promise<void> {
  try {
    const { userId, page, action, targetId, targetName, status = 'success', message = '' } = params;

    const { error } = await supabase.from('history').insert([
      {
        user_id: userId,
        page,
        action,
        target_id: targetId,
        target_name: targetName,
        status,
        message: message || null,
      },
    ]);

    if (error) {
      console.error('Failed to log user action:', error.message);
    }
  } catch (err) {
    // Silently fail to avoid disrupting user workflows
    console.error('Error logging action:', err);
  }
}


// Shared hook for Supabase CRUD operations
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UseSupabaseTableOptions<T> {
  tableName: string;
  enableRealtime?: boolean;
}

/**
 * Helper function to get the current authenticated user ID
 * Throws an error if user is not authenticated
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('[useSupabaseTable] Authentication error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('User not authenticated. Please log in again.');
  }
  
  return user.id;
}

export function useSupabaseTable<T extends { id: string; user_id: string }>(
  options: UseSupabaseTableOptions<T>
) {
  const { tableName, enableRealtime = false } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all items for the current user
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user ID
      const userId = await getCurrentUserId();
      console.log(`[${tableName}] Fetching items for user ${userId}`);

      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error(`[${tableName}] Error fetching items:`, fetchError);
        console.error(`[${tableName}] Fetch error details:`, {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
        });
        const errorMessage = fetchError.message || 'Failed to fetch data';
        setError(errorMessage);
        setData([]);
        throw new Error(errorMessage);
      }

      console.log(`[${tableName}] Successfully fetched ${items?.length || 0} items`);
      setData((items as T[]) || []);
      return items as T[];
    } catch (err) {
      console.error(`[${tableName}] Unexpected error fetching items:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setData([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  // Add new item
  const addItem = useCallback(
    async (item: Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      try {
        // Get authenticated user ID
        const userId = await getCurrentUserId();
        console.log(`[${tableName}] Adding item for user ${userId}:`, item);

        // Prepare item with user_id and timestamps
        // Include id if provided (Supabase supports custom IDs)
        const itemToInsert: any = {
          ...item,
          user_id: userId,
          created_at: new Date().toISOString(),
        };

        const { data: newItems, error: insertError } = await supabase
          .from(tableName)
          .insert([itemToInsert])
          .select();

        if (insertError) {
          console.error(`[${tableName}] Error adding item:`, insertError);
          console.error(`[${tableName}] Insert error details:`, {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          });
          const errorMessage = insertError.message || 'Failed to add item';
          throw new Error(errorMessage);
        }

        if (!newItems || newItems.length === 0) {
          throw new Error('Insert succeeded but no data returned. This may indicate an RLS policy issue.');
        }

        const newItem = newItems[0] as T;
        console.log(`[${tableName}] Successfully added item with ID ${newItem.id}:`, newItem);

        // Update local state with the returned data from Supabase
        setData((prev) => [newItem, ...prev]);
        return newItem;
      } catch (err) {
        console.error(`[${tableName}] Unexpected error adding item:`, err);
        throw err;
      }
    },
    [tableName]
  );

  // Update item
  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<T, 'id' | 'user_id' | 'created_at'>>) => {
      try {
        const userId = await getCurrentUserId();
  
        // Không thêm updated_at thủ công (DB trigger tự cập nhật)
        const updateData: any = { ...updates };
  
        console.log(`[${tableName}] Updating item ${id} for user ${userId}:`, updateData);
  
        const { data: updatedItems, error: updateError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single(); // lấy 1 record thôi, gọn
  
        if (updateError) {
          console.error(`[${tableName}] Error updating item ${id}:`, updateError);
          throw new Error(updateError.message || 'Failed to update item');
        }
  
        if (!updatedItems) {
          throw new Error('Update failed or item not found (possible RLS restriction)');
        }
  
        console.log(`[${tableName}] Successfully updated item ${id}`, updatedItems);
  
        // Cập nhật UI state
        setData((prev) => prev.map((item) => (item.id === id ? updatedItems : item)));
  
        return updatedItems;
      } catch (err) {
        console.error(`[${tableName}] Unexpected error updating item ${id}:`, err);
        throw err;
      }
    },
    [tableName]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id: string) => {
      try {
        const userId = await getCurrentUserId();
        console.log(`[${tableName}] Deleting item ${id} for user ${userId}`);
  
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
  
        if (deleteError) {
          console.error(`[${tableName}] Delete error for item ${id}:`, deleteError);
          throw new Error(deleteError.message || 'Failed to delete item');
        }
  
        // Thêm delay nhỏ (chờ DB apply RLS + replication)
        await new Promise((res) => setTimeout(res, 300));
  
        // Kiểm tra lại xem item còn không
        const { data: verifyItem } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();
  
        if (verifyItem) {
          console.warn(`[${tableName}] Delete verification: item still exists (${id})`);
          throw new Error('Delete operation failed: Item still exists (possible RLS issue).');
        }
  
        console.log(`[${tableName}] Successfully deleted item ${id}`);
        setData((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error(`[${tableName}] Unexpected error deleting item ${id}:`, err);
        throw err;
      }
    },
    [tableName]
  );  

  // Initial fetch on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription (optional)
  useEffect(() => {
    if (!enableRealtime) return;

    let channel: any = null;

    const setupRealtime = async () => {
      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.warn(`[${tableName}] Cannot setup realtime: user not authenticated`);
        return;
      }

      console.log(`[${tableName}] Setting up realtime subscription for user ${authUser.id}`);

      channel = supabase
        .channel(`${tableName}_changes_${authUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `user_id=eq.${authUser.id}`,
          },
          (payload) => {
            console.log(`[${tableName}] Realtime event:`, payload.eventType, payload);

            setData((prev) => {
              switch (payload.eventType) {
                case 'INSERT': {
                  // ✅ Prevent duplicates: skip if the record already exists
                  const exists = prev.some((item) => item.id === payload.new.id);
                  if (exists) return prev;
                  return [payload.new as T, ...prev];
                }
                case 'UPDATE':
                  return prev.map((item) =>
                    item.id === payload.new.id ? (payload.new as T) : item
                  );
                case 'DELETE':
                  return prev.filter((item) => item.id !== payload.old.id);
                default:
                  return prev;
              }
            });
          }
        )
        .subscribe();

      console.log(`[${tableName}] Realtime subscription established`);
    };

    setupRealtime();

    return () => {
      if (channel) {
        console.log(`[${tableName}] Removing realtime subscription`);
        supabase.removeChannel(channel);
      }
    };
  }, [enableRealtime, tableName]);

  return {
    data,
    loading,
    error,
    fetchAll,
    addItem,
    updateItem,
    deleteItem,
  };
}

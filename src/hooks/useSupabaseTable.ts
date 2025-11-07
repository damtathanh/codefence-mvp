// Shared hook for Supabase CRUD operations
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';

interface UseSupabaseTableOptions<T> {
  tableName: string;
  enableRealtime?: boolean;
}

export function useSupabaseTable<T extends { id: string; user_id: string }>(
  options: UseSupabaseTableOptions<T>
) {
  const { tableName, enableRealtime = false } = options;
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all items for the current user
  const fetchAll = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error(`Error fetching ${tableName}:`, fetchError);
        setError(fetchError.message);
        setData([]);
      } else {
        setData((items as T[]) || []);
      }
    } catch (err) {
      console.error(`Unexpected error fetching ${tableName}:`, err);
      setError('Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user, tableName]);

  // Add new item
  const addItem = useCallback(
    async (item: Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      try {
        const { data: newItem, error: insertError } = await supabase
          .from(tableName)
          .insert([{ ...item, user_id: user.id }])
          .select()
          .single();

        if (insertError) {
          console.error(`Error adding to ${tableName}:`, insertError);
          throw insertError;
        }

        // Optimistically update local state
        setData((prev) => [newItem as T, ...prev]);
        return newItem as T;
      } catch (err) {
        console.error(`Unexpected error adding to ${tableName}:`, err);
        throw err;
      }
    },
    [user, tableName]
  );

  // Update item
  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<T, 'id' | 'user_id' | 'created_at'>>) => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      try {
        const { data: updatedItem, error: updateError } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id) // Ensure user can only update their own items
          .select()
          .single();

        if (updateError) {
          console.error(`Error updating ${tableName}:`, updateError);
          throw updateError;
        }

        // Optimistically update local state
        setData((prev) => prev.map((item) => (item.id === id ? (updatedItem as T) : item)));
        return updatedItem as T;
      } catch (err) {
        console.error(`Unexpected error updating ${tableName}:`, err);
        throw err;
      }
    },
    [user, tableName]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id: string) => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      try {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id)
          .eq('user_id', user.id); // Ensure user can only delete their own items

        if (deleteError) {
          console.error(`Error deleting from ${tableName}:`, deleteError);
          throw deleteError;
        }

        // Optimistically update local state
        setData((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error(`Unexpected error deleting from ${tableName}:`, err);
        throw err;
      }
    },
    [user, tableName]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription (optional)
  useEffect(() => {
    if (!enableRealtime || !user) return;

    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [payload.new as T, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as T) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, user, tableName]);

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


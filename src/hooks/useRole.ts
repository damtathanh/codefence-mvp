// src/hooks/useRole.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';
import { isAdminByEmail } from '../utils/isAdmin';

export type UserRole = 'admin' | 'user' | null;

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Check email domain first (primary method)
    if (isAdminByEmail(user)) {
      setRole('admin');
      setLoading(false);
      return;
    }

    // If not admin by email, check database (fallback)
    const fetchRole = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch role from unified users_profile table
        const { data, error: fetchError } = await supabase
          .from('users_profile')
          .select('role')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            console.log('No profile found for user, defaulting to "user"');
            setRole('user');
          } else {
            console.error('Error fetching user role:', fetchError);
            setError(fetchError.message);
            setRole('user');
          }
        } else {
          console.log('Fetched role:', data?.role);
          setRole((data?.role as UserRole) || 'user');
        }
      } catch (err) {
        console.error('Unexpected error fetching role:', err);
        setError('Failed to fetch user role');
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return { role, loading, error };
}

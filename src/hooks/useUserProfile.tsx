import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh session before fetching profile
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        return false;
      }
      return !!data?.session;
    } catch (err) {
      console.error('Error refreshing session:', err);
      return false;
    }
  }, []);

  // Fetch profile with retry logic
  const fetchProfile = useCallback(async (retryCount = 0): Promise<void> => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Refresh session first
      if (retryCount === 0) {
        await refreshSession();
      }

      // Wait a bit for session to be ready
      await new Promise(resolve => setTimeout(resolve, 200));

      // Fetch profile
      const { data, error: fetchError } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // If profile doesn't exist, create it
        if (fetchError.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          await createProfile();
          return;
        }

        // If session error, retry once
        if ((fetchError.message.includes('JWT') || 
             fetchError.message.includes('expired') || 
             fetchError.message.includes('token') ||
             fetchError.message.includes('sub claim')) && 
            retryCount < 1) {
          console.log('Session error detected, retrying...');
          await refreshSession();
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchProfile(retryCount + 1);
        }

        console.error('Error fetching profile:', fetchError);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
        setError(null);
      } else {
        // No data returned, try creating profile
        await createProfile();
      }
    } catch (err: any) {
      console.error('Unexpected error fetching profile:', err);
      if (retryCount < 1 && (err?.message?.includes('JWT') || err?.message?.includes('expired'))) {
        await refreshSession();
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchProfile(retryCount + 1);
      }
      setError(err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user, refreshSession]);

  // Create profile if it doesn't exist
  const createProfile = useCallback(async (): Promise<void> => {
    if (!user?.id || !user?.email) return;

    try {
      // Extract full_name from various possible metadata fields
      const fullName = user.user_metadata?.full_name || 
                      user.user_metadata?.fullName ||
                      user.user_metadata?.display_name ||
                      user.user_metadata?.name ||
                      null;
      
      // Determine role based on email domain
      const isAdminEmail = user.email.toLowerCase().endsWith('@codfence.com');
      const userRole = isAdminEmail ? 'admin' : 'user';

      // Use upsert instead of insert to handle cases where profile might already exist
      const { data, error: createError } = await supabase
        .from('users_profile')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          phone: user.user_metadata?.phone || null,
          company_name: user.user_metadata?.company_name || 
                       user.user_metadata?.company || 
                       'CodFence',
          role: userRole, // ✅ Ensure role is set correctly based on domain
        }, {
          onConflict: 'id',
          // Update all fields when profile already exists
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (createError) {
        // If it's a conflict error, the profile might have been created by trigger
        if (createError.code === '23505' || createError.code === 'PGRST116') {
          console.log('Profile might already exist, fetching...');
          // Fetch the profile that was created by trigger
          const { data: fetchedData, error: fetchError } = await supabase
            .from('users_profile')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (fetchedData && !fetchError) {
            // Profile exists - check if it needs updating
            const needsUpdate = 
              (!fetchedData.full_name && fullName) ||
              (!fetchedData.phone && user.user_metadata?.phone) ||
              (!fetchedData.company_name && (user.user_metadata?.company_name || user.user_metadata?.company)) ||
              (fetchedData.role !== userRole);

            if (needsUpdate) {
              // Update profile with missing fields
              const updateData: any = {};
              if (!fetchedData.full_name && fullName) {
                updateData.full_name = fullName;
              }
              if (!fetchedData.phone && user.user_metadata?.phone) {
                updateData.phone = user.user_metadata.phone;
              }
              if (!fetchedData.company_name && (user.user_metadata?.company_name || user.user_metadata?.company)) {
                updateData.company_name = user.user_metadata?.company_name || user.user_metadata?.company;
              }
              // Always ensure role is correct
              if (fetchedData.role !== userRole) {
                updateData.role = userRole;
              }

              const { error: updateError } = await supabase
                .from('users_profile')
                .update(updateData)
                .eq('id', user.id);

              if (!updateError) {
                // Fetch updated profile
                const { data: updatedData } = await supabase
                  .from('users_profile')
                  .select('*')
                  .eq('id', user.id)
                  .single();
                
                if (updatedData) {
                  setProfile(updatedData);
                  setError(null);
                  return;
                }
              }
            } else {
              setProfile(fetchedData);
              setError(null);
              return;
            }
          }
        }
        console.error('Error creating/updating profile:', createError);
        setError(createError.message);
        return;
      }

      if (data) {
        setProfile(data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err?.message || 'Failed to create profile');
    }
  }, [user]);

  // Load profile on mount and when user changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refresh profile (call this after updates)
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
  };
};


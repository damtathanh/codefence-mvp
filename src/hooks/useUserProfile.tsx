// src/hooks/useUserProfile.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../features/auth";
import type { UserProfile } from "../types/supabase";

export interface UserProfileUpdateData {
  full_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create or upsert profile (safe, checks session)
  const createProfile = useCallback(async (): Promise<void> => {
    if (!user?.id || !user?.email) {
      console.warn("Cannot create profile: missing user ID or email");
      return;
    }

    // Ensure session present
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error while creating profile:", sessionError);
        setError("Session error. Please log in again.");
        return;
      }
      
      if (!session) {
        console.error("Cannot create profile: missing auth session");
        setError("No active session. Please log in again.");
        return;
      }

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.fullName ||
        user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        null;

      const isAdminEmail = user.email.toLowerCase().endsWith("@codfence.com");
      const userRole = isAdminEmail ? "admin" : "user";

      const { data, error: createError } = await supabase
        .from("users_profile")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
            phone: user.user_metadata?.phone || null,
            company_name:
              user.user_metadata?.company_name ||
              user.user_metadata?.company ||
              null,
            role: userRole,
          },
          { onConflict: "id", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (createError) {
        console.error("Error creating/updating profile:", createError);
        setError(createError.message);
        return;
      }

      if (data) {
        setProfile(data);
        setError(null);
      }
    } catch (err: any) {
      console.error("Error creating profile:", err);
      setError(err?.message || "Failed to create profile");
    }
  }, [user]);

  // Load profile when session exists
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!session) {
        // No active session — ensure UI handles that (redirect elsewhere)
        setProfile(null);
        setLoading(false);
        return;
      }

      // Check if email is verified
      if (!session.user.email_confirmed_at) {
        console.warn("Email not verified, cannot load profile");
        setProfile(null);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      if (!userId) {
        console.error("No user ID found in session");
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from("users_profile")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) {
        // Profile not found -> create
        if (fetchError?.code === "PGRST116") {
          await createProfile();
        } else {
          console.error("Error loading profile:", fetchError);
          // Don't set error for RLS or auth errors - these are handled by auth system
          if (!fetchError.message?.includes('row-level security') && 
              !fetchError.message?.includes('JWT') &&
              !fetchError.message?.includes('session')) {
            setError(fetchError.message || "Failed to load profile");
          }
        }
        setLoading(false);
        return;
      }

      setProfile(existingProfile || null);
      setError(null);
    } catch (err: any) {
      console.error("Unexpected error loadProfile:", err);
      // Don't set error for session/auth errors - these are handled by auth system
      if (!err?.message?.includes('session') && 
          !err?.message?.includes('JWT') &&
          !err?.message?.includes('auth')) {
        setError(err?.message || "Failed to load profile");
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [createProfile]);

  // ✅ Update profile helper - syncs both auth metadata and users_profile table
  const updateProfile = useCallback(async (updateData: UserProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Step 1: Update auth.users metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: updateData.full_name,
          fullName: updateData.full_name, // Compatibility
          phone: updateData.phone,
          company_name: updateData.company_name,
          company: updateData.company_name, // Compatibility
        },
      });

      if (authUpdateError) {
        console.error("Error updating auth user metadata:", authUpdateError);
        // Continue with profile update even if auth update fails
        // The profile table is the source of truth
      }

      // Step 2: Update users_profile table
      const { data, error: profileUpdateError } = await supabase
        .from("users_profile")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (profileUpdateError) {
        console.error("Error updating profile:", profileUpdateError);
        return { success: false, error: profileUpdateError.message };
      }

      if (data) {
        setProfile(data);
        setError(null);
        return { success: true };
      }

      return { success: false, error: "No data returned from update" };
    } catch (err: any) {
      console.error("Error updating profile:", err);
      return { success: false, error: err?.message || "Failed to update profile" };
    }
  }, [user]);

  // Initial load + listen to auth state changes
  useEffect(() => {
    // Only load profile if user exists and is authenticated
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    loadProfile();

    // Listen to auth state changes to reload profile
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Only reload on significant auth events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Small delay to ensure session is fully established
        setTimeout(() => {
          if (session?.user) {
            loadProfile();
          } else {
            setProfile(null);
            setLoading(false);
          }
        }, 300);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [user, loadProfile]);

  // refreshProfile helper
  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile, // ✅ Export updateProfile helper
  };
};

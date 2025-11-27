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

  // Load profile with polling (retry if trigger hasn't finished yet)
  const loadProfile = useCallback(async (retries = 3, delay = 1000) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Attempt to fetch profile
      const fetchProfile = async () => {
        const { data: existingProfile, error: fetchError } = await supabase
          .from("users_profile")
          .select("*")
          .eq("id", userId)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw new Error("Profile not found");
          }
          throw fetchError;
        }
        return existingProfile;
      };

      let currentProfile = null;
      let attempt = 0;

      while (attempt <= retries) {
        try {
          currentProfile = await fetchProfile();
          break; // Success
        } catch (err: any) {
          if (err.message === "Profile not found" && attempt < retries) {
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
          } else {
            throw err;
          }
        }
      }

      setProfile(currentProfile);
      setError(null);

    } catch (err: any) {
      console.error("Error loading profile:", err);
      // Don't set error if profile just isn't found yet (trigger delay)
      if (err?.message !== "Profile not found") {
        setError(err?.message || "Failed to load profile");
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updateData: UserProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Step 1: Update auth.users metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: updateData.full_name,
          fullName: updateData.full_name,
          phone: updateData.phone,
          company_name: updateData.company_name,
          company: updateData.company_name,
        },
      });

      if (authUpdateError) {
        console.error("Error updating auth user metadata:", authUpdateError);
      }

      // Step 2: Update users_profile table
      const { data, error: profileUpdateError } = await supabase
        .from("users_profile")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (profileUpdateError) {
        return { success: false, error: profileUpdateError.message };
      }

      if (data) {
        setProfile(data);
        setError(null);
        return { success: true };
      }

      return { success: false, error: "No data returned from update" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update profile" };
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (session?.user) {
          loadProfile();
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [user, loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
  };
};

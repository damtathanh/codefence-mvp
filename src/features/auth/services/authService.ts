// src/features/auth/services/authService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { User, AuthError } from '@supabase/supabase-js';

export interface LoginResult {
  error: AuthError | null;
}

export interface SignupResult {
  data: { user: User | null } | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * Sign in with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  },

  /**
   * Sign up with email and password
   */
  async signup(email: string, password: string): Promise<SignupResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  },

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  },

  /**
   * Get the current session
   */
  async getSession() {
    return await supabase.auth.getSession();
  },

  /**
   * Set the session with tokens
   */
  async setSession(tokens: { access_token: string; refresh_token: string }) {
    return await supabase.auth.setSession(tokens);
  },

  /**
   * Reset password for email
   */
  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    return await supabase.auth.resetPasswordForEmail(email, options);
  },

  /**
   * Update user password
   */
  async updatePassword(password: string) {
    return await supabase.auth.updateUser({ password });
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};


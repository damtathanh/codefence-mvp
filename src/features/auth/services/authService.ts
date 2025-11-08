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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Store session in localStorage as backup
      if (data?.session && !error) {
        try {
          localStorage.setItem('supabase_session', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type,
            user: data.session.user,
          }));
        } catch (storageError) {
          console.error('Error saving session to localStorage:', storageError);
        }
      }
      
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
      
      // Store session in localStorage if available (some signups require email verification first)
      if (data?.session && !error) {
        try {
          localStorage.setItem('supabase_session', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type,
            user: data.session.user,
          }));
        } catch (storageError) {
          console.error('Error saving session to localStorage:', storageError);
        }
      }
      
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
      // Clear session from localStorage
      localStorage.removeItem('supabase_session');
    } catch (error) {
      console.error('Error logging out:', error);
      // Clear session from localStorage even if logout fails
      localStorage.removeItem('supabase_session');
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
    const result = await supabase.auth.getSession();
    
    // Update localStorage with current session if it exists
    if (result.data?.session) {
      try {
        localStorage.setItem('supabase_session', JSON.stringify({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
          expires_at: result.data.session.expires_at,
          expires_in: result.data.session.expires_in,
          token_type: result.data.session.token_type,
          user: result.data.session.user,
        }));
      } catch (storageError) {
        console.error('Error saving session to localStorage:', storageError);
      }
    }
    
    return result;
  },

  /**
   * Refresh the current session
   */
  async refreshSession() {
    const result = await supabase.auth.refreshSession();
    
    // Update session in localStorage after refresh
    if (result.data?.session) {
      try {
        localStorage.setItem('supabase_session', JSON.stringify({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
          expires_at: result.data.session.expires_at,
          expires_in: result.data.session.expires_in,
          token_type: result.data.session.token_type,
          user: result.data.session.user,
        }));
      } catch (storageError) {
        console.error('Error saving refreshed session to localStorage:', storageError);
      }
    } else if (result.error) {
      // Refresh failed, clear saved session
      localStorage.removeItem('supabase_session');
    }
    
    return result;
  },

  /**
   * Set the session with tokens
   */
  async setSession(tokens: { access_token: string; refresh_token: string }) {
    const result = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    
    // Store session in localStorage as backup
    if (result.data?.session) {
      try {
        localStorage.setItem('supabase_session', JSON.stringify({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
          expires_at: result.data.session.expires_at,
          expires_in: result.data.session.expires_in,
          token_type: result.data.session.token_type,
          user: result.data.session.user,
        }));
      } catch (storageError) {
        console.error('Error saving session to localStorage:', storageError);
      }
    }
    
    return result;
  },

  /**
   * Restore session from localStorage
   */
  async restoreSession() {
    try {
      // First, check if Supabase already has a valid session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        // Supabase already has a valid session, use it
        return { data: { session: currentSession, user: currentSession.user }, error: null };
      }

      // If no current session, try to restore from localStorage
      const saved = localStorage.getItem('supabase_session');
      if (saved) {
        try {
          const sessionData = JSON.parse(saved);
          
          // Check if we have the required tokens
          if (sessionData.access_token && sessionData.refresh_token) {
            // Try to restore the session
            const result = await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });
            
            // If restoration failed but we have a refresh token, try to refresh
            if (result.error && sessionData.refresh_token) {
              try {
                const refreshResult = await supabase.auth.refreshSession();
                if (refreshResult.data?.session) {
                  // Save refreshed session
                  localStorage.setItem('supabase_session', JSON.stringify({
                    access_token: refreshResult.data.session.access_token,
                    refresh_token: refreshResult.data.session.refresh_token,
                    expires_at: refreshResult.data.session.expires_at,
                    expires_in: refreshResult.data.session.expires_in,
                    token_type: refreshResult.data.session.token_type,
                    user: refreshResult.data.session.user,
                  }));
                }
                return refreshResult;
              } catch (refreshError) {
                // Refresh failed, clear saved session
                localStorage.removeItem('supabase_session');
                return { data: { session: null, user: null }, error: refreshError as AuthError };
              }
            }
            
            return result;
          }
        } catch (parseError) {
          console.error('Error parsing saved session:', parseError);
          localStorage.removeItem('supabase_session');
        }
      }
      
      // No saved session or restoration failed
      return { data: { session: null, user: null }, error: null };
    } catch (error) {
      console.error('Error restoring session:', error);
      localStorage.removeItem('supabase_session');
      return { data: { session: null, user: null }, error: error as AuthError };
    }
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


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
   * Checks email verification before allowing login
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Check if login was successful
      if (error) {
        return { error };
      }

      // ✅ Check if email is verified
      if (data?.user && !data.user.email_confirmed_at) {
        // User exists but email is not verified - sign out immediately
        await supabase.auth.signOut();
        return { 
          error: {
            message: 'Email not verified. Please check your inbox and click the verification link to verify your email before logging in.',
            name: 'EmailNotVerified',
            status: 403,
          } as AuthError
        };
      }
      
      // Mark session as started for this browser session
      if (data?.session && !error) {
        try {
          sessionStorage.setItem('codfence_session_start', Date.now().toString());
        } catch (storageError) {
          console.error('Error saving session start:', storageError);
        }
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  },

  /**
   * Sign up with email and password
   */
  async signup(email: string, password: string, metadata?: Record<string, any>): Promise<SignupResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
      // Clear sessionStorage to mark session as ended
      sessionStorage.removeItem('codfence_session_start');
      // Clear other auth-related storage
      localStorage.removeItem('codfence_auth_user');
      localStorage.removeItem('codfence_auth_token');
    } catch (error) {
      console.error('Error logging out:', error);
      // Clear session from localStorage even if logout fails
      localStorage.removeItem('supabase_session');
      sessionStorage.removeItem('codfence_session_start');
      localStorage.removeItem('codfence_auth_user');
      localStorage.removeItem('codfence_auth_token');
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
   * Also checks if session is valid (not from a closed browser)
   */
  async getSession() {
    // Check if this is a new session (browser was closed)
    const sessionStart = sessionStorage.getItem('codfence_session_start');
    if (!sessionStart) {
      // New session - no valid session
      return { data: { session: null }, error: null };
    }

    const result = await supabase.auth.getSession();
    
    // ✅ Check if user's email is verified
    if (result.data?.session?.user && !result.data.session.user.email_confirmed_at) {
      // Email not verified - invalidate session
      await supabase.auth.signOut();
      sessionStorage.removeItem('codfence_session_start');
      return { data: { session: null }, error: null };
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
   * Only restores if sessionStart exists in sessionStorage (browser wasn't closed)
   */
  async restoreSession() {
    try {
      // Check if this is a new session (browser was closed)
      const sessionStart = sessionStorage.getItem('codfence_session_start');
      if (!sessionStart) {
        // New session - don't restore
        return { data: { session: null, user: null }, error: null };
      }

      // First, check if Supabase already has a valid session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        // ✅ Check if email is verified
        if (!currentSession.user.email_confirmed_at) {
          // Email not verified - don't restore
          await supabase.auth.signOut();
          sessionStorage.removeItem('codfence_session_start');
          return { data: { session: null, user: null }, error: null };
        }
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
            
            // ✅ Check if email is verified after restoring session
            if (result.data?.session?.user && !result.data.session.user.email_confirmed_at) {
              // Email not verified - sign out and clear
              await supabase.auth.signOut();
              sessionStorage.removeItem('codfence_session_start');
              localStorage.removeItem('supabase_session');
              return { data: { session: null, user: null }, error: null };
            }
            
            // If restoration failed but we have a refresh token, try to refresh
            if (result.error && sessionData.refresh_token) {
              try {
                const refreshResult = await supabase.auth.refreshSession();
                if (refreshResult.data?.session) {
                  // ✅ Check if email is verified
                  if (!refreshResult.data.session.user.email_confirmed_at) {
                    await supabase.auth.signOut();
                    sessionStorage.removeItem('codfence_session_start');
                    localStorage.removeItem('supabase_session');
                    return { data: { session: null, user: null }, error: null };
                  }
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
                sessionStorage.removeItem('codfence_session_start');
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
      sessionStorage.removeItem('codfence_session_start');
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


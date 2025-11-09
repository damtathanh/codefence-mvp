// src/features/auth/hooks/useAuth.tsx
import { supabase } from '../../../lib/supabaseClient';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { authService } from '../services/authService';

const STORAGE_KEY = 'codfence_auth_user';
const STORAGE_TOKEN_KEY = 'codfence_auth_token';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ data: { user: User | null } | null; error: AuthError | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper functions for localStorage
const saveUserToStorage = (user: User | null, token?: string) => {
  if (user) {
    try {
      // Save custom app-level auth info
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          avatar: user.user_metadata?.avatar_url || null,
        })
      );

      // Save CodFence token (legacy)
      if (token) {
        localStorage.setItem(STORAGE_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem('codfence_last_path');
    localStorage.removeItem('codfence_session_start');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // With persistSession: true, Supabase automatically restores sessions
        // Just get the current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          // Check if email is verified
          if (!session.user.email_confirmed_at) {
            // Email not verified - sign out
            await supabase.auth.signOut();
            if (isMounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }

          // Valid session found
          if (isMounted) {
            setUser(session.user);
            saveUserToStorage(session.user, session.access_token);
            // Save last path for redirect after refresh
            if (typeof window !== 'undefined') {
              localStorage.setItem('codfence_last_path', window.location.pathname);
              localStorage.setItem('codfence_session_start', Date.now().toString());
            }
            setLoading(false);
          }
        } else {
          // No session found
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Initialize auth on mount
    initializeAuth();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Check if email is verified
          if (!session.user.email_confirmed_at) {
            // Email not verified - sign out
            console.log('Email not verified, signing out');
            await supabase.auth.signOut();
            setUser(null);
            clearStorage();
            setLoading(false);
            return;
          }

          // Valid session
          setUser(session.user);
          saveUserToStorage(session.user, session.access_token);
          // Save last path for redirect after refresh
          if (typeof window !== 'undefined') {
            localStorage.setItem('codfence_last_path', window.location.pathname);
            localStorage.setItem('codfence_session_start', Date.now().toString());
          }
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setUser(null);
        clearStorage();
        setLoading(false);
      } else if (event === 'USER_UPDATED' && session?.user) {
        // User data updated
        setUser(session.user);
        saveUserToStorage(session.user, session.access_token);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Initial session event - session may be null on first load
        // This is handled by initializeAuth(), so we just set loading to false
        // Don't update user state here to avoid race conditions
        setLoading(false);
      }
    });

    // Cleanup
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Restore last route after refresh
  useEffect(() => {
    const lastPath = localStorage.getItem('codfence_last_path');
    // Only redirect if we're on home page and have a valid last path (dashboard page)
    if (lastPath && window.location.pathname === '/' && (lastPath.includes('/dashboard') || lastPath.includes('/admin') || lastPath.includes('/user'))) {
      // Only redirect if we have a valid session
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.email_confirmed_at) {
          // Small delay to ensure auth state is ready
          setTimeout(() => {
            window.location.replace(lastPath);
          }, 100);
        }
      };
      checkSession();
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      const result = await authService.login(email, password);
      
      if (!result.error) {
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 100));
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && session.user.email_confirmed_at) {
          setUser(session.user);
          saveUserToStorage(session.user, session.access_token);
          // Save last path for redirect after refresh
          if (typeof window !== 'undefined') {
            localStorage.setItem('codfence_last_path', window.location.pathname);
            localStorage.setItem('codfence_session_start', Date.now().toString());
          }
        }
      }
      
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  const signup = async (email: string, password: string, metadata?: Record<string, any>): Promise<{ data: { user: User | null } | null; error: AuthError | null }> => {
    try {
      setLoading(true);
      const result = await authService.signup(email, password, metadata);
      
      // If signup creates a session (some require email verification first)
      if (result.data?.user && !result.error) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.email_confirmed_at) {
          setUser(session.user);
          saveUserToStorage(session.user, session.access_token);
          if (typeof window !== 'undefined') {
            localStorage.setItem('codfence_last_path', window.location.pathname);
            localStorage.setItem('codfence_session_start', Date.now().toString());
          }
        }
      }
      
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return { data: null, error: error as AuthError };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      clearStorage();
      setLoading(false);
    } catch (error) {
      console.error('Error logging out:', error);
      // Clear storage even if logout fails
      setUser(null);
      clearStorage();
      setLoading(false);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

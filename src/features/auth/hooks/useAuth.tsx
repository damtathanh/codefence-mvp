// src/features/auth/hooks/useAuth.tsx
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
  signup: (email: string, password: string) => Promise<{ data: { user: User | null } | null; error: AuthError | null }>;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar: user.user_metadata?.avatar_url || null,
      }));
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
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const justLoggedInRef = useRef<boolean>(false);

  // Load user from localStorage on mount
  useEffect(() => {
    let isMounted = true;
    let lastSessionCheck = Date.now();

    const initializeAuth = async () => {
      try {
        // Step 1: Try to restore session from localStorage first
        const restoreResult = await authService.restoreSession();
        
        if (restoreResult.data?.session?.user && isMounted) {
          setUser(restoreResult.data.session.user);
          saveUserToStorage(restoreResult.data.session.user, restoreResult.data.session.access_token);
          lastSessionCheck = Date.now();
          setLoading(false);
          return;
        }
        
        // Step 2: Get current session from Supabase
        const { data: { session } } = await authService.getSession();
        
        if (session?.user && isMounted) {
          setUser(session.user);
          saveUserToStorage(session.user, session.access_token);
          lastSessionCheck = Date.now();
          setLoading(false);
        } else if (!session?.user && isMounted) {
          // Step 3: Try to refresh session if we have a refresh token
          try {
            const refreshResult = await authService.refreshSession();
            if (refreshResult.data?.session?.user && isMounted) {
              setUser(refreshResult.data.session.user);
              saveUserToStorage(refreshResult.data.session.user, refreshResult.data.session.access_token);
              lastSessionCheck = Date.now();
              setLoading(false);
              return;
            }
          } catch (refreshError) {
            console.log('Session refresh failed:', refreshError);
          }
          
          // No session found after all attempts - clear storage
          // But only if we're sure (not immediately after mount)
          clearStorage();
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Don't clear user on error - might be a temporary issue
        if (isMounted) {
          // Final attempt: try to get session
          try {
            const { data: { session } } = await authService.getSession();
            if (session?.user) {
              setUser(session.user);
              saveUserToStorage(session.user, session.access_token);
            }
          } catch (retryError) {
            console.error('Final retry failed:', retryError);
            // Don't clear on error - let auth state change handle it
          }
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to auth state changes with better handling
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('Auth state change:', event, session?.user?.email || 'no user');

      // Handle different auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          saveUserToStorage(session.user, session.access_token);
          lastSessionCheck = Date.now();
          // If this is a SIGNED_IN event, mark that we just logged in
          if (event === 'SIGNED_IN') {
            justLoggedInRef.current = true;
            setTimeout(() => {
              justLoggedInRef.current = false;
            }, 5000); // Increased to 5 seconds to prevent false logouts
          }
          setLoading(false);
        } else {
          // Session might not be ready yet, wait and check again
          setTimeout(async () => {
            if (!isMounted) return;
            const { data: { session: retrySession } } = await authService.getSession();
            if (retrySession?.user) {
              setUser(retrySession.user);
              saveUserToStorage(retrySession.user, retrySession.access_token);
              if (event === 'SIGNED_IN') {
                justLoggedInRef.current = true;
                setTimeout(() => {
                  justLoggedInRef.current = false;
                }, 5000);
              }
            } else {
              // Still no session, try to restore from localStorage
              const restoreResult = await authService.restoreSession();
              if (restoreResult.data?.session?.user) {
                setUser(restoreResult.data.session.user);
                saveUserToStorage(restoreResult.data.session.user, restoreResult.data.session.access_token);
              }
            }
            setLoading(false);
          }, 300);
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear on explicit sign out event
        // Don't clear if we just logged in (might be a false SIGNED_OUT event)
        if (!justLoggedInRef.current) {
          clearStorage();
          // Also clear Supabase session from localStorage
          try {
            localStorage.removeItem('supabase_session');
          } catch (e) {
            console.error('Error clearing supabase_session:', e);
          }
          setUser(null);
        }
        setLoading(false);
      } else if (session?.user) {
        // For other events (like USER_UPDATED), update if we have a session
        setUser(session.user);
        saveUserToStorage(session.user, session.access_token);
        lastSessionCheck = Date.now();
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Initial session event - don't clear user if session is null
        // This might fire before session is fully loaded
        if (session?.user) {
          setUser(session.user);
          saveUserToStorage(session.user, session.access_token);
          lastSessionCheck = Date.now();
        }
        // Don't clear user if session is null on INITIAL_SESSION
        // The initializeAuth function will handle it
        setLoading(false);
      } else {
        // For other events with no session, don't automatically clear
        // Only clear on explicit SIGNED_OUT events
        // Unknown events with no session might be temporary - don't react to them
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      // Mark that we're logging in
      justLoggedInRef.current = true;
      
      const result = await authService.login(email, password);
      if (!result.error) {
        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get the session after successful login
        const { data: { session }, error: sessionError } = await authService.getSession();
        
        if (sessionError) {
          console.error('Error getting session after login:', sessionError);
          // Don't return error - the auth state change listener will handle it
        }
        
        if (session?.user) {
          setUser(session.user);
          // Save to localStorage
          saveUserToStorage(session.user, session.access_token);
          // Reset flag after successful login (increased timeout)
          setTimeout(() => {
            justLoggedInRef.current = false;
          }, 5000);
        } else {
          // Session might not be ready yet, wait a bit more and retry
          await new Promise(resolve => setTimeout(resolve, 300));
          const { data: { session: retrySession } } = await authService.getSession();
          if (retrySession?.user) {
            setUser(retrySession.user);
            saveUserToStorage(retrySession.user, retrySession.access_token);
            setTimeout(() => {
              justLoggedInRef.current = false;
            }, 5000);
          } else {
            // Try to restore from localStorage as last resort
            const restoreResult = await authService.restoreSession();
            if (restoreResult.data?.session?.user) {
              setUser(restoreResult.data.session.user);
              saveUserToStorage(restoreResult.data.session.user, restoreResult.data.session.access_token);
              setTimeout(() => {
                justLoggedInRef.current = false;
              }, 5000);
            }
          }
        }
      } else {
        // Login failed, reset flag
        justLoggedInRef.current = false;
      }
      return result;
    } catch (error) {
      justLoggedInRef.current = false;
      return { error: error as AuthError };
    }
  };

  const signup = async (email: string, password: string): Promise<{ data: { user: User | null } | null; error: AuthError | null }> => {
    try {
      const result = await authService.signup(email, password);
      if (result.data?.user && !result.error) {
        // Get the session after successful signup
        const { data: { session } } = await authService.getSession();
        if (session?.user) {
          setUser(session.user);
          // Save to localStorage
          saveUserToStorage(session.user, session.access_token);
        }
      }
      return result;
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Reset login flag before logout
      justLoggedInRef.current = false;
      await authService.logout();
      clearStorage();
      // Clear Supabase session from localStorage
      try {
        localStorage.removeItem('supabase_session');
      } catch (e) {
        console.error('Error clearing supabase_session:', e);
      }
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Clear storage even if logout fails
      clearStorage();
      try {
        localStorage.removeItem('supabase_session');
      } catch (e) {
        console.error('Error clearing supabase_session:', e);
      }
      setUser(null);
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


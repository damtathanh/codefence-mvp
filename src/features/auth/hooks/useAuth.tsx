// src/features/auth/hooks/useAuth.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Load user from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Verify with Supabase session first (Supabase handles its own session persistence)
      try {
        const { data: { session } } = await authService.getSession();
        if (session?.user) {
          setUser(session.user);
          // Update localStorage with fresh data
          saveUserToStorage(session.user, session.access_token);
        } else {
          // No valid session, clear storage
          clearStorage();
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        clearStorage();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Save to localStorage when session changes
        saveUserToStorage(session.user, session.access_token);
      } else {
        // Session ended, clear everything
        clearStorage();
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const result = await authService.login(email, password);
      if (!result.error) {
        // Get the session after successful login
        const { data: { session } } = await authService.getSession();
        if (session?.user) {
          setUser(session.user);
          // Save to localStorage
          saveUserToStorage(session.user, session.access_token);
        }
      }
      return result;
    } catch (error) {
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
      await authService.logout();
      clearStorage();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Clear storage even if logout fails
      clearStorage();
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


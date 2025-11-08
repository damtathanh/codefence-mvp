// src/components/AutoLogoutWrapper.tsx
import React from 'react';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../features/auth';

/**
 * Wrapper component that enables auto-logout for authenticated users
 * This component should be placed inside the Router but outside protected routes
 * so it can access navigation and auth context
 */
export const AutoLogoutWrapper: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { role, loading } = useRole();

  // Only enable auto-logout for authenticated users
  useAutoLogout((role || 'user') as 'admin' | 'user', isAuthenticated && !loading && role !== null);

  // This component doesn't render anything
  return null;
};


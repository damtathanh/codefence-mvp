import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // While loading auth state, show spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F28] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // After loading: if no user -> redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user exists but email not verified, force login with message
  if (!user.email_confirmed_at) {
    return <Navigate to="/login" replace state={{ error: 'Please verify your email before accessing the dashboard. Check your inbox for the verification link.' }} />;
  }

  // Auth OK
  return <>{children}</>;
};

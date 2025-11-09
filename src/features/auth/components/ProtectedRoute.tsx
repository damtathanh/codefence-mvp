// src/features/auth/components/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking session
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

  // If no user after loading, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Check if email is verified
  if (!user.email_confirmed_at) {
    // Email not verified - redirect to login with message
    return <Navigate to="/login" replace state={{ error: 'Please verify your email before accessing the dashboard. Check your inbox for the verification link.' }} />;
  }

  // User is authenticated and verified, render children
  return <>{children}</>;
};


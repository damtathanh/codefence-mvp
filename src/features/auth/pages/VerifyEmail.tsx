import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase } from '../../../lib/supabaseClient';
import { convertHashToQueryRedirect } from '../../../utils/hashToQueryRedirect';

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (convertHashToQueryRedirect()) return;
  }, []);

  useEffect(() => {
    /**
     * Fetch user role and redirect to appropriate dashboard
     */
    const redirectToDashboard = async (userId: string) => {
      try {
        // Fetch user role from unified users_profile table
        const { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .select('role')
          .eq('id', userId)
          .single();

        const role = profileData?.role || 'user';
        
        // Redirect based on role
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        // Default to user dashboard if role fetch fails
        navigate('/dashboard', { replace: true });
      }
    };

    /**
     * Attempt to get user session with retry
     */
    const getUserWithRetry = async (retryCount: number = 0): Promise<boolean> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (user && !userError) {
          // User session exists, redirect to dashboard
          await redirectToDashboard(user.id);
          return true;
        }

        // If no user and we haven't retried, wait a bit and retry once
        if (!user && retryCount === 0) {
          setVerifying(true);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
          return getUserWithRetry(1);
        }

        return false;
      } catch (err) {
        console.error('Error getting user:', err);
        if (retryCount === 0) {
          setVerifying(true);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return getUserWithRetry(1);
        }
        return false;
      }
    };

    const handleEmailVerification = async () => {
      try {
        const searchParams = window.location.search;
        const hashParams = window.location.hash.substring(1);
        const queryString = hashParams || searchParams;
        const params = new URLSearchParams(queryString);

        const type = params.get('type');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (type === 'signup' && accessToken) {
          // Set session with tokens from verification link
          const { error: sessionError } = await authService.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });

          if (sessionError) {
            setError('Invalid or expired verification link.');
            setLoading(false);
            return;
          }

          // Session set successfully, now fetch user and redirect
          setVerified(true);
          setLoading(false);
          setVerifying(true);

          // Try to get user and redirect
          const userFound = await getUserWithRetry();
          
          if (!userFound) {
            setError('Session not available. Please try logging in manually.');
            setVerifying(false);
          }
        } else {
          // Try to get existing session
          const { data: { session } } = await authService.getSession();
          
          if (session && session.user) {
            setVerified(true);
            setLoading(false);
            setVerifying(true);
            
            // Redirect to dashboard based on role
            const userFound = await getUserWithRetry();
            
            if (!userFound) {
              setError('Unable to verify session. Please try logging in manually.');
              setVerifying(false);
            }
          } else {
            // No session found, try to get user directly
            setVerifying(true);
            const userFound = await getUserWithRetry();
            
            if (userFound) {
              setVerified(true);
              setLoading(false);
            } else {
              setError('Invalid or expired verification link. Please try logging in.');
              setLoading(false);
              setVerifying(false);
            }
          }
        }
      } catch (err) {
        console.error('Error verifying email:', err);
        setError('Invalid or expired verification link.');
        setLoading(false);
        setVerifying(false);
      }
    };

    handleEmailVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]">
      {/* Background gradient effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent">
              CodFence
            </span>
          </h1>
        </div>

        {/* Glassmorphism Container */}
        <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
          {loading && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4"></div>
              <p className="text-[#E5E7EB] text-lg animate-pulse">
                Verifying your email…
              </p>
            </div>
          )}

          {verifying && !error && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4"></div>
              <p className="text-[#E5E7EB] text-lg animate-pulse">
                Verifying your account...
              </p>
              <p className="text-[#E5E7EB]/70 text-sm mt-2">
                Setting up your session...
              </p>
            </div>
          )}

          {verified && !verifying && !error && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-green-400 text-lg font-medium mb-2">
                Your email has been verified successfully!
              </p>
              <p className="text-[#E5E7EB]/70 text-sm mb-6">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-red-400 text-lg font-medium mb-4">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="button-gradient px-6 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

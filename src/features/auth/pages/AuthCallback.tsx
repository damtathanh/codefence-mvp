import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../../../hooks/useUserProfile';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshProfile } = useUserProfile(); // Refresh profile after session is set
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRedirectedRef = React.useRef(false);

  // Priority 1: If user is already authenticated via AuthContext, redirect immediately
  useEffect(() => {
    if (user && !hasRedirectedRef.current) {
      // ✅ Check if email is verified
      if (!user.email_confirmed_at) {
        setError('Email not verified. Please check your inbox and verify your email.');
        setLoading(false);
        return;
      }

      // User is already authenticated and verified, refresh profile and redirect to dashboard
      hasRedirectedRef.current = true;
      
      // Mark session as started
      try {
        sessionStorage.setItem('codfence_session_start', Date.now().toString());
      } catch (e) {
        console.error('Error saving session start:', e);
      }
      
      // Refresh profile to ensure full_name is loaded
      refreshProfile().catch(err => {
        console.error('Error refreshing profile after auth callback:', err);
      });
      
      window.history.replaceState({}, document.title, '/auth/callback');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, refreshProfile]);

  useEffect(() => {
    // Don't run callback handling if user is already authenticated or if we've already redirected
    if (user || hasRedirectedRef.current || authLoading) return;

    const handleAuthCallback = async () => {
      try {
        // First, check if we already have a valid session (might be from AuthContext)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession?.user && !hasRedirectedRef.current) {
          // User already has a valid session, wait for AuthContext to update
          // Give it a moment for the auth state change listener to fire
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check again if user is now in AuthContext
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            window.history.replaceState({}, document.title, '/auth/callback');
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // Extract tokens from URL (Supabase redirects with tokens in hash or query params)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        const type = urlParams.get('type') || hashParams.get('type');
        const errorParam = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        // Check for errors in URL
        if (errorParam) {
          console.error('Auth error from URL:', errorParam, errorDescription);
          setError(errorDescription || 'Authentication failed. Please try again.');
          setLoading(false);
          return;
        }

        // If we have tokens in URL, set the session explicitly
        if (accessToken && refreshToken) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error('Error setting session from URL:', setSessionError);
            // Before showing error, wait a moment and check if session was set anyway
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user) {
              window.history.replaceState({}, document.title, '/auth/callback');
              navigate('/dashboard', { replace: true });
              return;
            }
            setError('Failed to restore session from verification link.');
            setLoading(false);
            return;
          }

          // Session was set successfully
          if (sessionData?.session?.user && !hasRedirectedRef.current) {
            // ✅ Check if email is verified
            if (!sessionData.session.user.email_confirmed_at) {
              setError('Email not verified. Please check your inbox and verify your email.');
              setLoading(false);
              return;
            }

            // Mark session as started
            try {
              sessionStorage.setItem('codfence_session_start', Date.now().toString());
            } catch (e) {
              console.error('Error saving session start:', e);
            }

            // Wait for AuthContext to update via auth state change listener
            // Poll for user to be set in AuthContext (max 2 seconds)
            let attempts = 0;
            const maxAttempts = 20;
            
            while (attempts < maxAttempts && !hasRedirectedRef.current) {
              attempts++;
              
              // Check if user is now in AuthContext
              const { data: { session: checkSession } } = await supabase.auth.getSession();
              if (checkSession?.user) {
                // Wait a bit more for AuthContext to update
                await new Promise(resolve => setTimeout(resolve, 300));
                break;
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Determine redirect destination based on type
            let redirectTo = '/dashboard';

            if (type === 'recovery') {
              redirectTo = '/reset-password';
            } else if (type === 'signup' || type === 'invite') {
              redirectTo = '/dashboard';
            }

            // Clear URL params before redirecting
            if (!hasRedirectedRef.current) {
              hasRedirectedRef.current = true;
              
              // Refresh profile to ensure full_name is loaded
              refreshProfile().catch(err => {
                console.error('Error refreshing profile after session set:', err);
              });
              
              window.history.replaceState({}, document.title, '/auth/callback');
              navigate(redirectTo, { replace: true });
            }
            return;
          }
        }

        // If no tokens in URL, check if we already have a session
        // This handles cases where Supabase automatically processed the URL
        // Give it more time for AuthContext to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          // Before showing error, check if AuthContext has user now
          // The error might be because session is being processed
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session: finalCheck } } = await supabase.auth.getSession();
          if (finalCheck?.user) {
            window.history.replaceState({}, document.title, '/auth/callback');
            navigate('/dashboard', { replace: true });
            return;
          }
          setError('Session not available. Please try logging in manually.');
          setLoading(false);
          return;
        }

        if (session?.user && !hasRedirectedRef.current) {
          // Session exists, wait for AuthContext to update, then redirect
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            window.history.replaceState({}, document.title, '/auth/callback');
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // No session found and no tokens in URL
        // Before showing error, give AuthContext one more chance to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session: lastAttempt } } = await supabase.auth.getSession();
        if (lastAttempt?.user && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          window.history.replaceState({}, document.title, '/auth/callback');
          navigate('/dashboard', { replace: true });
          return;
        }

        // Only show error if we truly have no session and haven't redirected
        if (!hasRedirectedRef.current) {
          setError('Session not available. Please try logging in manually.');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error handling auth callback:', err);
        // Before showing error, check one last time if session exists
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session: errorCheck } } = await supabase.auth.getSession();
          if (errorCheck?.user && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            window.history.replaceState({}, document.title, '/auth/callback');
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch (checkError) {
          console.error('Error checking session:', checkError);
        }
        
        // Only show error if we haven't redirected
        if (!hasRedirectedRef.current) {
          setError('Failed to verify your email. Please try logging in manually.');
          setLoading(false);
        }
      }
    };

    handleAuthCallback();
  }, [user, authLoading, navigate]);

  // If user is authenticated, show nothing (redirect will happen)
  if (user) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md w-full">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent">
                CodFence
              </span>
            </h1>
          </div>

          <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]">
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent">
              CodFence
            </span>
          </h1>
        </div>

        <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4"></div>
            <p className="text-[#E5E7EB] text-lg animate-pulse">
              Verifying your session...
            </p>
            <p className="text-[#E5E7EB]/70 text-sm mt-2">
              Please wait while we redirect you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


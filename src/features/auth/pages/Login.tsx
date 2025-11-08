import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Input } from '../../../components/ui/Input';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRedirectOverlay, setShowRedirectOverlay] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkSession = async () => {
      // Wait for auth to finish loading
      if (authLoading) return;

      // If user is already authenticated, redirect to dashboard
      if (user) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Also check Supabase session directly as a fallback
      try {
        const { data: { session } } = await authService.getSession();
        if (session?.user) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        // Session check failed, user is not authenticated
        // This is normal, just show the login form
        console.log('No session found, showing login page');
      }
    };

    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // navigate is stable, can be omitted

  // Handle overlay fade-in animation
  useEffect(() => {
    if (showRedirectOverlay) {
      // Small delay to trigger fade-in animation
      setTimeout(() => setOverlayVisible(true), 10);
    } else {
      setOverlayVisible(false);
    }
  }, [showRedirectOverlay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowRedirectOverlay(false);

    const { error } = await login(credentials.email, credentials.password);

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      // AuthProvider will update user context automatically
      
      // Get the authenticated user's email from the session
      try {
        const { data: { session } } = await authService.getSession();
        const userEmail = session?.user?.email;
        const admin = userEmail === 'admin@codfence.com';
        setIsAdmin(admin);

        // Show overlay with connecting message
        setRedirectMessage('🔐 Connecting to CodFence...');
        setOverlayVisible(false);
        setShowRedirectOverlay(true);
        setLoading(false);

        // After 500ms, change to redirect message
        setTimeout(() => {
          setRedirectMessage('Redirecting to homepage...');
        }, 500);

        // Redirect after 1 second total - all users go to home page
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } catch (err) {
        console.error('Error getting user session:', err);
        // Fallback: show overlay and redirect to home
        setRedirectMessage('🔐 Connecting to CodFence...');
        setOverlayVisible(false);
        setShowRedirectOverlay(true);
        setLoading(false);
        
        setTimeout(() => {
          setRedirectMessage('Redirecting to homepage...');
        }, 500);
        
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4"></div>
          <p className="text-[#E5E7EB]/70">Checking authentication...</p>
        </div>
      </div>
    );
  }

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
          <p className="text-[#E5E7EB]/70 text-lg font-medium">
            Secure access to your verification dashboard
          </p>
        </div>

        {/* Glassmorphism Form Container */}
        <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={credentials.email}
              onChange={(e) =>
                setCredentials({ ...credentials, email: e.target.value })
              }
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              placeholder="••••••••"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="text-[#E5E7EB]/60 text-sm text-center mt-3">
              <a
                href="#"
                className="text-[#8B5CF6] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
              >
                Forgot your password?
              </a>
            </p>

            {error && (
              <p className="text-red-400 text-center mt-4 text-sm">{error}</p>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#E5E7EB]/50 text-sm">
              Don't have an account?{' '}
              <a
                href="#"
                className="text-[#8B5CF6] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/register');
                }}
              >
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Redirect Overlay */}
      {showRedirectOverlay && (
        <div className={`fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 transition-opacity duration-700 ease-in-out ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-gradient-to-br from-[#12163A] to-[#181C3B] p-8 rounded-2xl shadow-2xl text-center text-white border border-white/10 max-w-md mx-4 transform transition-all duration-500 ease-out ${overlayVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin"></div>
            </div>
            <p className="text-xl font-semibold text-[#E5E7EB] transition-all duration-500 ease-in-out">
              {redirectMessage}
            </p>
            <div className="mt-4 flex justify-center space-x-1.5">
              <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

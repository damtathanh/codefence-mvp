import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { convertHashToQueryRedirect } from '../../../utils/hashToQueryRedirect';

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (convertHashToQueryRedirect()) return;
  }, []);

  useEffect(() => {
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
          const { error: sessionError } = await authService.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });

          if (sessionError) {
            setError('Invalid or expired verification link.');
            setLoading(false);
            return;
          }

          setVerified(true);
          setLoading(false);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          const { data: { session } } = await authService.getSession();
          if (session) {
            setVerified(true);
            setLoading(false);
            setTimeout(() => navigate('/login'), 3000);
          } else {
            setError('Invalid or expired verification link.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error verifying email:', err);
        setError('Invalid or expired verification link.');
        setLoading(false);
      }
    };

    handleEmailVerification();
  }, [navigate]);

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

          {verified && !error && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-green-400 text-lg font-medium mb-2">
                Your email has been verified successfully!
              </p>
              <p className="text-[#E5E7EB]/70 text-sm mb-6">
                Redirecting to login...
              </p>
              <button
                onClick={() => navigate('/login')}
                className="button-gradient px-6 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition"
              >
                Go to Login
              </button>
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

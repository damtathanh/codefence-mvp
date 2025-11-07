import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Input } from '../../../components/ui/Input';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await authService.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0B0F28]">
      {/* Background gradient effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent">
              CodFence
            </span>
          </h1>
          <h2 className="text-2xl font-semibold text-[#E5E7EB] mb-2">
            Reset Password
          </h2>
          <p className="text-[#E5E7EB]/70 text-lg font-medium">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Glassmorphism Form Container */}
        <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
          {success ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
                  <svg
                    className="w-12 h-12 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-green-400 text-lg font-medium mb-2">
                  A password reset link has been sent to your email.
                </p>
                <p className="text-[#E5E7EB]/70 text-sm">
                  Please check your inbox and follow the instructions to reset your password.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              {error && (
                <p className="text-red-400 text-center mt-4 text-sm">{error}</p>
              )}
            </form>
          )}

          {!success && (
            <div className="mt-8 text-center">
              <p className="text-[#E5E7EB]/50 text-sm">
                Remember your password?{' '}
                <a
                  href="#"
                  className="text-[#8B5CF6] hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/login');
                  }}
                >
                  Back to Login
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../../../components/ui/Input';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error } = await login(credentials.email, credentials.password);

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(true);
      // Don't navigate - just show success message
      // AuthProvider will update user context automatically
    }

    setLoading(false);
  };

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

            {success && (
              <p className="text-green-400 text-center mt-4 text-sm">
                ✅ Logged in successfully!
              </p>
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
    </div>
  );
};

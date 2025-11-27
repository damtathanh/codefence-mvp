import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabaseClient';

// Note: The users_profile table is automatically created by the migration.
// The trigger handle_new_user() automatically creates a profile when a user signs up.
// See supabase/migrations/002_unified_users_profile.sql for the schema.

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  // We'll use supabase directly for signup with metadata
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    company: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setSuccessMessage('');

    // Validate all fields are filled
    if (!formData.fullName.trim()) {
      setError('Full Name is required.');
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone Number is required.');
      setLoading(false);
      return;
    }

    if (!formData.company.trim()) {
      setError('Company Name is required.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Sign up with user metadata including full_name, phone, and company_name
    // Call signup through useAuth (which uses authService) with metadata
    // ✅ Ensure all metadata keys match what the trigger expects
    const { data, error } = await signup(
      formData.email.trim(),
      formData.password,
      {
        // Primary keys (used by trigger)
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        company_name: formData.company.trim(),
        // Compatibility keys (fallback)
        fullName: formData.fullName.trim(),
        company: formData.company.trim(),
      }
    );

    if (data?.user?.identities?.length === 0) {
      setError('This email is already registered.');
      setLoading(false);
      return;
    }

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // ✅ Success! The database trigger 'handle_new_user' will automatically create the profile.
    // We don't need to manually upsert or wait.
    setSuccess(true);
    setSuccessMessage(`Welcome ${formData.fullName}! Please check your email to confirm your account.`);

    // Redirect after a short delay to show success message
    setTimeout(() => {
      navigate('/login');
    }, 2000);

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
          <h2 className="text-2xl font-semibold text-[#E5E7EB] mb-2">
            Create your CodFence account
          </h2>
          <p className="text-[#E5E7EB]/70 text-lg font-medium">
            Join our secure verification platform
          </p>
        </div>

        {/* Glassmorphism Form Container */}
        <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="John Doe"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="you@example.com"
              required
            />
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1234567890"
              required
            />
            <Input
              label="Company Name"
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              placeholder="Your Company"
              required
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="••••••••"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="••••••••"
              required
            />

            <button
              type="submit"
              disabled={loading || success}
              className="button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            {error && (
              <p className="text-red-400 text-center mt-4 text-sm">{error}</p>
            )}

            {success && (
              <p className="text-green-400 text-center mt-4 text-sm">
                ✅ {successMessage || 'Registration successful! Please check your email to confirm your account.'}
              </p>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-[#E5E7EB]/50 text-sm">
              Already have an account?{' '}
              <a
                href="#"
                className="text-[#8B5CF6] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

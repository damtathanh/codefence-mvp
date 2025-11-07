import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { Input } from "../../../components/ui/Input";

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Handle both ? and # Supabase redirect cases
  useEffect(() => {
    const handleRedirect = () => {
      if (window.location.hash.includes("access_token")) {
        const newUrl =
          window.location.origin +
          "/reset-password?" +
          window.location.hash.substring(1);
        console.log("🔄 Rewriting URL to:", newUrl);
        window.location.replace(newUrl);
        return true;
      }
      return false;
    };

    if (handleRedirect()) return;

    const query = window.location.search;
    const params = new URLSearchParams(query);
    const type = params.get("type");
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    const setAuthSession = async () => {
      try {
        if (type === "recovery" && access_token) {
          const { error: sessionError } = await authService.setSession({
            access_token,
            refresh_token: refresh_token || access_token,
          });
          if (sessionError) {
            console.error("❌ setSession error:", sessionError);
            setError("Invalid or expired link. Please request a new one.");
          } else {
            console.log("✅ Session restored successfully");
          }
        }
      } catch (err) {
        console.error("❌ Exception in handleResetLink:", err);
        setError("Unexpected error occurred. Please try again.");
      }
    };

    setAuthSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { newPassword, confirmPassword } = formData;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await authService.updatePassword(newPassword);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
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
            Set New Password
          </h2>
          <p className="text-[#E5E7EB]/70 text-lg font-medium">
            Enter your new password below
          </p>
        </div>

        {/* Glassmorphism Container */}
        <div className="glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10">
          {success ? (
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
                Password updated successfully
              </p>
              <p className="text-[#E5E7EB]/70 text-sm mb-4">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="New Password"
                type="password"
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
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
                disabled={loading}
                className="button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>

              {error && (
                <p className="text-red-400 text-center mt-4 text-sm">{error}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

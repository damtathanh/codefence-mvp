import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { Input } from "../../../components/ui/Input";
export const ResetPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    // Handle both ? and # Supabase redirect cases
    useEffect(() => {
        const handleRedirect = () => {
            if (window.location.hash.includes("access_token")) {
                const newUrl = window.location.origin +
                    "/reset-password?" +
                    window.location.hash.substring(1);
                console.log("🔄 Rewriting URL to:", newUrl);
                window.location.replace(newUrl);
                return true;
            }
            return false;
        };
        if (handleRedirect())
            return;
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
                    }
                    else {
                        console.log("✅ Session restored successfully");
                    }
                }
            }
            catch (err) {
                console.error("❌ Exception in handleResetLink:", err);
                setError("Unexpected error occurred. Please try again.");
            }
        };
        setAuthSession();
    }, []);
    const handleSubmit = async (e) => {
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
            }
            else {
                setSuccess(true);
                setTimeout(() => navigate("/login"), 2000);
            }
        }
        catch {
            setError("Unexpected error. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 max-w-md w-full", children: [_jsxs("div", { className: "text-center mb-10", children: [_jsx("h1", { className: "text-5xl font-bold mb-3", children: _jsx("span", { className: "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent", children: "CodFence" }) }), _jsx("h2", { className: "text-2xl font-semibold text-[#E5E7EB] mb-2", children: "Set New Password" }), _jsx("p", { className: "text-[#E5E7EB]/70 text-lg font-medium", children: "Enter your new password below" })] }), _jsx("div", { className: "glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10", children: success ? (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block p-4 bg-green-500/20 rounded-full mb-4", children: _jsx("svg", { className: "w-12 h-12 text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("p", { className: "text-green-400 text-lg font-medium mb-2", children: "Password updated successfully" }), _jsx("p", { className: "text-[#E5E7EB]/70 text-sm mb-4", children: "Redirecting to login..." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsx(Input, { label: "New Password", type: "password", value: formData.newPassword, onChange: (e) => setFormData({ ...formData, newPassword: e.target.value }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true }), _jsx(Input, { label: "Confirm Password", type: "password", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true }), _jsx("button", { type: "submit", disabled: loading, className: "button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition", children: loading ? "Updating..." : "Update Password" }), error && (_jsx("p", { className: "text-red-400 text-center mt-4 text-sm", children: error }))] })) })] })] }));
};

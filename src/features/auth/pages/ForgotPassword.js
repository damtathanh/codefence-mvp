import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Input } from '../../../components/ui/Input';
export const ForgotPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');
    const handleSubmit = async (e) => {
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
            }
            else {
                setSuccess(true);
            }
        }
        catch (err) {
            setError('An unexpected error occurred. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 max-w-md w-full", children: [_jsxs("div", { className: "text-center mb-10", children: [_jsx("h1", { className: "text-5xl font-bold mb-3", children: _jsx("span", { className: "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent", children: "CodFence" }) }), _jsx("h2", { className: "text-2xl font-semibold text-[#E5E7EB] mb-2", children: "Reset Password" }), _jsx("p", { className: "text-[#E5E7EB]/70 text-lg font-medium", children: "Enter your email to receive a password reset link" })] }), _jsxs("div", { className: "glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10", children: [success ? (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block p-4 bg-green-500/20 rounded-full mb-4", children: _jsx("svg", { className: "w-12 h-12 text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("p", { className: "text-green-400 text-lg font-medium mb-2", children: "A password reset link has been sent to your email." }), _jsx("p", { className: "text-[#E5E7EB]/70 text-sm", children: "Please check your inbox and follow the instructions to reset your password." })] }), _jsx("button", { onClick: () => navigate('/login'), className: "button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition", children: "Back to Login" })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsx(Input, { label: "Email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", required: true }), _jsx("button", { type: "submit", disabled: loading, className: "button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition", children: loading ? 'Sending...' : 'Send Reset Link' }), error && (_jsx("p", { className: "text-red-400 text-center mt-4 text-sm", children: error }))] })), !success && (_jsx("div", { className: "mt-8 text-center", children: _jsxs("p", { className: "text-[#E5E7EB]/50 text-sm", children: ["Remember your password?", ' ', _jsx("a", { href: "#", className: "text-[#8B5CF6] hover:underline", onClick: (e) => {
                                                e.preventDefault();
                                                navigate('/login');
                                            }, children: "Back to Login" })] }) }))] })] })] }));
};

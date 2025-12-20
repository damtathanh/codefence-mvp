import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../../../components/ui/Input';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { isAdminByEmail } from '../../../utils/isAdmin';
export const Login = () => {
    const navigate = useNavigate();
    const { login, user, loading: authLoading } = useAuth();
    const { refreshProfile } = useUserProfile(); // Refresh profile after login
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showRedirectOverlay, setShowRedirectOverlay] = useState(false);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [redirectMessage, setRedirectMessage] = useState('');
    const [isRedirecting, setIsRedirecting] = useState(false);
    const justLoggedInRef = React.useRef(false);
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
    });
    // Check for error message from navigation state (e.g., from ProtectedRoute)
    React.useEffect(() => {
        const locationState = window.history.state?.usr;
        if (locationState?.error) {
            setError(locationState.error);
        }
    }, []);
    // Monitor user state - redirect when user becomes available
    // This handles both initial load (user already logged in) and after login
    useEffect(() => {
        // Don't run if we're currently processing a login (handled by handleSubmit)
        if (justLoggedInRef.current)
            return;
        // Wait for auth to finish loading
        if (authLoading)
            return;
        // If user is already authenticated, redirect based on role
        if (user && !isRedirecting) {
            setIsRedirecting(true);
            const redirectPath = isAdminByEmail(user) ? '/admin/dashboard' : '/dashboard';
            navigate(redirectPath, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, isRedirecting]); // navigate is stable
    // Handle redirect after login - watch for user state change
    useEffect(() => {
        // Only run if we just logged in and user becomes available
        if (justLoggedInRef.current && user && !isRedirecting) {
            // ✅ Check if email is verified
            if (!user.email_confirmed_at) {
                justLoggedInRef.current = false;
                setIsRedirecting(false);
                setError('Email not verified. Please check your inbox and verify your email before logging in.');
                setLoading(false);
                return;
            }
            setIsRedirecting(true);
            // Refresh profile to ensure full_name and role are loaded
            refreshProfile().catch(err => {
                console.error('Error refreshing profile after login:', err);
            });
            // User is now available and verified, redirect based on role
            const redirectPath = isAdminByEmail(user) ? '/admin/dashboard' : '/dashboard';
            navigate(redirectPath, { replace: true });
            // Clear the flag after redirect
            setTimeout(() => {
                justLoggedInRef.current = false;
            }, 2000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isRedirecting]); // navigate is stable
    // Handle overlay fade-in animation
    useEffect(() => {
        if (showRedirectOverlay) {
            // Small delay to trigger fade-in animation
            setTimeout(() => setOverlayVisible(true), 10);
        }
        else {
            setOverlayVisible(false);
        }
    }, [showRedirectOverlay]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowRedirectOverlay(false);
        justLoggedInRef.current = true;
        setIsRedirecting(true);
        try {
            const { error: loginError } = await login(credentials.email, credentials.password);
            if (loginError) {
                justLoggedInRef.current = false;
                setIsRedirecting(false);
                // Handle specific error cases
                if (loginError.message === 'Invalid login credentials') {
                    setError('Incorrect email or password. Please try again.');
                }
                else if (loginError.name === 'EmailNotVerified' || loginError.message.includes('email not verified') || loginError.message.includes('Email not verified')) {
                    setError('Email not verified. Please check your inbox and click the verification link to verify your email before logging in.');
                }
                else {
                    setError(loginError.message);
                }
                setLoading(false);
                return;
            }
            // Login succeeded - AuthContext will update via auth state change listener
            // Show overlay and wait for user state to be set (handled by useEffect above)
            setRedirectMessage('🔐 Connecting to CodFence...');
            setOverlayVisible(false);
            setShowRedirectOverlay(true);
            setLoading(false);
            // Update message after a short delay
            setTimeout(() => {
                setRedirectMessage('Redirecting to dashboard...');
            }, 500);
            // The redirect will happen automatically when user state updates
            // (handled by the useEffect that watches for user changes)
            // If user doesn't become available within 3 seconds, show error
            setTimeout(() => {
                if (!user && justLoggedInRef.current) {
                    // User still not available after 3 seconds
                    justLoggedInRef.current = false;
                    setIsRedirecting(false);
                    setShowRedirectOverlay(false);
                    setLoading(false);
                    setError('Login successful, but session is taking longer than expected. Please refresh the page.');
                }
            }, 3000);
        }
        catch (err) {
            console.error('Login error:', err);
            justLoggedInRef.current = false;
            setIsRedirecting(false);
            setLoading(false);
            setError('An error occurred during login. Please try again.');
        }
    };
    // Show loading state while checking authentication
    if (authLoading) {
        return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-[#E5E7EB]/70", children: "Checking authentication..." })] })] }));
    }
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 max-w-md w-full", children: [_jsxs("div", { className: "text-center mb-10", children: [_jsx("h1", { className: "text-5xl font-bold mb-3", children: _jsx("span", { className: "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent", children: "CodFence" }) }), _jsx("p", { className: "text-[#E5E7EB]/70 text-lg font-medium", children: "Secure access to your verification dashboard" })] }), _jsxs("div", { className: "glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10", children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsx(Input, { label: "Email", type: "email", value: credentials.email, onChange: (e) => setCredentials({ ...credentials, email: e.target.value }), placeholder: "you@example.com", required: true }), _jsx(Input, { label: "Password", type: "password", value: credentials.password, onChange: (e) => setCredentials({ ...credentials, password: e.target.value }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true }), _jsx("button", { type: "submit", disabled: loading, className: "button-gradient w-full px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition", children: loading ? 'Signing in...' : 'Sign In' }), _jsx("p", { className: "text-[#E5E7EB]/60 text-sm text-center mt-3", children: _jsx("a", { href: "#", className: "text-[#8B5CF6] hover:underline", onClick: (e) => {
                                                e.preventDefault();
                                                navigate('/forgot-password');
                                            }, children: "Forgot your password?" }) }), error && (_jsx("p", { className: "text-red-400 text-center mt-4 text-sm", children: error }))] }), _jsx("div", { className: "mt-8 text-center", children: _jsxs("p", { className: "text-[#E5E7EB]/50 text-sm", children: ["Don't have an account?", ' ', _jsx("a", { href: "#", className: "text-[#8B5CF6] hover:underline", onClick: (e) => {
                                                e.preventDefault();
                                                navigate('/register');
                                            }, children: "Register here" })] }) })] })] }), showRedirectOverlay && (_jsx("div", { className: `fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 transition-opacity duration-700 ease-in-out ${overlayVisible ? 'opacity-100' : 'opacity-0'}`, children: _jsxs("div", { className: `bg-gradient-to-br from-[#12163A] to-[#181C3B] p-8 rounded-2xl shadow-2xl text-center text-white border border-white/10 max-w-md mx-4 transform transition-all duration-500 ease-out ${overlayVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`, children: [_jsx("div", { className: "mb-4", children: _jsx("div", { className: "w-16 h-16 mx-auto mb-4 border-4 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin" }) }), _jsx("p", { className: "text-xl font-semibold text-[#E5E7EB] transition-all duration-500 ease-in-out", children: redirectMessage }), _jsxs("div", { className: "mt-4 flex justify-center space-x-1.5", children: [_jsx("div", { className: "w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" }), _jsx("div", { className: "w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce", style: { animationDelay: '150ms' } }), _jsx("div", { className: "w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce", style: { animationDelay: '300ms' } })] })] }) }))] }));
};

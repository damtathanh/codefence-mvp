import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { isAdminByEmail } from '../../../utils/isAdmin';
export const AuthCallback = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Wait a moment for Supabase to process URL hash/query params
                await new Promise(resolve => setTimeout(resolve, 500));
                // Check if we have a valid session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError('Failed to verify session. Please try logging in again.');
                    setLoading(false);
                    return;
                }
                if (session?.user) {
                    // Check if email is verified
                    if (!session.user.email_confirmed_at) {
                        setError('Email not verified. Please check your inbox and verify your email.');
                        setLoading(false);
                        return;
                    }
                    // Valid session found - redirect based on role
                    // The AuthProvider will handle updating the user state
                    window.history.replaceState({}, document.title, '/auth/callback');
                    const redirectPath = isAdminByEmail(session.user) ? '/admin/dashboard' : '/dashboard';
                    navigate(redirectPath, { replace: true });
                    return;
                }
                // No session found - check URL for tokens
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
                const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
                const errorParam = urlParams.get('error') || hashParams.get('error');
                const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
                // Check for errors in URL
                if (errorParam) {
                    console.error('Auth error from URL:', errorParam, errorDescription);
                    setError(errorDescription || 'Authentication failed. Please try again.');
                    setLoading(false);
                    return;
                }
                // If we have tokens, set the session
                if (accessToken && refreshToken) {
                    const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (setSessionError) {
                        console.error('Error setting session:', setSessionError);
                        setError('Failed to restore session. Please try logging in again.');
                        setLoading(false);
                        return;
                    }
                    if (sessionData?.session?.user) {
                        // Check if email is verified
                        if (!sessionData.session.user.email_confirmed_at) {
                            setError('Email not verified. Please check your inbox and verify your email.');
                            setLoading(false);
                            return;
                        }
                        // Session set successfully - redirect based on role
                        window.history.replaceState({}, document.title, '/auth/callback');
                        const redirectPath = isAdminByEmail(sessionData.session.user) ? '/admin/dashboard' : '/dashboard';
                        navigate(redirectPath, { replace: true });
                        return;
                    }
                }
                // No session and no tokens - redirect to login
                setError('No valid session found. Please try logging in again.');
                setLoading(false);
            }
            catch (err) {
                console.error('Error handling auth callback:', err);
                setError('An unexpected error occurred. Please try logging in again.');
                setLoading(false);
            }
        };
        // If user is already authenticated via AuthProvider, redirect immediately
        if (user?.email_confirmed_at) {
            const redirectPath = isAdminByEmail(user) ? '/admin/dashboard' : '/dashboard';
            navigate(redirectPath, { replace: true });
            return;
        }
        // Otherwise, handle the callback
        handleAuthCallback();
    }, [user, navigate]);
    if (error) {
        return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 max-w-md w-full", children: [_jsx("div", { className: "text-center mb-10", children: _jsx("h1", { className: "text-5xl font-bold mb-3", children: _jsx("span", { className: "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent", children: "CodFence" }) }) }), _jsx("div", { className: "glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl mb-4", children: "\u274C" }), _jsx("p", { className: "text-red-400 text-lg font-medium mb-4", children: error }), _jsx("button", { onClick: () => navigate('/login'), className: "button-gradient px-6 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition", children: "Go to Login" })] }) })] })] }));
    }
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 max-w-md w-full", children: [_jsx("div", { className: "text-center mb-10", children: _jsx("h1", { className: "text-5xl font-bold mb-3", children: _jsx("span", { className: "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent", children: "CodFence" }) }) }), _jsx("div", { className: "glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-[#E5E7EB] text-lg animate-pulse", children: "Verifying your session..." }), _jsx("p", { className: "text-[#E5E7EB]/70 text-sm mt-2", children: "Please wait while we redirect you." })] }) })] })] }));
};

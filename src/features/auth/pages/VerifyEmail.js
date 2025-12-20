import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase } from '../../../lib/supabaseClient';
import { convertHashToQueryRedirect } from '../../../utils/hashToQueryRedirect';
import { useAuth } from '../hooks/useAuth';
export const VerifyEmail = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [verified, setVerified] = useState(false);
    // Priority 1: If user is already authenticated via AuthContext, redirect immediately
    useEffect(() => {
        if (authLoading)
            return; // Wait for auth to finish loading
        if (user) {
            // User is already authenticated, redirect to dashboard immediately
            navigate('/dashboard', { replace: true });
            return;
        }
    }, [user, authLoading, navigate]);
    useEffect(() => {
        if (convertHashToQueryRedirect())
            return;
    }, []);
    useEffect(() => {
        // Don't run verification if user is already authenticated
        if (user || authLoading)
            return;
        /**
         * Fetch user role and redirect to appropriate dashboard
         */
        const redirectToDashboard = async (userId) => {
            try {
                // Fetch user role from unified users_profile table
                const { data: profileData, error: profileError } = await supabase
                    .from('users_profile')
                    .select('role')
                    .eq('id', userId)
                    .single();
                const role = profileData?.role || 'user';
                // Redirect based on role
                if (role === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                }
                else {
                    navigate('/dashboard', { replace: true });
                }
            }
            catch (err) {
                console.error('Error fetching user role:', err);
                // Default to user dashboard if role fetch fails
                navigate('/dashboard', { replace: true });
            }
        };
        /**
         * Attempt to get user session with retry
         */
        const getUserWithRetry = async (retryCount = 0) => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (user && !userError) {
                    // User session exists, redirect to dashboard
                    await redirectToDashboard(user.id);
                    return true;
                }
                // If no user and we haven't retried, wait a bit and retry once
                if (!user && retryCount === 0) {
                    setVerifying(true);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
                    return getUserWithRetry(1);
                }
                return false;
            }
            catch (err) {
                console.error('Error getting user:', err);
                if (retryCount === 0) {
                    setVerifying(true);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return getUserWithRetry(1);
                }
                return false;
            }
        };
        const handleEmailVerification = async () => {
            try {
                // First, check if we already have a valid session (user might be logged in)
                const { data: { session: existingSession } } = await authService.getSession();
                if (existingSession?.user) {
                    // User already has a valid session, redirect immediately
                    await redirectToDashboard(existingSession.user.id);
                    return;
                }
                const searchParams = window.location.search;
                const hashParams = window.location.hash.substring(1);
                const queryString = hashParams || searchParams;
                const params = new URLSearchParams(queryString);
                const type = params.get('type');
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                if (type === 'signup' && accessToken && refreshToken) {
                    // Set session with tokens from verification link
                    const { error: sessionError } = await authService.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (sessionError) {
                        setError('Invalid or expired verification link.');
                        setLoading(false);
                        return;
                    }
                    // Wait a moment for session to be established
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Session set successfully, now fetch user and redirect
                    const userFound = await getUserWithRetry();
                    if (userFound) {
                        setVerified(true);
                        setLoading(false);
                        // getUserWithRetry already redirects, so we're done
                    }
                    else {
                        // Only show error if we truly couldn't establish a session
                        // Check one more time if session exists now
                        const { data: { session: finalCheck } } = await authService.getSession();
                        if (finalCheck?.user) {
                            await redirectToDashboard(finalCheck.user.id);
                        }
                        else {
                            setError('Session not available. Please try logging in manually.');
                            setVerifying(false);
                            setLoading(false);
                        }
                    }
                }
                else {
                    // No verification tokens in URL, but check if session exists
                    // This handles cases where user visits /verify-email directly
                    const { data: { session } } = await authService.getSession();
                    if (session && session.user) {
                        // User has a valid session, redirect to dashboard
                        await redirectToDashboard(session.user.id);
                        return;
                    }
                    // No session found and no tokens - check if we can get user
                    const userFound = await getUserWithRetry();
                    if (userFound) {
                        setVerified(true);
                        setLoading(false);
                    }
                    else {
                        // Only show error if there's truly no session
                        // Give it one more chance - maybe AuthContext is still loading
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { data: { session: lastCheck } } = await authService.getSession();
                        if (lastCheck?.user) {
                            await redirectToDashboard(lastCheck.user.id);
                        }
                        else {
                            setError('Invalid or expired verification link. Please try logging in.');
                            setLoading(false);
                            setVerifying(false);
                        }
                    }
                }
            }
            catch (err) {
                console.error('Error verifying email:', err);
                // Before showing error, check one last time if session exists
                try {
                    const { data: { session: errorCheck } } = await authService.getSession();
                    if (errorCheck?.user) {
                        navigate('/dashboard', { replace: true });
                        return;
                    }
                }
                catch (checkError) {
                    console.error('Error checking session:', checkError);
                }
                setError('Invalid or expired verification link.');
                setLoading(false);
                setVerifying(false);
            }
        };
        // Only run if user is not already authenticated
        if (!user && !authLoading) {
            handleEmailVerification();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]); // Re-run if user/authLoading changes
    // Show loading while auth is initializing
    if (authLoading) {
        return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-[#E5E7EB]/70", children: "Checking authentication..." })] })] }));
    }
    // If user is authenticated, show nothing (redirect will happen)
    if (user) {
        return null;
    }
    return (_jsxs("div", { className: "min-h-screen flex items-center justify-center px-4 pt-[96px] pb-20 relative overflow-hidden bg-[#0B0F28]", children: [_jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl" }), _jsx("div", { className: "absolute bottom-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl" }), _jsxs("div", { className: "relative z-10 max-w-md w-full", children: [_jsx("div", { className: "text-center mb-10", children: _jsx("h1", { className: "text-5xl font-bold mb-3", children: _jsx("span", { className: "bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent", children: "CodFence" }) }) }), _jsxs("div", { className: "glass-card p-8 lg:p-10 shadow-2xl rounded-2xl bg-[#12163A]/40 backdrop-blur-lg border border-white/10", children: [loading && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-[#E5E7EB] text-lg animate-pulse", children: "Verifying your email\u2026" })] })), verifying && !error && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-[#E5E7EB] text-lg animate-pulse", children: "Verifying your account..." }), _jsx("p", { className: "text-[#E5E7EB]/70 text-sm mt-2", children: "Setting up your session..." })] })), verified && !verifying && !error && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83C\uDF89" }), _jsx("p", { className: "text-green-400 text-lg font-medium mb-2", children: "Your email has been verified successfully!" }), _jsx("p", { className: "text-[#E5E7EB]/70 text-sm mb-6", children: "Redirecting to your dashboard..." })] })), error && (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl mb-4", children: "\u274C" }), _jsx("p", { className: "text-red-400 text-lg font-medium mb-4", children: error }), _jsx("button", { onClick: () => navigate('/login'), className: "button-gradient px-6 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#0B0F28] transition", children: "Go to Login" })] }))] })] })] }));
};

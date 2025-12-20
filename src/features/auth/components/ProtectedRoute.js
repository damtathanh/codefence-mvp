import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    // While loading auth state, show spinner
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-[#0B0F28] flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-white text-lg", children: "Loading..." })] }) }));
    }
    // After loading: if no user -> redirect
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    // If user exists but email not verified, force login with message
    if (!user.email_confirmed_at) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { error: 'Please verify your email before accessing the dashboard. Check your inbox for the verification link.' } });
    }
    // Auth OK
    return _jsx(_Fragment, { children: children });
};

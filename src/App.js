import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute, Login, Register, ForgotPassword, ResetPassword, VerifyEmail, AuthCallback, useAuth } from "./features/auth";
import { ScrollToTop, Header, Footer, ScrollToSectionHandler, AutoLogoutWrapper, DashboardLayout } from "./components";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { convertHashToQueryRedirect } from "./utils/hashToQueryRedirect";
import { useRole } from "./hooks";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { AnalyticsPage } from "./pages/dashboard/AnalyticsPage";
import { ProductsPage } from "./pages/dashboard/ProductsPage";
import { OrdersPage } from "./pages/dashboard/OrdersPage";
import { InvoicePage } from "./pages/dashboard/InvoicePage";
import { HistoryPage } from "./pages/dashboard/HistoryPage";
import { MessagePage } from "./pages/dashboard/MessagePage";
import { SettingsPage } from "./pages/dashboard/SettingsPage";
import { CustomersPage } from "./pages/dashboard/CustomersPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminMessagePage } from "./pages/admin/AdminMessagePage";
import { ToastProvider } from "./components/ui";
// Layout wrapper for public routes
const PublicLayout = () => {
    return (_jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx(Header, {}), _jsx("main", { className: "flex-grow", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPassword, {}) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPassword, {}) }), _jsx(Route, { path: "/verify-email", element: _jsx(VerifyEmail, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }), _jsx(Footer, {})] }));
};
// Dashboard Router component that handles role-based routing
const DashboardRouter = () => {
    const { role, loading } = useRole();
    const { user } = useAuth();
    // Show loading screen while fetching role
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-[#0B0F28] flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4" }), _jsx("p", { className: "text-white text-lg", children: "Loading dashboard..." })] }) }));
    }
    // ✅ Check email verification
    if (user && !user.email_confirmed_at) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { error: 'Please verify your email before accessing the dashboard.' } });
    }
    // Both admin and user roles use DashboardLayout (admin sees filtered menu items)
    return _jsx(DashboardLayout, {});
};
function App() {
    // Handle hash-based Supabase redirects before React Router processes routes
    // This runs once when the app initializes
    React.useEffect(() => {
        convertHashToQueryRedirect();
    }, []);
    return (_jsx(ErrorBoundary, { children: _jsx(ToastProvider, { children: _jsx(AuthProvider, { children: _jsxs(Router, { children: [_jsx(ScrollToTop, {}), _jsx(ScrollToSectionHandler, {}), _jsx(AutoLogoutWrapper, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/auth/callback", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "/*", element: _jsx(PublicLayout, {}) }), _jsxs(Route, { path: "/dashboard/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardRouter, {}) }), children: [_jsx(Route, { index: true, element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "products", element: _jsx(ProductsPage, {}) }), _jsx(Route, { path: "orders", element: _jsx(OrdersPage, {}) }), _jsx(Route, { path: "invoice", element: _jsx(InvoicePage, {}) }), _jsx(Route, { path: "history", element: _jsx(HistoryPage, {}) }), _jsx(Route, { path: "customers", element: _jsx(CustomersPage, {}) }), _jsx(Route, { path: "message", element: _jsx(MessagePage, {}) }), _jsx(Route, { path: "settings", element: _jsx(SettingsPage, {}) })] }), _jsxs(Route, { path: "/admin/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardRouter, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/admin/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "message", element: _jsx(AdminMessagePage, {}) }), _jsx(Route, { path: "settings", element: _jsx(SettingsPage, {}) })] }), _jsx(Route, { path: "/user/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard", replace: true }) }) }), _jsx(Route, { path: "/settings", element: _jsx(ProtectedRoute, { children: _jsx(Navigate, { to: "/dashboard/settings", replace: true }) }) })] })] }) }) }) }));
}
export default App;

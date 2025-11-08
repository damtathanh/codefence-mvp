import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute, Login, Register, ForgotPassword, ResetPassword, VerifyEmail } from "./features/auth";
import { ScrollToTop } from "./components/ScrollToTop";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToSectionHandler } from "./components/ScrollToSectionHandler";
import { AutoLogoutWrapper } from "./components/AutoLogoutWrapper";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { convertHashToQueryRedirect } from "./utils/hashToQueryRedirect";
import { useRole } from "./hooks/useRole";
import { Home } from "./pages/Home";
import { Analytics } from "./pages/Analytics";
import { NotFound } from "./pages/NotFound";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { AnalyticsPage } from "./pages/dashboard/AnalyticsPage";
import { ProductsPage } from "./pages/dashboard/ProductsPage";
import { OrdersPage } from "./pages/dashboard/OrdersPage";
import { InvoicePage } from "./pages/dashboard/InvoicePage";
import { HistoryPage } from "./pages/dashboard/HistoryPage";
import { MessagePage } from "./pages/dashboard/MessagePage";
import { SettingsPage } from "./pages/dashboard/SettingsPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";

// Layout wrapper for public routes
const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

// Dashboard Router component that handles role-based routing
const DashboardRouter: React.FC = () => {
  const { role, loading } = useRole();

  // Show loading screen while fetching role
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F28] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If role is admin, render AdminDashboard
  if (role === 'admin') {
    return <AdminDashboard />;
  }

  // Otherwise, render regular DashboardLayout
  return <DashboardLayout />;
};

function App() {
  // Handle hash-based Supabase redirects before React Router processes routes
  // This runs once when the app initializes
  React.useEffect(() => {
    convertHashToQueryRedirect();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <ScrollToSectionHandler />
        <AutoLogoutWrapper />

        <Routes>
          {/* Public routes */}
          <Route path="/*" element={<PublicLayout />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="invoice" element={<InvoicePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="message" element={<MessagePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin dashboard route - redirects to /dashboard (role-based rendering handles the rest) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* User dashboard route - redirects to /dashboard (role-based rendering handles the rest) */}
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Settings route - accessible from header dropdown */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard/settings" replace />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

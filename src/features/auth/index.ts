// src/features/auth/index.ts
// Export all auth-related components, hooks, and services

// Hooks
export { AuthProvider, useAuth } from './hooks/useAuth';
export type { AuthContextType } from './hooks/useAuth';

// Components
export { ProtectedRoute } from './components/ProtectedRoute';

// Pages
export { Login } from './pages/Login';
export { Register } from './pages/Register';
export { ForgotPassword } from './pages/ForgotPassword';
export { ResetPassword } from './pages/ResetPassword';
export { VerifyEmail } from './pages/VerifyEmail';

// Services
export { authService } from './services/authService';
export type { LoginResult, SignupResult } from './services/authService';


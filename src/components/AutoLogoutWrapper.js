import { useAutoLogout } from '../hooks/useAutoLogout';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../features/auth';
/**
 * Wrapper component that enables auto-logout for authenticated users
 * This component should be placed inside the Router but outside protected routes
 * so it can access navigation and auth context
 */
export const AutoLogoutWrapper = () => {
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const { role, loading: roleLoading } = useRole();
    // Only enable auto-logout when:
    // 1. User is authenticated (has user object)
    // 2. Auth is not loading
    // 3. Role is loaded (or default to 'user' if still loading but user exists)
    const shouldEnableAutoLogout = isAuthenticated &&
        user !== null &&
        !authLoading &&
        (!roleLoading || role !== null);
    // Use 'user' as default role if role is still loading but user is authenticated
    const userRole = (role || 'user');
    useAutoLogout(userRole, shouldEnableAutoLogout);
    // This component doesn't render anything
    return null;
};

// src/hooks/useAutoLogout.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
/**
 * Custom hook for automatic logout based on user inactivity
 *
 * Features:
 * - Role-based timeout (Admin: 15 min, User: 30 min)
 * - Warning popup 1 minute before logout
 * - Detects inactivity from mouse, keyboard, scroll, and touch events
 * - Works even when tab is inactive
 * - Automatically clears storage and redirects to login
 *
 * @param role - User role ('admin' or 'user')
 * @param enabled - Whether the auto-logout is enabled (default: true)
 *
 * @example
 * ```tsx
 * function App() {
 *   const { role } = useRole();
 *   useAutoLogout(role || 'user');
 *   return <AppRouter />;
 * }
 * ```
 */
export function useAutoLogout(role, enabled = true) {
    const navigate = useNavigate();
    // Timeout durations in milliseconds
    const TIMEOUT_DURATIONS = {
        admin: 15 * 60 * 1000, // 15 minutes
        user: 30 * 60 * 1000, // 30 minutes
    };
    const WARNING_TIME = 60 * 1000; // 1 minute before logout
    // Refs to store timer IDs
    const inactivityTimerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const warningShownRef = useRef(false);
    const isLoggingOutRef = useRef(false);
    /**
     * Clear all timers
     */
    const clearTimers = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        warningShownRef.current = false;
    }, []);
    /**
     * Perform logout and cleanup
     */
    const performLogout = useCallback(async () => {
        if (isLoggingOutRef.current) {
            return; // Prevent multiple logout calls
        }
        isLoggingOutRef.current = true;
        clearTimers();
        try {
            // Sign out from Supabase
            await supabase.auth.signOut();
            // Clear auth-related localStorage items
            try {
                localStorage.removeItem('supabase_session');
                localStorage.removeItem('codfence_auth_user');
                localStorage.removeItem('codfence_auth_token');
            }
            catch (error) {
                console.error('Error clearing localStorage:', error);
            }
            // Clear sessionStorage (marks session as ended)
            try {
                sessionStorage.removeItem('codfence_session_start');
            }
            catch (error) {
                console.error('Error clearing sessionStorage:', error);
            }
            // Redirect to login
            navigate('/login', { replace: true });
        }
        catch (error) {
            console.error('Error during auto-logout:', error);
            // Still redirect even if logout fails
            navigate('/login', { replace: true });
        }
        finally {
            isLoggingOutRef.current = false;
        }
    }, [navigate, clearTimers]);
    /**
     * Show warning popup and handle user response
     */
    const showWarning = useCallback(() => {
        if (warningShownRef.current) {
            return; // Prevent showing multiple warnings
        }
        warningShownRef.current = true;
        // TODO: Replace window.confirm with Modal
        const userConfirmed = window.confirm('You have been inactive for a while. You will be logged out in 1 minute.\n\n' +
            'Click "OK" to stay logged in, or "Cancel" to continue.');
        if (userConfirmed) {
            // User wants to stay logged in - reset timer
            warningShownRef.current = false;
            resetTimer();
        }
        else {
            // User chose to continue - let the logout timer proceed
            // The logout will happen automatically after WARNING_TIME
        }
    }, []);
    /**
     * Reset the inactivity timer
     */
    const resetTimer = useCallback(() => {
        if (!enabled) {
            return;
        }
        clearTimers();
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        const timeoutDuration = TIMEOUT_DURATIONS[role];
        const warningTime = timeoutDuration - WARNING_TIME;
        // Set warning timer (1 minute before logout)
        warningTimerRef.current = setTimeout(() => {
            showWarning();
        }, warningTime);
        // Set logout timer
        inactivityTimerRef.current = setTimeout(() => {
            performLogout();
        }, timeoutDuration);
    }, [role, enabled, clearTimers, showWarning, performLogout]);
    /**
     * Handle user activity - reset timer on any activity
     */
    const handleActivity = useCallback(() => {
        if (!enabled) {
            return;
        }
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityRef.current;
        // Only reset if there's been actual activity (debounce rapid events)
        if (timeSinceLastActivity > 1000) { // 1 second debounce
            resetTimer();
        }
    }, [enabled, resetTimer]);
    /**
     * Handle visibility change (tab switching)
     */
    const handleVisibilityChange = useCallback(() => {
        if (!enabled) {
            return;
        }
        if (document.hidden) {
            // Tab is now hidden - don't reset timer, let it continue counting
            // This ensures inactivity is counted even when tab is inactive
            return;
        }
        else {
            // Tab is now visible - check if user has been inactive too long
            const timeSinceLastActivity = Date.now() - lastActivityRef.current;
            const timeoutDuration = TIMEOUT_DURATIONS[role];
            if (timeSinceLastActivity >= timeoutDuration) {
                // User has been inactive too long - logout immediately
                performLogout();
            }
            else if (timeSinceLastActivity >= timeoutDuration - WARNING_TIME && !warningShownRef.current) {
                // Show warning if we're past the warning time
                showWarning();
            }
            // Otherwise, continue with the existing timer
        }
    }, [role, enabled, performLogout, showWarning]);
    // Set up event listeners for user activity
    useEffect(() => {
        if (!enabled) {
            return;
        }
        // List of events that indicate user activity
        const events = [
            'mousemove',
            'keydown',
            'click',
            'scroll',
            'touchstart',
            'mousedown',
            'keypress',
            'touchmove',
        ];
        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });
        // Add visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);
        // Initialize timer on mount
        resetTimer();
        // Cleanup function
        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimers();
        };
    }, [enabled, handleActivity, handleVisibilityChange, resetTimer, clearTimers]);
    // Reset timer when role changes
    useEffect(() => {
        if (enabled) {
            resetTimer();
        }
    }, [role, enabled, resetTimer]);
}

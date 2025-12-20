// src/features/auth/services/authService.ts
import { supabase } from '../../../lib/supabaseClient';
export const authService = {
    /**
     * Sign in with email and password
     * Checks email verification before allowing login
     */
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            // Check if login was successful
            if (error) {
                return { error };
            }
            // ✅ Check if email is verified
            if (data?.user && !data.user.email_confirmed_at) {
                // User exists but email is not verified - sign out immediately
                await supabase.auth.signOut();
                return {
                    error: {
                        message: 'Email not verified. Please check your inbox and click the verification link to verify your email before logging in.',
                        name: 'EmailNotVerified',
                        status: 403,
                    }
                };
            }
            // Session is automatically persisted by Supabase with persistSession: true
            // Mark session start for tracking purposes only
            if (data?.session && !error) {
                try {
                    localStorage.setItem('codfence_session_start', Date.now().toString());
                }
                catch (storageError) {
                    console.error('Error saving session start:', storageError);
                }
            }
            return { error: null };
        }
        catch (error) {
            return { error: error };
        }
    },
    /**
     * Sign up with email and password
     */
    async signup(email, password, metadata) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata || {},
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            // Session is automatically persisted by Supabase with persistSession: true
            // Mark session start for tracking purposes only
            if (data?.session && !error) {
                try {
                    localStorage.setItem('codfence_session_start', Date.now().toString());
                }
                catch (storageError) {
                    console.error('Error saving session start:', storageError);
                }
            }
            return { data, error };
        }
        catch (error) {
            return { data: null, error: error };
        }
    },
    /**
     * Sign out the current user
     */
    async logout() {
        try {
            await supabase.auth.signOut();
            // Supabase automatically clears its session storage
            // Clear app-specific storage
            localStorage.removeItem('codfence_session_start');
            localStorage.removeItem('codfence_auth_user');
            localStorage.removeItem('codfence_auth_token');
            localStorage.removeItem('codfence_last_path');
        }
        catch (error) {
            console.error('Error logging out:', error);
            // Clear storage even if logout fails
            localStorage.removeItem('codfence_session_start');
            localStorage.removeItem('codfence_auth_user');
            localStorage.removeItem('codfence_auth_token');
            localStorage.removeItem('codfence_last_path');
            throw error;
        }
    },
    /**
     * Get the current user
     */
    async getUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            return { user, error };
        }
        catch (error) {
            return { user: null, error: error };
        }
    },
    /**
     * Get the current session
     * Supabase automatically persists and restores sessions with persistSession: true
     */
    async getSession() {
        try {
            const result = await supabase.auth.getSession();
            // ✅ Check if user's email is verified
            if (result.data?.session?.user && !result.data.session.user.email_confirmed_at) {
                // Email not verified - invalidate session
                await supabase.auth.signOut();
                return { data: { session: null }, error: null };
            }
            return result;
        }
        catch (error) {
            console.error('Error getting session:', error);
            return { data: { session: null }, error: error };
        }
    },
    /**
     * Refresh the current session
     * Supabase automatically handles session persistence with persistSession: true
     */
    async refreshSession() {
        return await supabase.auth.refreshSession();
    },
    /**
     * Set the session with tokens
     * Supabase automatically handles session persistence with persistSession: true
     */
    async setSession(tokens) {
        return await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        });
    },
    /**
     * Restore session
     * With persistSession: true, Supabase automatically restores sessions from localStorage
     * This function simply checks if a session exists and is valid
     */
    async restoreSession() {
        try {
            // Supabase with persistSession: true automatically restores from localStorage
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error restoring session:', error);
                return { data: { session: null, user: null }, error };
            }
            if (session?.user) {
                // ✅ Check if email is verified
                if (!session.user.email_confirmed_at) {
                    // Email not verified - sign out
                    await supabase.auth.signOut();
                    return { data: { session: null, user: null }, error: null };
                }
                // Valid session found
                return { data: { session, user: session.user }, error: null };
            }
            // No session found
            return { data: { session: null, user: null }, error: null };
        }
        catch (error) {
            console.error('Error restoring session:', error);
            return { data: { session: null, user: null }, error: error };
        }
    },
    /**
     * Reset password for email
     */
    async resetPasswordForEmail(email, options) {
        return await supabase.auth.resetPasswordForEmail(email, options);
    },
    /**
     * Update user password
     */
    async updatePassword(password) {
        return await supabase.auth.updateUser({ password });
    },
    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },
};

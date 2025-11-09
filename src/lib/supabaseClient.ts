// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

// ✅ Create Supabase client with session management
// Note: We use localStorage for Supabase (required for session management)
// But we implement custom logic to clear auth on browser close via sessionStorage tracking
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,  // refresh token automatically
    persistSession: false,   // 👈 Don't persist session across browser closes
    detectSessionInUrl: true,
    // Use custom storage that checks sessionStorage for session validity
    storage: {
      getItem: (key: string) => {
        // Check if this is a new session (sessionStorage cleared = browser was closed)
        const sessionStart = sessionStorage.getItem('codfence_session_start');
        if (!sessionStart) {
          // New session - clear any stale auth data
          localStorage.removeItem(key);
          return null;
        }
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        // Mark session as started
        if (!sessionStorage.getItem('codfence_session_start')) {
          sessionStorage.setItem('codfence_session_start', Date.now().toString());
        }
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
  },
})

// Clear auth on browser close (when sessionStorage is cleared)
// This runs on page load - if sessionStart doesn't exist, it's a new session
if (typeof window !== 'undefined') {
  const sessionStart = sessionStorage.getItem('codfence_session_start');
  if (!sessionStart) {
    // New session - mark it as started
    sessionStorage.setItem('codfence_session_start', Date.now().toString());
    // Clear any stale auth tokens
    const authKeys = ['codfence_auth_user', 'codfence_auth_token', 'supabase_session'];
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
  }

  // Clear session on beforeunload (optional - sessionStorage clears automatically on close)
  window.addEventListener('beforeunload', () => {
    // sessionStorage will be cleared automatically when browser closes
    // This is just for cleanup
  });
}

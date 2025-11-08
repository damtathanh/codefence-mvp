// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

// ✅ Create Supabase client with full session persistence and auto-refresh
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,  // refresh token automatically
    persistSession: true,    // keep session after reload
    detectSessionInUrl: true,
    storage: localStorage,   // 👈 MUST be direct reference, not conditional
  },
})

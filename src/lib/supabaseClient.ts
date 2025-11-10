import { createClient } from "@supabase/supabase-js";

// Support both VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_KEY for backward compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

// Validate environment variables with helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) {
    // Check which key is missing
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_KEY) {
      missing.push('VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_KEY)');
    } 
  }
  
  const errorMessage = `❌ Missing Supabase environment variables: ${missing.join(', ')}\n\nPlease check your .env file and ensure these variables are set:\n${missing.map(v => `  - ${v}`).join('\n')}\n\nThen restart your development server.`;
  
  console.error(errorMessage);
  
  // In development, don't throw - show error but allow app to render
  // This prevents white screen. The ErrorBoundary will catch any runtime errors.
  console.warn('⚠️ Supabase client will not work correctly without environment variables.');
  console.warn('The app will render but authentication features will fail.');
}

// Create Supabase client with optimal configuration
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Storage adapter defaults to localStorage (works across page reloads)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

// Validate client initialization
if (import.meta.env.DEV) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase client initialized with placeholder values.');
    console.warn('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_KEY) in .env file.');
  } else {
    console.log('✅ Supabase client initialized successfully');
  }
}

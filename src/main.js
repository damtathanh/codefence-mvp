import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// ✅ import Supabase client here — it must run once globally
import { supabase } from './lib/supabaseClient';
// ✅ attach supabase to window for debugging and ensure auth state listener runs
if (typeof window !== 'undefined') {
    window.supabase = supabase; // so you can use it in console
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));

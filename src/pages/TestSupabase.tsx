// src/pages/TestSupabase.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

type RecordRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type MessageType = 'success' | 'error' | 'info' | null;

export default function TestSupabase() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen to auth state changes (keep session active)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRecords(session.user.id);
      } else {
        setRecords([]);
      }
    });

    // Check current session on mount
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setMessage('⚠️ ' + error.message);
        setMessageType('error');
      } else {
        setUser(data.user ?? null);
        if (data.user) {
          fetchRecords(data.user.id);
        }
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const showMessage = (text: string, type: MessageType) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType(null);
    }, 5000);
  };

  const handleSignup = async () => {
    if (!email || !password) {
      showMessage('⚠️ Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showMessage('❌ ' + error.message, 'error');
    } else {
      showMessage('✅ Registered successfully! Please check your email for confirmation (if enabled).', 'success');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage('⚠️ Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showMessage('❌ ' + error.message, 'error');
    } else {
      showMessage('✅ Logged in successfully!', 'success');
      setUser(data.user);
      setEmail('');
      setPassword('');
      if (data.user) {
        fetchRecords(data.user.id);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showMessage('❌ ' + error.message, 'error');
    } else {
      showMessage('✅ Logged out successfully', 'success');
      setUser(null);
      setRecords([]);
    }
    setLoading(false);
  };

  const handleInsert = async () => {
    if (!user) {
      showMessage('⚠️ Please login first', 'error');
      return;
    }

    if (!newContent.trim()) {
      showMessage('⚠️ Please enter content for the record', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('records')
      .insert({
        user_id: user.id,
        content: newContent.trim(),
      });

    if (error) {
      showMessage('❌ ' + error.message, 'error');
    } else {
      showMessage('✅ Record inserted successfully!', 'success');
      fetchRecords(user.id);
      setNewContent('');
    }
    setLoading(false);
  };

  const fetchRecords = async (userId: string) => {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      showMessage('❌ Failed to fetch records: ' + error.message, 'error');
    } else {
      setRecords(data || []);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('records').delete().eq('id', id);

    if (error) {
      showMessage('❌ ' + error.message, 'error');
    } else {
      showMessage('✅ Record deleted successfully', 'success');
      fetchRecords(user.id);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F28] text-[#E5E7EB] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white">🔐 CodFence — Supabase Test</h1>
        <p className="text-[#E5E7EB]/70 mb-8">Test end-to-end Supabase connection for MVP</p>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              messageType === 'success'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : messageType === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
            }`}
          >
            {message}
          </div>
        )}

        {/* Auth Section */}
        <div className="bg-gradient-to-br from-[#12163A]/80 to-[#181C3B]/80 backdrop-blur-sm rounded-lg border border-[#1E223D] p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            {user ? `👤 Logged in as: ${user.email}` : '🔑 Authentication'}
          </h2>

          {!user ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  Sign Up
                </button>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  Login
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              Logout
            </button>
          )}
        </div>

        {/* Create Record Section */}
        {user && (
          <div className="bg-gradient-to-br from-[#12163A]/80 to-[#181C3B]/80 backdrop-blur-sm rounded-lg border border-[#1E223D] p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-white">📝 Create Record</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E5E7EB]/90 mb-2">Content</label>
                <textarea
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]/50 resize-none"
                  placeholder="Enter record content..."
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleInsert}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                Insert Record
              </button>
            </div>
          </div>
        )}

        {/* Records List Section */}
        {user && (
          <div className="bg-gradient-to-br from-[#12163A]/80 to-[#181C3B]/80 backdrop-blur-sm rounded-lg border border-[#1E223D] p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">
              📋 My Records ({records.length})
            </h2>
            {records.length === 0 ? (
              <p className="text-[#E5E7EB]/70">No records found. Create your first record above!</p>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="bg-white/5 border border-[#1E223D] rounded-lg p-4 flex justify-between items-start hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-[#E5E7EB]/70 mb-2">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                      <div className="text-[#E5E7EB]">{record.content}</div>
                    </div>
                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={loading}
                      className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info for non-logged in users */}
        {!user && (
          <div className="bg-gradient-to-br from-[#12163A]/80 to-[#181C3B]/80 backdrop-blur-sm rounded-lg border border-[#1E223D] p-6">
            <p className="text-[#E5E7EB]/70 text-center">
              Please sign up or login to create and manage records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

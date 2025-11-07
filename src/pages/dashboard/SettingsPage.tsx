import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Lock, Shield, Moon, Sun, Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import type { UserProfile } from '../../types/supabase';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security' | 'theme'>('profile');
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    display_name: '',
    company_name: '',
    email: user?.email || '',
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  // Save theme to localStorage and Supabase, and apply it
  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('codfence-theme', newTheme);
    
    // Apply theme to document
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }

    // Save to Supabase
    if (user) {
      try {
        const { error } = await supabase
          .from('users_profile')
          .upsert({
            id: user.id,
            theme: newTheme,
          }, { onConflict: 'id' });
        if (error) console.error('Error saving theme:', error);
      } catch (err) {
        console.error('Error saving theme:', err);
      }
    }
  };

  // Load user profile from Supabase
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading profile:', error);
        } else if (data) {
          setProfile(data);
          setProfileData({
            display_name: data.display_name || '',
            company_name: data.company_name || '',
            email: user.email || '',
          });
          if (data.theme) {
            setTheme(data.theme);
            // Apply theme without saving (already in DB)
            localStorage.setItem('codfence-theme', data.theme);
            if (data.theme === 'system') {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            } else {
              document.documentElement.setAttribute('data-theme', data.theme);
            }
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  // Load theme from localStorage on mount (fallback)
  useEffect(() => {
    const savedTheme = localStorage.getItem('codfence-theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme && !profile?.theme) {
      setTheme(savedTheme);
    }
  }, [profile]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users_profile')
        .upsert({
          id: user.id,
          display_name: profileData.display_name,
          company_name: profileData.company_name,
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      } else {
        alert('Profile updated successfully!');
        // Reload profile
        const { data } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match!');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new,
      });

      if (error) {
        console.error('Error updating password:', error);
        alert(error.message || 'Failed to update password. Please try again.');
      } else {
        alert('Password updated successfully!');
        setPasswordData({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      console.error('Error updating password:', err);
      alert('Failed to update password. Please try again.');
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'password' as const, label: 'Password', icon: Lock },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'theme' as const, label: 'Theme', icon: Moon },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Settings</h1>
        <p className="text-[#E5E7EB]/70 text-lg">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-[#8B5CF6] text-white'
                        : 'text-[#E5E7EB]/70 hover:bg-white/10 hover:text-[#E5E7EB]'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Update Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <Input
                    label="Display Name"
                    value={profileData.display_name}
                    onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                  />
                  <Input
                    label="Company Name"
                    value={profileData.company_name}
                    onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="opacity-60"
                  />
                  <Button type="submit">Update Profile</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  />
                  <Button type="submit">Update Password</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h3 className="text-[#E5E7EB] font-medium mb-1">Two-Factor Authentication</h3>
                      <p className="text-sm text-[#E5E7EB]/70">Add an extra layer of security to your account</p>
                    </div>
                    <button
                      onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                      className={`relative w-12 h-6 rounded-full transition ${
                        twoFAEnabled ? 'bg-[#8B5CF6]' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          twoFAEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-[#E5E7EB]/70">
                    {twoFAEnabled
                      ? '2FA is enabled. Your account is more secure.'
                      : '2FA is disabled. Enable it for better security.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[#E5E7EB] font-medium mb-4">Choose Theme</h3>
                    <p className="text-sm text-[#E5E7EB]/70 mb-6">
                      Select your preferred theme. System will automatically match your device settings.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Light Theme */}
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-6 rounded-lg border-2 transition-all ${
                          theme === 'light'
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`p-3 rounded-lg ${
                            theme === 'light' ? 'bg-[#8B5CF6]' : 'bg-white/10'
                          }`}>
                            <Sun size={24} className={theme === 'light' ? 'text-white' : 'text-[#E5E7EB]'} />
                          </div>
                          <div className="text-center">
                            <h4 className="text-[#E5E7EB] font-medium mb-1">Light</h4>
                            <p className="text-xs text-[#E5E7EB]/70">Bright and clean</p>
                          </div>
                          {theme === 'light' && (
                            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
                          )}
                        </div>
                      </button>

                      {/* Dark Theme */}
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-6 rounded-lg border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-[#8B5CF6]' : 'bg-white/10'
                          }`}>
                            <Moon size={24} className={theme === 'dark' ? 'text-white' : 'text-[#E5E7EB]'} />
                          </div>
                          <div className="text-center">
                            <h4 className="text-[#E5E7EB] font-medium mb-1">Dark</h4>
                            <p className="text-xs text-[#E5E7EB]/70">Easy on the eyes</p>
                          </div>
                          {theme === 'dark' && (
                            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
                          )}
                        </div>
                      </button>

                      {/* System Theme */}
                      <button
                        onClick={() => handleThemeChange('system')}
                        className={`p-6 rounded-lg border-2 transition-all ${
                          theme === 'system'
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`p-3 rounded-lg ${
                            theme === 'system' ? 'bg-[#8B5CF6]' : 'bg-white/10'
                          }`}>
                            <Monitor size={24} className={theme === 'system' ? 'text-white' : 'text-[#E5E7EB]'} />
                          </div>
                          <div className="text-center">
                            <h4 className="text-[#E5E7EB] font-medium mb-1">System</h4>
                            <p className="text-xs text-[#E5E7EB]/70">Match device</p>
                          </div>
                          {theme === 'system' && (
                            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Current Theme Info */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[#E5E7EB] font-medium mb-1">Current Selection</h4>
                        <p className="text-sm text-[#E5E7EB]/70">
                          {theme === 'light' && 'Light theme is selected'}
                          {theme === 'dark' && 'Dark theme is selected'}
                          {theme === 'system' && `System theme is selected (${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'})`}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        theme === 'light' ? 'bg-yellow-500/20' :
                        theme === 'dark' ? 'bg-blue-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        {theme === 'light' && <Sun size={20} className="text-yellow-400" />}
                        {theme === 'dark' && <Moon size={20} className="text-blue-400" />}
                        {theme === 'system' && <Monitor size={20} className="text-purple-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};


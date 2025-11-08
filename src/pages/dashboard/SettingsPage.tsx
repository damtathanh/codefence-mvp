import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Lock, Shield, Moon, Sun, Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useUserProfile } from '../../hooks/useUserProfile';

interface ProfileData {
  email: string | null;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  role?: string | null;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { showSuccess, showError, showInfo } = useToast();
  const { theme, setTheme: setThemeContext } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security' | 'theme'>('profile');
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Update profileData when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        company_name: profile.company_name || '',
        email: profile.email || user?.email || '',
      });
    } else if (user && !profileLoading) {
      // Profile doesn't exist yet, initialize with user data
      setProfileData({
        full_name: '',
        phone: '',
        company_name: '',
        email: user.email || '',
      });
    }
  }, [profile, user, profileLoading]);

  // Helper function to refresh session
  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }
      return !!data?.session;
    } catch (err) {
      console.error('Error refreshing session:', err);
      return false;
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    let retryCount = 0;
    const maxRetries = 1;

    const attemptUpdate = async (): Promise<void> => {
      try {
        // Refresh session before update
        const sessionRefreshed = await refreshSession();
        if (!sessionRefreshed && retryCount === 0) {
          showInfo('Refreshing session...');
        }

      // Prepare update data - always include full_name and phone (even if empty)
      const updateData: { full_name?: string | null; phone?: string | null } = {
        full_name: profileData.full_name.trim() || null,
        phone: profileData.phone.trim() || null,
      };

        // Update profile using .update()
        let { data, error } = await supabase
          .from('users_profile')
          .update(updateData)
          .eq('id', user.id)
          .select('email, full_name, phone, company_name, role')
          .single();

        // If update fails because record doesn't exist, create it with upsert
        if (error && error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          const { data: upsertData, error: upsertError } = await supabase
            .from('users_profile')
            .upsert({
              id: user.id,
              email: user.email || '',
              ...updateData,
            }, { onConflict: 'id' })
            .select('email, full_name, phone, company_name, role')
            .single();
          
          data = upsertData;
          error = upsertError;
        }

        if (error) {
          // Check if it's a JWT/authentication error
          if (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('token') || error.message.includes('sub claim')) {
            if (retryCount < maxRetries) {
              retryCount++;
              showInfo('Session expired. Refreshing and retrying...');
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 500));
              // Force refresh session
              await refreshSession();
              return attemptUpdate();
            } else {
              showError('Session expired. Please log out and log back in.');
              setSaving(false);
              return;
            }
          }
          
          console.error('Error updating profile:', error);
          showError(`Failed to update profile: ${error.message || 'Please try again.'}`);
          setSaving(false);
          return;
        }

        if (data) {
          // Refresh profile from hook
          await refreshProfile();
          
          // Dispatch custom event to notify Header to refresh
          window.dispatchEvent(new CustomEvent('profileUpdated'));
          
          showSuccess('Profile updated successfully!');
          setSaving(false);
        } else {
          showError('Profile updated but no data returned. Please refresh the page.');
          setSaving(false);
        }
      } catch (err: any) {
        console.error('Error updating profile:', err);
        if (retryCount < maxRetries && (err?.message?.includes('JWT') || err?.message?.includes('expired'))) {
          retryCount++;
          showInfo('Retrying after session refresh...');
          await refreshSession();
          return attemptUpdate();
        }
        showError('Failed to update profile. Please try again.');
        setSaving(false);
      }
    };

    await attemptUpdate();
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new !== passwordData.confirm) {
      showError('New passwords do not match!');
      return;
    }

    if (passwordData.new.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setUpdatingPassword(true);
    let retryCount = 0;
    const maxRetries = 1;

    const attemptPasswordUpdate = async (): Promise<void> => {
      try {
        // Refresh session to prevent JWT expiry errors
        const sessionRefreshed = await refreshSession();
        
        if (!sessionRefreshed) {
          if (retryCount < maxRetries) {
            retryCount++;
            showInfo('Refreshing session...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return attemptPasswordUpdate();
          } else {
            showError('Session expired. Please log out and log back in, then try again.');
            setUpdatingPassword(false);
            return;
          }
        }

        // Verify we have a valid session
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          if (retryCount < maxRetries) {
            retryCount++;
            showInfo('No active session. Refreshing...');
            await refreshSession();
            await new Promise(resolve => setTimeout(resolve, 500));
            return attemptPasswordUpdate();
          } else {
            showError('No active session found. Please log out and log back in.');
            setUpdatingPassword(false);
            return;
          }
        }

        // Update password with fresh session
        const { error } = await supabase.auth.updateUser({
          password: passwordData.new,
        });

        if (error) {
          console.error('Error updating password:', error);
          
          // Check for JWT/authentication errors
          if (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('token') || error.message.includes('sub claim')) {
            if (retryCount < maxRetries) {
              retryCount++;
              showInfo('Session expired. Refreshing and retrying...');
              await refreshSession();
              await new Promise(resolve => setTimeout(resolve, 500));
              return attemptPasswordUpdate();
            } else {
              showError('Session expired. Please log out and log back in, then try again.');
              setUpdatingPassword(false);
              return;
            }
          }
          
          showError(error.message || 'Failed to update password. Please try again.');
          setUpdatingPassword(false);
        } else {
          showSuccess('Password updated successfully!');
          setPasswordData({ current: '', new: '', confirm: '' });
          setUpdatingPassword(false);
        }
      } catch (err: any) {
        console.error('Error updating password:', err);
        if (retryCount < maxRetries && (err?.message?.includes('JWT') || err?.message?.includes('expired') || err?.message?.includes('sub claim'))) {
          retryCount++;
          showInfo('Retrying after session refresh...');
          await refreshSession();
          await new Promise(resolve => setTimeout(resolve, 500));
          return attemptPasswordUpdate();
        }
        showError('Failed to update password. Please try again.');
        setUpdatingPassword(false);
      }
    };

    await attemptPasswordUpdate();
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeContext(newTheme);
    showSuccess(`Theme changed to ${newTheme}`);
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
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6]"></div>
                    <span className="ml-3 text-[#E5E7EB]/70">Loading profile...</span>
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <Input
                      label="Full Name"
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                    <Input
                      label="Company Name"
                      type="text"
                      value={profileData.company_name}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                      placeholder="Company name (read-only)"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                      placeholder="Email (read-only)"
                    />
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                )}
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
                  <Button type="submit" disabled={updatingPassword}>
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
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
                          {theme === 'system' && `System theme is selected (${typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'})`}
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

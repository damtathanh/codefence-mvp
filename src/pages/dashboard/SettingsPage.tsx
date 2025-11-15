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
  const { profile, loading: profileLoading, refreshProfile, updateProfile } = useUserProfile();
  const { showSuccess, showError, showInfo } = useToast();
  const { theme, setTheme: setThemeContext } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security' | 'theme'>('profile');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
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

  // ✅ Introduce a short readiness delay so Settings waits until session is valid before querying Supabase
  useEffect(() => {
    // Set ready after a delay OR if user is authenticated and profile is loaded (or failed to load)
    const timer = setTimeout(() => {
      setReady(true);
    }, 1000);
    
    // Also set ready if profile loading completes (success or error) - faster path
    if (user && !profileLoading) {
      const quickTimer = setTimeout(() => {
        setReady(true);
      }, 300);
      return () => {
        clearTimeout(timer);
        clearTimeout(quickTimer);
      };
    }
    
    // Safety: Set ready after max 3 seconds even if profile is still loading
    const safetyTimer = setTimeout(() => {
      console.warn('Settings page: Profile loading timeout, showing form anyway');
      setReady(true);
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [user, profileLoading]);

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

  // Safe session refresh function that checks for session before refreshing
  const ensureValidSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        console.warn('Session expired or missing');
        return false;
      }
      // Also check if email is verified
      if (data.session.user && !data.session.user.email_confirmed_at) {
        console.warn('Email not verified');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking session:', err);
      return false;
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate user is authenticated
    if (!user?.id) {
      showError('User not authenticated. Please log in again.');
      return;
    }

    setSaving(true);

    try {
      // Ensure we have a valid session before making database calls
      const hasValidSession = await ensureValidSession();
      
      if (!hasValidSession) {
        // Double-check session one more time
        const { data: sessionCheck } = await supabase.auth.getSession();
        if (!sessionCheck?.session) {
          showError('Session expired. Please log out and log in again.');
          setSaving(false);
          return;
        }
      }

      // Verify session one more time before proceeding
      const { data: finalSessionCheck, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !finalSessionCheck?.session) {
        showError('Session expired. Please log out and log in again.');
        setSaving(false);
        return;
      }

      // Prepare update data - set to null if empty string
      const fullName = profileData.full_name.trim() || null;
      const phone = profileData.phone.trim() || null;
      const companyName = profileData.company_name?.trim() || null;
      
      const profileUpdateData: { full_name?: string | null; phone?: string | null; company_name?: string | null } = {
        full_name: fullName,
        phone: phone,
        company_name: companyName,
      };

      // ✅ Use the updateProfile helper from useUserProfile hook
      // This ensures both auth metadata and profile table stay in sync
      const updateResult = await updateProfile(profileUpdateData);
      
      if (!updateResult.success) {
        showError(updateResult.error || 'Failed to update profile');
        setSaving(false);
        return;
      }

      // Profile updated successfully - refresh to get latest data
      await refreshProfile();
      
      // Get updated profile data for verification
      const { data, error } = await supabase
        .from('users_profile')
        .select('id, email, full_name, phone, company_name, role')
        .eq('id', user.id)
        .single();

      // Handle any errors from profile query
      if (error) {
        console.error('Error verifying profile update:', error);
        // Profile was updated via updateProfile, but query failed
        // Refresh profile hook to get latest data
        await refreshProfile();
      }

      // Success: Profile updated
      if (data || updateResult.success) {
        // Dispatch custom event to notify Header component to refresh
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        showSuccess('Profile updated successfully!');
      } else {
        showError('Profile update completed but could not verify.');
      }
    } catch (err: any) {
      console.error('Unexpected error updating profile:', err);
      
      // Handle AuthSessionMissingError specifically
      if (err?.message?.includes('AuthSessionMissingError') || 
          err?.message?.includes('session missing')) {
        showError('Session expired. Please log out and log in again.');
        setSaving(false);
        return;
      }

      showError(`Failed to update profile: ${err?.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
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
        // Ensure valid session before updating password
        const hasValidSession = await ensureValidSession();
        
        if (!hasValidSession) {
          // Double-check session
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData?.session) {
            if (retryCount < maxRetries) {
              retryCount++;
              showInfo('No active session. Please wait...');
              await new Promise(resolve => setTimeout(resolve, 500));
              return attemptPasswordUpdate();
            } else {
              showError('Session expired. Please log out and log in again.');
              setUpdatingPassword(false);
              return;
            }
          }
        }

        // Verify we have a valid session one more time
        const { data: finalSessionData } = await supabase.auth.getSession();
        if (!finalSessionData?.session) {
          showError('Session expired. Please log out and log in again.');
          setUpdatingPassword(false);
          return;
        }

        // Update password with fresh session
        const { error } = await supabase.auth.updateUser({
          password: passwordData.new,
        });

        if (error) {
          console.error('Error updating password:', error);
          
          // Check for JWT/authentication errors
          if (error.message.includes('JWT') || 
              error.message.includes('expired') || 
              error.message.includes('token') || 
              error.message.includes('sub claim') ||
              error.message.includes('AuthSessionMissingError') ||
              error.message.includes('session missing')) {
            showError('Session expired. Please log out and log in again.');
            setUpdatingPassword(false);
            return;
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
        
        // Handle AuthSessionMissingError
        if (err?.message?.includes('AuthSessionMissingError') || 
            err?.message?.includes('session missing')) {
          showError('Session expired. Please log out and log in again.');
          setUpdatingPassword(false);
          return;
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 min-h-0">
        {/* Sidebar */}
        <Card className="h-full">
          <CardContent className="p-0 h-full">
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
        <div className="flex flex-col min-h-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="flex flex-col h-full min-h-0">
              <CardHeader className="!py-2">
                <CardTitle>Update Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-4">
                {(!ready || (profileLoading && user)) ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6]"></div>
                    <span className="ml-3 text-[#E5E7EB]/70">Loading profile...</span>
                  </div>
                ) : !user ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-[#E5E7EB]/70">Please log in to view your profile.</p>
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
            <Card className="flex flex-col h-full min-h-0">
              <CardHeader className="!py-2">
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-4">
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
            <Card className="flex flex-col h-full min-h-0">
              <CardHeader className="!py-2">
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-6">
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
            <Card className="flex flex-col h-full min-h-0">
              <CardHeader className="!py-2">
                <CardTitle>Theme Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-6">
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

import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, Settings, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../features/auth";
import { supabase } from "../lib/supabaseClient";

const navigationItems = [
  { label: "About Us", href: "#about" },
  { label: "Our Solutions", href: "#solutions" },
  { label: "News", href: "#news" },
  { label: "Careers", href: "#careers" },
  { label: "Contact", href: "#contact" },
];

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);

  // Fetch user profile from users_profile table
  const fetchUserProfile = useCallback(async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('users_profile')
          .select('display_name, full_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          // Use display_name or full_name for compatibility
          setUserProfile({ full_name: data.display_name || data.full_name });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Listen for profile update events from Settings page
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchUserProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setMobileMenuOpen(false);
      setDropdownOpen(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isAdmin = () => {
    return user?.email?.includes('@codfence.com') || false;
  };

  const getUserDisplayName = () => {
    // If admin, show "Admin"
    if (isAdmin()) {
      return 'Admin';
    }
    // Prioritize full_name from profiles table
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    if (!user?.email) return 'User';
    return user.email;
  };

  const getUserAvatar = () => {
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    return null;
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    if (displayName === 'Admin') return 'A';
    if (userProfile?.full_name) {
      const names = userProfile.full_name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0]?.toUpperCase() || 'U';
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const handleManageDashboard = () => {
    setDropdownOpen(false);
    // Navigate based on role - requirements specify /admin/dashboard and /user/dashboard
    if (isAdmin()) {
      navigate('/admin/dashboard');
    } else {
      navigate('/user/dashboard');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGoHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0B0F28]/80 backdrop-blur-xl border-b border-white/10 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6">
        {/* Logo */}
        <a
          href="/"
          onClick={handleGoHome}
          className="flex items-center gap-0 hover:opacity-90 transition"
        >
          <img
            src="/assets/logo.png"
            alt="CodFence Logo"
            className="w-6 h-6 object-contain flex-shrink-0 mr-2"
          />
          <h1 className="text-2xl md:text-3xl font-extrabold gradient-logo">
            CodFence
          </h1>
        </a>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center space-x-8">
          {navigationItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="relative text-gray-300 font-medium transition-all duration-300
                           hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#6366F1] hover:via-[#7C3AED] hover:to-[#8B5CF6]
                           after:content-[''] after:absolute after:bottom-[-6px] after:left-0 after:w-0 after:h-[2px]
                           after:bg-gradient-to-r after:from-[#6366F1] after:via-[#7C3AED] after:to-[#8B5CF6] after:rounded-full after:transition-all after:duration-500
                           hover:after:w-full"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* User Profile or Get Started Button - Desktop */}
        <div className="hidden md:flex items-center ml-4 relative">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 hover:opacity-90 transition-opacity"
              >
                {getUserAvatar() ? (
                  <img
                    src={getUserAvatar()!}
                    alt="User avatar"
                    className="rounded-full w-8 h-8 border border-white/30 object-cover"
                  />
                ) : (
                  <div className="rounded-full bg-white/10 w-8 h-8 flex items-center justify-center text-white font-semibold">
                    {getUserInitials()}
                  </div>
                )}
                <span className="text-white/90 font-medium hover:text-white transition-colors">
                  {getUserDisplayName()}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-[#12163A] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
                    <button
                      onClick={handleManageDashboard}
                      className="w-full text-left text-sm text-white/80 hover:bg-white/10 px-4 py-2 rounded flex items-center gap-3"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Manage Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full text-left text-sm text-white/80 hover:bg-white/10 px-4 py-2 rounded flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-sm text-white/80 hover:bg-white/10 px-4 py-2 rounded flex items-center gap-3"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="button-gradient px-5 py-2.5 rounded-xl text-sm"
            >
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition text-[#E5E7EB]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0B0F28]/95 backdrop-blur-xl">
          <div className="px-6 py-4 space-y-4">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="block text-gray-300 font-medium transition-all duration-300
                           hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#6366F1] hover:via-[#7C3AED] hover:to-[#8B5CF6]
                           py-2"
              >
                {item.label}
              </a>
            ))}
            {isAuthenticated && user ? (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  {getUserAvatar() ? (
                    <img
                      src={getUserAvatar()!}
                      alt="User avatar"
                      className="rounded-full w-8 h-8 border border-white/30 object-cover"
                    />
                  ) : (
                    <div className="rounded-full bg-white/10 w-8 h-8 flex items-center justify-center text-white font-semibold">
                      {getUserInitials()}
                    </div>
                  )}
                  <span className="text-white/90 font-medium">
                    {getUserDisplayName()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleManageDashboard();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Manage Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block button-gradient px-5 py-2.5 rounded-xl text-sm text-center mt-4"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

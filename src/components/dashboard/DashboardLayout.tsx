import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { useRole } from '../../hooks/useRole';
import { isAdminByEmail } from '../../utils/isAdmin';
import type { Notification as SupabaseNotification } from '../../types/supabase';
import { AddOrderModal } from './AddOrderModal';
import type { Order } from '../../types/supabase';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  FileText,
  History,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  Shield,
  ArrowLeft,
} from 'lucide-react';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
  id: string;
}

export interface DashboardOutletContext {
  openAddOrderModal: (options?: { order?: Order | null; onSuccess?: () => void }) => void;
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', id: 'dashboard' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', id: 'analytics' },
  { icon: Package, label: 'Products', path: '/dashboard/products', id: 'products' },
  { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders', id: 'orders' },
  { icon: FileText, label: 'Invoice', path: '/dashboard/invoice', id: 'invoice' },
  { icon: History, label: 'History', path: '/dashboard/history', id: 'history' },
  { icon: MessageSquare, label: 'Message', path: '/dashboard/message', id: 'message' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', id: 'settings' },
];

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'security';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { profile, refreshProfile } = useUserProfile();
  const { role } = useRole();
  const isAdmin = isAdminByEmail(user);
  
  // Detect if current page is Message page (user or admin)
  const isMessagePage = location.pathname.includes('/message');
  const {
    data: supabaseNotifications,
    loading: notificationsLoading,
  } = useSupabaseTable<SupabaseNotification>({ tableName: 'notifications', enableRealtime: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalEditingOrder, setOrderModalEditingOrder] = useState<Order | null>(null);
  const orderModalSuccessRef = useRef<(() => void) | null>(null);

  const openAddOrderModal = useCallback((options?: { order?: Order | null; onSuccess?: () => void }) => {
    setOrderModalEditingOrder(options?.order ?? null);
    orderModalSuccessRef.current = options?.onSuccess ?? null;
    setIsOrderModalOpen(true);
  }, []);

  const closeAddOrderModal = useCallback(() => {
    setIsOrderModalOpen(false);
    setOrderModalEditingOrder(null);
    orderModalSuccessRef.current = null;
  }, []);

  const handleOrderModalSuccess = useCallback(() => {
    orderModalSuccessRef.current?.();
    closeAddOrderModal();
  }, [closeAddOrderModal]);

  const outletContext = useMemo<DashboardOutletContext>(
    () => ({
      openAddOrderModal,
    }),
    [openAddOrderModal]
  );
  
  // Filter sidebar items based on role
  const filteredSidebarItems = useMemo(() => {
    if (isAdmin || role === 'admin') {
      // Admin sees: Dashboard (admin), History, Message, Settings
      return sidebarItems.filter(item => 
        item.id === 'dashboard' || 
        item.id === 'analytics' ||
        item.id === 'message' ||
        item.id === 'settings'
      ).map(item => {
        // Update paths for admin routes
        if (item.id === 'dashboard') {
          return { ...item, path: '/admin/dashboard', label: 'Dashboard' };
        }
        if (item.id === 'analytics') {
          return { ...item, path: '/admin/analytics', label: 'Analytics' };
        }
        if (item.id === 'message') {
          return { ...item, path: '/admin/message' };
        }
        if (item.id === 'settings') {
          return { ...item, path: '/admin/settings' };
        }
        return item;
      });
    }
    // Regular users see all items
    return sidebarItems;
  }, [isAdmin, role]);

  // Track window size to determine if we're on desktop
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      // Reset hover state when switching between mobile and desktop
      if (window.innerWidth < 1024) {
        setIsHovered(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch unread message count for admin
  useEffect(() => {
    if (!isAdmin || !user) return;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('read', false);

        if (error) throw error;
        setUnreadMessageCount(data?.length || 0);
      } catch (err) {
        console.error('Error fetching unread messages:', err);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for unread messages
    const channel = supabase
      .channel('admin_unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const mainContentRef = useRef<HTMLElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Listen for profile update events from Settings page
  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [refreshProfile]);

  // Reset scroll position when route changes
  useEffect(() => {
    // Reset window scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Reset main content scroll
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Format Supabase notifications for display
  useEffect(() => {
    const formatted = supabaseNotifications.map(notif => {
      const date = new Date(notif.created_at);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = '';
      if (diffHours < 1) {
        timeStr = 'Just now';
      } else if (diffHours < 24) {
        timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }

      return {
        id: notif.id,
        type: notif.type as 'success' | 'info' | 'warning' | 'security',
        title: notif.title,
        message: notif.message,
        time: timeStr,
        read: notif.is_read,
      };
    });
    setNotifications(formatted);
  }, [supabaseNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'info':
        return <Info size={18} className="text-blue-400" />;
      case 'warning':
        return <AlertCircle size={18} className="text-yellow-400" />;
      case 'security':
        return <Shield size={18} className="text-purple-400" />;
      default:
        return <Info size={18} className="text-blue-400" />;
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Page title and subtitle mapping - updates when profile or location changes
  const getPageInfo = () => {
    const path = location.pathname;
    // Extract first name from full_name for personalized greeting
    const fullName = profile?.full_name || '';
    const firstName = fullName ? fullName.trim().split(' ')[0] : (user?.email?.split('@')[0] || '');
    const userName = firstName;
    
    // Map paths to page info
    const pageMap: Record<string, { title: string; subtitle: string }> = {
      '/dashboard': {
        title: 'Dashboard',
        subtitle: userName ? `Welcome back, ${userName}! Here's your overview` : "Welcome back! Here's your overview"
      },
      '/admin/dashboard': {
        title: 'Admin Dashboard',
        subtitle: userName ? `Welcome back, ${userName}! Here's your overview` : "Welcome back! Here's your overview"
      },
      '/dashboard/analytics': {
        title: 'Analytics',
        subtitle: 'Detailed insights and performance metrics'
      },
      '/admin/analytics': {
        title: 'Analytics',
        subtitle: 'Detailed insights and performance metrics'
      },
      '/dashboard/settings': {
        title: 'Settings',
        subtitle: 'Manage your account settings'
      },
      '/admin/settings': {
        title: 'Settings',
        subtitle: 'Manage your account settings'
      },
      '/dashboard/orders': {
        title: 'Orders',
        subtitle: 'Track and manage your order history'
      },
      '/dashboard/products': {
        title: 'Products',
        subtitle: 'Manage your product listings and details'
      },
      '/dashboard/invoice': {
        title: 'Invoice',
        subtitle: 'View and download billing and payment details'
      },
      '/dashboard/history': {
        title: 'History',
        subtitle: 'Verification logs and activity history'
      },
      '/dashboard/message': {
        title: 'Message',
        subtitle: 'Chat with CodFence support team'
      },
      '/admin/message': {
        title: 'Message',
        subtitle: 'Chat with CodFence support team'
      }
    };
    
    // Get page info or default
    const pageInfo = pageMap[path] || {
      title: path.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard',
      subtitle: 'Dashboard overview'
    };
    
    // Capitalize title
    pageInfo.title = pageInfo.title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return pageInfo;
  };

  const pageInfo = getPageInfo();

  const isActive = (path: string) => {
    // Handle admin routes
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard';
    }
    if (path.startsWith('/admin/')) {
      return location.pathname.startsWith(path);
    }
    // Handle regular dashboard routes
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const confirmLogout = async () => {
    try {
      await logout(); // Calls Supabase signOut() from AuthContext
      setShowLogoutModal(false); // Close modal
      window.location.href = '/login'; // Redirect to login page
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Determine if sidebar is expanded
  const expanded = (isDesktop && isHovered) || sidebarOpen;

  return (
    <div className="flex h-screen bg-[#0B0F28] overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 h-full z-40 transition-[width,background,box-shadow] duration-300 ease-in-out flex flex-col ${
          // Mobile: slide in/out
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          // Width: expanded on hover (desktop) or when open (mobile)
          expanded ? 'w-[200px]' : 'w-20'
        } ${
          // Overlay styling when expanded on desktop
          expanded && isDesktop
            ? 'bg-[#12163A]/95 backdrop-blur-md border-r border-[#1E223D] shadow-xl'
            : 'bg-gradient-to-b from-[#12163A] to-[#181C3B] border-r border-[#1E223D]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-[#1E223D]">
          {expanded ? (
            <Link
              to="/"
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition ml-2"
            >
              <img
                src="/assets/logo.png"
                alt="CodFence Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent whitespace-nowrap transition-opacity duration-300">
                CodFence
              </span>
            </Link>
          ) : (
            <img
              src="/assets/logo.png"
              alt="CodFence Logo"
              className="w-8 h-8 object-contain mx-auto"
            />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition text-[#E5E7EB] -mr-2"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredSidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const showUnreadBadge = item.id === 'message' && isAdmin && unreadMessageCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  expanded ? 'justify-start' : 'justify-center'
                } ${
                  active
                    ? 'bg-[#8B5CF6] text-white shadow-lg'
                    : 'text-[#E5E7EB]/70 hover:bg-white/10 hover:text-[#E5E7EB]'
                }`}
              >
                <Icon size={28} />
                {expanded && (
                  <span className="font-medium transition-opacity duration-300 flex-1">
                    {item.label}
                  </span>
                )}
                {showUnreadBadge && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 shadow-md flex-shrink-0">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#1E223D]">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all ${
              expanded ? 'justify-start' : 'justify-center'
            }`}
          >
            <LogOut size={28} />
            {expanded && (
              <span className="font-medium transition-opacity duration-300">
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-20 transition-all duration-300">
        {/* Topbar */}
        <header className="h-16 bg-gradient-to-r from-[#12163A] to-[#181C3B] border-b border-[#1E223D] flex items-center justify-between px-6 sticky top-0 z-20">
          {/* Left side: Mobile Menu Button + Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition text-[#E5E7EB]"
            >
              <Menu size={20} />
            </button>
            
            {/* Page Title and Subtitle */}
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#E5E7EB] tracking-wide">
                {pageInfo.title}:
              </h2>
              <p className="text-base text-[#E5E7EB]/70">
                {pageInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Right side: Back to Home Button + Notifications + Profile */}
          <div className="flex items-center gap-3 ml-4">
            {/* Back to Home Button */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 rounded-lg text-[#E5E7EB] hover:bg-[#8B5CF6]/30 transition whitespace-nowrap"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium hidden md:inline">Back to Home</span>
              <span className="text-sm font-medium md:hidden">Home</span>
            </button>
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-white/10 transition text-[#E5E7EB]"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Notification Popup */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 md:w-96 bg-gradient-to-br from-[#12163A] to-[#181C3B] border border-[#1E223D] rounded-lg shadow-2xl z-50 max-h-[500px] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1E223D]">
                    <h3 className="text-lg font-semibold text-[#E5E7EB]">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto max-h-[400px]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={32} className="mx-auto mb-3 text-[#E5E7EB]/30" />
                        <p className="text-[#E5E7EB]/70 text-sm">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#1E223D]">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`p-4 hover:bg-white/5 transition cursor-pointer ${
                              !notification.read ? 'bg-[#8B5CF6]/10' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-[#E5E7EB]">
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <span className="w-2 h-2 bg-[#8B5CF6] rounded-full flex-shrink-0 mt-1"></span>
                                  )}
                                </div>
                                <p className="text-xs text-[#E5E7EB]/70 mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-[#E5E7EB]/50">{notification.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-[#1E223D] text-center">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          setShowAllNotifications(true);
                        }}
                        className="text-sm text-[#8B5CF6] hover:text-[#A78BFA] transition"
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <span className="text-[#E5E7EB] font-medium hidden md:block">
                {profile?.full_name || 'User'}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main ref={mainContentRef} className="flex-1 flex flex-col overflow-hidden bg-[#0B0F28]">
          <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0B0F28] via-[#12163A] to-[#181C3B]">
            {isMessagePage ? (
              <div className="flex-1 flex w-full max-w-screen-xl mx-auto px-4 py-4 md:py-6">
                <Outlet context={outletContext} />
              </div>
            ) : (
              <div className="flex-1 w-full max-w-screen-xl mx-auto px-4 py-6">
                <Outlet context={outletContext} />
              </div>
            )}
          </div>
        </main>

      </div>

      <AddOrderModal
        isOpen={isOrderModalOpen}
        onClose={closeAddOrderModal}
        onSuccess={handleOrderModalSuccess}
        editingOrder={orderModalEditingOrder ?? undefined}
      />

      {/* All Notifications Modal */}
      {showAllNotifications && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAllNotifications(false)}
        >
          <div
            className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-xl border border-[#1E223D] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1E223D]">
              <div>
                <h2 className="text-2xl font-bold text-[#E5E7EB] mb-1">All Notifications</h2>
                <p className="text-sm text-[#E5E7EB]/70">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 text-sm text-[#8B5CF6] hover:text-[#A78BFA] hover:bg-[#8B5CF6]/10 rounded-lg transition"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setShowAllNotifications(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition text-[#E5E7EB]"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bell size={48} className="mb-4 text-[#E5E7EB]/30" />
                  <p className="text-[#E5E7EB]/70 text-lg mb-2">No notifications</p>
                  <p className="text-[#E5E7EB]/50 text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-5 rounded-lg border transition-all cursor-pointer ${
                        !notification.read
                          ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/15'
                          : 'bg-white/5 border-[#1E223D] hover:bg-white/10'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`p-2 rounded-lg ${
                            notification.type === 'success' ? 'bg-green-500/20' :
                            notification.type === 'info' ? 'bg-blue-500/20' :
                            notification.type === 'warning' ? 'bg-yellow-500/20' :
                            'bg-purple-500/20'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-base font-semibold text-[#E5E7EB]">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.read && (
                                <span className="w-2 h-2 bg-[#8B5CF6] rounded-full"></span>
                              )}
                              <span className="text-xs text-[#E5E7EB]/50 whitespace-nowrap">
                                {notification.time}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-[#E5E7EB]/70 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              notification.type === 'success' ? 'bg-green-500/20 text-green-300' :
                              notification.type === 'info' ? 'bg-blue-500/20 text-blue-300' :
                              notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </span>
                            {!notification.read && (
                              <span className="text-xs text-[#8B5CF6]">• Unread</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-[#1E223D] bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#E5E7EB]/70">
                    Showing {notifications.length} notification{notifications.length > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => setShowAllNotifications(false)}
                    className="px-4 py-2 text-sm text-[#8B5CF6] hover:text-[#A78BFA] hover:bg-[#8B5CF6]/10 rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#12163A] to-[#181C3B] rounded-lg border border-[#1E223D] p-6 lg:p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold text-[#E5E7EB] mb-3">Confirm Logout</h3>
            <p className="text-[#E5E7EB]/70 mb-8">Are you sure you want to logout?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-lg border border-[#1E223D] text-[#E5E7EB] hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


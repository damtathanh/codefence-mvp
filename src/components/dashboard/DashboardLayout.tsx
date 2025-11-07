import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import type { Notification as SupabaseNotification } from '../../types/supabase';
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
  Search,
  Bell,
  Menu,
  X,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  Shield,
} from 'lucide-react';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
  id: string;
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
  const {
    data: supabaseNotifications,
    loading: notificationsLoading,
  } = useSupabaseTable<SupabaseNotification>({ tableName: 'notifications', enableRealtime: true });
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const mainContentRef = useRef<HTMLElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

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

  const confirmLogout = async () => {
    try {
      await logout(); // Calls Supabase signOut() from AuthContext
      setShowLogoutModal(false); // Close modal
      window.location.href = '/login'; // Redirect to login page
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

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
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-[#12163A] to-[#181C3B] border-r border-[#1E223D] transition-all duration-300 flex flex-col fixed lg:relative h-full z-30`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E223D]">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo.png"
                alt="CodFence Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-[#E5E7EB]">CodFence</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition text-[#E5E7EB]"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-[#8B5CF6] text-white shadow-lg'
                    : 'text-[#E5E7EB]/70 hover:bg-white/10 hover:text-[#E5E7EB]'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#1E223D]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col lg:ml-0 transition-all duration-300`}>
        {/* Topbar */}
        <header className="h-16 bg-gradient-to-r from-[#12163A] to-[#181C3B] border-b border-[#1E223D] flex items-center justify-between px-6 sticky top-0 z-20">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition text-[#E5E7EB] mr-2"
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#E5E7EB]/50" size={20} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-[#1E223D] rounded-lg text-[#E5E7EB] placeholder-[#E5E7EB]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] transition"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
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
              <span className="text-[#E5E7EB] font-medium hidden md:block">Admin</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-[#0B0F28] p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

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


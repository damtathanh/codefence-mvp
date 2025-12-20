import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { useRole } from '../../hooks/useRole';
import { isAdminByEmail } from '../../utils/isAdmin';
import { AddOrderModal } from './AddOrderModal';
import { AddProductModal } from './AddProductModal';
import { LayoutDashboard, BarChart3, Package, ShoppingCart, FileText, History, MessageSquare, Settings, LogOut, Bell, Menu, X, User, CheckCircle, AlertCircle, Info, Shield, ArrowLeft, Users, } from 'lucide-react';
const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', id: 'dashboard' },
    { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', id: 'analytics' },
    { icon: Package, label: 'Products', path: '/dashboard/products', id: 'products' },
    { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders', id: 'orders' },
    { icon: Users, label: 'Customers', path: '/dashboard/customers', id: 'customers' },
    { icon: FileText, label: 'Invoice', path: '/dashboard/invoice', id: 'invoice' },
    { icon: History, label: 'History', path: '/dashboard/history', id: 'history' },
    { icon: MessageSquare, label: 'Message', path: '/dashboard/message', id: 'message' },
];
export const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const { profile, refreshProfile } = useUserProfile();
    const { role } = useRole();
    const isAdmin = isAdminByEmail(user);
    // ⬇️ NEW: xác định layout đặc biệt cho Dashboard + Analytics
    const isAnalyticsLayout = useMemo(() => {
        const path = location.pathname;
        if (path === '/dashboard' ||
            path === '/admin/dashboard' ||
            path.startsWith('/dashboard/analytics') ||
            path.startsWith('/admin/analytics')) {
            return true;
        }
        return false;
    }, [location.pathname]);
    // Detect if current page is Message page (user or admin)
    const isMessagePage = location.pathname.startsWith("/dashboard/message") ||
        location.pathname.startsWith("/admin/message");
    const { data: supabaseNotifications, loading: notificationsLoading, } = useSupabaseTable({ tableName: 'notifications', enableRealtime: true });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [orderModalEditingOrder, setOrderModalEditingOrder] = useState(null);
    const orderModalSuccessRef = useRef(null);
    // Product modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productModalInitialName, setProductModalInitialName] = useState('');
    const productModalSuccessRef = useRef(null);
    const { fetchAll: refetchProducts, } = useSupabaseTable({ tableName: 'products', enableRealtime: false });
    const openAddOrderModal = useCallback((options) => {
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
    const openAddProductModal = useCallback((options) => {
        setProductModalInitialName(options?.initialName ?? '');
        productModalSuccessRef.current = options?.onSuccess ?? null;
        setIsProductModalOpen(true);
    }, []);
    const closeAddProductModal = useCallback(() => {
        setIsProductModalOpen(false);
        setProductModalInitialName('');
        productModalSuccessRef.current = null;
    }, []);
    const handleProductModalSuccess = useCallback(async () => {
        if (productModalSuccessRef.current) {
            await productModalSuccessRef.current();
        }
        closeAddProductModal();
    }, [closeAddProductModal]);
    const outletContext = useMemo(() => ({
        openAddOrderModal,
        openAddProductModal,
        refetchProducts: async () => {
            await refetchProducts();
        },
    }), [openAddOrderModal, openAddProductModal, refetchProducts]);
    // Filter sidebar items based on role
    const filteredSidebarItems = useMemo(() => {
        if (isAdmin || role === 'admin') {
            return sidebarItems
                .filter(item => item.id === 'dashboard' ||
                item.id === 'analytics' ||
                item.id === 'message' ||
                item.id === 'settings')
                .map(item => {
                if (item.id === 'dashboard') {
                    return { ...item, path: '/admin/dashboard', label: 'Dashboard' };
                }
                if (item.id === 'analytics') {
                    return { ...item, path: '/admin/analytics', label: 'Analytics' };
                }
                if (item.id === 'message') {
                    return { ...item, path: '/admin/message' };
                }
                return item;
            });
        }
        return sidebarItems;
    }, [isAdmin, role]);
    // Track window size to determine if we're on desktop
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
            if (window.innerWidth < 1024) {
                setIsHovered(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    // Fetch unread message count for admin
    useEffect(() => {
        if (!isAdmin || !user)
            return;
        const fetchUnreadCount = async () => {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('id', { count: 'exact' })
                    .eq('receiver_id', user.id)
                    .eq('read', false);
                if (error)
                    throw error;
                setUnreadMessageCount(data?.length || 0);
            }
            catch (err) {
                console.error('Error fetching unread messages:', err);
            }
        };
        fetchUnreadCount();
        const channel = supabase
            .channel('admin_unread_messages')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
        }, () => {
            fetchUnreadCount();
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin, user]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const mainContentRef = useRef(null);
    const notificationRef = useRef(null);
    // Profile dropdown state
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);
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
    // Reset scroll position when route changes (chỉ cho layout có scroll)
    useEffect(() => {
        if (!isAnalyticsLayout && mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
    }, [location.pathname, isAnalyticsLayout]);
    // Close notifications and profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        if (showNotifications || showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, showProfileMenu]);
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
            }
            else if (diffHours < 24) {
                timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            }
            else {
                timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            }
            return {
                id: notif.id,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                time: timeStr,
                read: notif.is_read,
            };
        });
        setNotifications(formatted);
    }, [supabaseNotifications]);
    const unreadCount = notifications.filter(n => !n.read).length;
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return _jsx(CheckCircle, { size: 18, className: "text-green-400" });
            case 'info':
                return _jsx(Info, { size: 18, className: "text-blue-400" });
            case 'warning':
                return _jsx(AlertCircle, { size: 18, className: "text-yellow-400" });
            case 'security':
                return _jsx(Shield, { size: 18, className: "text-purple-400" });
            default:
                return _jsx(Info, { size: 18, className: "text-blue-400" });
        }
    };
    const markAsRead = async (id) => {
        if (!user)
            return;
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
                .eq('user_id', user.id);
        }
        catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };
    const markAllAsRead = async () => {
        if (!user)
            return;
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
        }
        catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };
    const handleNavigation = (path) => {
        navigate(path);
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };
    const handleLogout = () => {
        setShowLogoutModal(true);
    };
    const getPageInfo = () => {
        const path = location.pathname;
        const fullName = profile?.full_name || '';
        const firstName = fullName ? fullName.trim().split(' ')[0] : (user?.email?.split('@')[0] || '');
        const userName = firstName;
        const pageMap = {
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
            '/dashboard/settings': {
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
            '/dashboard/customers': {
                title: 'Customers',
                subtitle: 'Manage customer profiles and blacklist'
            },
            '/dashboard/message': {
                title: 'Message',
                subtitle: 'Chat with CodFence support team'
            },
        };
        const pageInfo = pageMap[path] || {
            title: path.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard',
            subtitle: 'Dashboard overview'
        };
        pageInfo.title = pageInfo.title
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return pageInfo;
    };
    const pageInfo = getPageInfo();
    const isActive = (path) => {
        if (path === '/admin/dashboard') {
            return location.pathname === '/admin/dashboard';
        }
        if (path.startsWith('/admin/')) {
            return location.pathname.startsWith(path);
        }
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };
    const confirmLogout = async () => {
        try {
            await logout();
            setShowLogoutModal(false);
            window.location.href = '/login';
        }
        catch (error) {
            console.error('Logout error:', error);
        }
    };
    const expanded = (isDesktop && isHovered) || sidebarOpen;
    return (_jsxs("div", { className: "flex h-screen min-h-0 bg-[var(--bg-page)]", children: [sidebarOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 z-20 lg:hidden", onClick: () => setSidebarOpen(false) })), _jsxs("aside", { onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), className: `fixed top-0 left-0 h-full z-[100] transition-[width,background,box-shadow] duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${expanded ? 'w-[200px]' : 'w-20'} ${expanded && isDesktop
                    ? 'bg-[var(--bg-sidebar)]/95 backdrop-blur-md border-r border-[var(--border-subtle)] shadow-xl'
                    : 'bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)]'}`, children: [_jsxs("div", { className: "flex items-center justify-between h-16 px-5 border-b border-[var(--border-subtle)]", children: [expanded ? (_jsxs(Link, { to: "/", className: "flex items-center gap-2 cursor-pointer hover:opacity-80 transition ml-2", children: [_jsx("img", { src: "/assets/logo.png", alt: "CodFence Logo", className: "w-8 h-8 object-contain" }), _jsx("span", { className: "text-lg font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent whitespace-nowrap transition-opacity duration-300", children: "CodFence" })] })) : (_jsx("img", { src: "/assets/logo.png", alt: "CodFence Logo", className: "w-8 h-8 object-contain mx-auto" })), _jsx("button", { onClick: () => setSidebarOpen(!sidebarOpen), className: "lg:hidden p-1 rounded-lg hover:bg-[var(--bg-card-soft)] transition text-[var(--text-main)] -mr-2", "aria-label": "Toggle sidebar", children: sidebarOpen ? _jsx(X, { size: 20 }) : _jsx(Menu, { size: 20 }) })] }), _jsx("nav", { className: "flex-1 overflow-y-auto p-4 space-y-2", children: filteredSidebarItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const showUnreadBadge = item.id === 'message' && isAdmin && unreadMessageCount > 0;
                            return (_jsxs("button", { onClick: () => handleNavigation(item.path), className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${expanded ? 'justify-start' : 'justify-center'} ${active
                                    ? 'bg-[#8B5CF6] text-white shadow-lg'
                                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-soft)] hover:text-[var(--text-main)]'}`, children: [_jsx(Icon, { size: 28 }), expanded && (_jsx("span", { className: "font-medium transition-opacity duration-300 flex-1", children: item.label })), showUnreadBadge && (_jsx("span", { className: "bg-red-500 text-white text-xs rounded-full px-2 py-0.5 shadow-md flex-shrink-0", children: unreadMessageCount }))] }, item.id));
                        }) }), _jsx("div", { className: "p-4 border-t border-[var(--border-subtle)]", children: _jsxs("button", { onClick: handleLogout, className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all ${expanded ? 'justify-start' : 'justify-center'}`, children: [_jsx(LogOut, { size: 28 }), expanded && (_jsx("span", { className: "font-medium transition-opacity duration-300", children: "Logout" }))] }) })] }), _jsxs("div", { className: "flex-1 flex flex-col lg:ml-20 transition-all duration-300 min-h-0", children: [_jsxs("header", { className: "h-16 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] flex items-center justify-between px-6 sticky top-0 z-[80]", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => setSidebarOpen(!sidebarOpen), className: "lg:hidden p-2 rounded-lg hover:bg-[var(--bg-card-soft)] transition text-[var(--text-main)]", children: _jsx(Menu, { size: 20 }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("h2", { className: "text-lg font-semibold text-[var(--text-main)] tracking-wide", children: [pageInfo.title, ":"] }), _jsx("p", { className: "text-base text-[var(--text-muted)]", children: pageInfo.subtitle })] })] }), _jsxs("div", { className: "flex items-center gap-3 ml-4", children: [_jsxs("button", { onClick: () => navigate("/"), className: "flex items-center gap-2 px-4 py-2 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 rounded-lg text-[var(--text-main)] hover:bg-[#8B5CF6]/30 transition whitespace-nowrap", children: [_jsx(ArrowLeft, { size: 18 }), _jsx("span", { className: "text-sm font-medium hidden md:inline", children: "Back to Home" }), _jsx("span", { className: "text-sm font-medium md:hidden", children: "Home" })] }), _jsxs("div", { className: "relative", ref: notificationRef, children: [_jsxs("button", { onClick: () => setShowNotifications(!showNotifications), className: "relative p-2 rounded-lg hover:bg-[var(--bg-card-soft)] transition text-[var(--text-main)]", children: [_jsx(Bell, { size: 20 }), unreadCount > 0 && (_jsx("span", { className: "absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" }))] }), showNotifications && (_jsxs("div", { className: "absolute right-0 top-12 w-80 md:w-96 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-2xl z-50 max-h-[500px] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-[var(--border-subtle)]", children: [_jsx("h3", { className: "text-lg font-semibold text-[var(--text-main)]", children: "Notifications" }), unreadCount > 0 && (_jsx("button", { onClick: markAllAsRead, className: "text-xs text-[#8B5CF6] hover:text-[#A78BFA] transition", children: "Mark all as read" }))] }), _jsx("div", { className: "overflow-y-auto max-h-[400px]", children: notifications.length === 0 ? (_jsxs("div", { className: "p-8 text-center", children: [_jsx(Bell, { size: 32, className: "mx-auto mb-3 text-[var(--text-muted)]" }), _jsx("p", { className: "text-[var(--text-muted)] text-sm", children: "No notifications" })] })) : (_jsx("div", { className: "divide-y divide-[var(--border-subtle)]", children: notifications.map((notification) => (_jsx("div", { onClick: () => markAsRead(notification.id), className: `p-4 hover:bg-[var(--bg-card-soft)] transition cursor-pointer ${!notification.read ? 'bg-[#8B5CF6]/10' : ''}`, children: _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "flex-shrink-0 mt-0.5", children: getNotificationIcon(notification.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-1", children: [_jsx("h4", { className: "text-sm font-semibold text-[var(--text-main)]", children: notification.title }), !notification.read && (_jsx("span", { className: "w-2 h-2 bg-[#8B5CF6] rounded-full flex-shrink-0 mt-1" }))] }), _jsx("p", { className: "text-xs text-[var(--text-muted)] mb-2 line-clamp-2", children: notification.message }), _jsx("p", { className: "text-xs text-[var(--text-muted)]", children: notification.time })] })] }) }, notification.id))) })) }), notifications.length > 0 && (_jsx("div", { className: "p-3 border-t border-[var(--border-subtle)] text-center", children: _jsx("button", { onClick: () => {
                                                                setShowNotifications(false);
                                                                setShowAllNotifications(true);
                                                            }, className: "text-sm text-[#8B5CF6] hover:text-[#A78BFA] transition", children: "View all notifications" }) }))] }))] }), _jsxs("div", { className: "relative", ref: profileMenuRef, children: [_jsxs("button", { onClick: () => setShowProfileMenu(!showProfileMenu), className: "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-card-soft)] transition", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] flex items-center justify-center", children: _jsx(User, { size: 18, className: "text-white" }) }), _jsx("span", { className: "text-[var(--text-main)] font-medium hidden md:block", children: profile?.full_name || 'User' })] }), showProfileMenu && (_jsxs("div", { className: "absolute right-0 top-12 w-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 overflow-hidden py-1", children: [_jsxs("button", { onClick: () => {
                                                            setShowProfileMenu(false);
                                                            navigate(isAdmin ? '/admin/settings' : '/dashboard/settings');
                                                        }, className: "w-full text-left px-4 py-2.5 text-sm text-[var(--text-main)] hover:bg-white/5 flex items-center gap-2 transition-colors", children: [_jsx(Settings, { size: 16 }), "Settings"] }), _jsxs("button", { onClick: () => {
                                                            setShowProfileMenu(false);
                                                            handleLogout();
                                                        }, className: "w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors", children: [_jsx(LogOut, { size: 16 }), "Logout"] })] }))] })] })] }), _jsx("main", { ref: mainContentRef, className: `flex-1 min-h-0 bg-[var(--bg-page)] ${isAnalyticsLayout ? 'overflow-hidden' : 'overflow-y-auto'}`, children: _jsx("div", { className: `w-full flex flex-col bg-[var(--bg-page)] ${isAnalyticsLayout
                                ? 'h-[calc(100vh-4rem)] px-0 pt-0 pb-0' // full viewport, no scroll, không margin-top
                                : 'h-[calc(100vh-4rem)] px-0 pt-0 pb-0 lg:pb-1'}`, children: _jsx(Outlet, { context: outletContext }) }) })] }), _jsx(AddOrderModal, { isOpen: isOrderModalOpen, onClose: closeAddOrderModal, onSuccess: handleOrderModalSuccess, editingOrder: orderModalEditingOrder ?? undefined, openAddProductModal: openAddProductModal, refetchProducts: async () => {
                    await refetchProducts();
                } }), _jsx(AddProductModal, { isOpen: isProductModalOpen, onClose: closeAddProductModal, onSuccess: handleProductModalSuccess, initialName: productModalInitialName }), showAllNotifications && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4", onClick: () => setShowAllNotifications(false), children: _jsxs("div", { className: "bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[var(--border-subtle)]", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-[var(--text-main)] mb-1", children: "All Notifications" }), _jsx("p", { className: "text-sm text-[var(--text-muted)]", children: unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!' })] }), _jsxs("div", { className: "flex items-center gap-3", children: [unreadCount > 0 && (_jsx("button", { onClick: markAllAsRead, className: "px-4 py-2 text-sm text-[#8B5CF6] hover:text-[#A78BFA] hover:bg-[#8B5CF6]/10 rounded-lg transition", children: "Mark all as read" })), _jsx("button", { onClick: () => setShowAllNotifications(false), className: "p-2 rounded-lg hover:bg-[var(--bg-card-soft)] transition text-[var(--text-main)]", children: _jsx(X, { size: 20 }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: notifications.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16", children: [_jsx(Bell, { size: 48, className: "mb-4 text-[var(--text-muted)]" }), _jsx("p", { className: "text-[var(--text-muted)] text-lg mb-2", children: "No notifications" }), _jsx("p", { className: "text-[var(--text-muted)] text-sm", children: "You're all caught up!" })] })) : (_jsx("div", { className: "space-y-3", children: notifications.map((notification) => (_jsx("div", { onClick: () => markAsRead(notification.id), className: `p-5 rounded-lg border transition-all cursor-pointer ${!notification.read
                                        ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/15'
                                        : 'bg-[var(--bg-card-soft)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-soft)]'}`, children: _jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "flex-shrink-0 mt-1", children: _jsx("div", { className: `p-2 rounded-lg ${notification.type === 'success' ? 'bg-green-500/20' :
                                                        notification.type === 'info' ? 'bg-blue-500/20' :
                                                            notification.type === 'warning' ? 'bg-yellow-500/20' :
                                                                'bg-purple-500/20'}`, children: getNotificationIcon(notification.type) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-2", children: [_jsx("h4", { className: "text-base font-semibold text-[var(--text-main)]", children: notification.title }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [!notification.read && (_jsx("span", { className: "w-2 h-2 bg-[#8B5CF6] rounded-full" })), _jsx("span", { className: "text-xs text-[var(--text-muted)] whitespace-nowrap", children: notification.time })] })] }), _jsx("p", { className: "text-sm text-[var(--text-muted)] leading-relaxed", children: notification.message }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded-full ${notification.type === 'success' ? 'bg-green-500/20 text-green-300' :
                                                                    notification.type === 'info' ? 'bg-blue-500/20 text-blue-300' :
                                                                        notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                                                                            'bg-purple-500/20 text-purple-300'}`, children: notification.type.charAt(0).toUpperCase() + notification.type.slice(1) }), !notification.read && (_jsx("span", { className: "text-xs text-[#8B5CF6]", children: "\u2022 Unread" }))] })] })] }) }, notification.id))) })) }), notifications.length > 0 && (_jsx("div", { className: "p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card-soft)]", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-[var(--text-muted)]", children: ["Showing ", notifications.length, " notification", notifications.length > 1 ? 's' : ''] }), _jsx("button", { onClick: () => setShowAllNotifications(false), className: "px-4 py-2 text-sm text-[#8B5CF6] hover:text-[#A78BFA] hover:bg-[#8B5CF6]/10 rounded-lg transition", children: "Close" })] }) }))] }) })), showLogoutModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)] p-6 lg:p-8 max-w-md w-full", children: [_jsx("h3", { className: "text-xl font-semibold text-[var(--text-main)] mb-3", children: "Confirm Logout" }), _jsx("p", { className: "text-[var(--text-muted)] mb-8", children: "Are you sure you want to logout?" }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx("button", { onClick: () => setShowLogoutModal(false), className: "px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-card-soft)] transition", children: "Cancel" }), _jsx("button", { onClick: confirmLogout, className: "px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition", children: "Logout" })] })] }) }))] }));
};
